import React, { useState, useEffect } from 'react';

export const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 100);
    return () => clearInterval(timer);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');
  const ms = Math.floor(time.getMilliseconds() / 10).toString().padStart(2, '0');
  
  const day = time.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const date = time.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

  return (
    <div className="flex flex-col items-end font-mono">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black text-primary hud-text-glow tracking-tighter">{hh}:{mm}:{ss}</span>
        <span className="text-xs text-primary/60 font-bold w-6">{ms}</span>
      </div>
      <div className="flex gap-3 text-[9px] tracking-[0.2em] font-bold text-primary/40 uppercase mt-[-4px]">
        <span>{day}</span>
        <span className="w-[1px] h-full bg-primary/20"></span>
        <span>{date}</span>
      </div>
    </div>
  );
};
