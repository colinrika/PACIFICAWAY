const pool = require("../config/db");
const { ensureMarketplaceSchema } = require("../utils/schema");

const normalizeNameInput = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const handleDbError = (res, error, fallbackMessage) => {
  if (error.code === "23505") {
    return res.status(409).json({ error: "Category name already exists" });
  }
  console.error(error);
  return res.status(500).json({ error: fallbackMessage });
};

exports.list = async (_req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { rows } = await pool.query(
      "SELECT * FROM categories ORDER BY created_at DESC"
    );
    res.json({ categories: rows });
  } catch (error) {
    handleDbError(res, error, "Failed to list categories");
  }
};

exports.create = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const name = normalizeNameInput(req.body?.name);
    const description =
      req.body?.description === undefined || req.body?.description === null
        ? null
        : String(req.body.description);

    if (!name) {
      return res.status(400).json({ error: "name required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description]
    );

    res.status(201).json({ category: rows[0] });
  } catch (error) {
    handleDbError(res, error, "Failed to create category");
  }
};

exports.update = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { id } = req.params;
    const updates = [];
    const values = [];

    if (req.body?.name !== undefined) {
      const name = normalizeNameInput(req.body.name);
      if (!name) {
        return res.status(400).json({ error: "name required" });
      }
      updates.push(`name = $${values.length + 1}`);
      values.push(name);
    }

    if (req.body?.description !== undefined) {
      const description =
        req.body.description === null
          ? null
          : String(req.body.description);
      updates.push(`description = $${values.length + 1}`);
      values.push(description);
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push("updated_at = NOW()");
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE categories
       SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ category: rows[0] });
  } catch (error) {
    handleDbError(res, error, "Failed to update category");
  }
};

exports.remove = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { id } = req.params;

    const { rows } = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING id",
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ deleted: rows[0].id });
  } catch (error) {
    handleDbError(res, error, "Failed to delete category");
  }
};
