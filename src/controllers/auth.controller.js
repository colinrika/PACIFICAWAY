const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/tokens");
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res
        .status(400)
        .json({ error: "name, email, password, role are required" });
    const hashed = await hashPassword(password);
    const q = await pool.query(
      `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,status,created_at`,
      [name, email, hashed, role]
    );
    const user = q.rows[0];
    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });
    res.status(201).json({ user, token });
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    res.status(500).json({ error: "Registration failed" });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });
    const q = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user = q.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });
    res.json({ token });
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
};
exports.logout = async (_req, res) => {
  res.json({ message: "Logged out (client should discard token)" });
};
