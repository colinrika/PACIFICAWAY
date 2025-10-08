const pool = require("../config/db");
exports.create = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    if (!name || price == null)
      return res.status(400).json({ error: "name and price required" });
    const q = await pool.query(
      `INSERT INTO items (name,description,price,stock,provider_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description || null, price, stock || 0, req.user.id]
    );
    res.status(201).json({ item: q.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to create item" });
  }
};
exports.list = async (_req, res) => {
  try {
    const q = await pool.query(
      `SELECT i.*, u.name as provider_name FROM items i JOIN users u ON u.id=i.provider_id ORDER BY i.created_at DESC`
    );
    res.json({ items: q.rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list items" });
  }
};
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, active } = req.body;
    const q = await pool.query(
      `UPDATE items SET name=COALESCE($2,name), description=COALESCE($3,description), price=COALESCE($4,price), stock=COALESCE($5,stock), active=COALESCE($6,active), updated_at=NOW() WHERE id=$1 AND provider_id=$7 RETURNING *`,
      [id, name, description, price, stock, active, req.user.id]
    );
    if (!q.rows[0])
      return res.status(404).json({ error: "Not found or not owner" });
    res.json({ item: q.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to update item" });
  }
};
exports.remove = async (req, res) => {
  try {
    const q = await pool.query(
      `DELETE FROM items WHERE id=$1 AND provider_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!q.rows[0])
      return res.status(404).json({ error: "Not found or not owner" });
    res.json({ deleted: q.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete item" });
  }
};
