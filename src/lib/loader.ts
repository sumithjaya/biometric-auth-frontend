'use client';

import * as faceapi from 'face-api.js';
import '@tensorflow/tfjs-backend-webgl';

let loaded = false;

export async function loadFaceModels(baseUrl: string) {
  if (loaded) return;

  try {
    await faceapi.tf.setBackend('webgl');
  } catch {
    await faceapi.tf.setBackend('cpu');
  }
  await faceapi.tf.ready();

  await faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl);
  // add more nets here later if needed

  loaded = true;
}
