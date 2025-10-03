const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/tokens");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields required" });
    }

    const hashed = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashed, role]
    );

    const token = signToken({ id: result.rows[0].id, role });
    res.status(201).json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: user.id, role: user.role });
    res.json({ token });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
};

exports.logout = async (req, res) => {
  res.json({ message: "Logged out (delete token on client)" });
};
