jest.mock("../src/config/db", () => ({
  query: jest.fn(),
}));

jest.mock("../src/utils/schema", () => ({
  ensureMarketplaceSchema: jest.fn().mockResolvedValue(),
}));

const pool = require("../src/config/db");
const { ensureMarketplaceSchema } = require("../src/utils/schema");
const categoryController = require("../src/controllers/category.controller");
const { createMockResponse } = require("./helpers/http");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("category.controller", () => {
  describe("list", () => {
    it("returns categories ordered by creation date", async () => {
      const categories = [
        { id: "cat-2", name: "Tours", created_at: "2025-01-02" },
        { id: "cat-1", name: "Lodging", created_at: "2025-01-01" },
      ];
      pool.query.mockResolvedValueOnce({ rows: categories });

      const res = createMockResponse();
      await categoryController.list({}, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        "SELECT * FROM categories ORDER BY created_at DESC"
      );
      expect(res.body).toEqual({ categories });
    });
  });

  describe("create", () => {
    it("creates a category when a valid name is provided", async () => {
      const created = {
        id: "cat-1",
        name: "Excursions",
        description: "Group activities",
      };
      pool.query.mockResolvedValueOnce({ rows: [created] });

      const req = { body: { name: "  Excursions  ", description: "Group activities" } };
      const res = createMockResponse();

      await categoryController.create(req, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO categories"),
        ["Excursions", "Group activities"]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toEqual({ category: created });
    });

    it("returns 400 when name is missing", async () => {
      const res = createMockResponse();

      await categoryController.create({ body: { description: "Missing" } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "name required" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns 409 when the category name already exists", async () => {
      pool.query.mockRejectedValueOnce({ code: "23505" });

      const res = createMockResponse();
      await categoryController.create({ body: { name: "Tours" } }, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.body).toEqual({ error: "Category name already exists" });
    });
  });

  describe("update", () => {
    it("updates a category and returns the new record", async () => {
      const updated = {
        id: "cat-1",
        name: "Adventures",
        description: "Outdoor trips",
      };
      pool.query.mockResolvedValueOnce({ rows: [updated] });

      const req = {
        params: { id: "cat-1" },
        body: { name: "Adventures", description: "Outdoor trips" },
      };
      const res = createMockResponse();

      await categoryController.update(req, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE categories"),
        ["Adventures", "Outdoor trips", "cat-1"]
      );
      expect(res.body).toEqual({ category: updated });
    });

    it("returns 400 when no updates are provided", async () => {
      const res = createMockResponse();

      await categoryController.update({ params: { id: "cat-1" }, body: {} }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "No updates provided" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns 400 when name update is blank", async () => {
      const res = createMockResponse();

      await categoryController.update(
        { params: { id: "cat-1" }, body: { name: "   " } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body).toEqual({ error: "name required" });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it("returns 404 when the category cannot be found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();

      await categoryController.update(
        { params: { id: "missing" }, body: { description: "New" } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Category not found" });
    });

    it("returns 409 when the updated name conflicts", async () => {
      pool.query.mockRejectedValueOnce({ code: "23505" });

      const res = createMockResponse();

      await categoryController.update(
        { params: { id: "cat-1" }, body: { name: "Tours" } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.body).toEqual({ error: "Category name already exists" });
    });
  });

  describe("remove", () => {
    it("deletes the requested category", async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: "cat-1" }] });

      const res = createMockResponse();
      await categoryController.remove({ params: { id: "cat-1" } }, res);

      expect(ensureMarketplaceSchema).toHaveBeenCalled();
      expect(pool.query).toHaveBeenCalledWith(
        "DELETE FROM categories WHERE id = $1 RETURNING id",
        ["cat-1"]
      );
      expect(res.body).toEqual({ deleted: "cat-1" });
    });

    it("returns 404 when the category is missing", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = createMockResponse();
      await categoryController.remove({ params: { id: "missing" } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toEqual({ error: "Category not found" });
    });
  });
});
