const pool = require("../config/db");

const uuidPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const mapCity = (row) => ({
  id: row.id,
  name: row.name,
  countryId: row.country_id,
  stateId: row.state_id,
  country: {
    id: row.country_id,
    name: row.country_name,
    isoCode: row.country_iso_code,
  },
  state: row.state_id
    ? {
        id: row.state_id,
        name: row.state_name,
        code: row.state_code,
      }
    : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

exports.list = async (req, res) => {
  try {
    const { countryId, countryIso, stateId } = req.query;
    const conditions = [];
    const values = [];

    if (countryId) {
      if (!uuidPattern.test(countryId)) {
        return res.status(400).json({ error: "countryId must be a valid UUID" });
      }
      values.push(countryId);
      conditions.push(`ci.country_id = $${values.length}`);
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

    if (stateId) {
      if (!uuidPattern.test(stateId)) {
        return res.status(400).json({ error: "stateId must be a valid UUID" });
      }
      values.push(stateId);
      conditions.push(`ci.state_id = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const q = await pool.query(
      `SELECT
         ci.id,
         ci.name,
         ci.country_id,
         ci.state_id,
         ci.created_at,
         ci.updated_at,
         c.name AS country_name,
         c.iso_code AS country_iso_code,
         s.name AS state_name,
         s.code AS state_code
       FROM cities ci
       JOIN countries c ON c.id = ci.country_id
       LEFT JOIN states s ON s.id = ci.state_id
       ${whereClause}
       ORDER BY c.name ASC, s.name NULLS FIRST, ci.name ASC`,
      values
    );

    res.json({ cities: q.rows.map(mapCity) });
  } catch (e) {
    res.status(500).json({ error: "Failed to list cities" });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, stateId, countryId, countryIso } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ error: "name is required" });
    }

    let resolvedStateId = null;
    let resolvedCountryId = null;

    if (stateId && typeof stateId === "string" && stateId.trim()) {
      const normalizedStateId = stateId.trim();
      if (!uuidPattern.test(normalizedStateId)) {
        return res.status(400).json({ error: "stateId must be a valid UUID" });
      }
      const stateLookup = await pool.query(
        `SELECT s.id, s.country_id, c.iso_code
         FROM states s
         JOIN countries c ON c.id = s.country_id
         WHERE s.id = $1`,
        [normalizedStateId]
      );
      if (!stateLookup.rows[0]) {
        return res.status(400).json({ error: "stateId not found" });
      }
      resolvedStateId = normalizedStateId;
      resolvedCountryId = stateLookup.rows[0].country_id;

      if (countryId && typeof countryId === "string" && countryId.trim()) {
        const normalizedCountryId = countryId.trim();
        if (!uuidPattern.test(normalizedCountryId)) {
          return res
            .status(400)
            .json({ error: "countryId must be a valid UUID" });
        }
        if (normalizedCountryId !== resolvedCountryId) {
          return res
            .status(400)
            .json({ error: "countryId does not match stateId" });
        }
      }

      if (countryIso && typeof countryIso === "string") {
        const normalizedIso = countryIso.trim().toUpperCase();
        if (normalizedIso.length !== 2) {
          return res
            .status(400)
            .json({ error: "countryIso must be a 2 character ISO code" });
        }
        if (normalizedIso !== stateLookup.rows[0].iso_code) {
          return res
            .status(400)
            .json({ error: "countryIso does not match stateId" });
        }
      }
    } else {
      let normalizedCountryId = null;
      if (countryId && typeof countryId === "string" && countryId.trim()) {
        normalizedCountryId = countryId.trim();
        if (!uuidPattern.test(normalizedCountryId)) {
          return res
            .status(400)
            .json({ error: "countryId must be a valid UUID" });
        }
      }

      if (!normalizedCountryId && countryIso && typeof countryIso === "string") {
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
        normalizedCountryId = countryLookup.rows[0].id;
      }

      if (!normalizedCountryId) {
        return res
          .status(400)
          .json({ error: "stateId or countryId/countryIso is required" });
      }

      resolvedCountryId = normalizedCountryId;
    }

    const q = await pool.query(
      `WITH inserted AS (
         INSERT INTO cities (name, country_id, state_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, country_id, state_id, created_at, updated_at
       )
       SELECT i.id,
              i.name,
              i.country_id,
              i.state_id,
              i.created_at,
              i.updated_at,
              c.name AS country_name,
              c.iso_code AS country_iso_code,
              s.name AS state_name,
              s.code AS state_code
       FROM inserted i
       JOIN countries c ON c.id = i.country_id
       LEFT JOIN states s ON s.id = i.state_id`,
      [trimmedName, resolvedCountryId, resolvedStateId]
    );

    res.status(201).json({ city: mapCity(q.rows[0]) });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "City already exists for location" });
    }
    res.status(500).json({ error: "Failed to create city" });
  }
};
