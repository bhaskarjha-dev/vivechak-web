import React, { useEffect, useRef } from 'react';
import type { RnbxProfile } from '@/shared/lib/scopeEngine';

interface RiskDoorVisualProps {
  rnbx: RnbxProfile;
  doorType: 'one-way' | 'two-way';
  hardOverride: boolean;
  onCycleMode?: () => void;
}

/**
 * Interactive Real-Time 3D-Projected Reversibility Portal & Risk Polyhedron.
 * Hover to tilt 3D perspective; click to cycle Two-Way Door -> One-Way Vault -> X=3 Lock.
 */
export const RiskDoorVisual: React.FC<RiskDoorVisualProps> = ({
  rnbx,
  doorType,
  hardOverride,
  onCycleMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const propsRef = useRef({ rnbx, doorType, hardOverride });
  const hoverTiltRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, spinY: 0, spinX: 0, velY: 0, velX: 0, dragging: false, moved: false, px: 0, py: 0 });
  propsRef.current = { rnbx, doorType, hardOverride };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 84;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    let rafId = 0;
    let lastTs = performance.now();
    let t = 0;
    let oneWayBlend = propsRef.current.doorType === 'one-way' ? 1 : 0;
    let overrideBlend = propsRef.current.hardOverride ? 1 : 0;

    const project = (x: number, y: number, z: number, rx: number, ry: number) => {
      const y1 = y * Math.cos(rx) - z * Math.sin(rx);
      const z1 = y * Math.sin(rx) + z * Math.cos(rx);
      const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
      const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      const scale = 140 / (140 - z2);
      return { x: size / 2 + x2 * scale, y: size / 2 + y1 * scale, z: z2 };
    };

    const draw = (now: number) => {
      rafId = requestAnimationFrame(draw);
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      const { rnbx: p, doorType: dtMode, hardOverride: ov } = propsRef.current;
      const isLight = document.documentElement.dataset.theme === 'light';
      const intensity = (p.r + p.n + p.b + p.x) / 12;
      const damp = 1 - Math.exp(-dt * 8);

      oneWayBlend += ((dtMode === 'one-way' ? 1 : 0) - oneWayBlend) * damp;
      overrideBlend += ((ov ? 1 : 0) - overrideBlend) * damp;
      hoverTiltRef.current.x += (hoverTiltRef.current.tx - hoverTiltRef.current.x) * damp;
      hoverTiltRef.current.y += (hoverTiltRef.current.ty - hoverTiltRef.current.y) * damp;
      if (!hoverTiltRef.current.dragging) {
        hoverTiltRef.current.spinY += hoverTiltRef.current.velY * dt;
        hoverTiltRef.current.spinX += hoverTiltRef.current.velX * dt;
        const fr = Math.exp(-dt * 3.6);
        hoverTiltRef.current.velY *= fr;
        hoverTiltRef.current.velX *= fr;
      }
      const hx = hoverTiltRef.current.x + hoverTiltRef.current.spinY;
      const hy = hoverTiltRef.current.y + hoverTiltRef.current.spinX;
      t += dt * (0.9 + intensity * 1.45);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;

      // Primary semantic color interpolation: Emerald (Two-Way) -> Saffron (One-Way) -> Crimson (X=3)
      const rCol = Math.round(
        37 + (242 - 37) * oneWayBlend + (225 - 242) * overrideBlend
      );
      const gCol = Math.round(
        176 + (163 - 176) * oneWayBlend + (82 - 163) * overrideBlend
      );
      const bCol = Math.round(
        127 + (58 - 127) * oneWayBlend + (74 - 58) * overrideBlend
      );
      const accent = `${rCol},${gCol},${bCol}`;

      // Ambient core glow
      const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 36);
      halo.addColorStop(0, `rgba(${accent},${isLight ? 0.3 : 0.44})`);
      halo.addColorStop(1, `rgba(${accent},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 36, 0, Math.PI * 2);
      ctx.fill();

      // Outer 3D gimbal ring (ticks tighten into vault lock on One-Way / Override)
      const ringR = 29;
      ctx.strokeStyle = `rgba(${accent},${isLight ? 0.72 : 0.78})`;
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2 + t * 0.45;
        const pt = project(Math.cos(a) * ringR, Math.sin(a) * ringR, 0, 0.55 + oneWayBlend * 0.25 + hy * 0.45, t * 0.4 + hx * 0.55);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Second orthogonal orbital ring (represents blast radius B + novelty N)
      ctx.strokeStyle = isLight ? 'rgba(18,32,63,0.34)' : 'rgba(166,179,204,0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI * 2 - t * 0.6;
        const pt = project(Math.cos(a) * 23, 0, Math.sin(a) * 23, 0.42, -t * 0.55);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Central 3D Door / Containment Polyhedron
      if (overrideBlend > 0.45) {
        // X=3 Hard Override: Rotating 3D Hexagonal Containment Cage
        const cageR = 15.5;
        const vertsTop: { x: number; y: number }[] = [];
        const vertsBot: { x: number; y: number }[] = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 0.65;
          vertsTop.push(project(Math.cos(a) * cageR, -11, Math.sin(a) * cageR, 0.36, 0));
          vertsBot.push(project(Math.cos(a) * cageR, 11, Math.sin(a) * cageR, 0.36, 0));
        }
        ctx.strokeStyle = `rgba(255,112,104,${0.88 * overrideBlend})`;
        ctx.lineWidth = 1.35;
        for (let i = 0; i < 6; i++) {
          const j = (i + 1) % 6;
          ctx.beginPath();
          ctx.moveTo(vertsTop[i].x, vertsTop[i].y);
          ctx.lineTo(vertsTop[j].x, vertsTop[j].y);
          ctx.moveTo(vertsBot[i].x, vertsBot[i].y);
          ctx.lineTo(vertsBot[j].x, vertsBot[j].y);
          ctx.moveTo(vertsTop[i].x, vertsTop[i].y);
          ctx.lineTo(vertsBot[i].x, vertsBot[i].y);
          ctx.stroke();
        }
        // Horizontal red laser scan line across cage
        const ly = cy + Math.sin(t * 2.8) * 12;
        ctx.strokeStyle = 'rgba(255,150,144,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx - 18, ly);
        ctx.lineTo(cx + 18, ly);
        ctx.stroke();
      } else {
        // Swinging Two-Way Door Panels <-> Interlocking One-Way Vault Diamond
        const swingAngle = (1 - oneWayBlend) * (0.55 + Math.sin(t * 1.9) * 0.42);
        const panelW = 13;
        const panelH = 16;

        // Left & Right 3D swinging door wings
        for (const side of [-1, 1]) {
          const hingeX = side * 14;
          const a = side * swingAngle;
          const tipX = hingeX - side * Math.cos(a) * panelW;
          const tipZ = Math.sin(a) * panelW;
          const p0 = project(hingeX, -panelH, 0, 0.2, 0);
          const p1 = project(tipX, -panelH, tipZ, 0.2, 0);
          const p2 = project(tipX, panelH, tipZ, 0.2, 0);
          const p3 = project(hingeX, panelH, 0, 0.2, 0);

          ctx.fillStyle = `rgba(${accent},${isLight ? 0.16 : 0.22})`;
          ctx.strokeStyle = `rgba(${accent},${isLight ? 0.85 : 0.92})`;
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // Luminous Epistemic Core Center Node
      const coreR = 4.2 + intensity * 1.8 + Math.sin(t * 2.6) * 0.5;
      const cg = ctx.createRadialGradient(cx - 1.2, cy - 1.2, 0.5, cx, cy, coreR);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.55, `rgb(${accent})`);
      cg.addColorStop(1, `rgba(${accent},0.35)`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <button
      type="button"
      className="risk-door-btn"
      onClick={() => {
        if (hoverTiltRef.current.moved) {
          hoverTiltRef.current.moved = false;
          return;
        }
        onCycleMode?.();
      }}
      onPointerDown={(e) => {
        hoverTiltRef.current.dragging = true;
        hoverTiltRef.current.moved = false;
        hoverTiltRef.current.px = e.clientX;
        hoverTiltRef.current.py = e.clientY;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        hoverTiltRef.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        hoverTiltRef.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        if (hoverTiltRef.current.dragging) {
          const dx = e.clientX - hoverTiltRef.current.px;
          const dy = e.clientY - hoverTiltRef.current.py;
          if (Math.hypot(dx, dy) > 3) hoverTiltRef.current.moved = true;
          hoverTiltRef.current.spinY += dx * 0.032;
          hoverTiltRef.current.spinX += dy * 0.032;
          hoverTiltRef.current.velY = dx * 0.25;
          hoverTiltRef.current.velX = dy * 0.25;
          hoverTiltRef.current.px = e.clientX;
          hoverTiltRef.current.py = e.clientY;
        }
      }}
      onPointerUp={(e) => {
        hoverTiltRef.current.dragging = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerLeave={() => {
        hoverTiltRef.current.tx = 0;
        hoverTiltRef.current.ty = 0;
        hoverTiltRef.current.dragging = false;
      }}
      title="Drag to spin 3D portal · click to cycle Two-Way Door → One-Way Vault → X=3 Override"
      aria-label="Interactive 3D reversibility door — drag to rotate 360° or click to cycle door mode"
    >
      <canvas
        ref={canvasRef}
        className="risk-door-canvas"
        width={84}
        height={84}
        aria-hidden="true"
      />
    </button>
  );
};
