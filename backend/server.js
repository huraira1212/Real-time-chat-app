const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./models/Message");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000; // Railway friendly

// Routes
const uploadRoute = require("./routes/upload");

const app = express();

// Middleware
app.use(cors({ origin: "*" })); // Production friendly, ya frontend ka URL daal sakte ho
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/upload", uploadRoute);

// Health Check (Railway requirement)
app.get("/", (req, res) => {
  res.send("✅ Server is running");
});

// MongoDB connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err.message));

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

// HTTP Server
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Production: yaha frontend ka URL daal do
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send Message
  socket.on("sendMessage", async (data) => {
    try {
      const message = await Message.create({
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text || "",
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || "text",
      });

      // Emit only to receiver + sender (one-to-one)
      io.to(socket.id).emit("receiveMessage", message); // sender
      socket.broadcast.emit("receiveMessage", message); // receiver
    } catch (error) {
      console.log("Message Save Error:", error);
    }
  });

  // Typing indicator
  socket.on("typing", (receiverId) => {
    socket.broadcast.emit("typing", { receiverId });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Start Server
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
