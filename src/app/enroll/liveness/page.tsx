'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as faceapi from 'face-api.js';

import type { CameraFeedHandle } from '../../../components/camera/CameraFeed';
import { saveEnrollmentSnapshot, type EnrollmentSnapshot } from '../../../lib/enrollSession';

// camera
const CameraFeed = dynamic( 
  () => import('../../../components/camera/CameraFeed').then((m) => m.CameraFeed),
  { ssr: false }
);

// ---- config ----
const MODEL_URL = '/models';
const DETECTOR_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
const MIN_CONFIDENCE = 0.55;
const MIN_FACE_RATIO = 0.16;
const GOOD_HOLD_FRAMES = 10;

// ---- fake user (replace with NextAuth or your auth) ----
const userId = 'u123';
const userName = '';
const userEmail = '';
const consentVersion = 'v1';

// ---- helpers ----
function ear(eye: faceapi.Point[]) {
  if (eye.length < 6) return 0;
  const A = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const B = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  const C = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
  return (A + B) / (2.0 * C);
}
function mar(mouth: faceapi.Point[]) {
  if (mouth.length < 20) return 0;
  const A = Math.hypot(mouth[13].x - mouth[19].x, mouth[13].y - mouth[19].y);
  const B = Math.hypot(mouth[14].x - mouth[18].x, mouth[14].y - mouth[18].y);
  const C = Math.hypot(mouth[12].x - mouth[16].x, mouth[12].y - mouth[16].y);
  return (A + B) / (2.0 * C);
}
function yawApprox(lm: faceapi.FaceLandmarks68) {
  const L = lm.getLeftEye(), R = lm.getRightEye(), N = lm.getNose();
  if (!L.length || !R.length || !N.length) return 0;
  const cx = (L.reduce((s, p) => s + p.x, 0) / L.length + R.reduce((s, p) => s + p.x, 0) / R.length) / 2;
  const nx = N[Math.floor(N.length / 2)].x;
  return (nx - cx) * 0.1;
}

// classic blue box + red score
function drawBox(canvas: HTMLCanvasElement, box: faceapi.Box, score?: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#3b82f6'; // tailwind blue-500
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.fillStyle = '#ef4444'; // red-500
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const y = Math.max(0, box.y - 16);
  ctx.fillText((score ?? 0).toFixed(2), box.x + 2, y);
}

export default function LivenessPage() {
  const router = useRouter();

  const camRef = useRef<CameraFeedHandle>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  // expose hold progress for UI
  const holdRef = useRef(0);
  const [holdCount, setHoldCount] = useState(0);

  const [stats, setStats] = useState({ faces: 0, fps: 0, conf: 0, size: '0×0' });

  const onCameraReady = useCallback((v: HTMLVideoElement) => {
    videoRef.current = v;
    setIsDetecting(true);
  }, []);

  // load models
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await tf.setBackend('webgl'); await tf.ready();
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setModelsReady(true);
      } catch (e) {
        console.error('[face] init failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // detection loop
  useEffect(() => {
    if (!modelsReady) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const v = videoRef.current, canvas = overlayRef.current;
      if (!v || !canvas || v.readyState < 2 || v.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // match canvas to video
      if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) {
        canvas.width = v.videoWidth; canvas.height = v.videoHeight;
      }
      const t0 = performance.now();

      const dets = await faceapi
        .detectAllFaces(v, DETECTOR_OPTS)
        .withFaceLandmarks(true);

      const dt = performance.now() - t0;

      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.matchDimensions(canvas, { width: v.videoWidth, height: v.videoHeight });

      const resized = faceapi.resizeResults(dets, { width: v.videoWidth, height: v.videoHeight });

      resized.forEach(d => drawBox(canvas, d.detection.box, d.detection.score ?? 0));

      if (resized.length > 0) {
        const best = [...resized].sort((a, b) =>
          (b.detection.box.width * b.detection.box.height) - (a.detection.box.width * a.detection.box.height)
        )[0];

        const conf = Math.round((best.detection.score ?? 0) * 100) / 100;
        const bw = best.detection.box.width, bh = best.detection.box.height;

        setStats({
          faces: resized.length,
          fps: Math.max(1, Math.round(1000 / dt)),
          conf,
          size: `${Math.round(bw)}×${Math.round(bh)}`
        });

        const goodConf = conf >= MIN_CONFIDENCE;
        const goodSize = bw >= v.videoWidth * MIN_FACE_RATIO && bh >= v.videoHeight * MIN_FACE_RATIO;

        if (goodConf && goodSize) {
          holdRef.current = Math.min(holdRef.current + 1, GOOD_HOLD_FRAMES);
        } else {
          holdRef.current = Math.max(0, holdRef.current - 1);
        }
        setHoldCount(holdRef.current);
        setCanContinue(holdRef.current >= GOOD_HOLD_FRAMES);
      } else {
        setStats({ faces: 0, fps: Math.max(1, Math.round(1000 / dt)), conf: 0, size: '0×0' });
        holdRef.current = Math.max(0, holdRef.current - 1);
        setHoldCount(holdRef.current);
        setCanContinue(false);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (camRef.current) camRef.current.stop();
      setIsDetecting(false);
    };
  }, [modelsReady]);

  // compute descriptor + snapshot + features, then stash to session and go review
  async function handleContinue() {
    const v = videoRef.current;
    if (!v) return;

    const det = await faceapi
      .detectSingleFace(v, DETECTOR_OPTS)
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    if (!det || !det.descriptor || !det.landmarks) {
      alert('Hold steady and try again. No face captured.');
      return;
    }

    const lm = det.landmarks;
    const leftEAR = ear(lm.getLeftEye());
    const rightEAR = ear(lm.getRightEye());
    const mouthMAR = mar(lm.getMouth());
    const yaw = yawApprox(lm);

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = v.videoWidth; snapCanvas.height = v.videoHeight;
    const sctx = snapCanvas.getContext('2d')!;
    sctx.translate(snapCanvas.width, 0);
    sctx.scale(-1, 1);
    sctx.drawImage(v, 0, 0, snapCanvas.width, snapCanvas.height);
    const imageDataUrl = snapCanvas.toDataURL('image/png');

    const snapshot: EnrollmentSnapshot = {
      imageDataUrl,
      features: { leftEAR, rightEAR, mouthMAR, yaw },
      deviceInfo: { userAgent: navigator.userAgent, platform: navigator.platform },
      consentVersion,
      capturedAt: Date.now(),
    };
    saveEnrollmentSnapshot(snapshot);

    const pending = {
      userId, name: userName, email: userEmail,
      descriptor: Array.from(det.descriptor),
      createdAt: new Date().toISOString(),
    };
    sessionStorage.setItem('pendingEnrollment', JSON.stringify(pending));

    window.location.href = '/enroll/review';
  }

  const overlay = (
    <canvas
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );

  const progressPct = Math.round((holdCount / GOOD_HOLD_FRAMES) * 100);

  return (
    <main className="mx-auto max-w-5xl p-6 md:p-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-6 md:-mx-8 mb-6 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur">
        <div className="mx-6 md:mx-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
              aria-label="Go Back"
            >
              ← Back
            </button>
            <h1 className="text-base md:text-lg font-medium text-neutral-100">Liveness Check</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
              ${isDetecting ? (stats.faces > 0 ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/40' : 'bg-amber-600/20 text-amber-300 border border-amber-600/40')
                           : 'bg-rose-600/20 text-rose-300 border border-rose-600/40'}`}>
              {isDetecting ? (stats.faces > 0 ? 'Face Detected' : 'Searching…') : 'Inactive'}
            </span>
            <span className="text-xs text-neutral-400">{stats.fps} fps</span>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 md:p-6 text-neutral-100 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        {/* Guidance / progress */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="mb-1 text-lg font-medium">Face Detection</h2>
            <p className="text-sm text-neutral-400">
              Hold steady until the progress reaches 100%. Then continue to review.
            </p>
          </div>

          {/* Hold progress bar */}
          <div className="w-full md:w-64">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-neutral-400">Hold Progress</span>
              <span className="text-xs text-neutral-300">{progressPct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${canContinue ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${progressPct}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                role="progressbar"
              />
            </div>
          </div>
        </div>

        {/* Stats chips */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            <div className="text-neutral-400 text-xs">Faces</div>
            <div className="font-medium">{stats.faces}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            <div className="text-neutral-400 text-xs">Confidence</div>
            <div className={`font-medium ${stats.conf >= MIN_CONFIDENCE ? 'text-emerald-400' : 'text-amber-300'}`}>
              {(stats.conf * 100).toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            <div className="text-neutral-400 text-xs">Face Size</div>
            <div className="font-medium">{stats.size}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2">
            <div className="text-neutral-400 text-xs">FPS</div>
            <div className="font-medium">{stats.fps}</div>
          </div>
        </div>

        {/* Camera area */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-black">
          <CameraFeed ref={camRef} onReady={onCameraReady} overlay={overlay} facingMode="user" mirror />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 m-2 rounded-lg bg-black/65 px-3 py-2 text-sm text-white flex items-center justify-between">
            <span>
              {stats.faces > 0
                ? (canContinue ? 'Great! You can continue.' : 'Face detected — hold steady…')
                : 'No face detected.'}
            </span>
            <span className="text-xs opacity-75">{stats.fps} fps</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`rounded-xl border px-4 py-2 text-sm transition-colors
              ${canContinue
                ? 'border-emerald-400 bg-emerald-600 text-white hover:bg-emerald-500'
                : 'border-neutral-700 bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}
          >
            Continue to Review
          </button>

          <button
            onClick={() => { holdRef.current = 0; setHoldCount(0); setCanContinue(false); }}
            className="rounded-xl border border-blue-400/30 bg-blue-900/20 px-4 py-2 text-sm text-blue-200 hover:bg-blue-900/30"
          >
            Reset
          </button>

          <button
            onClick={() => router.back()}
            className="rounded-xl border border-neutral-700 bg-neutral-850 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
            aria-label="Back"
          >
            ← Back
          </button>
        </div>
      </section>
    </main>
  );
}
