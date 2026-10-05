const mongoose = require("mongoose");

const BoosterRoleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  roleId: { type: String, required: false },
  roleName: { type: String, required: true },
  guildId: { type: String, required: true },
  questions: { type: [String], default: [] },
  status: { type: String, default: "Beklemede" },
  type: { type: String, default: "Yeni Başvuru" },
  members: { type: [String], default: [] },
  approvedBy: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  reason: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BoosterRoles", BoosterRoleSchema);