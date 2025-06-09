const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { ObjectId, GridFSBucket } = require("mongodb");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Corrected dbName and mongoURI
const dbName = "videos"; // Should be a string
const mongoURI = `mongodb://localhost:27017/${dbName}`; // Correct MongoDB connection string
// const mongoURI = process.env.MONGO_URI;
let db; // Declare db globally
let bucket;

// Connect to MongoDB
mongoose.connect(mongoURI);

mongoose.connection.once("open", () => {
  db = mongoose.connection.db; // Assign to the global db variable
  bucket = new GridFSBucket(db, { bucketName: "videos" });
  console.log("📦 MongoDB GridFS ready");
});

// Add error handling for the connection
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1); // Exit the process if unable to connect
});

// Multer storage config
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

/**
 * POST /upload
 * Uploads file to GridFS
 */
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;

  if (!req.file) {
    return res.status(400).send("❌ No file uploaded");
  }

  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    contentType: "video/mp4",
  });

  fs.createReadStream(filePath)
    .pipe(uploadStream)
    .on("error", (err) => {
      console.error("❌ Upload error:", err);
      res.status(500).send("Upload error");
    })
    .on("finish", async () => {
      fs.unlinkSync(filePath); // cleanup local file

      const uploadedFile = await mongoose.connection.db
        .collection("videos.files")
        .findOne({ _id: uploadStream.id });

      if (!uploadedFile || uploadedFile.length === 0) {
        // Remove the broken file from GridFS
        await mongoose.connection.db
          .collection("videos.files")
          .deleteOne({ _id: uploadStream.id });
        await mongoose.connection.db
          .collection("videos.chunks")
          .deleteMany({ files_id: uploadStream.id });

        return res.status(400).send("❌ Upload failed: File is empty");
      }

      res.status(201).send({
        message: "✅ File uploaded",
        fileId: uploadStream.id,
        filename: req.file.originalname,
      });
    });
});

/**
 * GET /videos
 * List all uploaded videos
 */
app.get("/videos", async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: "Database not ready" });

    const files = await db.collection("videos.files").find().toArray();
    res.json(files);
  } catch (err) {
    console.error("❌ Error fetching videos:", err);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

/**
 * GET /video/:id
 * Stream video by ObjectId
 */
/**
 * GET /video/:id
 * Stream video by ObjectId
 */
app.get("/video/:id", async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.id);
    const file = await mongoose.connection.db
      .collection("videos.files")
      .findOne({ _id: fileId });

    if (!file || file.length === 0) {
      return res.status(404).send("❌ File not found or empty");
    }

    const videoSize = file.length;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1; // If end is not specified, stream till the end

      // Validate the range
      if (
        isNaN(start) ||
        isNaN(end) ||
        start < 0 ||
        end >= videoSize ||
        start > end
      ) {
        return res.status(416).send("❌ Range Not Satisfiable");
      }

      const contentLength = end - start + 1;
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, headers); // 206 Partial Content

      // Open download stream with start and end options
      const downloadStream = bucket.openDownloadStream(fileId, {
        start,
        end: end + 1,
      });
      // GridFS openDownloadStream 'end' option is exclusive (like slice in JS arrays),
      // so we need end + 1 to include the last byte.
      downloadStream.pipe(res);

      downloadStream.on("error", (err) => {
        console.error("💥 GridFS download stream error:", err);
        res.status(500).send("Internal Server Error during streaming");
      });
    } else {
      // No range header, send the whole file
      const headers = {
        "Content-Length": videoSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, headers); // 200 OK
      const downloadStream = bucket.openDownloadStream(fileId);
      downloadStream.pipe(res);

      downloadStream.on("error", (err) => {
        console.error("💥 GridFS download stream error (no range):", err);
        res.status(500).send("Internal Server Error during streaming");
      });
    }
  } catch (err) {
    console.error("💥 General streaming error:", err);
    // This catch block handles errors like invalid ObjectId or database issues before streaming starts
    if (
      err.name === "BSONTypeError" &&
      err.message.includes("not a valid ObjectId")
    ) {
      return res.status(400).send("❌ Invalid Video ID");
    }
    res.status(500).send("Internal Server Error");
  }
});

// Debug route to check uploaded file lengths
app.get("/debug/files", async (req, res) => {
  const files = await mongoose.connection.db
    .collection("videos.files")
    .find()
    .toArray();
  res.json(
    files.map((file) => ({
      _id: file._id,
      filename: file.filename,
      size: file.length,
    }))
  );
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
