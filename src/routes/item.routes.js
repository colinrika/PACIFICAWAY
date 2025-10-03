const express = require("express");
const router = express.Router();
const items = require("../controllers/item.controller");
const { requireAuth } = require("../middleware/auth");
router.get("/", items.list);
router.post("/", requireAuth, items.create);
router.patch("/:id", requireAuth, items.update);
router.delete("/:id", requireAuth, items.remove);
module.exports = router;
