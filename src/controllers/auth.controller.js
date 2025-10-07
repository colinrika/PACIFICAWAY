const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/tokens");

const buildFullName = (firstName, lastName, fallbackName) => {
  const safeFirst = typeof firstName === "string" ? firstName.trim() : "";
  const safeLast = typeof lastName === "string" ? lastName.trim() : "";
  if (safeFirst || safeLast) {
    return [safeFirst, safeLast].filter(Boolean).join(" ");
  }
  return typeof fallbackName === "string" ? fallbackName.trim() : "";
};

const splitName = (name) => {
  if (typeof name !== "string") {
    return { firstName: null, lastName: null };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  const [first, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: first || null,
    lastName: rest.length ? rest.join(" ") : null,
  };
};

exports.register = async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role } = req.body;
    const fullName = buildFullName(firstName, lastName, name);

    if (!fullName || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: "firstName (or name), email, password, role are required" });
    }

    const hashed = await hashPassword(password);
    const q = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,status,created_at`,
      [fullName, email, hashed, role]
    );

    const user = q.rows[0];
    const { firstName: userFirstName, lastName: userLastName } = splitName(user.name);
    const token = signToken({ id: user.id, role: user.role, email: user.email });

    res.status(201).json({
      user: {
        ...user,
        firstName: userFirstName,
        lastName: userLastName,
      },
      token,
    });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
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
    res.status(500).json({ error: "Login failed" });
  }
};

exports.logout = async (_req, res) => {
  res.json({ message: "Logged out (client should discard token)" });
};
