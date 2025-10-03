const express = require("express");
const router = express.Router();
const b = require("../controllers/booking.controller");
const { requireAuth } = require("../middleware/auth");
router.post("/", requireAuth, b.create);
router.get("/me", requireAuth, b.listMine);
router.patch("/:id/status", requireAuth, b.updateStatus);
module.exports = router;
