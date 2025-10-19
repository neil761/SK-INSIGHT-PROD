const express = require('express');
const router = express.Router();
const FormStatus = require('../models/FormStatus');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// PUT /api/formstatus/toggle
router.put('/toggle', protect, authorizeRoles('admin'), async (req, res) => {
  try {
    const { formName } = req.body;
    if (!formName) {
      return res.status(400).json({ error: 'formName is required' });
    }

    let form = await FormStatus.findOne({ formName });

    if (!form) {
      // Create form entry if it doesn't exist
      form = new FormStatus({
        formName,
        isOpen: true,
        cycleId: 1
      });
    } else {
      // Toggle status and increment cycle if opening
      form.isOpen = !form.isOpen;
      if (form.isOpen) form.cycleId += 1;
    }

    await form.save();

    res.json({
      message: `Form is now ${form.isOpen ? 'OPEN' : 'CLOSED'}`,
      cycleId: form.cycleId
    });
  } catch (error) {
    console.error('Form toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle form' });
  }
});

module.exports = router;
