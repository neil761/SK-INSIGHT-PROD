const User = require("../models/User");
  const { extractFromIDImage } = require("../utils/extractBirthday");
  const { normalizeDate } = require("../utils/dateUtils");
  const jwt = require("jsonwebtoken");
  const nodemailer = require("nodemailer");
  const path = require("path");
  const asyncHandler = require("express-async-handler");
  const fs = require("fs");
  const mailer = require("../utils/mailer");
  const KKProfile = require("../models/KKProfile");
const LGBTQProfile = require("../models/LGBTQProfile");
const EducationalAssistance = require("../models/EducationalAssistance");

  function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    // Adjust if birthday hasn't occurred yet this year
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  exports.createUser = async (req, res) => {
    try {
      const user = new User(req.body);
      await user.save();

      // Generate JWT
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({ user, token });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };

  // READ ALL
  exports.getUsers = async (req, res) => {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // controllers/userController.js
  exports.getUsers = async (req, res) => {
    try {
      // only fetch users where role is "user"
      const users = await User.find({ role: "user" }).select("-password");
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: "Server error" });
    }
  };


  // READ ONE
  exports.getUserById = async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });

      // Try to find related form documents for this user (if models exist)
      let kk = null, lgbtq = null, educ = null;
      try {
        kk = await KKProfile.findOne({ user: user._id }).select("_id");
      } catch (e) { /* ignore if model/collection missing */ }
      try {
        lgbtq = await LGBTQProfile.findOne({ user: user._id }).select("_id");
      } catch (e) { /* ignore if model/collection missing */ }
      try {
        educ = await EducationalAssistance.findOne({ user: user._id }).select("_id");
      } catch (e) { /* ignore if model/collection missing */ }

      return res.json({
        user,
        profiles: {
          kkProfileId: kk ? kk._id : null,
          lgbtqProfileId: lgbtq ? lgbtq._id : null,
          educationalProfileId: educ ? educ._id : null
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Server error" });
    }
  };

  // UPDATE
  exports.updateUser = async (req, res) => {
    try {
      const userIdToUpdate = req.params.id;
      const currentUserId = req.user._id.toString();
      const isAdmin = req.user.role === "admin";

      // Allow only admin or the user themselves
      if (!isAdmin && userIdToUpdate !== currentUserId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const user = await User.findById(userIdToUpdate);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Prevent normal users from updating protected fields
      if (!isAdmin) {
        delete req.body.role;
        delete req.body.isVerified;
      }

      // If admin is promoting someone to admin, auto-verify
      if (req.body.role === "admin" && user.role !== "admin") {
        req.body.isVerified = true;
      }

      // Update fields safely
      Object.assign(user, req.body);
      await user.save();

      const updatedUser = await User.findById(userIdToUpdate).select("-password");

      res.json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // DELETE
  exports.deleteUser = async (req, res) => {
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id);

      if (!deletedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // Get current user (for authenticated routes)
  exports.getCurrentUser = async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });

      // --- Age and accessLevel update logic ---
      if (user.birthday) {
        const today = new Date();
        const birthDate = new Date(user.birthday);
        let age = today.getFullYear() - birthDate.getFullYear();
        if (
          today.getMonth() < birthDate.getMonth() ||
          (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        if (user.age !== age) {
          user.age = age;
        }
        if (age > 30 && user.accessLevel !== "limited") {
          user.accessLevel = "limited";
        }
        await user.save();
      }
      // ----------------------------------------

      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };



exports.sendVerificationOtp = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const MAX_SENDS = 2;
  const WINDOW_MS = 2 * 60 * 1000;
  const now = Date.now();

  // --- Improved logging for OTP send count ---
  if (!user.emailVerificationOtpLastSent || now - user.emailVerificationOtpLastSent >= WINDOW_MS) {
    user.emailVerificationOtpSendCount = 1;
    console.log(`[VERIFICATION OTP LOG] Count reset to 1 (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
  } else {
    user.emailVerificationOtpSendCount = (user.emailVerificationOtpSendCount || 0) + 1;
    console.log(`[VERIFICATION OTP LOG] Count incremented to ${user.emailVerificationOtpSendCount} (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
  }

  // Restrict if count exceeds MAX_SENDS
  if (user.emailVerificationOtpSendCount > MAX_SENDS) {
    user.emailVerificationOtpLastSent = now; // update last sent for lockout
    await user.save();
    console.log(`[VERIFICATION OTP LOG] Restriction triggered at count ${user.emailVerificationOtpSendCount} (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
    return res.status(429).json({
      message: `Too many OTP requests. Please wait 2 minutes.`,
      secondsLeft: Math.ceil(WINDOW_MS / 1000),
    });
  }

  // Save last sent timestamp
  user.emailVerificationOtpLastSent = now;

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otpCode = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save();

  // Send email
  await mailer.sendMail({
    from: `"SK Insight" <${process.env.HOSTINGER_SMTP_USER}>`,
    to: user.email,
    subject: "Your OTP Code",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SK Insight OTP</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #f4f7fc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 10px; padding: 0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); text-align: center; overflow: hidden; }
          .header { background: #0A2C59; color: #fff; padding: 32px 0 16px 0; border-top-left-radius: 10px; border-top-right-radius: 10px; }
          .logo { max-width: 120px; margin-bottom: 12px; }
          h2 { color: #fff; margin-bottom: 10px; font-size: 2rem; font-weight: 700; }
          .content { padding: 32px 40px 24px 40px; }
          .otp { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0A2C59; margin: 24px 0; background: #eaf3fb; border-radius: 8px; display: inline-block; padding: 12px 32px; box-shadow: 0 2px 8px rgba(7,176,242,0.07); }
          p { color: #333; font-size: 16px; margin-bottom: 10px; }
          .footer { background: #0A2C59; color: #fff; font-size: 13px; padding: 18px 0; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img class="logo" src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" />
            <h2>Your OTP Code</h2>
          </div>
          <div class="content">
            <p>Use the following code to verify your email. It is valid for 10 minutes.</p>
            <div class="otp">${otp}</div>
            <p>If you didn’t request this, please ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
  });

  console.log(`[VERIFICATION OTP LOG] OTP sent, count is now ${user.emailVerificationOtpSendCount} (last sent: ${user.emailVerificationOtpLastSent}, now: ${now})`);
  res.json({ message: "OTP sent to your email." });
};



exports.verifyEmailOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    if (user.otpLockedUntil && user.otpLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.otpLockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    if (user.otpCode === otp && user.otpExpires && user.otpExpires > Date.now()) {
      user.isVerified = true;
      user.otpCode = undefined;
      user.otpExpires = undefined;
      user.otpAttempts = 0;
      user.otpLockedUntil = undefined;
      await user.save();
      return res.json({ message: "Email successfully verified." });
    } else {
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      if (user.otpAttempts >= 5) {
        user.otpLockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
        user.otpAttempts = 0;
      }

      await user.save();
      return res.status(400).json({
        message: "Invalid or expired OTP.",
        attemptsLeft: Math.max(0, 5 - user.otpAttempts),
      });
    }
  });


  // POST /api/users/smart-register
  exports.smartRegister = async (req, res) => {
    try {
      if (!req.file || !req.file.path) {
        return res.status(400).json({ message: "No ID image uploaded." });
      }

      const { username, email, password, birthday } = req.body;
      const idImagePath = req.file.path;

      // Validate input birthday format
      const normalizedInputBirthday = normalizeDate(birthday);
      if (!normalizedInputBirthday) {
        return res.status(400).json({
          message: "Please enter a valid birthday in YYYY-MM-DD format.",
          code: "birthday_invalid"
        });
      }

      // OCR extraction
      const { birthday: ocrBirthday, address: ocrAddress } =
        await extractFromIDImage(idImagePath);

      // Log extracted birthday and address
      console.log("Extracted birthday (controller):", ocrBirthday);
      console.log("Extracted address (controller):", ocrAddress);

      // Require birthday match
      if (!ocrBirthday || ocrBirthday !== normalizedInputBirthday) {
        return res.status(400).json({
          message: "Birthday on ID does not match the input birthday.",
          code: "birthday_mismatch"
        });
      }

      // Address validation (accept "CALACA" or "CALACA CITY", any case)
      const addressValid =
        ocrAddress &&
        /puting bato west/i.test(ocrAddress) &&
        /(calaca|calaca city)/i.test(ocrAddress) &&
        /batangas/i.test(ocrAddress);

      if (!addressValid) {
        return res.status(400).json({
          message: "Address must be Puting Bato West, Calaca City, Batangas.",
          code: "address_invalid"
        });
      }

      // Calculate precise age
      const computedAge = calculateAge(ocrBirthday);

      // Enforce age restriction (15-30)
      if (computedAge < 15 || computedAge > 30) {
        return res.status(400).json({
          message: "Registration is only allowed for ages 15 to 30.",
          code: "age_invalid"
        });
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail)
        return res.status(400).json({ message: "Email already in use", code: "email_exists" });

      // Check if username already exists
      const existingUsername = await User.findOne({ username });
      if (existingUsername)
        return res.status(400).json({ message: "Username already in use", code: "username_exists" });

      // Clean up the extracted address before saving
      let cleanedAddress = ocrAddress
        ? ocrAddress.replace(/\s*\([^)]+\)\s*$/, "").trim()
        : ocrAddress;

      // Create and save new user with accessLevel
      const user = new User({
        username,
        email,
        password,
        birthday: ocrBirthday,
        verifiedAddress: cleanedAddress,
        accessLevel: "full",
        idImage: path.basename(idImagePath),
      });
      await user.save();

      // Calculate and set user age
      user.age = calculateAge(ocrBirthday);
      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "Smart registration successful",
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          verifiedAddress: user.verifiedAddress,
          accessLevel: user.accessLevel,
        },
        token,
      });
    } catch (err) {
      console.error("Smart registration error:", err);
      res.status(500).json({ message: "Server error during registration.", code: "server_error" });
    }
  };

  // POST /api/users/change-password
  exports.changePassword = async (req, res) => {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

      user.password = newPassword;
      await user.save();
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  };

  // POST /api/users/change-email/send-otp
exports.sendChangeEmailOtp = async (req, res) => {
  console.log("sendChangeEmailOtp called", {
    url: req.originalUrl,
    method: req.method,
    headers: {
      authorization: req.headers.authorization
    },
    body: req.body
  });

  try {
    // ensure auth middleware populated req.user
    if (!req.user || !req.user._id) {
      console.error("sendChangeEmailOtp: missing req.user");
      return res.status(401).json({ message: "Unauthorized: missing user" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      console.error("sendChangeEmailOtp: user not found", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.email) {
      console.error("sendChangeEmailOtp: user has no email", user._id);
      return res.status(400).json({ message: "No email on user account" });
    }

    // Check lockout
    if (user.emailChangeOtpLockedUntil && user.emailChangeOtpLockedUntil > Date.now()) {
      const unlockAt = user.emailChangeOtpLockedUntil;
      const secondsLeft = Math.ceil((unlockAt - Date.now()) / 1000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${Math.ceil(secondsLeft / 60)} minutes.`,
        unlockAt,
        secondsLeft
      });
    }

    const MAX_SENDS = 2;
    const LOCKOUT_MS = 2 * 60 * 1000; // 2 minutes
    const now = Date.now();

    // --- Improved logic: reset count if last send was >= 2 minutes ago ---
    if (!user.emailChangeOtpLastSent || now - user.emailChangeOtpLastSent >= LOCKOUT_MS) {
      user.emailChangeOtpSendCount = 1;
      console.log(`[OTP LOG] Count reset to 1 (last sent: ${user.emailChangeOtpLastSent}, now: ${now})`);
    } else {
      user.emailChangeOtpSendCount = (user.emailChangeOtpSendCount || 0) + 1;
      console.log(`[OTP LOG] Count incremented to ${user.emailChangeOtpSendCount} (last sent: ${user.emailChangeOtpLastSent}, now: ${now})`);
    }

    // --- Restrict if count exceeds MAX_SENDS ---
    if (user.emailChangeOtpSendCount > MAX_SENDS) {
      user.emailChangeOtpLastSent = now; // update last sent for lockout
      await user.save();
      console.log(`[OTP LOG] Restriction triggered at count ${user.emailChangeOtpSendCount} (last sent: ${user.emailChangeOtpLastSent}, now: ${now})`);
      return res.status(429).json({
        message: `Too many OTP requests. Please wait 2 minutes.`,
        secondsLeft: Math.ceil(LOCKOUT_MS / 1000),
      });
    }

    // --- Save last sent timestamp ---
    user.emailChangeOtpLastSent = now;

    // --- Generate OTP and send email ---
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpires = Date.now() + 10 * 60 * 1000;
    user.emailChangeOtpAttempts = 0;
    user.emailChangeOtpLockedUntil = undefined;
    await user.save();

    // verify transporter connection (will throw if can't connect)
    try {
      await mailer.verify();
      console.log("SMTP verify ok");
    } catch (verifyErr) {
      console.error("SMTP verify failed:", verifyErr && verifyErr.message);
      // keep going to attempt sendMail so we capture the real error if any
    }

    // send email
    const mailOptions = {
      from: `"SK Insight" <${process.env.HOSTINGER_SMTP_USER || user.email}>`,
      to: user.email,
      subject: "SK Insight Email Change OTP",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>SK Insight - Email Change OTP</title>
          <style>
            body {
              font-family: 'Segoe UI', sans-serif;
              background-color: #f4f7fc;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 10px;
              padding: 0;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
              text-align: center;
              overflow: hidden;
            }
            .header {
              background: #0A2C59;
              color: #fff;
              padding: 32px 0 16px 0;
              border-top-left-radius: 10px;
              border-top-right-radius: 10px;
            }
            .logo {
              max-width: 120px;
              margin-bottom: 12px;
            }
            h2 {
              color: #fff;
              margin-bottom: 10px;
              font-size: 2rem;
              font-weight: 700;
            }
            .content {
              padding: 32px 40px 24px 40px;
            }
            .otp {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #0A2C59;
              margin: 24px 0;
              background: #eaf3fb;
              border-radius: 8px;
              display: inline-block;
              padding: 12px 32px;
              box-shadow: 0 2px 8px rgba(7,176,242,0.07);
            }
            p {
              color: #333;
              font-size: 16px;
              margin-bottom: 10px;
            }
            .footer {
              background: #0A2C59;
              color: #fff;
              font-size: 13px;
              padding: 18px 0;
              border-bottom-left-radius: 10px;
              border-bottom-right-radius: 10px;
              margin-top: 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img class="logo" src="https://res.cloudinary.com/dnmawrba8/image/upload/v1754197673/logo_no_bg_ycz1nn.png" alt="SK Insight Logo" />
              <h2>Email Change OTP</h2>
            </div>
            <div class="content">
              <p>Use the following code to verify your email change request. It is valid for 10 minutes.</p>
              <div class="otp">${otp}</div>
              <p>If you didn’t request this, please ignore this email.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} SK Insight. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await mailer.sendMail(mailOptions);

    res.json({ message: "OTP sent to your email." });
  } catch (err) {
    // Improved error logging
    console.error("Change Email OTP Error:", err);

    res.status(500).json({ message: "Could not send OTP. Please try again.", error: err.message });
  }
};

  // POST /api/users/change-email/verify-otp
  exports.verifyChangeEmailOtp = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "Missing otp" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Debug log
    console.log("Verifying OTP:", {
      sent: otp,
      stored: user.emailChangeOtp,
      expires: user.emailChangeOtpExpires,
      now: Date.now()
    });

    // Check lockout
    if (user.emailChangeOtpLockedUntil && user.emailChangeOtpLockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.emailChangeOtpLockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        message: `Too many failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    if (
      !user.emailChangeOtp ||
      !user.emailChangeOtpExpires ||
      user.emailChangeOtp !== otp ||
      user.emailChangeOtpExpires < Date.now()
    ) {
      user.emailChangeOtpAttempts = (user.emailChangeOtpAttempts || 0) + 1;
      if (user.emailChangeOtpAttempts >= 5) {
        user.emailChangeOtpAttempts = 0;
        user.emailChangeOtpLockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lock
      }
      await user.save();
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // mark verified so frontend can proceed to change email without retyping otp
    user.emailChangeOtpVerified = true;
    user.emailChangeOtpAttempts = 0;
    await user.save();

    return res.json({ message: "OTP verified" });
  } catch (err) {
    console.error("verifyChangeEmailOtp error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

  // POST /api/users/change-email
  exports.changeEmail = async (req, res) => {
    try {
      const userId = req.user._id;
      const { newEmail, otp } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Allow change if otp provided and matches OR if previously verified with /verify-otp
      const otpValid =
        (otp && user.emailChangeOtp && user.emailChangeOtpExpires && user.emailChangeOtp === otp && user.emailChangeOtpExpires > Date.now()) ||
        user.emailChangeOtpVerified === true;

      if (!otpValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Check if new email is already taken
      const existing = await User.findOne({ email: newEmail });
      if (existing) return res.status(400).json({ message: "Email already in use" });

      user.email = newEmail;
      user.isVerified = false; // require re-verification after email change

      // clear email-change OTP fields
      user.emailChangeOtp = undefined;
      user.emailChangeOtpExpires = undefined;
      user.emailChangeOtpAttempts = undefined;
      user.emailChangeOtpVerified = undefined;
      user.otpLockedUntil = undefined;

      await user.save();

      res.json({ message: "Email changed successfully" });
    } catch (err) {
      console.error("changeEmail error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };

  // POST /api/users/change-email-unverified
  exports.changeEmailUnverified = async (req, res) => {
    try {
      const userId = req.user._id;
      const { newEmail } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.isVerified) {
        return res.status(400).json({ message: "Verified users must use OTP to change email." });
      }

      // Check if new email is already taken
      const existing = await User.findOne({ email: newEmail });
      if (existing) return res.status(400).json({ message: "Email already in use" });

      user.email = newEmail;
      await user.save();

      res.json({ message: "Email changed successfully." });
    } catch (err) {
      console.error("changeEmailUnverified error:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
