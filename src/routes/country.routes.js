const express = require("express");
const router = express.Router();
const countries = require("../controllers/country.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", countries.list);
router.post("/", requireAuth, requireRole("admin"), countries.create);

module.exports = router;
