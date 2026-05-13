require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./src/config/db");
const { initGridFS } = require("./src/utils/gridfsUtils");
const authRoutes = require("./src/routers/authRoutes");
const profileRoutes = require("./src/routers/profileRoutes");
const followerRoutes = require("./src/routers/followerRoutes");
const postRoutes = require("./src/routers/postRoutes");
const audioRoutes = require("./src/routers/audioRoutes");
const playlistRoutes = require("./src/routers/playlistRoutes");
const voidSessionRoutes = require("./src/routers/voidSessionRoutes");
const feedbackRoutes = require("./src/routers/feedbackRoutes");
const { securityHeaders, validateInput } = require("./src/middleware/securityMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

function getAllowedOrigins() {
  const configuredOrigins = [
    process.env.CLIENT_ORIGINS,
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];

  return [
    ...new Set(
      configuredOrigins
        .flatMap((value) => String(value || "").split(","))
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean)
    )
  ];
}

const CLIENT_ORIGINS = getAllowedOrigins();

// Log allowed origins on startup (helpful for debugging)
console.log("Allowed CORS origins:", CLIENT_ORIGINS);

// CORS — must be first, before all other middleware and routes
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (CLIENT_ORIGINS.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-keyvoid-viewer"  // custom header used by frontend
  ],
  exposedHeaders: ["X-RateLimit-Remaining"]
};

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes
// Note: use "/{*path}" for Express 5 / path-to-regexp v8+, not "*"
app.options("/{*path}", cors(corsOptions));

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
app.use("/api/audio", audioRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/void", voidSessionRoutes);
app.use("/api/feedback", feedbackRoutes);

// Health check — Render needs this to confirm the service is alive
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", service: "KeyVoid API" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const startServer = async () => {
  try {
    await connectDB();
    initGridFS(require("mongoose").connection);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();