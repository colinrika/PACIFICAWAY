const fs = require("fs");
const path = require("path");

const scriptBlock = (code) => ({
  listen: code.type,
  script: {
    type: "text/javascript",
    exec: code.code
      .trim()
      .split("\n")
      .map((line) => line.replace(/\s+$/u, "")),
  },
});

const request = ({
  name,
  method,
  pathSegments,
  description,
  headers = [],
  body,
  test,
  prerequest,
}) => {
  const events = [];
  if (prerequest) {
    events.push(
      scriptBlock({
        type: "prerequest",
        code: prerequest,
      })
    );
  }
  if (test) {
    events.push(
      scriptBlock({
        type: "test",
        code: test,
      })
    );
  }

  const urlPath = Array.isArray(pathSegments)
    ? pathSegments.filter((segment) => segment !== null && segment !== undefined)
    : pathSegments
    ? [pathSegments]
    : [];

  const sanitizedPath = urlPath.filter((segment) => segment !== "");
  const rawPath = sanitizedPath.join("/");
  const raw = rawPath ? `{{baseUrl}}/${rawPath}` : `{{baseUrl}}/`;

  return {
    name,
    event: events.length ? events : undefined,
    request: {
      method,
      header: headers,
      body,
      url: {
        raw,
        host: ["{{baseUrl}}"],
        path: sanitizedPath,
      },
      description,
    },
    response: [],
  };
};

const jsonBody = (obj) => ({
  mode: "raw",
  raw: JSON.stringify(obj, null, 2),
});

const jsonHeaders = [{ key: "Content-Type", value: "application/json" }];
const authHeader = (variable) => ({
  key: "Authorization",
  value: `Bearer {{${variable}}}`,
});

const combineHeaders = (...sets) => sets.flat();

const collection = {
  info: {
    name: "PACIFICAWAY API",
    _postman_id: "d75f6fbe-4b1d-4cfa-96f8-bb5e1e7087c0",
    description:
      "Collection exercising the public endpoints plus the full authentication, admin, catalog, and booking workflows exposed by the PACIFICAWAY API server.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [],
  variable: [
    { key: "baseUrl", value: "https://laughing-funicular-rvgpqj5wqxx2xgqr-4000.app.github.dev" },
    { key: "authToken", value: "" },
    { key: "adminToken", value: "" },
    { key: "providerEmail", value: "" },
    { key: "providerPassword", value: "" },
    { key: "adminEmail", value: "" },
    { key: "adminPassword", value: "" },
    { key: "userId", value: "" },
    { key: "adminUserId", value: "" },
    { key: "countryId", value: "" },
    { key: "countryName", value: "" },
    { key: "countryIsoCode", value: "" },
    { key: "stateId", value: "" },
    { key: "stateName", value: "" },
    { key: "stateCode", value: "" },
    { key: "cityId", value: "" },
    { key: "cityName", value: "" },
    { key: "serviceId", value: "" },
    { key: "serviceName", value: "" },
    { key: "itemId", value: "" },
    { key: "itemName", value: "" },
    { key: "bookingId", value: "" },
  ],
};

const folders = {
  Public: [
    request({
      name: "Root",
      method: "GET",
      pathSegments: [""],
      test: `
pm.test("Root is reachable", function () {
  pm.response.to.have.status(200);
});
`,
    }),
    request({
      name: "Health",
      method: "GET",
      pathSegments: ["health"],
      test: `
pm.test("Health endpoint is healthy", function () {
  pm.response.to.have.status(200);
});
`,
    }),
  ],
  Auth: [
    request({
      name: "Register Provider",
      method: "POST",
      pathSegments: ["auth", "register"],
      headers: jsonHeaders,
      body: jsonBody({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "{{providerEmail}}",
        password: "{{providerPassword}}",
        role: "provider",
        phoneNumber: "+1-555-0000",
      }),
      prerequest: `
const now = Date.now();
if (!pm.collectionVariables.get("providerEmail")) {
  pm.collectionVariables.set("providerEmail", "provider." + now + "@example.com");
}
if (!pm.collectionVariables.get("providerPassword")) {
  pm.collectionVariables.set("providerPassword", "P@ssw0rd!");
}
`,
      test: `
pm.test("Provider registered", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("token");
pm.collectionVariables.set("authToken", json.token);
if (json.user && json.user.id) {
  pm.collectionVariables.set("userId", json.user.id);
}
if (json.user && json.user.email) {
  pm.collectionVariables.set("providerEmail", json.user.email);
}
`,
    }),
    request({
      name: "Login Provider",
      method: "POST",
      pathSegments: ["auth", "login"],
      headers: jsonHeaders,
      body: jsonBody({
        email: "{{providerEmail}}",
        password: "{{providerPassword}}",
      }),
      prerequest: `
if (!pm.collectionVariables.get("providerEmail")) {
  throw new Error("Run Register Provider to seed providerEmail first");
}
if (!pm.collectionVariables.get("providerPassword")) {
  throw new Error("providerPassword missing. Register Provider first.");
}
`,
      test: `
pm.test("Provider logged in", function () {
  pm.response.to.have.status(200);
});
const json = pm.response.json();
pm.expect(json).to.have.property("token");
pm.collectionVariables.set("authToken", json.token);
`,
    }),
    request({
      name: "Register Admin",
      method: "POST",
      pathSegments: ["auth", "register"],
      headers: jsonHeaders,
      body: jsonBody({
        firstName: "Grace",
        lastName: "Hopper",
        email: "{{adminEmail}}",
        password: "{{adminPassword}}",
        role: "admin",
        phoneNumber: "+1-555-1000",
      }),
      prerequest: `
const now = Date.now();
if (!pm.collectionVariables.get("adminEmail")) {
  pm.collectionVariables.set("adminEmail", "admin." + now + "@example.com");
}
if (!pm.collectionVariables.get("adminPassword")) {
  pm.collectionVariables.set("adminPassword", "Adm1nP@ss!");
}
`,
      test: `
pm.test("Admin registered", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("token");
pm.collectionVariables.set("adminToken", json.token);
if (json.user && json.user.id) {
  pm.collectionVariables.set("adminUserId", json.user.id);
}
if (json.user && json.user.email) {
  pm.collectionVariables.set("adminEmail", json.user.email);
}
`,
    }),
    request({
      name: "Login Admin",
      method: "POST",
      pathSegments: ["auth", "login"],
      headers: jsonHeaders,
      body: jsonBody({
        email: "{{adminEmail}}",
        password: "{{adminPassword}}",
      }),
      prerequest: `
if (!pm.collectionVariables.get("adminEmail")) {
  throw new Error("Run Register Admin to seed adminEmail first");
}
if (!pm.collectionVariables.get("adminPassword")) {
  throw new Error("adminPassword missing. Register Admin first.");
}
`,
      test: `
pm.test("Admin logged in", function () {
  pm.response.to.have.status(200);
});
const json = pm.response.json();
pm.expect(json).to.have.property("token");
pm.collectionVariables.set("adminToken", json.token);
`,
    }),
  ],
  Users: [
    request({
      name: "Me",
      method: "GET",
      pathSegments: ["users", "me"],
      headers: [authHeader("authToken")],
      test: `
pm.test("Fetched current user", function () {
  pm.response.to.have.status(200);
});
const json = pm.response.json();
pm.expect(json).to.have.property("user");
if (json.user && json.user.id) {
  pm.collectionVariables.set("userId", json.user.id);
}
`,
    }),
    request({
      name: "List Users (admin)",
      method: "GET",
      pathSegments: ["users"],
      headers: [authHeader("adminToken")],
      test: `
pm.test("Admin listed users", function () {
  pm.response.to.have.status(200);
});
const json = pm.response.json();
pm.expect(json).to.have.property("users");
pm.expect(json.users).to.be.an("array");
if (json.users && json.users[0] && json.users[0].id) {
  pm.collectionVariables.set("userId", json.users[0].id);
}
`,
    }),
    request({
      name: "Get User By Id (admin)",
      method: "GET",
      pathSegments: ["users", "{{userId}}"],
      headers: [authHeader("adminToken")],
      prerequest: `
if (!pm.collectionVariables.get("userId")) {
  throw new Error("userId missing. Fetch a user before requesting by id.");
}
`,
      test: `
pm.test("Admin fetched user", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("user");
`,
    }),
  ],
  Countries: [
    request({
      name: "List Countries",
      method: "GET",
      pathSegments: ["countries"],
      test: `
pm.test("Countries listed", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("countries");
`,
    }),
    request({
      name: "Create Country (admin)",
      method: "POST",
      pathSegments: ["countries"],
      headers: combineHeaders(jsonHeaders, [authHeader("adminToken")]),
      body: jsonBody({
        name: "{{countryName}}",
        isoCode: "{{countryIsoCode}}",
      }),
      prerequest: `
if (!pm.collectionVariables.get("adminToken")) {
  throw new Error("adminToken missing. Log in as an admin first.");
}
const now = Date.now();
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const first = letters[now % letters.length];
const second = letters[Math.floor(now / letters.length) % letters.length];
pm.collectionVariables.set("countryName", "Exampleland " + now);
pm.collectionVariables.set("countryIsoCode", first + second);
`,
      test: `
pm.test("Country created", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("country");
if (json.country && json.country.id) {
  pm.collectionVariables.set("countryId", json.country.id);
}
`,
    }),
  ],
  States: [
    request({
      name: "List States",
      method: "GET",
      pathSegments: ["states"],
      test: `
pm.test("States listed", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("states");
`,
    }),
    request({
      name: "Create State (admin)",
      method: "POST",
      pathSegments: ["states"],
      headers: combineHeaders(jsonHeaders, [authHeader("adminToken")]),
      body: jsonBody({
        name: "{{stateName}}",
        code: "{{stateCode}}",
        countryId: "{{countryId}}",
      }),
      prerequest: `
if (!pm.collectionVariables.get("adminToken")) {
  throw new Error("adminToken missing. Log in as an admin first.");
}
if (!pm.collectionVariables.get("countryId")) {
  throw new Error("countryId missing. Create a country first.");
}
const now = Date.now();
pm.collectionVariables.set("stateName", "Example State " + now);
const suffix = now.toString().slice(-3);
pm.collectionVariables.set("stateCode", "EX" + suffix);
`,
      test: `
pm.test("State created", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("state");
if (json.state && json.state.id) {
  pm.collectionVariables.set("stateId", json.state.id);
}
`,
    }),
  ],
  Cities: [
    request({
      name: "List Cities",
      method: "GET",
      pathSegments: ["cities"],
      test: `
pm.test("Cities listed", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("cities");
`,
    }),
    request({
      name: "Create City (admin)",
      method: "POST",
      pathSegments: ["cities"],
      headers: combineHeaders(jsonHeaders, [authHeader("adminToken")]),
      body: jsonBody({
        name: "{{cityName}}",
        stateId: "{{stateId}}",
        countryId: "{{countryId}}",
      }),
      prerequest: `
if (!pm.collectionVariables.get("adminToken")) {
  throw new Error("adminToken missing. Log in as an admin first.");
}
if (!pm.collectionVariables.get("countryId")) {
  throw new Error("countryId missing. Create a country first.");
}
if (!pm.collectionVariables.get("stateId")) {
  throw new Error("stateId missing. Create a state first.");
}
pm.collectionVariables.set("cityName", "Example City " + Date.now());
`,
      test: `
pm.test("City created", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("city");
if (json.city && json.city.id) {
  pm.collectionVariables.set("cityId", json.city.id);
}
`,
    }),
  ],
  Services: [
    request({
      name: "List Services",
      method: "GET",
      pathSegments: ["services"],
      test: `
pm.test("Services listed", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("services");
`,
    }),
    request({
      name: "Create Service",
      method: "POST",
      pathSegments: ["services"],
      headers: combineHeaders(jsonHeaders, [authHeader("authToken")]),
      body: jsonBody({
        name: "{{serviceName}}",
        description: "Full home cleaning package",
        price: 150,
        category: "Cleaning",
      }),
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in as the provider first.");
}
pm.collectionVariables.set("serviceName", "Premium Cleaning " + Date.now());
`,
      test: `
pm.test("Service created", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("service");
if (json.service && json.service.id) {
  pm.collectionVariables.set("serviceId", json.service.id);
}
`,
    }),
    request({
      name: "Update Service",
      method: "PATCH",
      pathSegments: ["services", "{{serviceId}}"],
      headers: combineHeaders(jsonHeaders, [authHeader("authToken")]),
      body: jsonBody({
        description: "Updated description",
        price: 175,
        active: true,
      }),
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in as the provider first.");
}
if (!pm.collectionVariables.get("serviceId")) {
  throw new Error("serviceId missing. Create a service first.");
}
`,
      test: `
pm.test("Service updated", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("service");
`,
    }),
  ],
  Items: [
    request({
      name: "List Items",
      method: "GET",
      pathSegments: ["items"],
      test: `
pm.test("Items listed", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("items");
`,
    }),
    request({
      name: "Create Item",
      method: "POST",
      pathSegments: ["items"],
      headers: combineHeaders(jsonHeaders, [authHeader("authToken")]),
      body: jsonBody({
        name: "{{itemName}}",
        description: "Plant-based cleaning solution",
        price: 25.5,
        stock: 10,
      }),
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in as the provider first.");
}
pm.collectionVariables.set("itemName", "Eco Detergent " + Date.now());
`,
      test: `
pm.test("Item created", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("item");
if (json.item && json.item.id) {
  pm.collectionVariables.set("itemId", json.item.id);
}
`,
    }),
    request({
      name: "Update Item",
      method: "PATCH",
      pathSegments: ["items", "{{itemId}}"],
      headers: combineHeaders(jsonHeaders, [authHeader("authToken")]),
      body: jsonBody({
        price: 27.5,
        stock: 15,
        active: true,
      }),
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in as the provider first.");
}
if (!pm.collectionVariables.get("itemId")) {
  throw new Error("itemId missing. Create an item first.");
}
`,
      test: `
pm.test("Item updated", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("item");
`,
    }),
    request({
      name: "Delete Item",
      method: "DELETE",
      pathSegments: ["items", "{{itemId}}"],
      headers: [authHeader("authToken")],
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in as the provider first.");
}
if (!pm.collectionVariables.get("itemId")) {
  throw new Error("itemId missing. Create an item first.");
}
`,
      test: `
pm.test("Item deleted", function () {
  pm.response.to.have.status(200);
});
const json = pm.response.json();
if (json.deleted) {
  pm.expect(json.deleted).to.eql(pm.collectionVariables.get("itemId"));
}
pm.collectionVariables.unset("itemId");
`,
    }),
  ],
  Bookings: [
    request({
      name: "Create Booking",
      method: "POST",
      pathSegments: ["bookings"],
      headers: combineHeaders(jsonHeaders, [authHeader("authToken")]),
      body: jsonBody({
        service_id: "{{serviceId}}",
        date: "2025-01-01T10:00:00Z",
        notes: "Please arrive early",
      }),
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in as the provider first.");
}
if (!pm.collectionVariables.get("serviceId")) {
  throw new Error("serviceId missing. Create a service first.");
}
`,
      test: `
pm.test("Booking created", function () {
  pm.response.to.have.status(201);
});
const json = pm.response.json();
pm.expect(json).to.have.property("booking");
if (json.booking && json.booking.id) {
  pm.collectionVariables.set("bookingId", json.booking.id);
}
`,
    }),
    request({
      name: "List My Bookings",
      method: "GET",
      pathSegments: ["bookings", "me"],
      headers: [authHeader("authToken")],
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in first.");
}
`,
      test: `
pm.test("Bookings listed", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("bookings");
`,
    }),
    request({
      name: "Update Booking Status",
      method: "PATCH",
      pathSegments: ["bookings", "{{bookingId}}", "status"],
      headers: combineHeaders(jsonHeaders, [authHeader("authToken")]),
      body: jsonBody({
        status: "confirmed",
      }),
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in first.");
}
if (!pm.collectionVariables.get("bookingId")) {
  throw new Error("bookingId missing. Create a booking first.");
}
`,
      test: `
pm.test("Booking status updated", function () {
  pm.response.to.have.status(200);
});
pm.expect(pm.response.json()).to.have.property("booking");
`,
    }),
  ],
  "Session Cleanup": [
    request({
      name: "Delete Service",
      method: "DELETE",
      pathSegments: ["services", "{{serviceId}}"],
      headers: [authHeader("authToken")],
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in first.");
}
if (!pm.collectionVariables.get("serviceId")) {
  throw new Error("serviceId missing. Create a service first.");
}
`,
      test: `
pm.test("Service deleted", function () {
  pm.response.to.have.status(200);
});
const json = pm.response.json();
if (json.deleted) {
  pm.expect(json.deleted).to.eql(pm.collectionVariables.get("serviceId"));
}
pm.collectionVariables.unset("serviceId");
`,
    }),
    request({
      name: "Logout",
      method: "POST",
      pathSegments: ["auth", "logout"],
      headers: [authHeader("authToken")],
      prerequest: `
if (!pm.collectionVariables.get("authToken")) {
  throw new Error("authToken missing. Log in first.");
}
`,
      test: `
pm.test("Logged out", function () {
  pm.response.to.have.status(200);
});
pm.collectionVariables.unset("authToken");
`,
    }),
  ],
};

for (const [name, items] of Object.entries(folders)) {
  collection.item.push({ name, item: items });
}

const outputPath = path.join(__dirname, "..", "postman", "PACIFICAWAY.postman_collection.json");
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2) + "\n");
