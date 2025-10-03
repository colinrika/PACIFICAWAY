const express = require("express");
const router = express.Router();
const users = require("../controllers/user.controller");
const { requireAuth, requireRole } = require("../middleware/auth");
router.get("/me", requireAuth, users.me);
router.get("/", requireAuth, requireRole("admin"), users.list);
router.get("/:id", requireAuth, requireRole("admin"), users.getById);
module.exports = router;
