import * as faceapi from "face-api.js";

export async function detectPrimaryFace(
  video: HTMLVideoElement,
  opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
) {
  const result = await faceapi.detectSingleFace(video, opts);
  if (!result) return null;

  const dims = { width: video.videoWidth, height: video.videoHeight };
  return {
    ...result,
    box: result.box,
    score: result.score,
    frameArea: dims.width * dims.height,
  };
}
