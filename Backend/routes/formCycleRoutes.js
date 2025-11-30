const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/formCycleController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const FormCycle = require("../models/FormCycle");
const FormStatus = require("../models/FormStatus");
const Announcement = require("../models/Announcement");

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

      // Create a public announcement about the form being closed (follow Educational Assistance pattern)
      try {
        const title = `${formName} Closed`;
        const content = `${formName} (Cycle ${lastCycle.cycleNumber}, ${lastCycle.year})`;
        const expiresAt = null; // keep announcement permanent (no expiry)
        const createdBy = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : null;
        // Use future eventDate so it stays in General tab and doesn't expire immediately
        const eventDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
        const ann = await Announcement.create({
          title,
          content,
          category: formName === 'Educational Assistance' ? 'Educational Assistance' : 'Other',
          eventDate,
          expiresAt,
          createdBy,
          recipient: null,
          isPinned: false,
          isActive: true,
          viewedBy: [],
        });
        // Emit announcement created event for realtime clients
        try {
          const io2 = req.app && req.app.get && req.app.get('io');
          if (io2) io2.emit('announcement:created', { id: ann._id, category: ann.category });
        } catch (ee) {/* ignore */}
      } catch (annErr) {
        console.error('Failed to create form-close announcement:', annErr);
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

    // Create a public announcement about the form being opened (follow Educational Assistance pattern)
    try {
      const title = `${formName} Opened`;
      const content = `${formName} (Cycle ${newCycle.cycleNumber}, ${newCycle.year}) has been opened by ${req.user ? (req.user.email || req.user.name || 'an administrator') : 'an administrator'}. Applicants may now submit.`;
      const expiresAt = null; // keep announcement permanent (no expiry)
      const createdBy = (req.user && (req.user.id || req.user._id)) ? (req.user.id || req.user._id) : null;
      // Use future eventDate so it stays in General tab and doesn't expire immediately
      const eventDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
      const annOpen = await Announcement.create({
        title,
        content,
        category: formName === 'Educational Assistance' ? 'Educational Assistance' : 'Other',
        eventDate,
        expiresAt,
        createdBy,
        recipient: null,
        isPinned: false,
        isActive: true,
        viewedBy: [],
      });
      try {
        const io3 = req.app && req.app.get && req.app.get('io');
        if (io3) io3.emit('announcement:created', { id: annOpen._id, category: annOpen.category });
      } catch (ee) {/* ignore */}
    } catch (annErr) {
      console.error('Failed to create form-open announcement:', annErr);
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
