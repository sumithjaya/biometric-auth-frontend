"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import * as faceapi from "face-api.js";
import { loadFaceModels } from "@/lib/loader";
import { detectPrimaryFace } from "@/lib/detector";
import { FaceGuideOverlay } from "@/components/camera/FaceGuideOverlay";
import { useTfBackend } from "@/lib/hooks/useTfBackend";
import HoldFrameProgress from "@/components/camera/HoldFrameProgress";

const CameraFeed = dynamic(
  () => import("@/components/camera/CameraFeed").then((m) => m.CameraFeed),
  { ssr: false }
);

const DETECTOR_OPTS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.4,
});
const MIN_CONFIDENCE = 0.55;
const MIN_FACE_RATIO = 0.16;
const GOOD_HOLD_FRAMES = 10;

type Status = "loading" | "align" | "capturing" | "success" | "error";

type AuthUser = {
  ok: boolean;
  employee_id: string;
  name: string;
};

export default function FaceAuthPage() {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [fps, setFps] = useState(0);
  const [framesOK, setFramesOK] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [lastMetrics, setLastMetrics] = useState<{
    conf: number;
    ratio: number;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useTfBackend("webgl");
  const capturePendingRef = useRef(false);
  const captureTimeoutRef = useRef<number | null>(null);
  const router = useRouter();

  // ✅ Load employee details from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("authUser");
    if (stored) {
      setUser(JSON.parse(stored));
    } else {
      router.push("/auth/pin"); // redirect for security
    }
  }, [router]);

  // ✅ Load models
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadFaceModels("/models");
        if (alive) setStatus("align");
      } catch (e) {
        console.error("[face] model load failed", e);
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ✅ Detection loop
  useEffect(() => {
    if (!video || status !== "align") return;
    let raf = 0;
    let lastT = performance.now();

    const tick = async () => {
      const now = performance.now();
      const dt = now - lastT;
      if (dt >= 500) {
        setFps(Math.max(1, Math.round(1000 / dt)));
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
              if (ok) {
                const next = Math.min(GOOD_HOLD_FRAMES, n + 1);
                if (next >= GOOD_HOLD_FRAMES && !capturePendingRef.current) {
                  capturePendingRef.current = true;
                  setStatus("capturing");
                  captureTimeoutRef.current = window.setTimeout(
                    () => captureSnapshot(),
                    120
                  );
                }
                return next;
              } else {
                return 0; // reset instead of decrement
              }
            });
          } else {
            setLastMetrics(null);
            setFramesOK(0);
          }
        } catch (e) {
          console.error("[face] detect loop error", e);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [video, status]);

  const captureSnapshot = () => {
    if (!video) return;
    if (captureTimeoutRef.current) {
      clearTimeout(captureTimeoutRef.current);
      captureTimeoutRef.current = null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setSnapshot(dataUrl);
    setStatus("success");
    capturePendingRef.current = false;
  };

  const meters = useMemo(() => {
    const conf = lastMetrics?.conf ?? 0;
    const ratio = lastMetrics?.ratio ?? 0;
    const confPct = Math.round(Math.min(1, conf / MIN_CONFIDENCE) * 100);
    const ratioPct = Math.round(Math.min(1, ratio / MIN_FACE_RATIO) * 100);
    return { conf, ratio, confPct, ratioPct };
  }, [lastMetrics]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12 space-y-6">
      {/* ✅ Show employee info */}
      {user && (
        <div className="rounded-xl border bg-white p-4 shadow">
          <h2 className="text-lg font-semibold">
            Welcome, {user.name}{" "}
            <span className="text-gray-500">({user.employee_id})</span>
          </h2>
          <p className="text-sm text-gray-600">
            Please align your face in the frame to complete authentication.
          </p>
        </div>
      )}

      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        Face sign-in
      </h1>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
          {snapshot ? (
            <img
              src={snapshot}
              alt="Captured face"
              className="w-full h-full object-cover"
            />
          ) : (
            <CameraFeed
              facingMode="user"
              onReady={(v) => setVideo(v)}
              overlay={<FaceGuideOverlay />}
            />
          )}
        </div>

        <aside className="rounded-2xl border border-neutral-200 p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="text-sm text-neutral-500">Status</div>
            <div className="mt-1 text-lg font-medium capitalize">{status}</div>

            <div className="mt-4 space-y-3">
              <Metric
                label="Confidence"
                value={`${(meters.conf * 100).toFixed(0)}%`}
                bar={meters.confPct}
              />
              <Metric
                label="Face size"
                value={`${(meters.ratio * 100).toFixed(0)}%`}
                bar={meters.ratioPct}
              />
              <Metric label="FPS" value={`${fps}`} />
              <HoldFrameProgress value={framesOK} max={GOOD_HOLD_FRAMES} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  bar,
}: {
  label: string;
  value: string;
  bar?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      {typeof bar === "number" && (
        <div className="mt-1 h-2 rounded-full bg-neutral-200">
          <div
            className="h-2 rounded-full bg-emerald-500"
            style={{ width: `${bar}%` }}
          />
        </div>
      )}
    </div>
  );
}
