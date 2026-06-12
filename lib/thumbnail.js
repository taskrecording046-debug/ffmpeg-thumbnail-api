const { spawn } = require("child_process")

function generateThumbnail(inputPath, outputPath, timestamp = "00:00:01") {
  return new Promise((resolve, reject) => {
    const args = [
      "-y", 
      "-ss", timestamp,
      "-i", inputPath,
      "-frames:v", "1",
      "-vf", "scale=480:-1",
      outputPath,
    ]

    const ffmpeg = spawn("ffmpeg", args)

    let stderr = ""
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk;
    })

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(outputPath)
      } else {
        reject(
          new Error(`ffmpeg exited with code ${code}\n--- ffmpeg stderr ---\n${stderr}`)
        )
      }
    })
  });
}

module.exports = { generateThumbnail };
