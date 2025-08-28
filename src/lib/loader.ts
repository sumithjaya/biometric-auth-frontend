// src/lib/loader.ts
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // Use WebGL backend for performance
import * as faceapi from "face-api.js";

// Ensure tf is globally available (some libs expect window.tf or globalThis.tf)
if (!(globalThis as any).tf) {
  (globalThis as any).tf = tf;
}

/**
 * Load all required FaceAPI models from the given base path.
 * Make sure `/models` folder is served by your Next.js public/ dir.
 */
export async function loadFaceModels(basePath: string) {
  // Ensure TensorFlow.js backend is ready
  await tf.ready();

  // Load models in parallel
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(basePath),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(basePath), // ✅ tiny version
    faceapi.nets.faceRecognitionNet.loadFromUri(basePath),
    faceapi.nets.faceExpressionNet.loadFromUri(basePath),
  ]);
}

export { tf, faceapi };
