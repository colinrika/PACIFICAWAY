const pool = require("../config/db");
const { ensureMarketplaceSchema } = require("../utils/schema");

exports.create = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { service_id: serviceId, date, notes } = req.body;
    if (!serviceId || !date) {
      return res
        .status(400)
        .json({ error: "service_id and date required" });
    }

    const q = await pool.query(
      `INSERT INTO bookings (service_id, customer_id, date, notes, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [serviceId, req.user.id, date, notes ?? null]
    );
    res.status(201).json({ booking: q.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to create booking" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const { id } = req.params;
    const { status } = req.body;
    const allowed = new Set(["pending", "confirmed", "cancelled", "completed"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const q = await pool.query(
      `UPDATE bookings
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );
    if (!q.rows[0]) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ booking: q.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "Failed to update booking" });
  }
};

exports.listMine = async (req, res) => {
  try {
    await ensureMarketplaceSchema();
    const q = await pool.query(
      `SELECT b.*, s.name as service_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: q.rows });
  } catch (e) {
    res.status(500).json({ error: "Failed to list bookings" });
  }
};
