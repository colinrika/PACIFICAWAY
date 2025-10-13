const pool = require("../config/db");
const { ensureMarketplaceSchema } = require("../utils/schema");

const baseServiceSelect = `
  SELECT s.*, u.name AS provider_name, c.name AS category
  FROM services s
  JOIN users u ON u.id = s.provider_id
  LEFT JOIN categories c ON c.id = s.category_id
`;

const normalizeService = (service) => {
  if (!service) return service;
  if (
    (service.name === null || service.name === undefined) &&
    service.title !== null &&
    service.title !== undefined
  ) {
    return { ...service, name: service.title };
  }
  return service;
};

const fetchServiceById = async (id) => {
  const { rows } = await pool.query(`${baseServiceSelect} WHERE s.id = $1`, [id]);
  return normalizeService(rows[0]);
};

const resolveCategoryInput = async (categoryId, categoryName) => {
  if (categoryId !== undefined) {
    if (categoryId === null || categoryId === "") {
      return { touched: true, value: null };
    }

    const { rows } = await pool.query(
      "SELECT id FROM categories WHERE id = $1",
      [categoryId]
    );
    if (!rows[0]) {
      const err = new Error("Category not found");
      err.status = 400;
      throw err;
    }
    return { touched: true, value: rows[0].id };
  }

  if (categoryName !== undefined) {
    const name = String(categoryName || "").trim();
    if (!name) return { touched: true, value: null };

    const { rows } = await pool.query(
      `INSERT INTO categories (name)
       VALUES ($1)
       ON CONFLICT (name)
       DO UPDATE SET name = EXCLUDED.name,
         updated_at = NOW()
       RETURNING id`,
      [name]
    );
    return { touched: true, value: rows[0].id };
  }

  return { touched: false };
};

const handlePgError = (res, error, fallbackMessage) => {
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.code === "22P02") {
    return res.status(400).json({ error: "Invalid category id" });
  }
  console.error(error);
  return res.status(500).json({ error: fallbackMessage });
};

// ----------------------- CONTROLLERS -----------------------

exports.create = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { title, name, description, categoryId, category, price } = req.body;

    const serviceTitleRaw = title ?? name;
    const serviceTitle =
      serviceTitleRaw === undefined || serviceTitleRaw === null
        ? ""
        : String(serviceTitleRaw).trim();

    if (!serviceTitle || price == null) {
      return res.status(400).json({ error: "name and price required" });
    }

    const categoryResolution = await resolveCategoryInput(categoryId, category);
    const resolvedCategoryId = categoryResolution.touched
      ? categoryResolution.value
      : null;

    const inserted = await pool.query(
      `INSERT INTO services (title, description, category_id, price, provider_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [serviceTitle, description ?? null, resolvedCategoryId, price, req.user.id]
    );

    const service = await fetchServiceById(inserted.rows[0].id);
    res.status(201).json({ service });
  } catch (e) {
    handlePgError(res, e, "Failed to create service");
  }
};

exports.list = async (_req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { rows } = await pool.query(
      `${baseServiceSelect} ORDER BY s.created_at DESC`
    );
    res.json({ services: rows.map(normalizeService) });
  } catch (e) {
    handlePgError(res, e, "Failed to list services");
  }
};

exports.update = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { id } = req.params;
    const { title, name, description, categoryId, category, price, active } =
      req.body;

    let nextTitle;
    if (title !== undefined || name !== undefined) {
      const newTitleRaw = title !== undefined ? title : name;
      const newTitle =
        newTitleRaw === undefined || newTitleRaw === null
          ? ""
          : String(newTitleRaw).trim();

      if (!newTitle) {
        return res.status(400).json({ error: "name required" });
      }

      nextTitle = newTitle;
    }

    const updates = [];
    const values = [];

    if (nextTitle !== undefined) {
      updates.push(`title = $${values.length + 1}`);
      values.push(nextTitle);
    }

    if (description !== undefined) {
      updates.push(`description = $${values.length + 1}`);
      values.push(description);
    }

    const categoryResolution = await resolveCategoryInput(categoryId, category);
    if (categoryResolution.touched) {
      updates.push(`category_id = $${values.length + 1}`);
      values.push(categoryResolution.value);
    }

    if (price !== undefined) {
      updates.push(`price = $${values.length + 1}`);
      values.push(price);
    }

    if (active !== undefined) {
      updates.push(`active = $${values.length + 1}`);
      values.push(active);
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push("updated_at = NOW()");

    values.push(id);
    const idPos = values.length;
    values.push(req.user.id);
    const providerPos = values.length;

    const updated = await pool.query(
      `UPDATE services
       SET ${updates.join(", ")}
       WHERE id = $${idPos} AND provider_id = $${providerPos}
       RETURNING id`,
      values
    );

    if (!updated.rows[0]) {
      return res.status(404).json({ error: "Not found or not owner" });
    }

    const service = await fetchServiceById(updated.rows[0].id);
    res.json({ service });
  } catch (e) {
    handlePgError(res, e, "Failed to update service");
  }
};

exports.remove = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const q = await pool.query(
      `DELETE FROM services WHERE id=$1 AND provider_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!q.rows[0]) {
      return res.status(404).json({ error: "Not found or not owner" });
    }

    res.json({ deleted: q.rows[0].id });
  } catch (e) {
    handlePgError(res, e, "Failed to delete service");
  }
};
