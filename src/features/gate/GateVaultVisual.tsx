import React, { useEffect, useRef } from 'react';

interface GateVaultVisualProps {
  steps: [boolean, boolean, boolean, boolean]; // [G6/7, G8/9, G10 SHA-256, G11 TTY]
  passed: boolean;
  diverged: boolean;
  highlightedStep?: number | null;
  onAdvanceStep?: () => void;
}

/**
 * Interactive 3D-Projected 4-Ring Cryptographic Interlock Vault Seal for Phase 0 Gate Chamber.
 * Auto-precesses smoothly in 3D at rest; drag/flick to set your own 3D orbit angle & slow spin axis;
 * double-click to recenter; click directly to engage the next Track B interlock!
 */
export const GateVaultVisual: React.FC<GateVaultVisualProps> = ({
  steps,
  passed,
  diverged,
  highlightedStep = null,
  onAdvanceStep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ steps, passed, diverged, highlightedStep });
  const hoverRef = useRef({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    spinX: 0,
    spinY: 0,
    velX: 0,
    velY: 0,
    cruiseX: 0,
    cruiseY: 0.52,
    customAxis: false,
    resetting: false,
    dragging: false,
    moved: false,
    px: 0,
    py: 0,
  });
  stateRef.current = { steps, passed, diverged, highlightedStep };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 210;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let passWave = 0;
    let prevPassed = false;
    const ringAngles = [0.7, -1.2, 1.9, -0.8];
    const ringTilts = [0.34, 0.28, 0.22, 0.16];
    const lockFlashes = [0, 0, 0, 0];
    const prevSteps = [...stateRef.current.steps];

    const project = (x: number, y: number, z: number, tiltX: number, tiltY: number) => {
      const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
      const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
      const x2 = x * Math.cos(tiltY) + z1 * Math.sin(tiltY);
      const z2 = -x * Math.sin(tiltY) + z1 * Math.cos(tiltY);
      const s = 320 / (320 - z2);
      return { x: size / 2 + x2 * s, y: size / 2 + y1 * s, z: z2 };
    };

    const draw = (now: number) => {
      rafId = requestAnimationFrame(draw);
      const dt = Math.min(Math.max(0, (now - lastTs) / 1000), 0.05);
      lastTs = now;
      elapsed += dt;

      const { steps: curSteps, passed: isPass, diverged: isDiv, highlightedStep: hiStep } = stateRef.current;
      const isLight = document.documentElement.dataset.theme === 'light';
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const damp = 1 - Math.exp(-dt * 7.5);
      hoverRef.current.x += (hoverRef.current.tx - hoverRef.current.x) * damp;
      hoverRef.current.y += (hoverRef.current.ty - hoverRef.current.y) * damp;
      if (!hoverRef.current.dragging) {
        if (hoverRef.current.resetting) {
          const rDamp = 1 - Math.exp(-dt * 7.2);
          hoverRef.current.spinX += (0 - hoverRef.current.spinX) * rDamp;
          hoverRef.current.spinY += (0 - hoverRef.current.spinY) * rDamp;
          if (Math.hypot(hoverRef.current.spinX, hoverRef.current.spinY) < 0.01) {
            hoverRef.current.spinX = 0;
            hoverRef.current.spinY = 0;
            hoverRef.current.resetting = false;
          }
        } else {
          // Smooth flick momentum blending seamlessly into user's chosen slow 3D cruise axis (or default precession)
          const fr = Math.exp(-dt * 3.0);
          hoverRef.current.velX *= fr;
          hoverRef.current.velY *= fr;
          const hoverSlow = hoverRef.current.tx !== 0 || hoverRef.current.ty !== 0 ? 0.55 : 1.0;
          const motionScale = prefersReducedMotion ? 0.35 : 1.0;
          hoverRef.current.spinX += (hoverRef.current.velX + hoverRef.current.cruiseX * hoverSlow * motionScale) * dt;
          hoverRef.current.spinY += (hoverRef.current.velY + hoverRef.current.cruiseY * hoverSlow * motionScale) * dt;
        }
      }

      if (isPass && !prevPassed) passWave = 1.0;
      prevPassed = isPass;
      passWave = Math.min(1, Math.max(0, passWave - dt * 1.15));

      for (let i = 0; i < 4; i++) {
        if (curSteps[i] && !prevSteps[i]) lockFlashes[i] = 1.0;
        prevSteps[i] = curSteps[i];
        lockFlashes[i] = Math.min(1, Math.max(0, lockFlashes[i] - dt * 2.2));

        if (isDiv) {
          ringAngles[i] += dt * (i % 2 === 0 ? 3.8 : -4.4) * (1 + i * 0.15);
          ringTilts[i] += (0.52 - ringTilts[i]) * damp;
        } else if (curSteps[i]) {
          // Snap cleanly toward top-center 0-radian harmonic lock alignment!
          const wrapped = ((ringAngles[i] + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
          ringAngles[i] = wrapped + (0 - wrapped) * damp;
          const targetTilt = isPass ? 0.14 : 0.22;
          ringTilts[i] += (targetTilt - ringTilts[i]) * damp;
        } else {
          ringAngles[i] += dt * (i % 2 === 0 ? 0.52 : -0.62) * (1 + i * 0.12);
          ringTilts[i] += (0.38 - ringTilts[i]) * damp;
        }
      }

      ctx.save();
      try {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size, size);

        const cx = size / 2;
        const cy = size / 2;

        // Ambient vault glow
        const glowRgb = isDiv ? '225,82,74' : isPass ? '37,176,127' : '242,163,58';
        const bgGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 92);
        bgGrad.addColorStop(0, `rgba(${glowRgb},${isLight ? 0.2 : 0.32})`);
        bgGrad.addColorStop(0.6, `rgba(${glowRgb},${isLight ? 0.05 : 0.1})`);
        bgGrad.addColorStop(1, `rgba(${glowRgb},0)`);
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 92, 0, Math.PI * 2);
        ctx.fill();

        // Vertical alignment laser crosshair at 12 o'clock (shows harmonic lock axis!)
        ctx.strokeStyle = isDiv
          ? 'rgba(225,82,74,0.45)'
          : isPass
            ? 'rgba(60,227,168,0.65)'
            : isLight
              ? 'rgba(18,32,63,0.16)'
              : 'rgba(242,163,58,0.24)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, 12);
        ctx.lineTo(cx, size - 12);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4 Concentric Machined 3D Interlock Rings (outer = Step 01 -> inner = Step 04)
        const radii = [84, 68, 52, 37];
        const labels = ['01', '02', '03', '04'];
        const swayY = Math.sin(elapsed * 0.65) * 0.16;
        const swayX = Math.cos(elapsed * 0.48) * 0.1;

        for (let i = 0; i < 4; i++) {
          const r = radii[i];
          const locked = curSteps[i] && !isDiv;
          const flash = lockFlashes[i];
          const col = isDiv
            ? '225,82,74'
            : isPass
              ? isLight ? '19,118,82' : '56,222,164'
              : locked
                ? isLight ? '19,118,82' : '37,176,127'
                : isLight
                  ? '68,84,116'
                  : '142,160,196';

          // Draw segmented arc leaving an engineered lock notch at ringAngles[i] - PI/2
          const notchAngle = ringAngles[i] - Math.PI / 2;
          const gap = 0.22;
          const isHi = hiStep === i;
          const tiltX = ringTilts[i] + swayX * (i % 2 === 0 ? 1 : -1) + hoverRef.current.y * 0.26 + hoverRef.current.spinX;
          const tiltY = swayY * (i % 2 === 0 ? 1 : -1) + hoverRef.current.x * 0.32 + hoverRef.current.spinY;

          ctx.strokeStyle = isHi
            ? isLight
              ? 'rgba(184,108,8,0.96)'
              : 'rgba(255,212,118,0.98)'
            : `rgba(${col},${locked || isDiv ? 0.9 : isLight ? 0.48 : 0.44})`;
          ctx.lineWidth = isHi ? 3.2 : locked ? 2.4 + flash * 2.2 : 1.5;
          ctx.beginPath();
          const segs = 64;
          for (let s = 0; s <= segs; s++) {
            const a = notchAngle + gap + (Math.PI * 2 - gap * 2) * (s / segs);
            const pt = project(Math.cos(a) * r, Math.sin(a) * r, 0, tiltX, tiltY);
            if (s === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          // Vernier precision ticks on ring 0 and ring 2
          if (i === 0 || i === 2) {
            ctx.strokeStyle = `rgba(${col},${locked ? 0.55 : 0.28})`;
            ctx.lineWidth = 1;
            const count = i === 0 ? 24 : 16;
            for (let k = 0; k < count; k++) {
              const a = notchAngle + (k / count) * Math.PI * 2;
              const p0 = project(Math.cos(a) * (r - 3.5), Math.sin(a) * (r - 3.5), 0, tiltX, tiltY);
              const p1 = project(Math.cos(a) * (r + 3.5), Math.sin(a) * (r + 3.5), 0, tiltX, tiltY);
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
              ctx.stroke();
            }
          }

          // Glowing Interlock Pin Sitting Inside the Ring's Notch
          const pin = project(Math.cos(notchAngle) * r, Math.sin(notchAngle) * r, 0, tiltX, tiltY);
          const pinR = Math.max(1, locked ? 4.4 + flash * 2.6 : 3.2);
          ctx.fillStyle = isDiv
            ? '#ff7d75'
            : locked
              ? isLight ? '#137652' : '#6ce8bb'
              : isLight
                ? '#b86c08'
                : '#f2a33a';
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, pinR, 0, Math.PI * 2);
          ctx.fill();

          if (flash > 0.05) {
            const pulseR = Math.max(1, pinR + (1 - flash) * 14);
            ctx.strokeStyle = isLight ? `rgba(19,118,82,${flash * 0.78})` : `rgba(108,232,187,${flash * 0.8})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, pulseR, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Central 3D Crystalline Octahedron Core (Seals Emerald on PASS, Fractures Crimson on Tamper)
        const coreR = isPass ? 18 : 15;
        const spin = elapsed * (isDiv ? 3.2 : isPass ? 0.65 : 0.9);
        const coreTiltX = 0.25 + hoverRef.current.y * 0.22 + hoverRef.current.spinX;
        const coreSpinY = spin + hoverRef.current.x * 0.3 + hoverRef.current.spinY;
        const top = project(0, -coreR, 0, coreTiltX, coreSpinY);
        const bot = project(0, coreR, 0, coreTiltX, coreSpinY);
        const eq = [0, 1, 2, 3].map((k) => {
          const a = (k / 4) * Math.PI * 2 + coreSpinY;
          return project(Math.cos(a) * coreR, 0, Math.sin(a) * coreR, coreTiltX, coreSpinY * 0.4);
        });

        ctx.strokeStyle = isDiv
          ? isLight ? 'rgba(184,48,41,0.95)' : 'rgba(255,112,104,0.95)'
          : isPass
            ? isLight ? 'rgba(19,118,82,0.95)' : 'rgba(108,232,187,0.98)'
            : isLight ? 'rgba(184,108,8,0.92)' : 'rgba(242,163,58,0.88)';
        ctx.fillStyle = isDiv
          ? 'rgba(225,82,74,0.22)'
          : isPass
            ? 'rgba(37,176,127,0.28)'
            : 'rgba(242,163,58,0.16)';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 4; k++) {
          const nk = (k + 1) % 4;
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(eq[k].x, eq[k].y);
          ctx.lineTo(eq[nk].x, eq[nk].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(bot.x, bot.y);
          ctx.lineTo(eq[k].x, eq[k].y);
          ctx.lineTo(eq[nk].x, eq[nk].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Expanding radial emerald seal pulse + orbiting SHA-256 verification motes when all 4 gates clear!
        if (passWave > 0.02) {
          const pr = Math.max(1, 18 + (1 - passWave) * 86);
          ctx.strokeStyle = isLight ? `rgba(19,118,82,${passWave * 0.85})` : `rgba(108,232,187,${passWave * 0.9})`;
          ctx.lineWidth = Math.max(0.5, 2.4 * passWave);
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (isPass && !isDiv) {
          for (let m = 0; m < 8; m++) {
            const a = elapsed * (0.9 + (m % 3) * 0.25) + (m * Math.PI) / 4;
            const orbR = 26 + (m % 2) * 20;
            const pt = project(
              Math.cos(a) * orbR,
              Math.sin(a * 1.4) * 14,
              Math.sin(a) * orbR,
              0.28 + hoverRef.current.spinX,
              hoverRef.current.spinY
            );
            ctx.fillStyle = isLight ? 'rgba(14,118,82,0.85)' : 'rgba(108,232,187,0.92)';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 1.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Tiny 4-dot telemetry footer inside canvas
        const cleared = curSteps.filter(Boolean).length;
        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = isDiv
          ? (isLight ? '#b83029' : '#ff8e87')
          : isPass
            ? (isLight ? '#137652' : '#6ce8bb')
            : (isLight ? '#43506b' : '#8fa0bf');
        const statusText = isDiv
          ? 'SHA-256 DIVERGED'
          : isPass
            ? '4/4 LOCKED · SEALED'
            : `${cleared}/4 INTERLOCKS (${labels.filter((_, idx) => curSteps[idx]).join('·') || 'HOLD'})`;
        ctx.fillText(statusText, cx, size - 5);
      } finally {
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <button
      type="button"
      className={`gate-vault-card is-interactive ${passed ? 'is-pass' : ''} ${diverged ? 'is-diverged' : ''}`}
      onClick={() => {
        if (hoverRef.current.moved) {
          hoverRef.current.moved = false;
          return;
        }
        onAdvanceStep?.();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        hoverRef.current.velX = 0;
        hoverRef.current.velY = 0;
        hoverRef.current.cruiseX = 0;
        hoverRef.current.cruiseY = 0.52;
        hoverRef.current.customAxis = false;
        hoverRef.current.resetting = true;
      }}
      onPointerDown={(e) => {
        hoverRef.current.dragging = true;
        hoverRef.current.moved = false;
        hoverRef.current.resetting = false;
        hoverRef.current.velX = 0;
        hoverRef.current.velY = 0;
        hoverRef.current.px = e.clientX;
        hoverRef.current.py = e.clientY;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        hoverRef.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        hoverRef.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        if (hoverRef.current.dragging) {
          const dx = e.clientX - hoverRef.current.px;
          const dy = e.clientY - hoverRef.current.py;
          if (Math.hypot(dx, dy) > 4) hoverRef.current.moved = true;
          hoverRef.current.spinY += dx * 0.018;
          hoverRef.current.spinX += dy * 0.018;
          hoverRef.current.velY = Math.max(-6, Math.min(6, dx * 0.16));
          hoverRef.current.velX = Math.max(-6, Math.min(6, dy * 0.16));
          hoverRef.current.px = e.clientX;
          hoverRef.current.py = e.clientY;
        }
      }}
      onPointerUp={(e) => {
        if (hoverRef.current.dragging && hoverRef.current.moved) {
          const mag = Math.hypot(hoverRef.current.velX, hoverRef.current.velY);
          if (mag > 0.15) {
            hoverRef.current.cruiseX = (hoverRef.current.velX / mag) * 0.56;
            hoverRef.current.cruiseY = (hoverRef.current.velY / mag) * 0.56;
            hoverRef.current.customAxis = true;
          } else {
            // Preserve the user's exact placed angle with gentle slow spin
            hoverRef.current.cruiseX = 0;
            hoverRef.current.cruiseY = 0.32;
          }
        }
        hoverRef.current.dragging = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerLeave={() => {
        hoverRef.current.tx = 0;
        hoverRef.current.ty = 0;
        hoverRef.current.dragging = false;
      }}
      title={passed ? 'Drag to spin 3D vault (flick sets axis · dbl-click resets) · click to Tamper' : 'Drag to spin 3D vault (flick sets axis · dbl-click resets) · click to engage next lock'}
      aria-label="Interactive 4-ring cryptographic Phase 0 gate interlock visualizer — drag to rotate 3D, flick to set spin axis, or click to engage next gate step"
    >
      <div className="gate-vault-head mono">
        <span>CRYPTO INTERLOCK</span>
        <span className={`vault-dot ${diverged ? 'is-fail' : passed ? 'is-pass' : ''}`} />
      </div>
      <canvas
        ref={canvasRef}
        className="gate-vault-canvas"
        aria-hidden="true"
      />
      <span className="gate-vault-cue mono">
        {diverged ? 'CLICK TO RESTORE' : passed ? 'SEALED · CLICK TO TAMPER' : 'DRAG 3D · CLICK TO LOCK'}
      </span>
    </button>
  );
};
