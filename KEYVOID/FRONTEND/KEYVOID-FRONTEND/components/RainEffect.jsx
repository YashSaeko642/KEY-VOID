import { useEffect, useRef } from "react";
import "./RainEffect.css";

class VoidGlow {
  constructor(width, height, index) {
    this.index = index;
    this.baseX = [0.08, 0.78, 0.42, 0.18][index] ?? 0.5;
    this.baseY = [0.12, 0.22, 0.76, 0.88][index] ?? 0.5;
    this.radius = Math.max(width, height) * ([0.46, 0.4, 0.52, 0.36][index] ?? 0.42);
    this.phase = index * 1.7;
    this.speed = 0.002 + index * 0.00045;
    this.colors = [
      ["rgba(86, 170, 255, 0.13)", "rgba(86, 170, 255, 0)"],
      ["rgba(172, 92, 255, 0.11)", "rgba(172, 92, 255, 0)"],
      ["rgba(44, 220, 196, 0.08)", "rgba(44, 220, 196, 0)"],
      ["rgba(255, 108, 194, 0.06)", "rgba(255, 108, 194, 0)"]
    ][index] ?? ["rgba(86, 170, 255, 0.1)", "rgba(86, 170, 255, 0)"];
  }

  draw(ctx, width, height, time) {
    const drift = time * this.speed + this.phase;
    const x = width * this.baseX + Math.cos(drift) * width * 0.055;
    const y = height * this.baseY + Math.sin(drift * 0.8) * height * 0.065;
    const radius = this.radius * (1 + Math.sin(drift * 1.2) * 0.06);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, this.colors[0]);
    gradient.addColorStop(0.44, this.colors[0].replace(/0\.\d+\)/, "0.06)"));
    gradient.addColorStop(1, this.colors[1]);

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function drawLightGrid(ctx, width, height, time) {
  const spacing = 96;
  const offset = (time * 0.012) % spacing;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "rgba(107, 160, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let x = -spacing + offset; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height * 0.08, height);
    ctx.stroke();
  }

  for (let y = spacing * 0.5; y < height; y += spacing * 1.4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + width * 0.025);
    ctx.stroke();
  }

  ctx.restore();
}

export default function RainEffect({ disabled = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (disabled) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const glows = Array.from({ length: 4 }, (_, index) => new VoidGlow(canvas.width, canvas.height, index));

    let animationFrameId;
    const animate = (time = 0) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      glows.forEach((glow) => {
        glow.draw(ctx, canvas.width, canvas.height, time);
      });

      drawLightGrid(ctx, canvas.width, canvas.height, time);
      ctx.restore();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="rain-effect-canvas"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
