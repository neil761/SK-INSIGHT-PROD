const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const lgbtqRoutes = require("./routes/lgbtqProfileRoutes");
const educationalRoutes = require("./routes/educationalAssistanceRoutes");
const AnnouncementRoutes = require("./routes/announcementRoutes");
const path = require("path");
const Announcement = require("./models/Announcement");
const http = require("http");
const socketio = require("socket.io");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: "*" },
});

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../Frontend")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kkprofiling", require("./routes/kkProfileRoutes"));
app.use("/api/formstatus", require("./routes/formStatusRoutes"));
app.use("/api/lgbtqprofiling", lgbtqRoutes);
app.use("/api/educational-assistance", educationalRoutes);
app.use("/api/announcements", AnnouncementRoutes);
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use(express.static("public"));
app.use("/api/formcycle", require("./routes/formCycleRoutes"));

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
});

// Make io available in controllers
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);
  // You can add authentication here if needed
});
