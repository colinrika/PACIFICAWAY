const pool = require("../config/db");
const { formatUserRow } = require("../utils/users");

const baseUserQuery = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    u.created_at,
    u.updated_at,
    u.phone_number,
    u.country_id,
    c.name AS country_name,
    c.iso_code AS country_iso_code
  FROM users u
  LEFT JOIN countries c ON c.id = u.country_id
`;

exports.me = async (req, res) => {
  try {
    const q = await pool.query(`${baseUserQuery} WHERE u.id = $1`, [req.user.id]);
    res.json({ user: formatUserRow(q.rows[0]) });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

exports.list = async (_req, res) => {
  try {
    const q = await pool.query(`${baseUserQuery} ORDER BY u.created_at DESC`);
    res.json({ users: q.rows.map(formatUserRow) });
  } catch (e) {
    res.status(500).json({ error: "Failed to list users" });
  }
};

exports.getById = async (req, res) => {
  try {
    const q = await pool.query(`${baseUserQuery} WHERE u.id = $1`, [req.params.id]);
    if (!q.rows[0]) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json({ user: formatUserRow(q.rows[0]) });
  } catch (e) {
    res.status(500).json({ error: "Failed to get user" });
  }
};
