const { spawn } = require("child_process");

function runOne({ inputPath, outDir, baseName, timestamp, size }) {
  const fileName = `${baseName}-${size.label}.jpg`;
  const outputPath = `${outDir}/${fileName}`;

  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-ss", timestamp,
      "-i", inputPath,
      "-frames:v", "1",
      "-vf", `scale=${size.width}:-1`,
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => { stderr += chunk; });

    ffmpeg.on("error", (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve({ label: size.label, width: size.width, fileName });
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n--- ffmpeg stderr ---\n${stderr}`));
      }
    });
  });
}

function generateAllSizes({ inputPath, outDir, baseName, timestamp, sizes }) {
  // ⚠️ 所有任务在同一瞬间启动——同时运行多少个 ffmpeg 进程没有任何限制。
  return Promise.all(
    sizes.map((size) => runOne({ inputPath, outDir, baseName, timestamp, size }))
  );
}

module.exports = { generateAllSizes };
