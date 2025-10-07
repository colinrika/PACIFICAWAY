#!/usr/bin/env node
require("dotenv").config();

const path = require("path");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed cities");
  process.exit(1);
}

const pool = require("../src/config/db");
const { parseCsv } = require("./utils/csv");
const { createCountryFinder, createStateFinder } = require("./utils/locations");

const CSV_FILE = path.join(__dirname, "../sql/data/cities.csv");

(async () => {
  const rows = parseCsv(CSV_FILE);

  if (!rows.length) {
    console.log("No cities found in CSV. Nothing to seed.");
    process.exit(0);
  }

  const client = await pool.connect();
  const findCountryId = createCountryFinder(client);
  const findStateId = createStateFinder(client);

  try {
    await client.query("BEGIN");
    const tableCheck = await client.query(
      "SELECT to_regclass('public.cities') AS identifier"
    );

    if (!tableCheck.rows[0] || !tableCheck.rows[0].identifier) {
      throw new Error("cities table does not exist. Run migrations first.");
    }

    let processed = 0;
    for (const row of rows) {
      const cityName = row.city_name || row.name;
      const isoCode = row.country_iso_code || row.iso_code;
      const countryName = row.country_name || "";
      const stateCode = row.state_code || "";
      const stateName = row.state_name || "";

      if (!cityName || !cityName.trim()) {
        continue;
      }

      const countryId = await findCountryId(isoCode, countryName);
      let stateId = null;

      const hasStateInfo =
        (stateCode && stateCode.trim().length > 0) ||
        (stateName && stateName.trim().length > 0);

      if (hasStateInfo) {
        try {
          stateId = await findStateId(countryId, stateCode, stateName);
        } catch (stateError) {
          throw new Error(
            `Failed to resolve state for city "${cityName}": ${stateError.message}`
          );
        }
      }

      await client.query(
        `INSERT INTO cities (name, country_id, state_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (country_id, state_lookup, name)
         DO UPDATE SET state_id = EXCLUDED.state_id, updated_at = NOW()`,
        [cityName.trim(), countryId, stateId]
      );
      processed += 1;
    }

    await client.query("COMMIT");
    console.log(`Seeded ${processed} cities.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed cities", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
