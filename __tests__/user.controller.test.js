jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const pool = require("../src/config/db");
const userController = require("../src/controllers/user.controller");
const { createMockResponse } = require("./helpers/http");

const baseRow = {
  id: "user-1",
  name: "Jane Doe",
  email: "jane@example.com",
  role: "admin",
  status: "active",
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
  phone_number: "+1 555-0100",
  country_id: "country-1",
  country_name: "Australia",
  country_iso_code: "AU",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("user.controller", () => {
  it("returns current user profile", async () => {
    pool.query.mockResolvedValueOnce({ rows: [baseRow] });

    const req = { user: { id: "user-1" } };
    const res = createMockResponse();

    await userController.me(req, res);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE u.id = $1"), ["user-1"]);
    expect(res.body.user).toMatchObject({
      id: "user-1",
      name: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
      country: { isoCode: "AU" },
    });
  });

  it("lists users", async () => {
    pool.query.mockResolvedValueOnce({ rows: [baseRow] });

    const res = createMockResponse();
    await userController.list({}, res);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY u.created_at DESC"));
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0]).toMatchObject({ id: "user-1", email: "jane@example.com" });
  });

  it("returns 404 when user not found by id", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: "missing" } };
    const res = createMockResponse();

    await userController.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});
