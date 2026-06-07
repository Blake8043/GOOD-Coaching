const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

require("dotenv").config();

if (process.env.ALLOW_INSECURE_ROLE_TEST_ACCOUNTS !== "true") {
  throw new Error("Refusing to create insecure test accounts. Set ALLOW_INSECURE_ROLE_TEST_ACCOUNTS=true only for a temporary staging test.");
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;
if (!/^mongodb(\+srv)?:\/\//i.test(String(mongoUri || ""))) throw new Error("A MongoDB connection variable is required.");

const accounts = [
  { username: "user", email: "user@goodcoaching.test", password: "user", role: "user", fullName: "Test User" },
  { username: "coach", email: "coach@goodcoaching.test", password: "coach", role: "coach", fullName: "Test Coach" },
  { username: "admin", email: "admin@goodcoaching.test", password: "admin", role: "admin", fullName: "Test Admin" },
];

(async () => {
  await mongoose.connect(mongoUri);
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 10);
    await User.findOneAndUpdate(
      { email: account.email },
      { $set: { username: account.username, email: account.email, passwordHash, role: account.role, fullName: account.fullName, phone: "000-000-0000" } },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`Created temporary ${account.role} login: ${account.username} / ${account.password}`);
  }
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
