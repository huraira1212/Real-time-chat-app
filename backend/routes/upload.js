const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Upload route
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const isImage = [".jpg", ".jpeg", ".png", ".gif"].includes(ext);

  res.json({
    fileUrl: `http://localhost:5000/uploads/${req.file.filename}`,
    fileType: isImage ? "image" : "file",
  });
});

module.exports = router;
