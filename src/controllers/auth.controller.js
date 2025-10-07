const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/tokens");
const { resolveName } = require("../utils/names");
const { formatUserRow } = require("../utils/users");

exports.register = async (req, res) => {
  try {
    const {
      name,
      firstName,
      lastName,
      email,
      password,
      role,
      countryId,
      phone,
      phoneNumber,
    } = req.body;
    const safeName = resolveName(name, firstName, lastName);

    // Combine first/last name if needed
    const safeName = resolveName(name, firstName, lastName);

    // Normalize phone number
    const safePhone = (() => {
      const source =
        typeof phoneNumber === "string" && phoneNumber.trim()
          ? phoneNumber
          : phone;
      return typeof source === "string" && source.trim()
        ? source.trim()
        : null;
    })();
    let safeCountryId = null;
    if (typeof countryId === "string" && countryId.trim()) {
      const trimmedCountryId = countryId.trim();
      const uuidPattern =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!uuidPattern.test(trimmedCountryId)) {

    // Validate countryId
    let safeCountryId = null;
    if (typeof countryId === "string" && countryId.trim()) {
      const trimmed = countryId.trim();
      const uuidPattern =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!uuidPattern.test(trimmed)) {
        return res
          .status(400)
          .json({ error: "countryId must be a valid UUID" });
      }
      safeCountryId = trimmedCountryId;
    }

    if (!safeName || !email || !password || !role) {
      return res
        .status(400)
        .json({
          error: "A name (or firstName/lastName), email, password, and role are required",
        });
    }

    if (safeCountryId) {
      safeCountryId = trimmed;
      const countryCheck = await pool.query(
        `SELECT id FROM countries WHERE id=$1`,
        [safeCountryId]
      );
      if (!countryCheck.rows[0]) {
        return res.status(400).json({ error: "countryId not found" });
      }
    }

    const hashed = await hashPassword(password);
    const q = await pool.query(
      `INSERT INTO users (name,email,password_hash,role,phone_number,country_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,name,email,role,status,created_at,updated_at,phone_number,country_id`,
      [safeName, email, hashed, role, safePhone, safeCountryId]
    );

    const user = formatUserRow(q.rows[0]);
    // Required fields
    if (!safeName || !email || !password || !role) {
      return res.status(400).json({
        error:
          "A name (or firstName/lastName), email, password, and role are required",
      });
    }

    // Hash and insert
    const hashed = await hashPassword(password);
    const q = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone_number, country_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, email, role, status, created_at, updated_at, phone_number, country_id`,
      [safeName, email, hashed, role, safePhone, safeCountryId]
    );

    const user = formatUserRow ? formatUserRow(q.rows[0]) : q.rows[0];
    const token = signToken({ id: user.id, role: user.role, email: user.email });

    res.status(201).json({ user, token });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Registration error:", e);
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const q = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = q.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.json({ token });
  } catch (e) {

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.json({ token });
  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Login failed" });
  }
};

exports.logout = async (_req, res) => {
exports.logout = (_req, res) => {
  res.json({ message: "Logged out (client should discard token)" });
};
