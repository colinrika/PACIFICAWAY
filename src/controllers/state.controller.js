const pool = require("../config/db");

const uuidPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const mapState = (row) => ({
  id: row.id,
  name: row.name,
  code: row.code,
  countryId: row.country_id,
  country: row.country_name
    ? {
        id: row.country_id,
        name: row.country_name,
        isoCode: row.country_iso_code,
      }
    : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

exports.list = async (req, res) => {
  try {
    const { countryId, countryIso } = req.query;
    const conditions = [];
    const values = [];

    if (countryId) {
      if (!uuidPattern.test(countryId)) {
        return res.status(400).json({ error: "countryId must be a valid UUID" });
      }
      values.push(countryId);
      conditions.push(`s.country_id = $${values.length}`);
    }

    if (countryIso) {
      if (typeof countryIso !== "string" || countryIso.trim().length !== 2) {
        return res
          .status(400)
          .json({ error: "countryIso must be a 2 character ISO code" });
      }
      values.push(countryIso.trim().toUpperCase());
      conditions.push(`UPPER(c.iso_code) = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const q = await pool.query(
      `SELECT
         s.id,
         s.name,
         s.code,
         s.country_id,
         s.created_at,
         s.updated_at,
         c.name AS country_name,
         c.iso_code AS country_iso_code
       FROM states s
       JOIN countries c ON c.id = s.country_id
       ${whereClause}
       ORDER BY c.name ASC, s.name ASC`,
      values
    );

    res.json({ states: q.rows.map(mapState) });
  } catch (e) {
    res.status(500).json({ error: "Failed to list states" });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, countryId, countryIso } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedCode = typeof code === "string" ? code.trim().toUpperCase() : "";

    if (!trimmedName) {
      return res.status(400).json({ error: "name is required" });
    }

    let resolvedCountryId = null;
    if (countryId && typeof countryId === "string" && countryId.trim()) {
      const normalized = countryId.trim();
      if (!uuidPattern.test(normalized)) {
        return res.status(400).json({ error: "countryId must be a valid UUID" });
      }
      resolvedCountryId = normalized;
    } else if (countryIso && typeof countryIso === "string") {
      const normalizedIso = countryIso.trim().toUpperCase();
      if (normalizedIso.length !== 2) {
        return res
          .status(400)
          .json({ error: "countryIso must be a 2 character ISO code" });
      }
      const countryLookup = await pool.query(
        "SELECT id FROM countries WHERE iso_code = $1",
        [normalizedIso]
      );
      if (!countryLookup.rows[0]) {
        return res.status(400).json({ error: "countryIso not found" });
      }
      resolvedCountryId = countryLookup.rows[0].id;
    } else {
      return res.status(400).json({ error: "countryId or countryIso is required" });
    }

    if (trimmedCode && trimmedCode.length > 10) {
      return res
        .status(400)
        .json({ error: "code must be 10 characters or fewer" });
    }

    const q = await pool.query(
      `WITH inserted AS (
         INSERT INTO states (name, code, country_id)
         VALUES ($1, NULLIF($2, ''), $3)
         RETURNING id, name, code, country_id, created_at, updated_at
       )
       SELECT i.id,
              i.name,
              i.code,
              i.country_id,
              i.created_at,
              i.updated_at,
              c.name AS country_name,
              c.iso_code AS country_iso_code
       FROM inserted i
       JOIN countries c ON c.id = i.country_id`,
      [trimmedName, trimmedCode, resolvedCountryId]
    );

    res.status(201).json({ state: mapState(q.rows[0]) });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "State already exists for country" });
    }
    res.status(500).json({ error: "Failed to create state" });
  }
};
