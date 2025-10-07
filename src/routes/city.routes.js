const express = require("express");
const router = express.Router();
const cities = require("../controllers/city.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", cities.list);
router.post("/", requireAuth, requireRole("admin"), cities.create);

module.exports = router;
