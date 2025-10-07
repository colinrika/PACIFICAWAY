const express = require("express");
const router = express.Router();
const states = require("../controllers/state.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.get("/", states.list);
router.post("/", requireAuth, requireRole("admin"), states.create);

module.exports = router;
