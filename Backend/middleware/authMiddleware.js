const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// Middleware to protect routes (requires a valid token)
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for Authorization header and extract token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by decoded ID and exclude password
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Attach user to request
      req.user = user;

      // ✅ Only allow verified users — EXCEPT admins
      if (!user.isVerified && user.role !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Please verify your email to access this feature.' });
      }

      next(); // Proceed to route
    } catch (err) {
      console.error('Token error:', err);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // No token provided
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
});

// Middleware to restrict access by role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: `Access denied for role: ${req.user.role}` });
    }
    next();
  };
};

module.exports = {
  protect,
  authorizeRoles,
};
