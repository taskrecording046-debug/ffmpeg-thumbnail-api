// Media Thumbnail Service
// POST /api/thumbnails  — upload a video, get back a JPEG thumbnail URL.
//
// The ffmpeg integration lives in lib/thumbnail.js so the process-handling
// logic can be discussed (and fixed) in isolation.

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateThumbnail } = require("./lib/thumbnail");
const { startTranscode } = require("./lib/transcode");
const { generateAllSizes } = require("./lib/thumbnail-sizes");

const SIZES = [
  { label: "thumb", width: 320 },
  { label: "small", width: 640 },
  { label: "medium", width: 1280 },
  { label: "large", width: 1920 },
  { label: "xlarge", width: 2560 },
];

const app = express();
const PORT = process.env.PORT || 4000;

const UPLOAD_DIR = path.join(__dirname, "uploads");
const THUMB_DIR = path.join(__dirname, "thumbnails");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });

// Keep the original filename (prefixed with a timestamp for uniqueness)
// so the files in uploads/ stay human-readable.
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB cap
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/thumbnails", express.static(THUMB_DIR));

app.post("/api/thumbnails", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No video uploaded. Send the file in a field named 'video'." });
  }

  const timestamp = req.body.timestamp || "00:00:01";
  const thumbName = `${path.parse(req.file.filename).name}.jpg`;
  const thumbPath = path.join(THUMB_DIR, thumbName);

  try {
    await generateThumbnail(req.file.path, thumbPath, timestamp);
    res.json({
      source: req.file.originalname,
      timestamp,
      thumbnail: `/thumbnails/${encodeURIComponent(thumbName)}`,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Thumbnail generation failed. See server logs." });
  }
});

app.get("/api/transcode", (req, res) => {
  const name = req.query.name
  if (!name) {
    return res.status(400).json({ error: "Pass ?name=<uploaded filename>." })
  }

  const inputPath = path.join(UPLOAD_DIR, path.basename(name))
  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: "Upload file not found." })
  }

  res.setHeader("Content-Type", "video/mp4")

  const { process: ffmpeg, stop } = startTranscode(inputPath)
  ffmpeg.stdout.pipe(res)

  ffmpeg.stderr.on("data", (chunk) => {
    const line = chunk.toString()
    if (line.includes("frame=")) process.stdout.write(`[ffmpeg ${ffmpeg.pid}] ${line.trim()}\r`)
  })

  ffmpeg.on("close", (code) => {
    console.log(`\n[ffmpeg ${ffmpeg.pid}] exited with code ${code}`)
  })

  req.on("close", () => {
    if (ffmpeg.exitCode === null) {
      console.log(`\n[ffmpeg ${ffmpeg.pid}] client disconnected - killing transcode`)
      stop()
    }
  })
})

app.post("/api/thumbnails/sizes", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No video uploaded. Send the file in a field named 'video'." });
  }

  const timestamp = req.body.timestamp || "00:00:01";
  const baseName = path.parse(req.file.filename).name;

  try {
    const results = await generateAllSizes({
      inputPath: req.file.path,
      outDir: THUMB_DIR,
      baseName,
      timestamp,
      sizes: SIZES,
    });

    res.json({
      source: req.file.originalname,
      timestamp,
      thumbnails: results.map((r) => ({
        label: r.label,
        width: r.width,
        url: `/thumbnails/${encodeURIComponent(r.fileName)}`,
      })),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Thumbnail generation failed. See server logs." });
  }
});

app.listen(PORT, () => {
  console.log(`Media thumbnail service listening on http://localhost:${PORT}`);
});
