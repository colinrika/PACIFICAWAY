const express = require("express");
const router = express.Router();
const svc = require("../controllers/service.controller");
const { requireAuth } = require("../middleware/auth");
router.get("/", svc.list);
router.post("/", requireAuth, svc.create);
router.patch("/:id", requireAuth, svc.update);
router.delete("/:id", requireAuth, svc.remove);
module.exports = router;
