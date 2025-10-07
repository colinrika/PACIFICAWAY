const pool = require("../config/db");

const mapCountry = (row) => ({
  id: row.id,
  name: row.name,
  isoCode: row.iso_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

exports.list = async (_req, res) => {
  try {
    const q = await pool.query(
      `SELECT id, name, iso_code, created_at, updated_at FROM countries ORDER BY name ASC`
    );
    res.json({ countries: q.rows.map(mapCountry) });
  } catch (e) {
    res.status(500).json({ error: "Failed to list countries" });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, isoCode } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const normalizedIso =
      typeof isoCode === "string" && isoCode.trim()
        ? isoCode.trim().toUpperCase()
        : null;

    if (!trimmedName) {
      return res.status(400).json({ error: "name is required" });
    }

    if (normalizedIso && normalizedIso.length !== 2) {
      return res.status(400).json({ error: "isoCode must be 2 characters" });
    }

    const q = await pool.query(
      `INSERT INTO countries (name, iso_code) VALUES ($1, $2)
       RETURNING id, name, iso_code, created_at, updated_at`,
      [trimmedName, normalizedIso]
    );

    res.status(201).json({ country: mapCountry(q.rows[0]) });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Country already exists" });
    }
    res.status(500).json({ error: "Failed to create country" });
  }
};
