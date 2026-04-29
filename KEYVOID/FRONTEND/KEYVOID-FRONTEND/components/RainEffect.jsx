import { useEffect, useRef } from "react";
import "./RainEffect.css";

class Raindrop {
  constructor(width, height) {
    this.length = Math.random() * 15 + 10;
    this.reset(width);
    this.y = Math.random() * height;
  }

  reset(width) {
    this.x = Math.random() * width;
    this.y = -this.length;
    this.velocity = Math.random() * 3 + 2;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.length = Math.random() * 15 + 10;
    this.width = Math.random() * 1 + 0.5;
  }

  update(canvas) {
    this.y += this.velocity;
    if (this.y > canvas.height) {
      this.reset(canvas.width);
    }
  }

  draw(ctx) {
    if (!ctx) return;

    ctx.strokeStyle = `rgba(148, 163, 184, ${this.opacity})`;
    ctx.lineWidth = this.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + this.length);
    ctx.stroke();
  }
}

export default function RainEffect() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const raindrops = [];
    const rainCount = 500;

    for (let i = 0; i < rainCount; i++) {
      raindrops.push(new Raindrop(canvas.width, canvas.height));
    }

    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      raindrops.forEach((drop) => {
        drop.update(canvas);
        drop.draw();
      });

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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="rain-effect-canvas"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
