jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

jest.mock("../src/utils/schema", () => ({
  ensureMarketplaceSchema: jest.fn().mockResolvedValue(),
}));

const pool = require("../src/config/db");
const { ensureMarketplaceSchema } = require("../src/utils/schema");
const serviceController = require("../src/controllers/service.controller");
const { createMockResponse } = require("./helpers/http");

const provider = { id: "provider-123" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("service.controller", () => {
  describe("create", () => {
    it("creates a service when valid data is provided", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: "svc-1" }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "svc-1",
              title: "Island Tour",
              description: "A scenic tour",
              price: 199.99,
              provider_id: provider.id,
              provider_name: "Test Provider",
              category: null,
              created_at: "2025-01-01T00:00:00.000Z",
              updated_at: "2025-01-01T00:00:00.000Z",
            },
          ],
        });

      const req = {
        body: { title: "Island Tour", price: 199.99 },
        user: provider,
      };
      const res = createMockResponse();

      await serviceController.create(req, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO services"),
        ["Island Tour", null, null, 199.99, provider.id]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.service).toMatchObject({
        id: "svc-1",
        name: "Island Tour",
        price: 199.99,
      });
    });

    it("returns 400 when required fields are missing", async () => {
      const req = { body: { description: "Missing title" }, user: provider };
      const res = createMockResponse();

      await serviceController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "name and price required" });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("lists services with normalized names", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: "svc-1",
            title: "Sunset Tour",
            description: "",
            price: 50,
            provider_id: provider.id,
            provider_name: "Provider",
            category: null,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-01T00:00:00.000Z",
          },
        ],
      });

      const req = {};
      const res = createMockResponse();

      await serviceController.list(req, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT s.*"));
      expect(res.body.services[0]).toMatchObject({
        id: "svc-1",
        name: "Sunset Tour",
      });
    });
  });

  describe("update", () => {
    it("updates a service and returns the updated record", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: "svc-1" }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: "svc-1",
              title: "Updated Tour",
              description: "New description",
              price: 250,
              provider_id: provider.id,
              provider_name: "Provider",
              category: null,
              created_at: "2025-01-01T00:00:00.000Z",
              updated_at: "2025-01-02T00:00:00.000Z",
            },
          ],
        });

      const req = {
        params: { id: "svc-1" },
        body: { name: "Updated Tour", price: 250 },
        user: provider,
      };
      const res = createMockResponse();

      await serviceController.update(req, res);

      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("UPDATE services"),
        expect.arrayContaining(["Updated Tour", 250, "svc-1", provider.id])
      );
      expect(res.body.service).toMatchObject({
        id: "svc-1",
        name: "Updated Tour",
        price: 250,
      });
    });

    it("returns 400 when no updates are provided", async () => {
      const req = { params: { id: "svc-1" }, body: {}, user: provider };
      const res = createMockResponse();

      await serviceController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "No updates provided" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns 404 when the service is not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = {
        params: { id: "missing" },
        body: { name: "Updated" },
        user: provider,
      };
      const res = createMockResponse();

      await serviceController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Not found or not owner" });
    });
  });

  describe("remove", () => {
    it("removes a service owned by the provider", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: "svc-1" }] });

      const req = { params: { id: "svc-1" }, user: provider };
      const res = createMockResponse();

      await serviceController.remove(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM services"),
        ["svc-1", provider.id]
      );
      expect(res.body).toEqual({ deleted: "svc-1" });
    });

    it("returns 404 when the service is missing", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = { params: { id: "missing" }, user: provider };
      const res = createMockResponse();

      await serviceController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Not found or not owner" });
    });
  });
});
