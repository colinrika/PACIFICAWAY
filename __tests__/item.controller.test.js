jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

jest.mock("../src/utils/schema", () => ({
  ensureMarketplaceSchema: jest.fn().mockResolvedValue(),
}));

const pool = require("../src/config/db");
const { ensureMarketplaceSchema } = require("../src/utils/schema");
const itemController = require("../src/controllers/item.controller");
const { createMockResponse } = require("./helpers/http");

const provider = { id: "provider-99" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("item.controller", () => {
  describe("create", () => {
    it("creates an item for the provider", async () => {
      const itemRow = {
        id: "item-1",
        name: "Kayak",
        description: "Single seat",
        price: 120,
        stock: 2,
        provider_id: provider.id,
      };
      pool.query.mockResolvedValueOnce({ rows: [itemRow] });

      const req = {
        body: { name: "Kayak", price: 120, stock: 2, description: "Single seat" },
        user: provider,
      };
      const res = createMockResponse();

      await itemController.create(req, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO items"),
        ["Kayak", "Single seat", 120, 2, provider.id]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.item).toEqual(itemRow);
    });

    it("returns 400 when name or price missing", async () => {
      const req = { body: { stock: 1 }, user: provider };
      const res = createMockResponse();

      await itemController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "name and price required" });
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("lists provider items", async () => {
      const rows = [
        { id: "item-1", name: "Kayak", provider_id: provider.id, provider_name: "Alice" },
      ];
      pool.query.mockResolvedValueOnce({ rows });

      const res = createMockResponse();
      await itemController.list({}, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SELECT i.*"));
      expect(res.body.items).toEqual(rows);
    });
  });

  describe("update", () => {
    it("updates owned item fields", async () => {
      const updated = {
        id: "item-1",
        name: "Kayak",
        description: "Updated",
        price: 140,
        stock: 3,
        provider_id: provider.id,
      };
      pool.query.mockResolvedValueOnce({ rows: [updated] });

      const req = {
        params: { id: "item-1" },
        body: { description: "Updated", price: 140, stock: 3 },
        user: provider,
      };
      const res = createMockResponse();

      await itemController.update(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE items"),
        ["item-1", undefined, "Updated", 140, 3, undefined, provider.id]
      );
      expect(res.body.item).toEqual(updated);
    });

    it("returns 404 when item not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = {
        params: { id: "item-1" },
        body: { name: "New" },
        user: provider,
      };
      const res = createMockResponse();

      await itemController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Not found or not owner" });
    });
  });

  describe("remove", () => {
    it("removes owned item", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: "item-1" }] });

      const req = { params: { id: "item-1" }, user: provider };
      const res = createMockResponse();

      await itemController.remove(req, res);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM items"),
        ["item-1", provider.id]
      );
      expect(res.body).toEqual({ deleted: "item-1" });
    });

    it("returns 404 when delete fails", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const req = { params: { id: "missing" }, user: provider };
      const res = createMockResponse();

      await itemController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Not found or not owner" });
    });
  });
});
