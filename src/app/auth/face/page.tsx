'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import * as faceapi from 'face-api.js';
import { loadFaceModels } from '../../../lib/loader';
import { detectPrimaryFace } from '../../../lib/detector';
import { FaceGuideOverlay } from '@/components/camera/FaceGuideOverlay';

const CameraFeed = dynamic(
  () => import('@/components/camera/CameraFeed').then(m => m.CameraFeed),
  { ssr: false }
);

const DETECTOR_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
const MIN_CONFIDENCE = 0.55;
const MIN_FACE_RATIO = 0.16;
const GOOD_HOLD_FRAMES = 10;

export default function FaceAuthPage() {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [fps, setFps] = useState(0);
  const [framesOK, setFramesOK] = useState(0);
  const [status, setStatus] = useState<'loading'|'align'|'capturing'|'success'|'error'>('loading');
  const [lastMetrics, setLastMetrics] = useState<{ conf: number; ratio: number } | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // load models
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadFaceModels('/models');
        if (alive) setStatus('align');
      } catch (e) {
        console.error('[face] model load failed', e);
        if (alive) setStatus('error');
      }
    })();
    return () => { alive = false; };
  }, []);

  // detection loop
  useEffect(() => {
    if (!video || status === 'loading' || status === 'success' || status === 'error') return;

    let raf = 0;
    let lastT = performance.now();

    const tick = async () => {
      const now = performance.now();
      const dt = now - lastT;
      if (dt >= 500) {
        setFps(Math.round((1000 / dt) * 2)); // rough FPS
        lastT = now;
      }

      if (video.readyState >= 2) {
        try {
          const res = await detectPrimaryFace(video, DETECTOR_OPTS);
          if (res) {
            const { score, box, frameArea } = res;
            const areaRatio = (box.width * box.height) / frameArea;
            setLastMetrics({ conf: score, ratio: areaRatio });

            const ok = score >= MIN_CONFIDENCE && areaRatio >= MIN_FACE_RATIO;
            setFramesOK((n) => {
              const next = ok ? Math.min(GOOD_HOLD_FRAMES, n + 1) : Math.max(0, n - 1);
              if (next >= GOOD_HOLD_FRAMES && status !== 'capturing' && status !== 'success') {
                setStatus('capturing');
                setTimeout(() => captureSnapshot(), 120);
              }
              return next;
            });
          } else {
            setLastMetrics(null);
            setFramesOK(0);
          }
        } catch (e) {
          console.error('[face] detect loop error', e);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [video, status]);

  const captureSnapshot = () => {
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setSnapshot(dataUrl);
    setStatus('success');
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
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          <CameraFeed
            facingMode="user"
            onReady={(v) => setVideo(v)}
            overlay={
              <FaceGuideOverlay 
                //state={status}
                //holdProgress={framesOK / GOOD_HOLD_FRAMES}
              />
            }
          />
        </div>

        <aside className="rounded-2xl border border-neutral-200 p-4 bg-white">
          <div className="text-sm text-neutral-500">Status</div>
          <div className="mt-1 text-lg font-medium capitalize">{status}</div>

          <div className="mt-4 space-y-3">
            <Metric label="Confidence" value={`${(meters.conf * 100).toFixed(0)}%`} bar={meters.confPct} />
            <Metric label="Face size" value={`${(meters.ratio * 100).toFixed(0)}%`} bar={meters.ratioPct} />
            <Metric label="FPS" value={`${fps}`} />
            <Metric label="Hold frames" value={`${framesOK}/${GOOD_HOLD_FRAMES}`} bar={Math.round((framesOK/GOOD_HOLD_FRAMES)*100)} />
          </div>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      {typeof bar === 'number' && (
        <div className="mt-1 h-2 rounded-full bg-neutral-200">
          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
