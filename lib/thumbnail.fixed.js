// ✅ Fixed version.
//
// 1. spawn() with an argument array: no shell is involved, so paths with
//    spaces (or any other special characters) are passed to ffmpeg as
//    single, intact arguments. This also closes the command-injection
//    hole that exec() with interpolated user input opens.
// 2. stderr is collected and the exit code is checked, so failures are
//    reported with ffmpeg's actual diagnostics instead of disappearing.
//
// Note: ffmpeg writes its normal progress logs to stderr too, so stderr
// containing text does NOT mean failure — the exit code is the source
// of truth. stderr is the explanation we attach when the code is non-zero.

const { spawn } = require("child_process");

/**
 * Extract a single frame from a video as a JPEG thumbnail.
 *
 * @param {string} inputPath   path to the uploaded video
 * @param {string} outputPath  path the JPEG should be written to
 * @param {string} timestamp   position to grab the frame from (HH:MM:SS)
 * @returns {Promise<string>}  resolves with outputPath
 */
function generateThumbnail(inputPath, outputPath, timestamp = "00:00:01") {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",                  // overwrite output if it exists
      "-ss", timestamp,      // seek before decoding (fast)
      "-i", inputPath,       // input file — one argument, spaces and all
      "-frames:v", "1",      // grab exactly one frame
      "-vf", "scale=480:-1", // resize to 480px wide, keep aspect ratio
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    // Fires if the process could not be started at all
    // (e.g. ffmpeg is not installed or not on PATH).
    ffmpeg.on("error", (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(
          new Error(`ffmpeg exited with code ${code}\n--- ffmpeg stderr ---\n${stderr}`)
        );
      }
    });
  });
}

module.exports = { generateThumbnail };
