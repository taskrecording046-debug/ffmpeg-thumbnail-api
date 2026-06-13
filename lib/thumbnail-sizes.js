const { spawn } = require("child_process");
const os = require("os")

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

function runWithLimit(tasks, limit) {
  return new Promise((resolve, reject) => {
    const results = new Array(tasks.length)
    let next = 0
    let active = 0
    let settled = false

    const fail = (err) => {
      if (settled) return
      settled = true
      reject(err)
    }

    const launch = () => {
      while (active < limit && next < tasks.length) {
        const index = next++
        active++
        task[index]()
          .then((value) => {
            results[index] = value
            active--
            if (next >= tasks.length && active === 0) {
              if (!settled) { settled = true; resolve(results) }
            } else {
              launch()
            }
          })
          .catch(fail)
      }
    }

    if (tasks.length === 0) reslove(results)
    else launch()
  })
}

function generateAllSizes({ inputPath, outDir, baseName, timestamp, sizes, concurrency }) {
  const limit = concurrency || Math.max(1, os.cpus().length)
  
  const tasks = sizes.map(
    (size) => () => runOne({ inputPath, outDir, baseName, timestamp, size })
  )

  return runWithLimit(tasks, limit)
}

module.exports = { generateAllSizes };
  return Promise.all(
    sizes.map((size) => runOne({ inputPath, outDir, baseName, timestamp, size }))
  );
}

module.exports = { generateAllSizes };
