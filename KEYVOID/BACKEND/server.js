require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routers/authRoutes");
const profileRoutes = require("./src/routers/profileRoutes");
const followerRoutes = require("./src/routers/followerRoutes");
const postRoutes = require("./src/routers/postRoutes");
const { securityHeaders, validateInput } = require("./src/middleware/securityMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const CLIENT_ORIGINS = [CLIENT_ORIGIN, "http://127.0.0.1:5173"];

// Middleware
app.use(
  cors({
    origin: CLIENT_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "6mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Security middleware
app.use(securityHeaders);
app.use(validateInput);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/followers", followerRoutes);
app.use("/api/posts", postRoutes);

app.get("/", (req, res) => {
  res.send("KeyVoid API Running");
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
