'use client';

import * as faceapi from 'face-api.js';

export async function detectPrimaryFace(
  input: HTMLVideoElement | HTMLCanvasElement,
  opts: faceapi.TinyFaceDetectorOptions
) {
  const det = await faceapi.detectSingleFace(input, opts);
  if (!det) return null;
  const box = det.box;
  const frameArea =
    (input as HTMLVideoElement).videoWidth * (input as HTMLVideoElement).videoHeight;
  return { score: det.score ?? 0, box, frameArea };
}
