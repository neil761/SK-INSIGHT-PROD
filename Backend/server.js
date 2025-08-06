const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const lgbtqRoutes = require("./routes/lgbtqProfileRoutes");
const path = require("path");

require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kkprofiling", require("./routes/kkProfileRoutes"));
app.use("/api/formstatus", require("./routes/formStatusRoutes")); // Optional

app.use(express.static("public"));
app.use("/api/lgbtqprofiling", lgbtqRoutes);
app.use("/api/formcycle", require("./routes/formCycleRoutes"));

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
