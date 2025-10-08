#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { inspect, isDeepStrictEqual } = require("util");
const Module = require("module");

process.env.NODE_ENV = process.env.NODE_ENV || "test";

const projectRoot = path.resolve(__dirname, "..");
const testsRoot = path.join(projectRoot, "__tests__");
const supertestStubPath = path.join(projectRoot, "scripts", "supertest-stub.js");

function findTestFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const result = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      result.push(fullPath);
    }
  }
  return result;
}

async function main() {
  const testFiles = findTestFiles(testsRoot);
  if (testFiles.length === 0) {
    console.log("No tests found.");
    return;
  }

  let totalSuitesFailed = 0;
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const file of testFiles) {
    const relative = path.relative(projectRoot, file);
    console.log(`\n${relative}`);
    const { total, passed, failed } = await runTestFile(file);
    totalTests += total;
    totalPassed += passed;
    totalFailed += failed;
    if (failed > 0) {
      totalSuitesFailed += 1;
    }
  }

  const suitesPassed = testFiles.length - totalSuitesFailed;
  console.log("\nTest Suites:", `${suitesPassed} passed, ${totalSuitesFailed} failed, ${testFiles.length} total`);
  console.log("Tests:      ", `${totalPassed} passed, ${totalFailed} failed, ${totalTests} total`);

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

function formatValue(value) {
  return inspect(value, { depth: 5, colors: false });
}

function createExpect() {
  return function expect(received) {
    return {
      toBe(expected) {
        if (!Object.is(received, expected)) {
          throw new Error(`Expected ${formatValue(received)} to be ${formatValue(expected)}`);
        }
      },
      toEqual(expected) {
        assert.deepStrictEqual(received, expected);
      },
      toHaveBeenCalledWith(...expectedArgs) {
        if (!received || !received.mock || !Array.isArray(received.mock.calls)) {
          throw new Error("Expected a mock function with call history");
        }
        const calls = received.mock.calls;
        const matched = calls.some((call) => isDeepStrictEqual(call, expectedArgs));
        if (!matched) {
          throw new Error(`Expected mock to be called with ${formatValue(expectedArgs)}, but received calls ${formatValue(calls)}`);
        }
      },
    };
  };
}

function createMockUtilities(allMocks, testRequire) {
  const originalLoad = Module._load;
  const mockFactories = new Map();
  const mockInstances = new Map();

  function resolveRequest(request, parent) {
    try {
      return Module._resolveFilename(request, parent);
    } catch (err) {
      try {
        return testRequire.resolve(request);
      } catch (innerErr) {
        return request;
      }
    }
  }

  Module._load = function mockLoader(request, parent, isMain) {
    if (request === 'supertest') {
      try {
        return originalLoad(request, parent, isMain);
      } catch (err) {
        if (!err || err.code !== 'MODULE_NOT_FOUND') {
          throw err;
        }
        return originalLoad(supertestStubPath, parent, isMain);
      }
    }
    const resolved = resolveRequest(request, parent);
    if (mockFactories.has(resolved)) {
      if (!mockInstances.has(resolved)) {
        const factory = mockFactories.get(resolved);
        mockInstances.set(resolved, factory());
      }
      return mockInstances.get(resolved);
    }
    return originalLoad(request, parent, isMain);
  };

  function restore() {
    Module._load = originalLoad;
  }

  function jestMock(request, factory) {
    let resolved;
    try {
      resolved = testRequire.resolve(request);
    } catch (err) {
      resolved = resolveRequest(request);
    }
    mockFactories.set(resolved, factory);
    mockInstances.delete(resolved);
    if (resolved && require.cache[resolved]) {
      delete require.cache[resolved];
    }
  }

  function createMockFn(implementation) {
    let impl = typeof implementation === "function" ? implementation : () => undefined;
    const mockFn = function mockFnWrapper(...args) {
      mockFn.mock.calls.push(args);
      return impl.apply(this, args);
    };
    mockFn.mock = { calls: [] };
    mockFn.mockImplementation = (nextImpl) => {
      impl = nextImpl;
      return mockFn;
    };
    mockFn.mockReturnValue = (value) => {
      impl = () => value;
      return mockFn;
    };
    mockFn.mockResolvedValue = (value) => {
      impl = () => Promise.resolve(value);
      return mockFn;
    };
    mockFn.mockRejectedValue = (error) => {
      impl = () => Promise.reject(error);
      return mockFn;
    };
    allMocks.add(mockFn);
    return mockFn;
  }

  function clearAllMocks() {
    for (const mockFn of allMocks) {
      mockFn.mock.calls = [];
    }
  }

  return {
    jest: {
      fn: createMockFn,
      mock: jestMock,
      clearAllMocks,
    },
    restore,
  };
}

function createSuite(name, parent = null) {
  return {
    name,
    tests: [],
    suites: [],
    beforeEach: [],
    afterEach: [],
    parent,
  };
}

function createTestAPI(rootSuite) {
  let currentSuite = rootSuite;

  function describe(name, fn) {
    const suite = createSuite(name, currentSuite);
    currentSuite.suites.push(suite);
    const previous = currentSuite;
    currentSuite = suite;
    try {
      fn();
    } finally {
      currentSuite = previous;
    }
  }

  function it(name, fn) {
    currentSuite.tests.push({ name, fn });
  }

  function beforeEach(fn) {
    currentSuite.beforeEach.push(fn);
  }

  function afterEach(fn) {
    currentSuite.afterEach.push(fn);
  }

  return {
    describe,
    it,
    test: it,
    beforeEach,
    afterEach,
  };
}

async function runSuite(suite, ancestors, context) {
  const chain = [...ancestors, suite];
  for (const child of suite.suites) {
    await runSuite(child, chain, context);
  }
  for (const test of suite.tests) {
    await runSingleTest(chain, test, context);
  }
}

async function runSingleTest(suites, test, context) {
  const namedSuites = suites.filter((suite) => suite.name);
  const indent = "  ".repeat(namedSuites.length);
  const fullName = [...namedSuites.map((suite) => suite.name), test.name].join(" › ");
  context.total += 1;
  try {
    for (const suite of suites) {
      for (const hook of suite.beforeEach) {
        await hook();
      }
    }
    const result = test.fn();
    if (result && typeof result.then === "function") {
      await result;
    }
    console.log(`${indent}✓ ${fullName}`);
    context.passed += 1;
  } catch (error) {
    console.log(`${indent}✗ ${fullName}`);
    console.error(indent + (error && error.stack ? error.stack : String(error)));
    context.failed += 1;
  } finally {
    for (const suite of suites.slice().reverse()) {
      for (const hook of suite.afterEach) {
        try {
          await hook();
        } catch (hookError) {
          console.error(indent + "afterEach hook failed:", hookError);
        }
      }
    }
    if (typeof context.clearMocks === "function") {
      context.clearMocks();
    }
  }
}

async function runTestFile(testFile) {
  const allMocks = new Set();
  const testRequire = Module.createRequire(testFile);
  const { jest, restore } = createMockUtilities(allMocks, testRequire);
  const expect = createExpect();
  const rootSuite = createSuite(null);
  const api = createTestAPI(rootSuite);

  Object.assign(globalThis, {
    describe: api.describe,
    it: api.it,
    test: api.test,
    beforeEach: api.beforeEach,
    afterEach: api.afterEach,
    jest,
    expect,
  });

  const context = { total: 0, passed: 0, failed: 0, clearMocks: jest.clearAllMocks };

  try {
    if (require.cache[testFile]) {
      delete require.cache[testFile];
    }
    testRequire(testFile);
    await runSuite(rootSuite, [], context);
  } catch (err) {
    console.error("Test file execution failed:", err);
    context.failed += 1;
    context.total += 1;
  } finally {
    restore();
    delete globalThis.describe;
    delete globalThis.it;
    delete globalThis.test;
    delete globalThis.beforeEach;
    delete globalThis.afterEach;
    delete globalThis.jest;
    delete globalThis.expect;
  }

  return context;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
