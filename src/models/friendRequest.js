const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const FriendRequestSchema = new Schema({
  status: { type: String, enum: ["Accepted", "Pending", "Declined"] },
  from: { type: Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: String,
});

module.exports = mongoose.model("FriendRequest", FriendRequestSchema);
