const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { MongoClient, ObjectId, GridFSBucket } = require("mongodb");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// const mongoURI = "mongodb://localhost:27017";
const dbName = "videoDB";
const mongoURI = `mongodb+srv://lightlife908:lifelight0011@cluster0.3dnyipx.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
let bucket;

// Connect to MongoDB
// mongoose.connect(`${mongoURI}/${dbName}`);
mongoose.connect(`${mongoURI}`);

mongoose.connection.once("open", () => {
  const db = mongoose.connection.db;
  bucket = new GridFSBucket(db, {
    bucketName: "videos",
  });
  console.log("📦 MongoDB GridFS ready");
});

// Multer local storage (temp uploads folder)
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

/**
 * POST /upload
 * Upload video to MongoDB (GridFS)
 */

app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;
  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    contentType: "video/mp4",
  });

  fs.createReadStream(filePath)
    .pipe(uploadStream)
    .on("error", (err) => {
      console.error("❌ Upload error", err);
      res.status(500).send("Upload error");
    })
    .on("finish", () => {
      fs.unlinkSync(filePath); // cleanup local file
      res.status(201).send({
        message: "✅ File uploaded",
        fileId: uploadStream.id,
        filename: req.file.originalname,
      });
    });
});

/**
 * GET /videos
 * List all video files
 */
// List all video metadata (MongoDB files)

app.get("/videos", async (req, res) => {
  try {
    const files = await mongoose.connection.db
      .collection("videos.files")
      .find()
      .toArray();

    res.json(files);
  } catch (err) {
    console.error("Error fetching videos:", err);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});
/**
 * GET /video/:id
 * Stream video by Mongo ObjectId
 */
app.get("/video/:id", async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const file = await mongoose.connection.db
      .collection("videos.files")
      .findOne({ _id: fileId });

    if (!file) return res.status(404).send("❌ Video not found");

    if (file.length === 0) return res.status(400).send("❌ Empty video file");

    const range = req.headers.range;
    if (!range) return res.status(416).send("❌ Requires Range header");

    const videoSize = file.length;
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;

    if (start >= videoSize || end >= videoSize) {
      return res.status(416).send("❌ Range Not Satisfiable");
    }

    const contentLength = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    });

    bucket.openDownloadStream(fileId, { start }).pipe(res);
  } catch (err) {
    console.error("💥 Streaming error", err);
    res.status(500).send("Internal Server Error");
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
