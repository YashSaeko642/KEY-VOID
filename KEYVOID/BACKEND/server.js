require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./src/config/db");
const authRoutes = require("./src/routers/authRoutes");
const profileRoutes = require("./src/routers/profileRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "6mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);

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
