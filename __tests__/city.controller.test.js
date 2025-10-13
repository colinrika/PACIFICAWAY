jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

const pool = require("../src/config/db");
const cityController = require("../src/controllers/city.controller");
const { createMockResponse } = require("./helpers/http");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("city.controller", () => {
  describe("list", () => {
    it("validates country ISO length", async () => {
      const req = { query: { countryIso: "A" } };
      const res = createMockResponse();

      await cityController.list(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "countryIso must be a 2 character ISO code" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns mapped cities", async () => {
      const rows = [
        {
          id: "city-1",
          name: "Sydney",
          country_id: "country-1",
          state_id: "state-1",
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
          country_name: "Australia",
          country_iso_code: "AU",
          state_name: "New South Wales",
          state_code: "NSW",
        },
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const req = { query: {} };
      const res = createMockResponse();

      await cityController.list(req, res);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("FROM cities"), []);
      expect(res.body.cities[0]).toEqual({
        id: "city-1",
        name: "Sydney",
        countryId: "country-1",
        stateId: "state-1",
        country: { id: "country-1", name: "Australia", isoCode: "AU" },
        state: { id: "state-1", name: "New South Wales", code: "NSW" },
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01",
      });
    });
  });

  describe("create", () => {
    const stateId = "123e4567-e89b-12d3-a456-426614174000";
    const countryId = "223e4567-e89b-12d3-a456-426614174000";

    it("creates a city when state lookup succeeds", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: stateId, country_id: countryId, iso_code: "AU" }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "city-1",
              name: "Sydney",
              country_id: countryId,
              state_id: stateId,
              created_at: "2025-01-01",
              updated_at: "2025-01-01",
              country_name: "Australia",
              country_iso_code: "AU",
              state_name: "New South Wales",
              state_code: "NSW",
            },
          ],
        });

      const req = {
        body: { name: "Sydney", stateId },
      };
      const res = createMockResponse();

      await cityController.create(req, res);

      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("SELECT s.id"),
        [stateId]
      );
      expect(pool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO cities"),
        ["Sydney", countryId, stateId]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.city.name).toBe("Sydney");
    });

    it("returns 400 when name missing", async () => {
      const req = { body: { stateId } };
      const res = createMockResponse();

      await cityController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "name is required" });
    });

    it("returns 409 when duplicate city", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: stateId, country_id: countryId, iso_code: "AU" }],
        })
        .mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "23505" }));

      const req = { body: { name: "Sydney", stateId } };
      const res = createMockResponse();

      await cityController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.body).toEqual({ error: "City already exists for location" });
    });
  });
});
