const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

jest.setTimeout(60000);

const ctx = {
  tokens: {},
  ids: {},
};

beforeAll(async () => {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret";
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be defined to run API integration tests");
  }

  await pool.query(
    "TRUNCATE TABLE bookings, services, service_categories, items, cities, states, countries, users RESTART IDENTITY CASCADE"
  );
});

afterAll(async () => {
  await pool.end();
});

describe("PACIFICAWAY API end-to-end flows", () => {
  test("health check responds with ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.time).toBeTruthy();
  });

  test("register admin user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Admin User",
        email: "admin@example.com",
        password: "Secret123!",
        role: "admin",
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.token).toBeDefined();

    ctx.tokens.admin = res.body.token;
    ctx.ids.admin = res.body.user.id;
  });

  test("login admin user", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "Secret123!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("admin can view their profile", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${ctx.tokens.admin}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("admin@example.com");
  });

  test("admin can create and list countries", async () => {
    const createRes = await request(app)
      .post("/countries")
      .set("Authorization", `Bearer ${ctx.tokens.admin}`)
      .send({ name: "Testland", isoCode: "tl" });

    expect(createRes.status).toBe(201);
    expect(createRes.body.country.isoCode).toBe("TL");
    ctx.ids.country = createRes.body.country.id;

    const listRes = await request(app).get("/countries");
    expect(listRes.status).toBe(200);
    expect(listRes.body.countries.some((c) => c.id === ctx.ids.country)).toBe(
      true
    );
  });

  test("admin can create and list states", async () => {
    const createRes = await request(app)
      .post("/states")
      .set("Authorization", `Bearer ${ctx.tokens.admin}`)
      .send({ name: "Example State", code: "ES", countryId: ctx.ids.country });

    expect(createRes.status).toBe(201);
    ctx.ids.state = createRes.body.state.id;

    const listRes = await request(app)
      .get("/states")
      .query({ countryId: ctx.ids.country });

    expect(listRes.status).toBe(200);
    expect(listRes.body.states).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ctx.ids.state,
          name: "Example State",
        }),
      ])
    );
  });

  test("admin can create and list cities", async () => {
    const createRes = await request(app)
      .post("/cities")
      .set("Authorization", `Bearer ${ctx.tokens.admin}`)
      .send({
        name: "Sample City",
        countryId: ctx.ids.country,
        stateId: ctx.ids.state,
      });

    expect(createRes.status).toBe(201);
    ctx.ids.city = createRes.body.city.id;

    const listRes = await request(app)
      .get("/cities")
      .query({ stateId: ctx.ids.state });

    expect(listRes.status).toBe(200);
    expect(listRes.body.cities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ctx.ids.city,
          name: "Sample City",
        }),
      ])
    );
  });

  test("admin can list and fetch users", async () => {
    const listRes = await request(app)
      .get("/users")
      .set("Authorization", `Bearer ${ctx.tokens.admin}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.users.length).toBeGreaterThan(0);

    const getRes = await request(app)
      .get(`/users/${ctx.ids.admin}`)
      .set("Authorization", `Bearer ${ctx.tokens.admin}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.user.email).toBe("admin@example.com");
  });

  test("register provider user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Provider One",
        email: "provider@example.com",
        password: "ProviderPass1!",
        role: "provider",
        phoneNumber: "+1234567890",
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("provider");

    ctx.tokens.provider = res.body.token;
    ctx.ids.provider = res.body.user.id;
  });

  test("provider can access their profile", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${ctx.tokens.provider}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("provider@example.com");
  });

  test("register customer user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        firstName: "Customer",
        lastName: "Example",
        email: "customer@example.com",
        password: "CustomerPass1!",
        role: "customer",
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("customer");

    ctx.tokens.customer = res.body.token;
    ctx.ids.customer = res.body.user.id;
  });

  test("provider can create and list services", async () => {
    const createRes = await request(app)
      .post("/services")
      .set("Authorization", `Bearer ${ctx.tokens.provider}`)
      .send({
        name: "Island Tour",
        description: "A guided tour around the islands.",
        price: 199.99,
        category: "Excursions",
      });

    expect(createRes.status).toBe(201);
    ctx.ids.service = createRes.body.service.id;

    const deleteRes = await request(app)
      .post("/services")
      .set("Authorization", `Bearer ${ctx.tokens.provider}`)
      .send({
        name: "Temporary Service",
        description: "Disposable test service",
        price: 50,
      });

    expect(deleteRes.status).toBe(201);
    ctx.ids.serviceToDelete = deleteRes.body.service.id;

    const listRes = await request(app).get("/services");
    expect(listRes.status).toBe(200);
    expect(listRes.body.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ctx.ids.service }),
        expect.objectContaining({ id: ctx.ids.serviceToDelete }),
      ])
    );
  });

  test("provider can update a service", async () => {
    const res = await request(app)
      .patch(`/services/${ctx.ids.service}`)
      .set("Authorization", `Bearer ${ctx.tokens.provider}`)
      .send({
        description: "Updated guided tour",
        price: 249.5,
        active: false,
        category: "Premium Excursions",
      });

    expect(res.status).toBe(200);
    expect(res.body.service.description).toBe("Updated guided tour");
    expect(res.body.service.active).toBe(false);
  });

  test("provider can delete a service they own", async () => {
    const res = await request(app)
      .delete(`/services/${ctx.ids.serviceToDelete}`)
      .set("Authorization", `Bearer ${ctx.tokens.provider}`);

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(ctx.ids.serviceToDelete);
  });

  test("provider can manage items", async () => {
    const createRes = await request(app)
      .post("/items")
      .set("Authorization", `Bearer ${ctx.tokens.provider}`)
      .send({
        name: "Rental Kayak",
        description: "Single-person kayak rental",
        price: 45,
        stock: 5,
      });

    expect(createRes.status).toBe(201);
    ctx.ids.item = createRes.body.item.id;

    const listRes = await request(app).get("/items");
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.some((i) => i.id === ctx.ids.item)).toBe(true);

    const updateRes = await request(app)
      .patch(`/items/${ctx.ids.item}`)
      .set("Authorization", `Bearer ${ctx.tokens.provider}`)
      .send({ price: 60, stock: 8, active: false });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.price).toBe("60");
    expect(updateRes.body.item.active).toBe(false);

    const deleteRes = await request(app)
      .delete(`/items/${ctx.ids.item}`)
      .set("Authorization", `Bearer ${ctx.tokens.provider}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(ctx.ids.item);
  });

  test("customer can create and view bookings", async () => {
    const createRes = await request(app)
      .post("/bookings")
      .set("Authorization", `Bearer ${ctx.tokens.customer}`)
      .send({
        service_id: ctx.ids.service,
        date: new Date().toISOString(),
        notes: "Please provide snorkeling gear.",
      });

    expect(createRes.status).toBe(201);
    ctx.ids.booking = createRes.body.booking.id;

    const listRes = await request(app)
      .get("/bookings/me")
      .set("Authorization", `Bearer ${ctx.tokens.customer}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.bookings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ctx.ids.booking }),
      ])
    );
  });

  test("provider can update booking status", async () => {
    const res = await request(app)
      .patch(`/bookings/${ctx.ids.booking}/status`)
      .set("Authorization", `Bearer ${ctx.tokens.provider}`)
      .send({ status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe("confirmed");
  });

  test("customer logout returns success message", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Logged out/i);
  });

  test("deleting a service cascades to related bookings", async () => {
    const deleteRes = await request(app)
      .delete(`/services/${ctx.ids.service}`)
      .set("Authorization", `Bearer ${ctx.tokens.provider}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(ctx.ids.service);

    const listRes = await request(app)
      .get("/bookings/me")
      .set("Authorization", `Bearer ${ctx.tokens.customer}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.bookings).toEqual([]);
  });
});
