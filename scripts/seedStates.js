#!/usr/bin/env node
require("dotenv").config();

const path = require("path");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed states");
  process.exit(1);
}

const pool = require("../src/config/db");
const { parseCsv } = require("./utils/csv");
const { createCountryFinder } = require("./utils/locations");

const CSV_FILE = path.join(__dirname, "../sql/data/states.csv");

(async () => {
  const rows = parseCsv(CSV_FILE);

  if (!rows.length) {
    console.log("No states found in CSV. Nothing to seed.");
    process.exit(0);
  }

  const client = await pool.connect();
  const findCountryId = createCountryFinder(client);
  try {
    await client.query("BEGIN");
    const tableCheck = await client.query(
      "SELECT to_regclass('public.states') AS identifier"
    );

    if (!tableCheck.rows[0] || !tableCheck.rows[0].identifier) {
      throw new Error("states table does not exist. Run migrations first.");
    }

    let processed = 0;
    for (const row of rows) {
      const stateName = row.state_name || row.name;
      const stateCode = row.state_code ? row.state_code.trim() : "";
      const isoCode = row.country_iso_code || row.iso_code;
      const countryName = row.country_name || "";

      if (!stateName || !stateName.trim()) {
        continue;
      }

      if (stateCode && stateCode.length > 10) {
        throw new Error(
          `State code for "${stateName}" is too long (max 10 characters)`
        );
      }

      const countryId = await findCountryId(isoCode, countryName);

      await client.query(
        `INSERT INTO states (name, code, country_id)
         VALUES ($1, NULLIF($2, ''), $3)
         ON CONFLICT (country_id, name)
         DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()`,
        [stateName.trim(), stateCode, countryId]
      );
      processed += 1;
    }

    await client.query("COMMIT");
    console.log(`Seeded ${processed} states.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed states", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
