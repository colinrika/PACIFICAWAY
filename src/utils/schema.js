const pool = require("../config/db");

let ensureMarketplacePromise;

const ensureCategoriesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      description text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'service_categories'
      ) THEN
        EXECUTE $$
          INSERT INTO categories (id, name, description, created_at, updated_at)
          SELECT
            id,
            name,
            NULL,
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
          FROM service_categories
          ON CONFLICT (id) DO NOTHING
        $$;
      END IF;
    END
    $$;
  `);
};

const ensureServicesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid()
    )
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS services
      ADD COLUMN IF NOT EXISTS provider_id uuid,
      ADD COLUMN IF NOT EXISTS category_id uuid,
      ADD COLUMN IF NOT EXISTS title text,
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS price numeric(12,2),
      ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'services'
          AND column_name = 'name'
      ) THEN
        EXECUTE $$UPDATE services
                 SET title = COALESCE(title, name)
                 WHERE title IS NULL AND name IS NOT NULL$$;
      END IF;
    END
    $$;
  `);

  await pool.query(
    "ALTER TABLE IF EXISTS services DROP COLUMN IF EXISTS name"
  );

  await pool.query(
    "UPDATE services SET active = true WHERE active IS NULL"
  );
  await pool.query(
    "UPDATE services SET created_at = NOW() WHERE created_at IS NULL"
  );
  await pool.query(
    "UPDATE services SET updated_at = NOW() WHERE updated_at IS NULL"
  );

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id)"
  );

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'services_category_id_fkey'
          AND conrelid = 'services'::regclass
      ) THEN
        ALTER TABLE services DROP CONSTRAINT services_category_id_fkey;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    ALTER TABLE services
      ADD CONSTRAINT services_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES categories(id)
      ON DELETE SET NULL
  `);
};

const ensureItemsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid()
    )
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS items
      ADD COLUMN IF NOT EXISTS provider_id uuid,
      ADD COLUMN IF NOT EXISTS name text,
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS price numeric(12,2),
      ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()
  `);

  await pool.query("UPDATE items SET stock = 0 WHERE stock IS NULL");
  await pool.query("UPDATE items SET active = true WHERE active IS NULL");
  await pool.query(
    "UPDATE items SET created_at = NOW() WHERE created_at IS NULL"
  );
  await pool.query(
    "UPDATE items SET updated_at = NOW() WHERE updated_at IS NULL"
  );

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_items_provider ON items(provider_id)"
  );
};

const ensureBookingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid()
    )
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS bookings
      ADD COLUMN IF NOT EXISTS service_id uuid,
      ADD COLUMN IF NOT EXISTS customer_id uuid,
      ADD COLUMN IF NOT EXISTS date timestamp,
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS notes text,
      ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()
  `);

  await pool.query(
    "UPDATE bookings SET status = 'pending' WHERE status IS NULL"
  );
  await pool.query(
    "UPDATE bookings SET created_at = NOW() WHERE created_at IS NULL"
  );
  await pool.query(
    "UPDATE bookings SET updated_at = NOW() WHERE updated_at IS NULL"
  );

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id)"
  );
};

async function ensurePgcryptoExtension() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  } catch (error) {
    if (error.code !== "42501" && error.code !== "58P01") {
      throw error;
    }
  }
}

async function runEnsureMarketplaceSchema() {
  await ensurePgcryptoExtension();
  await ensureCategoriesTable();
  await ensureServicesTable();
  await ensureItemsTable();
  await ensureBookingsTable();
}

async function ensureMarketplaceSchema() {
  if (!ensureMarketplacePromise) {
    ensureMarketplacePromise = runEnsureMarketplaceSchema().catch((error) => {
      ensureMarketplacePromise = undefined;
      throw error;
    });
  }
  return ensureMarketplacePromise;
}

module.exports = { ensureMarketplaceSchema };
