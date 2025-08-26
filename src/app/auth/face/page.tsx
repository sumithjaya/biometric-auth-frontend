'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as faceapi from 'face-api.js';
import { loadFaceModels } from '@/lib/face/loader';
import { detectPrimaryFace } from '@/lib/face/detector';
import { FaceGuideOverlay } from '@/components/camera/FaceGuideOverlay';

const CameraFeed = dynamic(
  () => import('@/components/camera/CameraFeed').then((m) => m.CameraFeed),
  { ssr: false }
);

const DETECTOR_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
const MIN_CONFIDENCE = 0.55; // tune for your camera
const MIN_FACE_RATIO = 0.16; // face bbox area / frame area
const GOOD_HOLD_FRAMES = 10; // frames to hold steady before capture

export default function FaceAuthPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [fps, setFps] = useState(0);
  const [framesOK, setFramesOK] = useState(0);
  const [status, setStatus] = useState<'loading'|'align'|'capturing'|'success'|'error'>('loading');
  const [lastMetrics, setLastMetrics] = useState<{ conf: number; ratio: number } | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // warm up models
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadFaceModels('/models');
        if (mounted) setStatus('align');
      } catch (e) {
        console.error(e);
        if (mounted) setStatus('error');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // detection loop
  useEffect(() => {
    if (!videoRef.current || status === 'loading' || status === 'success' || status === 'error') return;

    const vid = videoRef.current;
    let raf = 0;
    let lastT = performance.now();

    const tick = async () => {
      const now = performance.now();
      const dt = now - lastT;
      if (dt >= 500) {
        setFps(Math.round(1000 / Math.max(1, dt)) * 2); // coarse FPS approx
        lastT = now;
      }

      if (vid.readyState >= 2) {
        try {
          const res = await detectPrimaryFace(vid, DETECTOR_OPTS);
          if (res) {
            const { score, box, frameArea } = res;
            const areaRatio = (box.width * box.height) / frameArea;
            setLastMetrics({ conf: score, ratio: areaRatio });

            const ok = score >= MIN_CONFIDENCE && areaRatio >= MIN_FACE_RATIO;
            setFramesOK((n) => {
              const next = ok ? Math.min(GOOD_HOLD_FRAMES, n + 1) : Math.max(0, n - 1);
              if (next >= GOOD_HOLD_FRAMES && status !== 'capturing' && status !== 'success') {
                setStatus('capturing');
                // small delay to avoid motion blur
                setTimeout(() => captureSnapshot(), 120);
              }
              return next;
            });
          } else {
            setLastMetrics(null);
            setFramesOK(0);
          }
        } catch (e) {
          console.error(e);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  const captureSnapshot = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const canvas = document.createElement('canvas');
    canvas.width = vid.videoWidth;
    canvas.height = vid.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(vid, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setSnapshot(dataUrl);
    setStatus('success');
  };

  const enroll = async () => {
    if (!snapshot) return;
    try {
      const payload = {
        userId: 'u123',
        name: 'Sumith',
        email: 'sumith@example.com',
        descriptor: new Array(128).fill(0), // TODO: replace with your embedding vector
        snapshot,
        createdAt: new Date().toISOString(),
      };
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'enroll_failed');
      alert('Enrolled! (stub)');
    } catch (e) {
      console.error(e);
      alert('Enroll failed (stub). Check console.');
    }
  };

  const meters = useMemo(() => {
    const conf = lastMetrics?.conf ?? 0;
    const ratio = lastMetrics?.ratio ?? 0;
    const confPct = Math.round(Math.min(1, conf / MIN_CONFIDENCE) * 100);
    const ratioPct = Math.round(Math.min(1, ratio / MIN_FACE_RATIO) * 100);
    return { conf, ratio, confPct, ratioPct };
  }, [lastMetrics]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Face sign-in</h1>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
        {/* Camera panel */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          <CameraFeed ref={videoRef} onReady={() => setReady(true)} />
          <FaceGuideOverlay state={status} holdProgress={framesOK / GOOD_HOLD_FRAMES} />
        </div>

        {/* Right rail / status */}
        <aside className="rounded-2xl border border-neutral-800 p-4 bg-neutral-900/40">
          <div className="text-sm text-neutral-400">Status</div>
          <div className="mt-1 text-lg font-medium capitalize">{status}</div>

          <div className="mt-4 space-y-3">
            <Metric label="Confidence" value={`${(meters.conf * 100).toFixed(0)}%`} bar={meters.confPct} />
            <Metric label="Face size" value={`${(meters.ratio * 100).toFixed(0)}%`} bar={meters.ratioPct} />
            <Metric label="FPS" value={`${fps}`} />
            <Metric label="Hold frames" value={`${framesOK}/${GOOD_HOLD_FRAMES}`} bar={Math.round((framesOK/GOOD_HOLD_FRAMES)*100)} />
          </div>

          <div className="mt-6 grid gap-2">
            <button
              className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 text-white text-sm"
              onClick={() => setStatus('align')}
            >Reset</button>
            <button
              className="rounded-xl px-3 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-sm disabled:opacity-40"
              disabled={!snapshot}
              onClick={enroll}
            >Enroll (stub)</button>
          </div>

          {snapshot && (
            <div className="mt-6">
              <div className="text-sm text-neutral-400 mb-2">Snapshot</div>
              <img src={snapshot} alt="face" className="rounded-xl border border-neutral-800" />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-400">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      {typeof bar === 'number' && (
        <div className="mt-1 h-2 rounded-full bg-neutral-800">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}

// =========================================
// file: components/camera/CameraFeed.tsx
// =========================================
'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

type Props = { onReady?: () => void };
export type CameraFeedHandle = HTMLVideoElement;

export const CameraFeed = forwardRef<CameraFeedHandle, Props>(function CameraFeed({ onReady }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          onReady?.();
        }
      } catch (e) {
        console.error('[camera] permission / device error', e);
        alert('Could not access camera. Please allow camera permissions.');
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onReady]);

  return (
    <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
  );
});

// =============================================
// file: components/camera/FaceGuideOverlay.tsx
// =============================================
'use client';

import React from 'react';

export function FaceGuideOverlay({ state, holdProgress }: { state: 'loading'|'align'|'capturing'|'success'|'error'; holdProgress: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {/* dimmer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10" />

      {/* guide ring */}
      <div className="relative h-56 w-56 rounded-full border-2 border-white/40">
        <div className="absolute inset-0 rounded-full border-2 border-emerald-400/70" style={{ clipPath: `inset(${(1-holdProgress)*50}% 0 0 0 round 999px)` }} />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
        {state === 'loading' && 'Loading models…'}
        {state === 'align' && 'Center your face in the circle'}
        {state === 'capturing' && 'Hold still… capturing'}
        {state === 'success' && 'Captured ✓'}
        {state === 'error' && 'Error loading models'}
      </div>
    </div>
  );
}

// ==============================
// file: lib/face/loader.ts
// ==============================
import * as faceapi from 'face-api.js';

let loaded = false;
export async function loadFaceModels(baseUrl: string) {
  if (loaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
    // add more nets here if/when you need them
  ]);
  loaded = true;
}

// ==============================
// file: lib/face/detector.ts
// ==============================
import * as faceapi from 'face-api.js';

export async function detectPrimaryFace(
  input: HTMLVideoElement | HTMLCanvasElement,
  opts: faceapi.TinyFaceDetectorOptions
) {
  const det = await faceapi.detectSingleFace(input, opts);
  if (!det) return null;
  const box = det.box;
  const frameArea = (input as HTMLVideoElement).videoWidth * (input as HTMLVideoElement).videoHeight;
  return { score: det.score ?? 0, box, frameArea };
}

// ==================================
// file: app/api/enroll/route.ts (stub)
// ==================================
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.userId || !body?.email || !Array.isArray(body?.descriptor)) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }
    console.log('[enroll] saving', {
      userId: body.userId,
      name: body.name,
      email: body.email,
      descriptorLen: body.descriptor.length,
      hasSnapshot: !!body.snapshot,
      createdAt: body.createdAt,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

// ==================================
// Setup notes
// ==================================
// 1) Place face-api model files under public/models/ (TinyFaceDetector model):
//    - tiny_face_detector_model-weights_manifest.json
//    - tiny_face_detector_model-shard1
//   (If you use a different file name, adjust loadFaceModels.)
// 2) Ensure your package.json includes face-api.js 0.22.x and React/Next versions you use.
// 3) Navigate to http://localhost:3000/auth/face, allow camera, and try it.
// 4) The "Enroll (stub)" button posts to /api/enroll. Wire this to your real backend later.
