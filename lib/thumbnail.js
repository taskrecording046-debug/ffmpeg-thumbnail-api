// ⚠️ Starter version — this module intentionally contains two related bugs.
//
// 1. The ffmpeg command is built by string interpolation and run through
//    exec(), which passes it to a shell. A file path containing spaces
//    gets split into separate words by the shell.
// 2. The callback ignores the error and ffmpeg's stderr entirely and
//    always resolves — so when ffmpeg fails, the API still reports
//    success. A classic "silent failure".
//
// See lib/thumbnail.fixed.js for the corrected version.

const { exec } = require("child_process");

/**
 * Extract a single frame from a video as a JPEG thumbnail.
 *
 * @param {string} inputPath   path to the uploaded video
 * @param {string} outputPath  path the JPEG should be written to
 * @param {string} timestamp   position to grab the frame from (HH:MM:SS)
 * @returns {Promise<string>}  resolves with outputPath
 */
function generateThumbnail(inputPath, outputPath, timestamp = "00:00:01") {
  return new Promise((resolve) => {
    const command = `ffmpeg -y -ss ${timestamp} -i ${inputPath} -frames:v 1 -vf scale=480:-1 ${outputPath}`;

    exec(command, () => {
      // Assume it worked.
      resolve(outputPath);
    });
  });
}

module.exports = { generateThumbnail };
