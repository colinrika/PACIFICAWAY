const http = require("http");

function supertest(app) {
  return new TestAgent(app);
}

class TestAgent {
  constructor(app) {
    this.app = app;
  }

  get(path) {
    return this._request("GET", path);
  }

  post(path, body) {
    return this._request("POST", path, body);
  }

  put(path, body) {
    return this._request("PUT", path, body);
  }

  delete(path) {
    return this._request("DELETE", path);
  }

  async _request(method, path, payload) {
    const app = this.app;
    return new Promise((resolve, reject) => {
      const server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        const options = {
          hostname: "127.0.0.1",
          port: address.port,
          path,
          method,
          headers: {},
        };

        let bodyString = null;
        if (payload !== undefined) {
          bodyString = typeof payload === "string" ? payload : JSON.stringify(payload);
          options.headers["content-type"] = "application/json";
          options.headers["content-length"] = Buffer.byteLength(bodyString);
        }

        const req = http.request(options, (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const text = buffer.toString();
            const contentType = res.headers["content-type"] || "";
            let body;
            if (contentType.includes("application/json")) {
              try {
                body = text.length ? JSON.parse(text) : {};
              } catch (err) {
                body = undefined;
              }
            }
            const response = {
              status: res.statusCode,
              text,
              body,
              headers: res.headers,
            };
            server.close(() => resolve(response));
          });
        });

        req.on("error", (error) => {
          server.close(() => reject(error));
        });

        if (bodyString !== null) {
          req.write(bodyString);
        }

        req.end();
      });
    });
  }
}

supertest.agent = function agent(app) {
  return new TestAgent(app);
};

module.exports = supertest;
module.exports.TestAgent = TestAgent;
