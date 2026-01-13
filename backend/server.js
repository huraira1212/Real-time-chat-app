const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./models/Message");

// Upload route import
const uploadRoute = require("./routes/upload");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Use upload route
app.use("/upload", uploadRoute);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/chat-app")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

// POSTMAN API → Save message
app.post("/messages", async (req, res) => {
  try {
    const message = await Message.create({
      senderId: req.body.senderId,
      receiverId: req.body.receiverId,
      text: req.body.text || "",
      fileUrl: req.body.fileUrl || null,
      fileType: req.body.fileType || "text",
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chat history
app.get("/messages/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.io
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("sendMessage", async (data) => {
    try {
      const message = await Message.create({
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text || "",
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || "text",
      });

      io.emit("receiveMessage", message);
    } catch (error) {
      console.log("Message Save Error:", error);
    }
  });

  socket.on("typing", () => socket.broadcast.emit("typing"));

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
