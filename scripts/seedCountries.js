#!/usr/bin/env node
require("dotenv").config();

const path = require("path");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed countries");
  process.exit(1);
}

const pool = require("../src/config/db");
const { parseCsv } = require("./utils/csv");

const CSV_FILE = path.join(__dirname, "../sql/data/countries.csv");

(async () => {
  const rows = parseCsv(CSV_FILE);

  if (!rows.length) {
    console.log("No countries found in CSV. Nothing to seed.");
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tableCheck = await client.query(
      "SELECT to_regclass('public.countries') AS identifier"
    );

    if (!tableCheck.rows[0] || !tableCheck.rows[0].identifier) {
      throw new Error("countries table does not exist. Run migrations first.");
    }

    let processed = 0;
    for (const row of rows) {
      const name = row.name ? row.name.trim() : "";
      const iso = row.iso_code ? row.iso_code.trim().toUpperCase() : null;

      if (!name) {
        continue;
      }

      if (iso && iso.length !== 2) {
        throw new Error(`Invalid ISO code for country "${name}": ${iso}`);
      }

      try {
        await client.query(
          `INSERT INTO countries (name, iso_code)
           VALUES ($1, $2)
           ON CONFLICT (name)
           DO UPDATE SET iso_code = EXCLUDED.iso_code, updated_at = NOW()`,
          [name, iso || null]
        );
      } catch (error) {
        if (error.code === "23505" && error.constraint === "countries_iso_code_key" && iso) {
          await client.query(
            `UPDATE countries
             SET name = $1, updated_at = NOW()
             WHERE iso_code = $2`,
            [name, iso]
          );
        } else {
          throw error;
        }
      }
      processed += 1;
    }
    await client.query("COMMIT");
    console.log(`Seeded ${processed} countries.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to seed countries", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
