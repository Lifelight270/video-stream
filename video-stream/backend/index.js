const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors()); // allow frontend access

// Example "video database" (you can replace this with MongoDB or another DB)
const videos = [
  { id: "1", title: "Video One", filename: "sample.mp4" },
  { id: "2", title: "Video Two", filename: "video2.mp4" },
];

// List all videos
app.get("/videos", (req, res) => {
  res.json(videos);
});

app.get("/", (req, res) => {
  res.send("🎥 Video streaming server is running.");
});

// app.get("/video", (req, res) => {
//   const videoPath = path.join(__dirname, "sample.mp4");
app.get("/video/:id", (req, res) => {
  const video = videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).send("Video not found");

  const videoPath = path.join(__dirname, video.filename);

  // Ensure video file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("Video not found.");
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    // Optional fallback: send entire file (not efficient for large files)
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(videoPath).pipe(res);
    return;
  }

  const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

  if (start >= fileSize || end >= fileSize) {
    return res.status(416).send("Requested range not satisfiable");
  }

  const chunkSize = end - start + 1;
  const file = fs.createReadStream(videoPath, { start, end });

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": "video/mp4",
  });

  file.pipe(res);
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
