"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  dagen: number;
  uur: number;
  min: number;
  sec: number;
};

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  const totalSec = Math.floor(diff / 1000);
  return {
    dagen: Math.floor(totalSec / 86400),
    uur: Math.floor((totalSec % 86400) / 3600),
    min: Math.floor((totalSec % 3600) / 60),
    sec: totalSec % 60,
  };
}

export function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const target = new Date(targetDate);
    setTimeLeft(getTimeLeft(target));
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const items = [
    { value: timeLeft?.dagen ?? 0, label: "dagen" },
    { value: timeLeft?.uur ?? 0, label: "uur" },
    { value: timeLeft?.min ?? 0, label: "min" },
    { value: timeLeft?.sec ?? 0, label: "sec" },
  ];

  return (
    <div className="bg-red-sportac flex items-stretch">
      <div className="bg-black/20 px-6 py-3.5 text-white text-xs font-bold uppercase tracking-widest flex items-center whitespace-nowrap">
        Aftellen tot het EK
      </div>
      <div className="flex flex-1">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 border-l border-white/20"
          >
            <span className="font-condensed font-black text-2xl text-white leading-none">
              {String(item.value).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-semibold text-white/70 self-end pb-0.5">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
