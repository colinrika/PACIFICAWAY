jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const pool = require("../src/config/db");
const stateController = require("../src/controllers/state.controller");
const { createMockResponse } = require("./helpers/http");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("state.controller", () => {
  describe("list", () => {
    it("validates UUID filter", async () => {
      const req = { query: { countryId: "not-uuid" } };
      const res = createMockResponse();

      await stateController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "countryId must be a valid UUID" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns mapped states", async () => {
      const rows = [
        {
          id: "state-1",
          name: "Queensland",
          code: "QLD",
          country_id: "country-1",
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
          country_name: "Australia",
          country_iso_code: "AU",
        },
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const req = { query: {} };
      const res = createMockResponse();

      await stateController.list(req, res);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("FROM states"), []);
      expect(res.body.states[0]).toEqual({
        id: "state-1",
        name: "Queensland",
        code: "QLD",
        countryId: "country-1",
        country: {
          id: "country-1",
          name: "Australia",
          isoCode: "AU",
        },
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
      });
    });
  });

  describe("create", () => {
    it("creates a state when payload is valid", async () => {
      const row = {
        id: "state-1",
        name: "Queensland",
        code: "QLD",
        country_id: "country-1",
        created_at: "2025-01-01",
        updated_at: "2025-01-01",
        country_name: "Australia",
        country_iso_code: "AU",
      };
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const req = {
        body: { name: "Queensland", code: "QLD", countryId: "123e4567-e89b-12d3-a456-426614174000" },
      };
      const res = createMockResponse();

      await stateController.create(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO states"),
        ["Queensland", "QLD", "123e4567-e89b-12d3-a456-426614174000"]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.state.name).toBe("Queensland");
    });

    it("returns 400 when country id missing", async () => {
      const req = { body: { name: "Queensland" } };
      const res = createMockResponse();

      await stateController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "countryId or countryIso is required" });
    });

    it("returns 409 when duplicate", async () => {
      pool.query.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "23505" }));

      const req = {
        body: {
          name: "Queensland",
          code: "QLD",
          countryId: "123e4567-e89b-12d3-a456-426614174000",
        },
      };
      const res = createMockResponse();

      await stateController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.body).toEqual({ error: "State already exists for country" });
    });
  });
});
