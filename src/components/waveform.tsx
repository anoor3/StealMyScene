"use client";

import { useEffect, useRef } from "react";

export function Waveform({ analyser, active }: { analyser?: AnalyserNode; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !active) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const values = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.scale(ratio, ratio);
      }
      analyser.getByteFrequencyData(values);
      context.clearRect(0, 0, width, height);
      const bars = 36;
      const gap = 3;
      const barWidth = (width - gap * (bars - 1)) / bars;
      for (let index = 0; index < bars; index += 1) {
        const strength = values[Math.floor((index / bars) * values.length)] / 255;
        const barHeight = Math.max(3, strength * height * 0.9);
        context.fillStyle = index % 3 === 0 ? "#ff7089" : "#f7f1e8";
        context.fillRect(index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active, analyser]);

  return <canvas ref={canvasRef} className="waveform" role="img" aria-label={active ? "Live microphone level" : "Microphone level inactive"} />;
}
