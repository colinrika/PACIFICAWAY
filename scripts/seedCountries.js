#!/usr/bin/env node
require("dotenv").config();

const fs = require("fs");
const path = require("path");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to seed countries");
  process.exit(1);
}

const pool = require("../src/config/db");

const CSV_FILE = path.join(__dirname, "../sql/data/countries.csv");

const splitCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsv = (content) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ? values[index].trim() : "";
      return acc;
    }, {});
  });
};

(async () => {
  const fileContent = fs.readFileSync(CSV_FILE, "utf8");
  const rows = parseCsv(fileContent.replace(/^﻿/, ""));

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
