const express = require("express");
const router = express.Router();
const categories = require("../controllers/category.controller");
const { requireAuth } = require("../middleware/auth");

router.get("/", categories.list);
router.post("/", requireAuth, categories.create);
router.patch("/:id", requireAuth, categories.update);
router.delete("/:id", requireAuth, categories.remove);

module.exports = router;
