const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/formCycleController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// PUT /api/formcycle/toggle
router.put("/toggle", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const { formName } = req.body;

    if (!formName)
      return res.status(400).json({ error: "formName is required" });

    // Find the most recent cycle for the form
    const lastCycle = await FormCycle.findOne({ formName }).sort({
      cycleNumber: -1,
    });

    // Close current open form if it exists
    if (lastCycle && lastCycle.isOpen) {
      lastCycle.isOpen = false;
      await lastCycle.save();
      return res.json({ message: "Form closed", cycleId: lastCycle._id });
    }

    // Open new cycle
    const newCycle = new FormCycle({
      formName,
      cycleNumber: lastCycle ? lastCycle.cycleNumber + 1 : 1,
      year: new Date().getFullYear(),
      isOpen: true,
    });

    await newCycle.save();

    // Update or create FormStatus for this form
    const FormStatus = require("../models/FormStatus");
    let formStatus = await FormStatus.findOne({ formName });
    if (!formStatus) {
      formStatus = new FormStatus({
        formName,
        isOpen: true,
        cycleId: newCycle._id,
      });
    } else {
      formStatus.isOpen = true;
      formStatus.cycleId = newCycle._id;
    }
    await formStatus.save();

    res.json({
      message: `Form ${formName} is now OPEN (Cycle ${newCycle.cycleNumber})`,
      cycleId: newCycle._id,
    });
  } catch (err) {
    console.error("Cycle toggle error:", err);
    res.status(500).json({ error: "Failed to toggle form cycle" });
  }
});

router.get("/kk", protect, authorizeRoles("admin"), ctrl.getKkCycles);
router.get("/lgbtq", protect, authorizeRoles("admin"), ctrl.getLgbtqCycles);
router.get("/educ", protect, authorizeRoles("admin"), ctrl.getEducCycles);

module.exports = router;
