"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PiFingerprintSimpleBold } from "react-icons/pi";

export default function PinPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [time, setTime] = useState("");

  // 🔊 Load audio file (put a short click/beep in public/sounds/click.mp3)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioRef.current = new Audio("/sounds/button-ui-sound.mp3");
  }, []);

  // ⏰ Update clock every second
  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const playClick = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // rewind for rapid clicks
      audioRef.current.play().catch(() => {}); // ignore autoplay errors
    }
  };

  const handleInput = (digit: string) => {
    if (loading) return;
    playClick();

    if (digit === "⌫") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (digit !== "✔" && pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const submit = async () => {
    if (pin.length !== 4) {
      setError("Enter 4-digit PIN");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.detail || data.error || "Invalid PIN");
        setPin("");
      } else {
        localStorage.setItem("authUser", JSON.stringify(data));
        router.push("/auth/face");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl text-center">
        {/* Digital Clock */}
        <div className="text-2xl font-mono font-bold mb-2 text-indigo-600">
          {time}
        </div>
        <p className="text-xs text-neutral-500 mb-6">
          Secure access system · Employee Portal
        </p>

        <h1 className="text-xl font-semibold mb-2">Enter Employee PIN</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Please enter your 4-digit employee PIN to continue. This will confirm
          your identity before face verification.
        </p>

        {/* PIN Dots */}
        <div
          className={`flex justify-center gap-3 mb-6 transition ${
            error ? "animate-shake" : ""
          }`}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 ${
                i < pin.length
                  ? "bg-indigo-600 border-indigo-600"
                  : "border-neutral-300"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((key) => (
            <button
              key={key}
              onClick={() => handleInput(key)}
              disabled={loading}
              className="h-14 rounded-full bg-neutral-100 text-xl font-semibold
                         hover:bg-neutral-200 active:scale-95 disabled:opacity-50"
            >
              {key}
            </button>
          ))}
        </div>

        {/* Sign In */}
        <button
          onClick={() => {
            playClick();
            submit();
          }}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white py-3 font-semibold text-lg hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
        >
          <PiFingerprintSimpleBold className="h-6 w-6" />
          {loading ? "Checking..." : "Sign In"}
        </button>

        {loading && (
          <div className="mt-3 text-sm text-neutral-500">Verifying PIN...</div>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          Having trouble signing in? Contact your administrator.
        </p>
      </div>
    </main>
  );
}
