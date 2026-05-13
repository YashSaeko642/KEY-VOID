/**
 * Run this once to make your account admin:
 *   node scripts/set-admin.js
 *
 * Make sure your .env is in the backend root with MONGO_URI set.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const ADMIN_EMAIL = "kanwarzen642@gmail.com";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const User = require("../src/models/User");

  const user = await User.findOne({ email: ADMIN_EMAIL });
  if (!user) {
    console.error(`No user found with email: ${ADMIN_EMAIL}`);
    console.error("Make sure you have registered on the site first.");
    process.exit(1);
  }

  user.role = "admin";
  await user.save();

  console.log(`✓ ${user.username} (${user.email}) is now an admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});