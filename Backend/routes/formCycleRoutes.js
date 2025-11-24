const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/formCycleController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");

// PUT /api/formcycle/toggle
router.put("/toggle", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const { formName } = req.body;
    if (!formName) return res.status(400).json({ error: "formName is required" });

    const currentYear = new Date().getFullYear();

    // Find last cycle
    const lastCycle = await FormCycle.findOne({ formName }).sort({ cycleNumber: -1 });

    const now = new Date();

    // If open -> close it and record history
    if (lastCycle && lastCycle.isOpen) {
      lastCycle.isOpen = false;
      lastCycle.history = lastCycle.history || [];
      lastCycle.history.push({
        action: "close",
        actor: req.user ? req.user._id : null,
        actorName: req.user ? (req.user.name || req.user.email || "") : "",
        at: now
      });
      await lastCycle.save();

      // Update FormStatus
      let formStatus = await FormStatus.findOne({ formName });
      if (!formStatus) {
        formStatus = new FormStatus({ formName, isOpen: false, cycleId: lastCycle._id });
      } else {
        formStatus.isOpen = false;
        formStatus.cycleId = lastCycle._id;
      }
      await formStatus.save();

      // Emit realtime notification if io is attached to app
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io) {
          io.emit('formcycle:changed', {
            action: 'close',
            formName,
            cycleNumber: lastCycle.cycleNumber,
            year: lastCycle.year,
            actorName: req.user ? (req.user.email || req.user.name || "") : null,
            at: now
          });
        }
      } catch (e) {
        console.warn('Socket emit failed:', e);
      }

      return res.json({ message: "Form closed", cycleId: lastCycle._id });
    }

    // Open new cycle (no per-year limit)
    const newCycle = new FormCycle({
      formName,
      cycleNumber: lastCycle ? lastCycle.cycleNumber + 1 : 1,
      year: currentYear,
      isOpen: true,
      history: []
    });

    // record open event
    newCycle.history.push({
      action: "open",
      actor: req.user ? req.user._id : null,
      actorName: req.user ? (req.user.name || req.user.email || "") : "",
      at: now
    });

    await newCycle.save();

    // Update or create FormStatus
    let formStatus = await FormStatus.findOne({ formName });
    if (!formStatus) {
      formStatus = new FormStatus({ formName, isOpen: true, cycleId: newCycle._id });
    } else {
      formStatus.isOpen = true;
      formStatus.cycleId = newCycle._id;
    }
    await formStatus.save();

    // Emit realtime notification if io is attached to app
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io) {
        io.emit('formcycle:changed', {
          action: 'open',
          formName,
          cycleNumber: newCycle.cycleNumber,
          year: newCycle.year,
          actorName: req.user ? (req.user.email || req.user.name || "") : null,
          at: now
        });
      }
    } catch (e) {
      console.warn('Socket emit failed:', e);
    }

    res.json({
      message: `Form ${formName} is now OPEN (Cycle ${newCycle.cycleNumber})`,
      cycleId: newCycle._id,
    });
  } catch (err) {
    console.error("Cycle toggle error:", err);
    res.status(500).json({ error: "Failed to toggle form cycle" });
  }
});

// GET /api/formcycle/history?formName=...
router.get("/history", ctrl.getFormHistory);

router.get('/latest-kk', ctrl.getLatestKkCycle);
router.get('/latest-lgbtq', ctrl.getLatestLgbtqCycle);
router.get('/latest-educ', ctrl.getLatestEducCycle);
router.get("/kk", protect, authorizeRoles("admin"), ctrl.getKkCycles);
router.get("/lgbtq", protect, authorizeRoles("admin"), ctrl.getLgbtqCycles);
router.get("/educ", protect, authorizeRoles("admin"), ctrl.getEducCycles);
router.get("/status", ctrl.getFormStatus);

module.exports = router;
