jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const pool = require("../src/config/db");
const countryController = require("../src/controllers/country.controller");
const { createMockResponse } = require("./helpers/http");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("country.controller", () => {
  describe("list", () => {
    it("returns mapped countries", async () => {
      const rows = [
        {
          id: "country-1",
          name: "Australia",
          iso_code: "AU",
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const res = createMockResponse();
      await countryController.list({}, res);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("FROM countries"));
      expect(res.body.countries[0]).toEqual({
        id: "country-1",
        name: "Australia",
        isoCode: "AU",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
      });
    });
  });

  describe("create", () => {
    it("creates a country when valid", async () => {
      const row = {
        id: "country-1",
        name: "Australia",
        iso_code: "AU",
        created_at: "2025-01-01",
        updated_at: "2025-01-01",
      };
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const req = { body: { name: "Australia", isoCode: "au" } };
      const res = createMockResponse();

      await countryController.create(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO countries"),
        ["Australia", "AU"]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.country).toEqual({
        id: "country-1",
        name: "Australia",
        isoCode: "AU",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
      });
    });

    it("returns 400 when name missing", async () => {
      const req = { body: { isoCode: "AU" } };
      const res = createMockResponse();

      await countryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "name is required" });
    });

    it("returns 409 when duplicate", async () => {
      pool.query.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "23505" }));

      const req = { body: { name: "Australia", isoCode: "AU" } };
      const res = createMockResponse();

      await countryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.body).toEqual({ error: "Country already exists" });
    });

    it("returns 400 when isoCode invalid length", async () => {
      const req = { body: { name: "Australia", isoCode: "AUS" } };
      const res = createMockResponse();

      await countryController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "isoCode must be 2 characters" });
    });
  });
});
