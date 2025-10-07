const pool = require("../config/db");
exports.create = async (req, res) => {
  try {
    const { name, description, category, price } = req.body;
    if (!name || price == null)
      return res.status(400).json({ error: "name and price required" });
    console.log("req.user:", req.user);
    const q = await pool.query(
      `INSERT INTO services (name,description,category,price,provider_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description || null, category || null, price, req.user.id]
    );
    res.status(201).json({ service: q.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to create service" });
  }
};
exports.list = async (_req, res) => {
  try {
    const q = await pool.query(
      `SELECT s.*, u.name as provider_name FROM services s JOIN users u ON u.id=s.provider_id ORDER BY s.created_at DESC`
    );
    res.json({ services: q.rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list services" });
  }
};
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, active } = req.body;
    const q = await pool.query(
      `UPDATE services SET name=COALESCE($2,name), description=COALESCE($3,description), category=COALESCE($4,category), price=COALESCE($5,price), active=COALESCE($6,active), updated_at=NOW() WHERE id=$1 AND provider_id=$7 RETURNING *`,
      [id, name, description, category, price, active, req.user.id]
    );
    if (!q.rows[0])
      return res.status(404).json({ error: "Not found or not owner" });
    res.json({ service: q.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to update service" });
  }
};
exports.remove = async (req, res) => {
  try {
    const q = await pool.query(
      `DELETE FROM services WHERE id=$1 AND provider_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!q.rows[0])
      return res.status(404).json({ error: "Not found or not owner" });
    res.json({ deleted: q.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete service" });
  }
};
