"use client";

import React from "react";

export default function HoldFrameProgress({ value, max }: { value: number; max: number }) {
  const pct = (value / max) * 100;
  const r = 28;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative flex items-center justify-center mt-4">
      <svg className="w-20 h-20 transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="#e5e7eb"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="#10b981"
          strokeWidth="6"
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          className="transition-all duration-200"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-gray-700">
        {value}/{max}
      </span>
    </div>
  );
}
