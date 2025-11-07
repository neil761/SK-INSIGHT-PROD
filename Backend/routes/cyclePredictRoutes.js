const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/cyclePredictController");

router.post("/", ctrl.getOrCreatePrediction);
router.get("/", ctrl.getAllPredictions);

module.exports = router;