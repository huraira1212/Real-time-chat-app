const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,

  text: String,

  fileUrl: String,
  fileType: {
    type: String,
    enum: ["text", "image", "file"],
    default: "text",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  seen: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Message", messageSchema);
