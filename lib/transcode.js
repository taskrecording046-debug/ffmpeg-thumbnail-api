const { spawn } = require("child_process")

function startTranscode(inputPath) {
    const args = [
      "-i", inputPath,
      "-vf", "scale=640:-2",
      "-c:v", "libx264",
      "-preset", "veryslow",
      "-crf", "28",
      "-movflags", "frag_keyframe+empty_moov",
      "-f", "mp4",
      "pipe:1",
    ]

    const process = spawn("ffmpeg", args)

    let stopped = false
    const stop = () => {
        if (stopped) return
        stopped = true
        process.kill("SIGKILL")
    }

    process.on("close", () => {
        stopped = true
    })

    return { process, stop }
}

module.exports = { startTranscode }