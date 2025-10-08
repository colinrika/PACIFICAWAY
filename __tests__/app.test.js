jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("App routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("responds with API status message on root route", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("PACIFICAWAY API is running 🚀");
  });

  it("returns database health information when query succeeds", async () => {
    const now = new Date().toISOString();
    pool.query.mockResolvedValue({ rows: [{ now }] });

    const res = await request(app).get("/health");

    expect(pool.query).toHaveBeenCalledWith("SELECT NOW() as now");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", time: now });
  });

  it("returns a 500 status when the database query fails", async () => {
    pool.query.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/health");

    expect(pool.query).toHaveBeenCalledWith("SELECT NOW() as now");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: "db_error", error: "boom" });
  });
});
