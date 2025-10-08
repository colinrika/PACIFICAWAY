const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("PACIFICAWAY API is running 🚀"));

app.get("/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ status: "ok", time: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ status: "db_error", error: e.message });
  }
});

app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/user.routes"));
app.use("/services", require("./routes/service.routes"));
app.use("/items", require("./routes/item.routes"));
app.use("/bookings", require("./routes/booking.routes"));
app.use("/countries", require("./routes/country.routes"));
app.use("/states", require("./routes/state.routes"));
app.use("/cities", require("./routes/city.routes"));

module.exports = app;
