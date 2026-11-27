import React, { useEffect, useRef } from 'react';
import {
  QUAT_IDENTITY,
  buildCanonicalContours,
  buildSplitContours,
  quatAngleToIdentity,
  quatFromAxisAngle,
  quatMultiply,
  quatNormalize,
  quatRotateVec,
  quatSlerp,
  quatToEulerDeg,
  type Point2D,
  type Quat,
  type Vec3,
} from '@/shared/lib/sieveGeometry3D';
import { soundEngine } from '@/shared/lib/sound';
import type { ThemeMode } from '@/shared/lib/theme';
import type { SieveMode } from './LogoShared';

interface VivechakLogoCanvas2DProps {
  mode: SieveMode;
  theme: ThemeMode;
  impulseNonce: number;
  replayNonce: number;
  resetAxisNonce?: number;
  rotationPaused?: boolean;
  onQuickPulse?: () => void;
  onSuperDistill?: () => void;
  onTruthPulse?: () => void;
  onCustomSpinChange?: (custom: boolean) => void;
}

// Exact canonical Vivechak vector geometry on 512x512 canvas (docs/BRAND.md: S = 36)
const OUTER_SVG =
  'M 112 116.25 H 400 A 18 18 0 0 1 400 152.25 H 375.8 A 10.8 10.8 0 0 0 366.45 157.65 L 271.59 321.96 A 18 18 0 0 1 240.41 321.96 L 145.55 157.65 A 10.8 10.8 0 0 0 136.2 152.25 H 112 A 18 18 0 0 1 112 116.25 Z';
const INNER_SVG =
  'M 315.53 152.25 H 196.47 A 7.2 7.2 0 0 0 190.24 163.05 L 249.76 266.16 A 7.2 7.2 0 0 0 262.24 266.16 L 321.76 163.05 A 7.2 7.2 0 0 0 315.53 152.25 Z';

// Kinematic 3-piece architectural decomposition for Raw Chat aperture split & 3D depth parallax
const BAR_PART_SVG =
  'M 112 116.25 H 400 A 18 18 0 0 1 400 152.25 H 112 A 18 18 0 0 1 112 116.25 Z';
const LEFT_ARM_SVG =
  'M 145.55 154 L 188 154 L 254.5 270 L 254.5 329 A 18 18 0 0 1 240.41 321.96 L 145.55 157.65 Z';
const RIGHT_ARM_SVG =
  'M 366.45 154 L 324 154 L 257.5 270 L 257.5 329 A 18 18 0 0 0 271.59 321.96 L 366.45 157.65 Z';

interface ClaimMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'verified' | 'noise';
  r: number;
  life: number;
  maxLife: number;
  state: 'entering' | 'deflected' | 'funneling';
}

interface ImpactGlint {
  x: number;
  y: number;
  age: number;
  kind: 'verified' | 'noise';
}

interface Ripple {
  age: number;
  maxAge: number;
  maxRadius: number;
  strong: boolean;
  emerald?: boolean;
}

type GestureMode = 'idle' | 'charge' | 'orbit' | 'pull-drop';

/**
 * Tactile 60fps "Epistemic Gravity Instrument" (Canvas 2D).
 * Calm & uncluttered at rest (honors docs/BRAND.md 1S clearspace), deeply alive under your hand:
 * - Hover upper mouth: pour live claims into the 30° sieve.
 * - Press & Hold anywhere: gravitationally charge 0%->100% distillation with radial precision arc -> Super-Distillation Seal!
 * - Press & Drag across monolith: orbit in 3D with perspective foreshortening, machined bevel shift & spring return!
 * - Grab & Pull the Saffron Drop: stretch it on an elastic liquid-gold filament, release to spring-snap with water ripple!
 */
export const VivechakLogoCanvas2D: React.FC<VivechakLogoCanvas2DProps> = ({
  mode,
  theme,
  impulseNonce,
  replayNonce,
  resetAxisNonce = 0,
  rotationPaused = false,
  onQuickPulse,
  onSuperDistill,
  onTruthPulse,
  onCustomSpinChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<SieveMode>(mode);
  const themeRef = useRef<ThemeMode>(theme);
  const pausedRef = useRef(rotationPaused);
  const quickCbRef = useRef(onQuickPulse);
  const superCbRef = useRef(onSuperDistill);
  const pulseCbRef = useRef(onTruthPulse);
  const customSpinCbRef = useRef(onCustomSpinChange);
  const entranceRef = useRef(0);
  const condenseRef = useRef(1);
  const condenseSuperRef = useRef(false);
  const dropVelRef = useRef(0);
  const dropSquashRef = useRef(0);
  const resetQuatRef = useRef(false);

  modeRef.current = mode;
  themeRef.current = theme;
  pausedRef.current = rotationPaused;
  quickCbRef.current = onQuickPulse;
  superCbRef.current = onSuperDistill;
  pulseCbRef.current = onTruthPulse;
  customSpinCbRef.current = onCustomSpinChange;

  useEffect(() => {
    if (impulseNonce > 0) {
      condenseRef.current = 0;
    }
  }, [impulseNonce]);

  useEffect(() => {
    if (replayNonce > 0) {
      entranceRef.current = 0;
      condenseRef.current = 1;
      dropSquashRef.current = 0;
      dropVelRef.current = 0;
      resetQuatRef.current = true;
    }
  }, [replayNonce]);

  useEffect(() => {
    if (resetAxisNonce > 0) {
      resetQuatRef.current = true;
    }
  }, [resetAxisNonce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fullPath = new Path2D(`${OUTER_SVG} ${INNER_SVG}`);
    const outerPath = new Path2D(OUTER_SVG);
    const innerPath = new Path2D(INNER_SVG);
    const barPath = new Path2D(BAR_PART_SVG);
    const leftArmPath = new Path2D(LEFT_ARM_SVG);
    const rightArmPath = new Path2D(RIGHT_ARM_SVG);

    const makeBrush = (lightA: number, darkA: number) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const g = c.getContext('2d');
      if (g) {
        for (let y = 0; y < 256; y += 2) {
          const a = y % 4 === 0 ? lightA : darkA;
          g.fillStyle = y % 4 === 0 ? `rgba(255,255,255,${a})` : `rgba(8,16,36,${a})`;
          g.fillRect(0, y, 256, 1);
        }
      }
      return ctx.createPattern(c, 'repeat');
    };
    const brushDark = makeBrush(0.032, 0.025);
    const brushLight = makeBrush(0.014, 0.018);

    const claims: ClaimMote[] = [];
    const glints: ImpactGlint[] = [];
    const ripples: Ripple[] = [];

    const spawnClaim = (xOverride?: number, yOverride?: number, forceKind?: 'verified' | 'noise') => {
      if (claims.length >= 36) return;
      const isVerified = forceKind ? forceKind === 'verified' : Math.random() < 0.46;
      const x =
        xOverride !== undefined
          ? Math.max(108, Math.min(404, xOverride))
          : isVerified
            ? 256 + (Math.random() - 0.5) * 98
            : 256 + (Math.random() < 0.5 ? -1 : 1) * (54 + Math.random() * 88);
      const y = yOverride !== undefined ? yOverride : 50 + Math.random() * 26;
      claims.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 14,
        vy: 38 + Math.random() * 26,
        kind: isVerified ? 'verified' : 'noise',
        r: isVerified ? 3.2 + Math.random() * 1.1 : 2.5 + Math.random() * 0.9,
        life: 0,
        maxLife: 3.4 + Math.random() * 1.2,
        state: 'entering',
      });
    };

    const search = typeof window !== 'undefined' ? window.location.search : '';
    const forceChargePreview = search.includes('charging=1');
    const forceOrbitPreview = search.includes('orbit=1');
    const forceFlipPreview = search.includes('flip=1');
    const forceCondensePreview = search.includes('midcondense=1');
    if (
      search.includes('settled=1') ||
      forceCondensePreview ||
      forceChargePreview ||
      forceOrbitPreview ||
      forceFlipPreview
    ) {
      entranceRef.current = 1;
      for (let i = 0; i < 14; i++) {
        spawnClaim(undefined, 70 + Math.random() * 165, i % 2 === 0 ? 'verified' : undefined);
      }
      if (forceCondensePreview) {
        condenseRef.current = 0.44;
        ripples.push({ age: 0.24, maxAge: 1.12, maxRadius: 72, strong: true });
        ripples.push({ age: 0.08, maxAge: 1.05, maxRadius: 52, strong: false });
      }
    } else if (search.includes('midforge=1')) {
      entranceRef.current = 0.58;
      condenseRef.current = 0.28;
    }

    const contours = buildCanonicalContours();
    const splitContours = buildSplitContours();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const DEFAULT_CRUISE_AXIS: Vec3 = [0.05 / Math.hypot(0.05, 1.0, 0.0), 1.0 / Math.hypot(0.05, 1.0, 0.0), 0];
    const DEFAULT_CRUISE_SPEED = 0; // Poised upright stance at rest; 360° flick cruise activates on user drag
    let cruiseAxis: Vec3 = [...DEFAULT_CRUISE_AXIS];
    let userQuat: Quat = QUAT_IDENTITY;
    if (forceOrbitPreview) {
      userQuat = quatNormalize(
        quatMultiply(
          quatFromAxisAngle([0, 0, 1], 0.24),
          quatMultiply(quatFromAxisAngle([0, 1, 0], 0.78), quatFromAxisAngle([1, 0, 0], 0.34))
        )
      );
    } else if (forceFlipPreview) {
      userQuat = quatNormalize(
        quatMultiply(
          quatFromAxisAngle([0, 0, 1], -0.35),
          quatMultiply(quatFromAxisAngle([0, 1, 0], 2.52), quatFromAxisAngle([1, 0, 0], -0.26))
        )
      );
    }

    // Unified tactile pointer state (Hover Pour + Hold-to-Distill + Slow 360° Horological Auto-Rotate + Axis-Memory Flick Cruise + Elastic Drop Pull)
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, svgX: 256, svgY: 256, inside: false };
    const gesture = {
      mode: (forceChargePreview ? 'charge' : forceOrbitPreview || forceFlipPreview ? 'orbit' : 'idle') as GestureMode,
      pointerId: -1,
      downX: 0,
      downY: 0,
      prevX: 0,
      prevY: 0,
      prevAngle: 0,
      zRoll: false,
      downTime: 0,
      charge: forceChargePreview ? 0.68 : 0,
      chargeTriggered: false,
      lastChargeTick: 0,
      velX: 0,
      velY: 0,
      velZ: 0,
      extraSpeed: 0,
      cruiseSpeed: DEFAULT_CRUISE_SPEED,
      customSpin: false,
      hudTimer: 0,
      hoverBrake: 1,
      resetting: false,
      pullX: 0,
      pullY: 0,
      pullVelX: 0,
      pullVelY: 0,
      superHalo: 0,
    };

    let lastPourTs = 0;

    const clientToSvg = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const unit = Math.min(rect.width, rect.height) / 512;
      return {
        sx: (clientX - rect.left - rect.width / 2) / (unit * 0.96) + 256,
        sy: (clientY - rect.top - rect.height / 2) / (unit * 0.96) + 244,
        nx: ((clientX - rect.left) / rect.width) * 2 - 1,
        ny: ((clientY - rect.top) / rect.height) * 2 - 1,
        rect,
      };
    };

    const onDoubleClick = () => {
      gesture.velX = 0;
      gesture.velY = 0;
      gesture.velZ = 0;
      gesture.extraSpeed = 0;
      gesture.cruiseSpeed = DEFAULT_CRUISE_SPEED;
      gesture.customSpin = false;
      cruiseAxis = [...DEFAULT_CRUISE_AXIS];
      gesture.resetting = true;
      gesture.hudTimer = 0;
      customSpinCbRef.current?.(false);
      soundEngine.playSieveDrop();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const { sx, sy, nx, ny } = clientToSvg(e.clientX, e.clientY);
      pointer.svgX = sx;
      pointer.svgY = sy;
      pointer.inside = true;

      gesture.pointerId = e.pointerId;
      gesture.downX = e.clientX;
      gesture.downY = e.clientY;
      gesture.prevX = e.clientX;
      gesture.prevY = e.clientY;
      gesture.prevAngle = Math.atan2(ny, nx);
      gesture.zRoll = e.shiftKey || Math.hypot(nx, ny) > 0.68;
      gesture.downTime = performance.now();
      gesture.chargeTriggered = false;
      gesture.lastChargeTick = 0;
      gesture.resetting = false;
      gesture.velX = 0;
      gesture.velY = 0;
      gesture.velZ = 0;
      gesture.extraSpeed = 0;

      // Project the actual rotated bottom Saffron Drop position so grabbing it works even while turning
      const dropRot = quatRotateVec(userQuat, [0, 128.16, 0]);
      const projS = 980 / Math.max(120, 980 - dropRot[2]);
      const dropScreenX = 256 + dropRot[0] * projS;
      const dropScreenY = 246 + dropRot[1] * projS;
      const frontNormal = quatRotateVec(userQuat, [0, 0, 1]);
      const distToDrop = Math.hypot(sx - dropScreenX, sy - dropScreenY);
      if (Math.abs(frontNormal[2]) > 0.55 && distToDrop < 48 && entranceRef.current > 0.85) {
        gesture.mode = 'pull-drop';
        soundEngine.playTick(680);
      } else {
        gesture.mode = 'charge';
      }
      canvas.style.cursor = 'grabbing';
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore synthetic events
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      const { sx, sy, nx, ny, rect } = clientToSvg(e.clientX, e.clientY);
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      pointer.inside = isInside;
      if (isInside) {
        pointer.svgX = sx;
        pointer.svgY = sy;
      }

      if (gesture.mode === 'pull-drop') {
        const dx = sx - 256;
        const dy = sy - 374.16;
        const dist = Math.hypot(dx, dy);
        const maxPull = 54;
        const clamped = dist > maxPull ? maxPull / dist : 1;
        gesture.pullX = dx * clamped * 0.72;
        gesture.pullY = Math.max(-18, dy * clamped * 0.82);
        return;
      }

      if (gesture.mode === 'charge' || gesture.mode === 'orbit') {
        const moveDist = Math.hypot(e.clientX - gesture.downX, e.clientY - gesture.downY);
        if (gesture.mode === 'charge' && moveDist > 12 && gesture.charge < 0.65) {
          gesture.mode = 'orbit';
          gesture.prevX = e.clientX;
          gesture.prevY = e.clientY;
          gesture.prevAngle = Math.atan2(ny, nx);
        }
        if (gesture.mode === 'orbit') {
          const curAngle = Math.atan2(ny, nx);
          if (gesture.zRoll || e.shiftKey) {
            let dA = curAngle - gesture.prevAngle;
            if (dA > Math.PI) dA -= Math.PI * 2;
            if (dA < -Math.PI) dA += Math.PI * 2;
            userQuat = quatNormalize(quatMultiply(quatFromAxisAngle([0, 0, 1], dA * 1.15), userQuat));
            gesture.velZ = Math.max(-9, Math.min(9, dA * 24));
            gesture.velX *= 0.6;
            gesture.velY *= 0.6;
          } else {
            const dx = (e.clientX - gesture.prevX) * 0.0115;
            const dy = (e.clientY - gesture.prevY) * 0.0115;
            const qY = quatFromAxisAngle([0, 1, 0], dx);
            const qX = quatFromAxisAngle([1, 0, 0], -dy);
            userQuat = quatNormalize(quatMultiply(qX, quatMultiply(qY, userQuat)));
            gesture.velY = Math.max(-10, Math.min(10, dx * 26));
            gesture.velX = Math.max(-10, Math.min(10, -dy * 26));
            gesture.velZ *= 0.6;
          }
          gesture.prevX = e.clientX;
          gesture.prevY = e.clientY;
          gesture.prevAngle = curAngle;
          gesture.hudTimer = 2.0;
          if (!gesture.customSpin) {
            gesture.customSpin = true;
            customSpinCbRef.current?.(true);
          }
        }
        return;
      }

      // Idle hover: interactive cursor pour across upper funnel mouth!
      if (isInside) {
        canvas.style.cursor = Math.hypot(nx, ny) > 0.68 ? 'alias' : 'grab';
        const now = performance.now();
        const frontNormal = quatRotateVec(userQuat, [0, 0, 1]);
        if (
          Math.abs(frontNormal[2]) > 0.45 &&
          sy > 35 &&
          sy < 195 &&
          sx > 96 &&
          sx < 416 &&
          now - lastPourTs > 130 &&
          entranceRef.current > 0.85
        ) {
          lastPourTs = now;
          const inAperture = Math.abs(sx - 256) < 54;
          spawnClaim(sx + (Math.random() - 0.5) * 14, Math.min(sy, 108), inAperture ? 'verified' : 'noise');
        }
      }
    };

    const finishGesture = (e?: PointerEvent) => {
      if (gesture.mode === 'idle') return;
      const prevMode = gesture.mode;
      const heldMs = performance.now() - gesture.downTime;

      if (prevMode === 'pull-drop') {
        const pulled = Math.hypot(gesture.pullX, gesture.pullY);
        if (pulled > 12) {
          soundEngine.playSpringSnap();
          dropVelRef.current += 3.1;
          ripples.push({ age: 0, maxAge: 1.05, maxRadius: 112, strong: true });
          quickCbRef.current?.();
        } else {
          condenseSuperRef.current = false;
          condenseRef.current = 0;
          quickCbRef.current?.();
        }
      } else if (prevMode === 'charge' && !gesture.chargeTriggered) {
        condenseSuperRef.current = gesture.charge > 0.72;
        condenseRef.current = 0;
        if (gesture.charge > 0.72) {
          gesture.superHalo = 1.0;
          superCbRef.current?.();
        } else if (heldMs < 950) {
          quickCbRef.current?.();
        }
      } else if (prevMode === 'orbit') {
        soundEngine.playTick(540);
        // Adopt the user's exact 3D flick axis & spin direction (CW / CCW / diagonal / Z-roll) as continuous cruise!
        const releaseSpeed = Math.hypot(gesture.velX, gesture.velY, gesture.velZ);
        if (releaseSpeed > 0.18) {
          cruiseAxis = [
            gesture.velX / releaseSpeed,
            gesture.velY / releaseSpeed,
            gesture.velZ / releaseSpeed,
          ];
          gesture.cruiseSpeed = 0.62;
          gesture.extraSpeed = pausedRef.current ? 0 : Math.min(8.5, Math.max(0, releaseSpeed - gesture.cruiseSpeed));
        } else {
          gesture.cruiseSpeed = 0.36;
          gesture.extraSpeed = 0;
        }
        gesture.velX = 0;
        gesture.velY = 0;
        gesture.velZ = 0;
        gesture.hudTimer = 1.9;
      }

      gesture.mode = 'idle';
      canvas.style.cursor = 'grab';
      if (e && gesture.pointerId === e.pointerId) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      gesture.pointerId = -1;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('dblclick', onDoubleClick);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', finishGesture);
    window.addEventListener('pointercancel', finishGesture);

    const resize = () => {
      const w = Math.max(260, canvas.clientWidth || canvas.parentElement?.clientWidth || 468);
      const h = Math.max(260, canvas.clientHeight || canvas.parentElement?.clientHeight || 468);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let spawnAccum = 0;
    let autoPulseTimer = 0;
    let noiseBlend = 0;
    let sealedBlend = 0;
    let dropMagX = 0;
    let dropMagY = 0;
    let prevCondenseImpact = false;
    let initialStreamSeeded =
      search.includes('settled=1') ||
      forceCondensePreview ||
      forceChargePreview ||
      forceOrbitPreview ||
      forceFlipPreview;
    let entranceDropFired =
      search.includes('settled=1') ||
      forceCondensePreview ||
      forceChargePreview ||
      forceOrbitPreview ||
      forceFlipPreview;

    // True 3D Extruded Perspective Mesh Renderer for Full 360° X/Y/Z Inspection in Canvas2D!
    // Supports monolithic Sift, 3-piece Raw Chat aperture split, 3D emerald seal ring, charge ring,
    // depth-sorted claim motes, and a whisper-subtle orbital gimbal reticle during active drag.
    const drawExtruded3D = (
      q: Quat,
      isLight: boolean,
      emeraldVis: number,
      splitBlend: number,
      floatY: number,
      dropAppear: number,
      ch: number,
      orbitGuide: number,
      isZRoll: boolean
    ) => {
      const HALF_D = 15;
      const FOV = 980;
      const keyLight: Vec3 = [0.44, -0.58, 0.69];
      const isSealed = emeraldVis > 0.35;
      const isNoise = splitBlend > 0.45;

      const xform = (v: Vec3) => {
        const r = quatRotateVec(q, v);
        const s = FOV / Math.max(120, FOV - r[2]);
        return { x: r[0] * s, y: (r[1] + floatY) * s, z: r[2], s };
      };

      // Subtle Horological 3D Orbital Gimbal Reticle (visible ONLY while actively orbiting!)
      if (orbitGuide > 0.03) {
        const gR = 204;
        const gCol = isZRoll
          ? isLight ? '184, 108, 8' : '242, 163, 58'
          : isLight ? '18, 32, 63' : '244, 240, 232';
        ctx.save();
        ctx.strokeStyle = `rgba(${gCol}, ${orbitGuide * (isZRoll ? 0.42 : 0.16)})`;
        ctx.lineWidth = isZRoll ? 1.4 : 0.9;
        ctx.setLineDash(isZRoll ? [6, 5] : [3, 6]);
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const pt = xform([Math.cos(a) * gR, Math.sin(a) * gR, 0]);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        // Equatorial meridian ring for 3D depth reference
        ctx.strokeStyle = `rgba(${gCol}, ${orbitGuide * 0.12})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const pt = xform([Math.cos(a) * gR, 0, Math.sin(a) * gR]);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const dropLocalX = dropMagX + gesture.pullX;
      const dropLocalY = 128.16 + dropMagY + gesture.pullY + Math.sin(elapsed * 1.65) * 2.3;
      const drop3D = xform([dropLocalX, dropLocalY, 0]);
      const dropBehind = drop3D.z < -2;

      const draw3DDropAndRings = () => {
        if (dropAppear < 0.02) return;
        const baseR = Math.max(1, 21.6 * dropAppear * drop3D.s * (1 + ch * 0.08));
        const sq = Math.max(-0.2, Math.min(0.24, dropSquashRef.current));
        const rx = baseR * (1 + sq * 0.82);
        const ry = baseR * (1 - sq * 0.70);

        // Elastic liquid-gold tether when user pulls the bottom Saffron Drop
        const pullDist = Math.hypot(gesture.pullX, gesture.pullY);
        if (pullDist > 3 && !isNoise) {
          const apexPt = xform([0, 84.5, 0]);
          ctx.save();
          ctx.strokeStyle = isLight ? 'rgba(206, 120, 8, 0.85)' : 'rgba(255, 214, 115, 0.9)';
          ctx.lineWidth = Math.max(1.2, 5.2 - pullDist * 0.07);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(apexPt.x, apexPt.y);
          ctx.quadraticCurveTo((apexPt.x + drop3D.x) * 0.5, (apexPt.y + drop3D.y) * 0.5 - 4, drop3D.x, drop3D.y - ry * 0.7);
          ctx.stroke();
          ctx.restore();
        }

        // 3D-projected Perpetual Precision Circular Ring Around Bottom Bubble (All 3 Modes + Cardinal Ticks!)
        const sealR = 34.5 + Math.min(4.5, Math.abs(dropSquashRef.current) * 14) + ch * 1.8;
        const ringCol = isSealed
          ? isLight ? '12, 134, 92' : '60, 227, 168'
          : isNoise
            ? isLight ? '184, 50, 44' : '224, 88, 82'
            : isLight ? '184, 108, 8' : '248, 190, 82';
        ctx.save();
        ctx.strokeStyle = `rgba(${ringCol}, ${(isSealed ? 0.54 : isNoise ? 0.52 : 0.48) * dropAppear})`;
        ctx.lineWidth = isSealed ? 1.8 : 1.6;
        if (isNoise) ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const pt = xform([dropLocalX + Math.cos(a) * sealR, dropLocalY + Math.sin(a) * sealR, 0]);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (!isNoise) {
          // Two precision caliper arcs anchored cleanly to the rotating 3D sculpture (no competing spin)
          const arcRot = 0;
          ctx.strokeStyle = `rgba(${ringCol}, ${(isSealed ? 0.98 : 0.94) * dropAppear})`;
          ctx.lineWidth = isSealed ? 2.7 : 2.4;
          ctx.lineCap = 'round';
          for (const baseA of [0, Math.PI]) {
            ctx.beginPath();
            for (let i = 0; i <= 16; i++) {
              const a = baseA + arcRot - 0.58 + (1.16 * i) / 16;
              const pt = xform([dropLocalX + Math.cos(a) * sealR, dropLocalY + Math.sin(a) * sealR, 0]);
              if (i === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }

          // 4 precision cardinal vernier ticks around the circular halo ring
          const tickHalf = isSealed ? 4.2 : 2.7;
          ctx.strokeStyle = `rgba(${ringCol}, ${(isSealed ? 0.94 : 0.64) * dropAppear})`;
          ctx.lineWidth = isSealed ? 1.75 : 1.35;
          for (let k = 0; k < 4; k++) {
            const a = arcRot + (k * Math.PI) / 2;
            const p0 = xform([dropLocalX + Math.cos(a) * (sealR - tickHalf), dropLocalY + Math.sin(a) * (sealR - tickHalf), 0]);
            const p1 = xform([dropLocalX + Math.cos(a) * (sealR + tickHalf), dropLocalY + Math.sin(a) * (sealR + tickHalf), 0]);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.stroke();
          }
        }
        ctx.restore();

        // 3D-projected Expanding Impact Ripples
        for (const rp of ripples) {
          if (rp.age < 0) continue;
          const p = rp.age / rp.maxAge;
          const easeP = 1 - Math.pow(1 - p, 2.5);
          const rad = 22 + easeP * rp.maxRadius;
          const op = (1 - p) * (rp.strong ? (isLight ? 0.76 : 0.88) : 0.48);
          ctx.save();
          ctx.strokeStyle = `rgba(${ringCol}, ${op})`;
          ctx.lineWidth = (rp.strong ? 2.2 : 1.35) * (1 - p * 0.35);
          ctx.beginPath();
          for (let i = 0; i <= 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            const pt = xform([dropLocalX + Math.cos(a) * rad, dropLocalY + Math.sin(a) * rad * 0.86, -2]);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 3D-projected Falling Condensation Teardrop + Tapered Meniscus across the 0.6S gap
        const curCT = condenseRef.current;
        if ((curCT < 0.66 || ch > 0.14) && !isNoise) {
          const isHoldingCharge = ch > 0.14 && curCT >= 0.66;
          const dropLocalYPos = isHoldingCharge
            ? 84.5 + 5 + ch * 17
            : curCT < 0.40
              ? 84.5 + 4 + (1 - Math.pow(1 - curCT / 0.40, 2)) * 21
              : 109.5 + Math.pow((curCT - 0.40) / 0.26, 2) * (dropLocalY - 109.5);
          const td = xform([0, dropLocalYPos, 0]);
          const tr = Math.max(2.4, (isHoldingCharge ? 3.5 + ch * 6.5 : curCT < 0.40 ? 3.6 + (curCT / 0.40) * 6.2 : 8.6) * td.s);
          ctx.save();
          // Tapered meniscus bridge from V-apex during swelling phase
          if (isHoldingCharge || curCT < 0.40) {
            const apexPt = xform([0, 84.5, 0]);
            ctx.strokeStyle = isLight ? '#d9810c' : '#ffcf66';
            ctx.lineWidth = tr * 0.65;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(apexPt.x, apexPt.y);
            ctx.lineTo(td.x, td.y);
            ctx.stroke();
          }
          // Luminous halo for 1× DPR Full HD clarity
          ctx.fillStyle = isLight ? 'rgba(218, 128, 12, 0.25)' : 'rgba(255, 206, 102, 0.30)';
          ctx.beginPath();
          ctx.arc(td.x, td.y, tr * 1.6, 0, Math.PI * 2);
          ctx.fill();
          const tg = ctx.createRadialGradient(td.x - tr * 0.22, td.y - tr * 0.22, 0.5, td.x, td.y, tr);
          tg.addColorStop(0, '#fffce8');
          tg.addColorStop(0.55, '#ffca5a');
          tg.addColorStop(1, isLight ? '#bd6406' : '#d6780e');
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.ellipse(td.x, td.y, tr * 0.86, tr * 1.22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 3D-projected Charge Ring when holding
        if (ch > 0.04) {
          const ringR = 34.5;
          const cCol = isLight ? '184, 108, 8' : '248, 190, 82';
          ctx.save();
          ctx.strokeStyle = `rgba(${cCol}, 0.94)`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          const steps = Math.max(4, Math.round(ch * 48));
          for (let i = 0; i <= steps; i++) {
            const a = -Math.PI / 2 + (ch * Math.PI * 2 * i) / steps;
            const pt = xform([dropLocalX + Math.cos(a) * ringR, dropLocalY + Math.sin(a) * ringR, 4]);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(drop3D.x, drop3D.y);
        if (!isLight) {
          const auraCol = isSealed ? '60,227,168' : isNoise ? '204,76,72' : '242,163,58';
          const aura = ctx.createRadialGradient(0, 0, baseR * 0.2, 0, 0, baseR * 3.1);
          aura.addColorStop(0, `rgba(${auraCol}, 0.36)`);
          aura.addColorStop(1, `rgba(${auraCol}, 0)`);
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, baseR * 3.1, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.shadowColor = 'rgba(176, 98, 6, 0.28)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 5;
        }
        const dg = ctx.createRadialGradient(-rx * 0.34, -ry * 0.34, baseR * 0.06, 0, 0, Math.max(rx, ry));
        if (isNoise) {
          dg.addColorStop(0, '#d6564e');
          dg.addColorStop(1, '#38151a');
        } else {
          dg.addColorStop(0, '#fffbe6');
          dg.addColorStop(0.3, '#ffd46a');
          dg.addColorStop(0.7, '#f2a33a');
          dg.addColorStop(1, '#b85a08');
        }
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!isNoise) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.ellipse(-rx * 0.33, -ry * 0.33, rx * 0.23, ry * 0.13, -0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      const draw3DClaims = (behindOnly: boolean) => {
        for (const m of claims) {
          const pt = xform([m.x - 256, m.y - 246, 0]);
          if (behindOnly ? pt.z >= 0 : pt.z < 0) continue;
          const lifeFade = Math.min(1, (m.maxLife - m.life) / 0.55);
          const a = Math.max(0, lifeFade) * 0.92;
          if (a <= 0.04) continue;
          const rad = Math.max(1.2, m.r * pt.s);
          if (m.kind === 'verified') {
            ctx.fillStyle = isLight ? `rgba(218, 128, 12, ${a * 0.28})` : `rgba(255, 206, 102, ${a * 0.30})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, rad * 2.0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle =
            m.kind === 'verified'
              ? isLight ? `rgba(196, 112, 8, ${a})` : `rgba(255, 206, 102, ${a})`
              : m.state === 'deflected' || isNoise
                ? isLight ? `rgba(186, 62, 54, ${a * 0.88})` : `rgba(232, 92, 84, ${a * 0.88})`
                : isLight ? `rgba(42, 66, 112, ${a * 0.62})` : `rgba(148, 178, 228, ${a * 0.65})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const renderSolid3D = (
        outerLoopRaw: Point2D[],
        innerLoopRaw: Point2D[] | null,
        offsetLocal: [number, number] = [0, 0],
        rotLocalZ = 0,
        pivotLocal: [number, number] = [0, 0]
      ) => {
        const transformPt = (p: Point2D): Point2D => {
          if (rotLocalZ === 0 && offsetLocal[0] === 0 && offsetLocal[1] === 0) return p;
          const dx = p.x - pivotLocal[0];
          const dy = p.y - pivotLocal[1];
          const c = Math.cos(rotLocalZ);
          const s = Math.sin(rotLocalZ);
          return {
            x: pivotLocal[0] + dx * c - dy * s + offsetLocal[0],
            y: pivotLocal[1] + dx * s + dy * c + offsetLocal[1],
          };
        };

        const oRaw = outerLoopRaw.map(transformPt);
        const iRaw = innerLoopRaw ? innerLoopRaw.map(transformPt) : null;
        const outerF = oRaw.map((p) => xform([p.x, p.y, HALF_D]));
        const outerB = oRaw.map((p) => xform([p.x, p.y, -HALF_D]));
        const innerF = iRaw ? iRaw.map((p) => xform([p.x, p.y, HALF_D])) : null;
        const innerB = iRaw ? iRaw.map((p) => xform([p.x, p.y, -HALF_D])) : null;

        const nFront = quatRotateVec(q, [0, 0, 1]);
        const frontIsNear = nFront[2] >= 0;
        const nearOuter = frontIsNear ? outerF : outerB;
        const nearInner = frontIsNear ? innerF : innerB;
        const farOuter = frontIsNear ? outerB : outerF;
        const farInner = frontIsNear ? innerB : innerF;

        const traceFace = (oLoop: { x: number; y: number }[], iLoop: { x: number; y: number }[] | null) => {
          ctx.beginPath();
          oLoop.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();
          if (iLoop) {
            iLoop.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.closePath();
          }
        };

        const drawCap = (
          oLoop: { x: number; y: number }[],
          iLoop: { x: number; y: number }[] | null,
          facingLight: number,
          isFrontVisible: boolean
        ) => {
          ctx.save();
          traceFace(oLoop, iLoop);
          const lit = 0.55 + Math.max(0, facingLight) * 0.45;
          const g = ctx.createLinearGradient(-150, -140, 150, 120);
          if (isLight) {
            if (isNoise) {
              g.addColorStop(0, '#3a2c3c');
              g.addColorStop(1, '#1a1524');
            } else {
              const b1 = Math.round(24 + lit * 26);
              const b2 = Math.round(48 + lit * 44);
              const b3 = Math.round(96 + lit * 56);
              g.addColorStop(0, `rgb(${b1 + 14}, ${b2 + 22}, ${b3 + 22})`);
              g.addColorStop(0.52, `rgb(${b1}, ${b2 - 12}, ${b3 - 18})`);
              g.addColorStop(1, `rgb(${Math.max(10, b1 - 12)}, ${Math.max(20, b2 - 26)}, ${Math.max(40, b3 - 42)})`);
            }
          } else {
            if (isNoise) {
              g.addColorStop(0, '#b5a8a6');
              g.addColorStop(1, '#8c7d7c');
            } else {
              const vHi = Math.min(255, Math.round(218 + lit * 37));
              const vMid = Math.min(250, Math.round(196 + lit * 42));
              const vLo = Math.round(158 + lit * 38);
              g.addColorStop(0, `rgb(${vMid}, ${vMid - 5}, ${vMid - 14})`);
              g.addColorStop(0.48, `rgb(${vHi}, ${vHi - 2}, ${vHi - 8})`);
              g.addColorStop(1, `rgb(${vLo}, ${vLo - 6}, ${vLo - 14})`);
            }
          }
          ctx.fillStyle = g;
          ctx.fill('evenodd');

          if (isFrontVisible) {
            ctx.strokeStyle = isLight ? 'rgba(210, 228, 255, 0.36)' : 'rgba(255, 255, 255, 0.52)';
            ctx.lineWidth = 1.1;
            ctx.stroke();

            if (iLoop) {
              ctx.beginPath();
              iLoop.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
              ctx.closePath();
              ctx.strokeStyle = isSealed
                ? isLight
                  ? 'rgba(12, 134, 92, 0.92)'
                  : 'rgba(60, 227, 168, 0.95)'
                : isLight
                  ? 'rgba(218, 140, 24, 0.9)'
                  : 'rgba(252, 194, 86, 0.9)';
              ctx.lineWidth = 2.0;
              ctx.stroke();
            }
          }
          ctx.restore();
        };

        interface SideQuad {
          pts: { x: number; y: number }[];
          avgZ: number;
          light: number;
          isInner: boolean;
        }
        const quads: SideQuad[] = [];
        const pushWalls = (
          raw: Point2D[],
          fLoop: { x: number; y: number; z: number }[],
          bLoop: { x: number; y: number; z: number }[],
          isInner: boolean
        ) => {
          const len = raw.length;
          for (let i = 0; i < len; i++) {
            const j = (i + 1) % len;
            const ex = raw[j].x - raw[i].x;
            const ey = raw[j].y - raw[i].y;
            const elen = Math.hypot(ex, ey) || 1;
            const nLocal: Vec3 = [ey / elen, -ex / elen, 0];
            const nWorld = quatRotateVec(q, nLocal);
            const avgZ = (fLoop[i].z + fLoop[j].z + bLoop[i].z + bLoop[j].z) * 0.25;
            const light = nWorld[0] * keyLight[0] + nWorld[1] * keyLight[1] + nWorld[2] * keyLight[2];
            quads.push({
              pts: [fLoop[i], fLoop[j], bLoop[j], bLoop[i]],
              avgZ,
              light,
              isInner,
            });
          }
        };
        pushWalls(oRaw, outerF, outerB, false);
        if (iRaw && innerF && innerB) pushWalls(iRaw, innerF, innerB, true);
        quads.sort((a, b) => a.avgZ - b.avgZ);

        const faceDot = Math.abs(nFront[0] * keyLight[0] + nFront[1] * keyLight[1] + nFront[2] * keyLight[2]);
        drawCap(farOuter, farInner, faceDot * 0.5, false);

        for (const qd of quads) {
          const shade = Math.max(0, Math.min(1, 0.42 + qd.light * 0.58));
          const r = Math.round((isNoise ? 76 : isLight ? 24 : 30) + shade * (isLight ? 48 : 66));
          const g = Math.round((isNoise ? 38 : isLight ? 46 : 58) + shade * (isLight ? 78 : 104));
          const b = Math.round((isNoise ? 46 : isLight ? 92 : 116) + shade * (isLight ? 115 : 132));
          const col = qd.isInner && isSealed ? `rgb(18, ${Math.round(120 + shade * 80)}, ${Math.round(92 + shade * 60)})` : `rgb(${r},${g},${b})`;
          ctx.fillStyle = col;
          ctx.strokeStyle = col;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.moveTo(qd.pts[0].x, qd.pts[0].y);
          ctx.lineTo(qd.pts[1].x, qd.pts[1].y);
          ctx.lineTo(qd.pts[2].x, qd.pts[2].y);
          ctx.lineTo(qd.pts[3].x, qd.pts[3].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        drawCap(nearOuter, nearInner, faceDot, true);
      };

      draw3DClaims(true);
      if (dropBehind) draw3DDropAndRings();

      // Grounding subtle studio shadow in Light Theme
      if (isLight) {
        ctx.save();
        const sh = ctx.createRadialGradient(0, 175, 4, 0, 175, 120);
        sh.addColorStop(0, 'rgba(18, 32, 63, 0.13)');
        sh.addColorStop(1, 'rgba(18, 32, 63, 0)');
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.ellipse(0, 175, 118, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (splitBlend > 0.02) {
        const es = splitBlend * splitBlend * (3 - 2 * splitBlend);
        renderSolid3D(splitContours.bar, null, [0, -22 * es], 0);
        renderSolid3D(splitContours.left, null, [-18 * es, 7 * es], -0.075 * es, [-58, -6]);
        renderSolid3D(splitContours.right, null, [18 * es, 7 * es], 0.075 * es, [58, -6]);
      } else {
        renderSolid3D(contours.outer, contours.inner);
      }

      if (!dropBehind) draw3DDropAndRings();
      draw3DClaims(false);
    };

    const drawSculptedBody = (
      path: Path2D,
      isLight: boolean,
      alpha: number,
      sheenShift: number,
      yaw: number,
      pitch: number,
      splitTint: number
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;

      // Real studio levitation shadow shifts dynamically as you orbit in 3D!
      if (isLight) {
        ctx.save();
        ctx.shadowColor = 'rgba(14, 26, 54, 0.21)';
        ctx.shadowBlur = 30 + Math.abs(yaw) * 14;
        ctx.shadowOffsetX = -4 - yaw * 24;
        ctx.shadowOffsetY = 16 - pitch * 14;
        ctx.fillStyle = '#0f1d3b';
        ctx.fill(path, 'evenodd');
        ctx.restore();
      }

      // Dynamic 3D bevel extrusion responds live to orbit angle!
      const steps = Math.round(4 + Math.abs(yaw) * 6);
      const dx = -0.7 - yaw * 3.1;
      const dy = 0.92 - pitch * 2.2;
      for (let d = steps; d >= 1; d--) {
        ctx.save();
        ctx.translate(dx * d, dy * d);
        ctx.fillStyle = isLight
          ? d === 1
            ? splitTint > 0.4
              ? '#7c4c57'
              : '#487ad4'
            : d <= 2
              ? '#1f3b73'
              : '#0b152c'
          : d === 1
            ? splitTint > 0.4
              ? '#9c454a'
              : '#4e82e6'
            : '#172f64';
        ctx.fill(path, 'evenodd');
        ctx.restore();
      }

      // Satin metallic face with studio softbox specular reflection sweeping across your drag angle
      const faceGrad = ctx.createLinearGradient(104 + sheenShift, 96, 396 + sheenShift, 344);
      if (isLight) {
        if (splitTint > 0.5) {
          faceGrad.addColorStop(0, '#3a2c3c');
          faceGrad.addColorStop(0.5, '#251e2c');
          faceGrad.addColorStop(1, '#161421');
        } else {
          faceGrad.addColorStop(0, '#2e4e8a');
          faceGrad.addColorStop(0.2, '#162b57');
          faceGrad.addColorStop(0.46, '#0f1e3e');
          faceGrad.addColorStop(0.6, '#23427c');
          faceGrad.addColorStop(1, '#0b1630');
        }
      } else {
        if (splitTint > 0.5) {
          faceGrad.addColorStop(0, '#b5a8a6');
          faceGrad.addColorStop(0.5, '#d6cac6');
          faceGrad.addColorStop(1, '#8c7d7c');
        } else {
          faceGrad.addColorStop(0, '#d9d3c7');
          faceGrad.addColorStop(0.36, '#f6f2e8');
          faceGrad.addColorStop(0.52, '#ffffff');
          faceGrad.addColorStop(0.75, '#e2dcd0');
          faceGrad.addColorStop(1, '#bcb6aa');
        }
      }
      ctx.fillStyle = faceGrad;
      ctx.fill(path, 'evenodd');

      const brush = isLight ? brushLight : brushDark;
      if (brush) {
        ctx.save();
        ctx.clip(path, 'evenodd');
        ctx.fillStyle = brush;
        ctx.fillRect(80, 100, 360, 260);
        ctx.restore();
      }

      ctx.strokeStyle = isLight ? 'rgba(215, 232, 255, 0.36)' : 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.stroke(path);
      ctx.restore();
    };

    let orbitGuide = forceOrbitPreview || forceFlipPreview ? 1 : 0;

    const drawFrame = (now: number) => {
      rafId = requestAnimationFrame(drawFrame);
      const dt = Math.min(Math.max(0, (now - lastTs) / 1000), 0.05);
      lastTs = now;
      elapsed += dt;

      const isLight =
        typeof document !== 'undefined' && document.documentElement.dataset.theme
          ? document.documentElement.dataset.theme === 'light'
          : themeRef.current === 'light';
      const curMode = modeRef.current;
      const damp = 1 - Math.exp(-dt * 7.2);
      noiseBlend += ((curMode === 'noise' ? 1 : 0) - noiseBlend) * damp;
      sealedBlend += ((curMode === 'sealed' ? 1 : 0) - sealedBlend) * damp;

      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 5.2));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 5.2));

      if (resetQuatRef.current) {
        resetQuatRef.current = false;
        userQuat = QUAT_IDENTITY;
        cruiseAxis = [...DEFAULT_CRUISE_AXIS];
        gesture.velX = 0;
        gesture.velY = 0;
        gesture.velZ = 0;
        gesture.extraSpeed = 0;
        gesture.cruiseSpeed = DEFAULT_CRUISE_SPEED;
        gesture.customSpin = false;
        gesture.resetting = false;
        gesture.hudTimer = 0;
        customSpinCbRef.current?.(false);
      }

      // Press-and-Hold Gravitational Charge Progression (0 -> 1 over ~1.05s) + Continuous Smooth 3D Whole-Logo Auto-Rotate
      const rotAngleFromHome = quatAngleToIdentity(userQuat);
      const wantBrake = pointer.inside && gesture.mode === 'idle' && !gesture.customSpin ? 0.58 : 1.0;
      gesture.hoverBrake += (wantBrake - gesture.hoverBrake) * (1 - Math.exp(-dt * 5.0));

      if (gesture.mode === 'charge' && !gesture.chargeTriggered) {
        if (!forceChargePreview) {
          gesture.charge = Math.min(1, gesture.charge + dt * 0.96);
        }
        if (gesture.charge > 0.12 && now - gesture.lastChargeTick > 135) {
          gesture.lastChargeTick = now;
          soundEngine.playChargeTick(gesture.charge);
          spawnClaim(256 + (Math.random() - 0.5) * 160, 62, 'verified');
        }
        if (gesture.charge >= 1.0 && !forceChargePreview) {
          gesture.chargeTriggered = true;
          condenseSuperRef.current = true;
          condenseRef.current = 0;
          gesture.superHalo = 1.0;
          superCbRef.current?.();
        }
      } else {
        if (!forceChargePreview) {
          gesture.charge = Math.max(0, gesture.charge - dt * 3.8);
        }
        if (gesture.mode === 'idle' && !forceOrbitPreview && !forceFlipPreview) {
          if (gesture.resetting) {
            userQuat = quatSlerp(userQuat, QUAT_IDENTITY, 1 - Math.exp(-dt * 7.5));
            if (quatAngleToIdentity(userQuat) < 0.012) {
              userQuat = QUAT_IDENTITY;
              gesture.resetting = false;
            }
          } else if (entranceRef.current > 0.25) {
            const ramp = Math.min(1, (entranceRef.current - 0.25) / 0.45);
            const smoothRamp = ramp * ramp * (3 - 2 * ramp);
            const motionScale = prefersReducedMotion ? 0.35 : 1.0;
            const baseSpin = pausedRef.current ? 0 : gesture.cruiseSpeed * gesture.hoverBrake * motionScale;
            const activeSpeed = (baseSpin + gesture.extraSpeed) * smoothRamp;
            if (activeSpeed > 0.002) {
              userQuat = quatNormalize(quatMultiply(quatFromAxisAngle(cruiseAxis, activeSpeed * dt), userQuat));
            }
            if (gesture.extraSpeed > 0.004) {
              gesture.extraSpeed *= Math.exp(-dt * (pausedRef.current ? 4.5 : 2.4));
            } else {
              gesture.extraSpeed = 0;
            }
          }
        }
        if (gesture.hudTimer > 0 && gesture.mode === 'idle') {
          gesture.hudTimer = Math.max(0, gesture.hudTimer - dt);
        }
      }
      gesture.superHalo = Math.max(0, gesture.superHalo - dt * 0.65);

      if (gesture.mode !== 'pull-drop') {
        const ax = -190 * gesture.pullX - 13 * gesture.pullVelX;
        const ay = -190 * gesture.pullY - 13 * gesture.pullVelY;
        gesture.pullVelX += ax * dt;
        gesture.pullVelY += ay * dt;
        gesture.pullX += gesture.pullVelX * dt;
        gesture.pullY += gesture.pullVelY * dt;
      }

      if (entranceRef.current < 1 && !search.includes('midforge=1')) {
        entranceRef.current = Math.min(1, entranceRef.current + dt * 0.72);
      }
      const ent = entranceRef.current;
      const bodyEase = 1 - Math.pow(1 - Math.min(1, ent / 0.62), 3);
      const dropAppear = 1 - Math.pow(1 - Math.min(1, Math.max(0, (ent - 0.52) / 0.42)), 3);

      if (!entranceDropFired && ent >= 0.48) {
        entranceDropFired = true;
        condenseRef.current = 0;
      }

      if (!initialStreamSeeded && ent >= 0.66) {
        initialStreamSeeded = true;
        for (let i = 0; i < 7; i++) {
          spawnClaim(undefined, 76 + Math.random() * 140, i < 4 ? 'verified' : 'noise');
        }
      }

      if (curMode === 'sift' && ent >= 0.99 && condenseRef.current >= 1 && gesture.mode === 'idle') {
        autoPulseTimer += dt;
        if (autoPulseTimer > 2.6) {
          autoPulseTimer = 0;
          condenseSuperRef.current = false;
          condenseRef.current = 0;
          pulseCbRef.current?.();
        }
      }

      if (condenseRef.current < 1 && !search.includes('midforge=1') && !forceCondensePreview) {
        condenseRef.current = Math.min(1, condenseRef.current + dt * 0.85);
      }
      const cT = condenseRef.current;
      if (cT >= 0.62 && cT < 0.95 && !prevCondenseImpact) {
        prevCondenseImpact = true;
        const isSuper = condenseSuperRef.current;
        dropVelRef.current += isSuper ? 4.2 : 2.8;
        ripples.push({ age: 0, maxAge: isSuper ? 1.32 : 1.14, maxRadius: isSuper ? 90 : 72, strong: true, emerald: isSuper });
        ripples.push({ age: -0.16, maxAge: 1.08, maxRadius: isSuper ? 66 : 52, strong: false });
      }
      if (cT < 0.42) prevCondenseImpact = false;

      // Spring-damper squash/stretch on Saffron Drop
      const accel = -140 * dropSquashRef.current - 12 * dropVelRef.current;
      dropVelRef.current += accel * dt;
      dropSquashRef.current += dropVelRef.current * dt;

      // Subtle magnetic hover attraction toward Saffron Drop when idle
      let targetMagX = 0;
      let targetMagY = 0;
      if (pointer.inside && gesture.mode === 'idle') {
        const dxD = pointer.svgX - 256;
        const dyD = pointer.svgY - 374.16;
        const distD = Math.hypot(dxD, dyD);
        if (distD < 115 && distD > 0.1) {
          const pull = (1 - distD / 115) * 9.5;
          targetMagX = (dxD / distD) * pull;
          targetMagY = (dyD / distD) * pull;
        }
      }
      dropMagX += (targetMagX - dropMagX) * (1 - Math.exp(-dt * 8));
      dropMagY += (targetMagY - dropMagY) * (1 - Math.exp(-dt * 8));

      // Calm ambient claim spawner
      if (ent > 0.72 && curMode !== 'sealed') {
        spawnAccum += dt * (curMode === 'noise' ? 7.0 : 5.4);
        while (spawnAccum >= 1) {
          spawnAccum -= 1;
          spawnClaim(undefined, undefined, curMode === 'noise' ? (Math.random() < 0.8 ? 'noise' : 'verified') : undefined);
        }
      }

      // Claim physics (with gravitational funnel suction while holding to charge!)
      const ch = gesture.charge;
      for (let i = claims.length - 1; i >= 0; i--) {
        const m = claims[i];
        m.life += dt;
        if (m.life >= m.maxLife || m.y > 465 || m.x < 40 || m.x > 472) {
          claims.splice(i, 1);
          continue;
        }

        if (ch > 0.15 && m.kind === 'verified') {
          // Gravitational vortex pull into equilateral funnel during hold-to-distill!
          const gx = 256 - m.x;
          const gy = 270 - m.y;
          m.vx += gx * ch * 4.5 * dt;
          m.vy += Math.max(40, gy * ch * 3.2) * dt;
          m.vx *= 0.92;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y >= 358) {
            dropVelRef.current += 0.45;
            claims.splice(i, 1);
          }
          continue;
        }

        if (noiseBlend > 0.55) {
          m.vy = Math.min(185, m.vy + 110 * dt);
          m.vx += Math.sin(elapsed * 3 + i) * 14 * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          continue;
        }

        if (m.state === 'entering') {
          m.vy = Math.min(125, m.vy + 45 * dt);
          m.x += m.vx * dt;
          m.y += m.vy * dt;

          if (m.kind === 'noise' && m.y >= 111 && m.y <= 156) {
            const dxFromCenter = m.x - 256;
            if (Math.abs(dxFromCenter) >= 56 && Math.abs(dxFromCenter) <= 165) {
              const side = dxFromCenter >= 0 ? 1 : -1;
              m.state = 'deflected';
              m.vx = side * (62 + Math.random() * 48);
              m.vy = -34 - Math.random() * 24;
              glints.push({ x: m.x, y: 115, age: 0, kind: 'noise' });
              continue;
            }
          }
          if (m.y >= 150) {
            if (m.kind === 'verified' && Math.abs(m.x - 256) < 62) {
              m.state = 'funneling';
            } else {
              const side = m.x >= 256 ? 1 : -1;
              m.state = 'deflected';
              m.vx = side * (78 + Math.random() * 45);
              m.vy = -18 + Math.random() * 24;
              glints.push({ x: m.x, y: m.y, age: 0, kind: 'noise' });
            }
          }
        } else if (m.state === 'deflected') {
          m.vy += 115 * dt;
          m.vx *= 1 - dt * 0.45;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
        } else {
          const pull = m.y < 275 ? 5.2 : 11.5;
          m.vx += (256 - m.x) * pull * dt;
          m.vx *= 0.88;
          m.vy = Math.min(165, m.vy + 115 * dt);
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y >= 152 && m.y <= 268) {
            const frac = (m.y - 152) / (268 - 152);
            const maxHalf = Math.max(3, (1 - frac) * 56);
            if (Math.abs(m.x - 256) > maxHalf) m.x = 256 + Math.sign(m.x - 256) * maxHalf;
          }
          if (m.y >= 362) {
            dropVelRef.current += 0.55;
            glints.push({ x: 256 + dropMagX, y: 356 + dropMagY, age: 0, kind: 'verified' });
            claims.splice(i, 1);
          }
        }
      }

      for (let i = glints.length - 1; i >= 0; i--) {
        glints[i].age += dt;
        if (glints[i].age > 0.28) glints.splice(i, 1);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (!forceCondensePreview) ripples[i].age += dt;
        if (ripples[i].age > ripples[i].maxAge) ripples.splice(i, 1);
      }

      const cw = canvas.width;
      const chH = canvas.height;
      ctx.clearRect(0, 0, cw, chH);

      const unit = Math.min(cw, chH) / 512;
      const isPaused = pausedRef.current;
      const floatY = isPaused ? 0 : Math.sin(elapsed * 0.95) * 3.4;
      const useFull3D = ent >= 0.35 || rotAngleFromHome > 0.012 || forceOrbitPreview || forceFlipPreview;
      const targetGuide = gesture.mode === 'orbit' || forceOrbitPreview || forceFlipPreview ? 1 : 0;
      orbitGuide += (targetGuide - orbitGuide) * (1 - Math.exp(-dt * 9));
      const totalYaw = isPaused ? 0 : pointer.x * 0.14;
      const totalPitch = isPaused ? 0 : pointer.y * 0.08;
      const sheenShift = Math.sin(elapsed * 0.55) * 60 + totalYaw * 165;
      const chargeScale = 1 + ch * 0.036;

      ctx.save();
      ctx.translate(cw / 2, chH / 2);
      ctx.scale(unit * 0.96 * chargeScale, unit * 0.96 * chargeScale);

      if (useFull3D) {
        // Poised upright sculptural breathing yaw/pitch at rest; softens during custom 360° spin
        const breatheWeight = isPaused ? 0 : gesture.customSpin ? 0.14 : 1.0;
        const idleYaw = gesture.customSpin ? 0 : Math.sin(elapsed * 0.52) * 0.19;
        const idlePitch = Math.sin(elapsed * 0.38) * 0.055;
        const breatheQ = quatNormalize(
          quatMultiply(
            quatFromAxisAngle([1, 0, 0], (-pointer.y * 0.08 + idlePitch) * breatheWeight),
            quatFromAxisAngle([0, 1, 0], (pointer.x * 0.14 + idleYaw) * breatheWeight)
          )
        );
        const renderQ = quatNormalize(quatMultiply(userQuat, breatheQ));
        drawExtruded3D(
          renderQ,
          isLight,
          Math.max(sealedBlend, gesture.superHalo),
          noiseBlend,
          floatY,
          dropAppear,
          ch,
          orbitGuide,
          gesture.zRoll
        );
      } else {
        // Subtle idle cursor parallax when resting upright
        const cosYaw = Math.cos(totalYaw * 0.92);
        const skewY = Math.sin(totalYaw) * 0.075;
        ctx.transform(cosYaw, skewY, 0, 1 - Math.abs(totalPitch) * 0.1, 0, 0);
        ctx.translate(-256 + totalYaw * 14, -244 + floatY + totalPitch * 14);

        const dropX = 256 + dropMagX + gesture.pullX + totalYaw * 16;
        const dropY = 374.16 + dropMagY + gesture.pullY + Math.sin(elapsed * 1.65) * 2.3;

      // 1 · Grounding Contact Shadow (Light) / Quiet Focused Aura (Dark)
      if (dropAppear > 0.04) {
        if (isLight) {
          const sh = ctx.createRadialGradient(dropX, 418, 2, dropX, 418, 48 + ch * 14);
          sh.addColorStop(0, `rgba(18, 32, 63, ${(0.15 + ch * 0.07) * dropAppear})`);
          sh.addColorStop(0.55, `rgba(18, 32, 63, ${0.045 * dropAppear})`);
          sh.addColorStop(1, 'rgba(18, 32, 63, 0)');
          ctx.fillStyle = sh;
          ctx.beginPath();
          ctx.ellipse(dropX, 418, 48 + ch * 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const auraCol =
            sealedBlend > 0.5 || gesture.superHalo > 0.25
              ? '60,227,168'
              : noiseBlend > 0.5
                ? '204,76,72'
                : '242,163,58';
          const auraR = 78 + ch * 34 + Math.abs(dropSquashRef.current) * 35;
          const aura = ctx.createRadialGradient(dropX, dropY, 4, dropX, dropY, auraR);
          aura.addColorStop(0, `rgba(${auraCol}, ${(0.40 + ch * 0.28) * dropAppear})`);
          aura.addColorStop(0.5, `rgba(${auraCol}, ${(0.14 + ch * 0.1) * dropAppear})`);
          aura.addColorStop(1, `rgba(${auraCol}, 0)`);
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(dropX, dropY, auraR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2 · Crisp Concentric Circular Impact Ripples (Unclipped & Vivid on 1× DPR Full HD!)
      for (const rp of ripples) {
        if (rp.age < 0) continue;
        const p = rp.age / rp.maxAge;
        const easeP = 1 - Math.pow(1 - p, 2.5);
        const rad = 22 + easeP * rp.maxRadius;
        const op = (1 - p) * (rp.strong ? (isLight ? 0.78 : 0.90) : isLight ? 0.46 : 0.58);
        const rCol =
          sealedBlend > 0.5 || rp.emerald
            ? isLight
              ? '12,126,88'
              : '60,227,168'
            : isLight
              ? '184,104,8'
              : '255,204,98';
        ctx.save();
        ctx.strokeStyle = `rgba(${rCol}, ${op})`;
        ctx.lineWidth = (rp.strong ? 2.4 : 1.5) * (1 - p * 0.35);
        ctx.beginPath();
        ctx.ellipse(dropX, dropY + 2, rad, rad * 0.86, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3 · Crisp Intentional Claim Droplets (Soft Glow Halo + Elongated Golden Liquid Trail)
      for (const m of claims) {
        const entryFade = Math.min(1, (m.y - 44) / 34);
        const lifeFade = Math.min(1, (m.maxLife - m.life) / 0.55);
        const a = Math.max(0, entryFade * lifeFade) * (m.state === 'deflected' ? 0.84 : 0.96);
        if (a <= 0.03) continue;
        ctx.save();
        if (m.kind === 'verified') {
          // Soft luminous outer halo for crisp 1× DPR Full HD legibility
          ctx.fillStyle = isLight ? `rgba(214, 126, 12, ${a * 0.24})` : `rgba(255, 206, 102, ${a * 0.28})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 2.05, 0, Math.PI * 2);
          ctx.fill();

          // Elongated falling liquid trail
          ctx.strokeStyle = isLight ? `rgba(196, 112, 8, ${a * 0.52})` : `rgba(255, 224, 140, ${a * 0.62})`;
          ctx.lineWidth = m.r * 0.85;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * (0.13 + ch * 0.08), m.y - m.vy * (0.13 + ch * 0.08));
          ctx.stroke();

          // Primary golden droplet core + specular glint
          ctx.fillStyle = isLight ? `rgba(196, 112, 8, ${a})` : `rgba(255, 206, 102, ${a})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 252, 234, ${a * 0.85})`;
          ctx.beginPath();
          ctx.arc(m.x - m.r * 0.28, m.y - m.r * 0.28, m.r * 0.34, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const deflectedCol = isLight ? `rgba(186, 62, 54, ${a * 0.90})` : `rgba(236, 98, 90, ${a * 0.90})`;
          const rawCol = isLight ? `rgba(42, 66, 112, ${a * 0.66})` : `rgba(158, 188, 238, ${a * 0.72})`;
          ctx.fillStyle = m.state === 'deflected' || noiseBlend > 0.5 ? deflectedCol : rawCol;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 4 · Sculpted Canonical Monolith (with Raw Chat Splitting!)
      if (bodyEase > 0.01) {
        ctx.save();
        if (bodyEase < 0.995) {
          ctx.beginPath();
          ctx.rect(60, 80, 400, (345 - 80) * bodyEase + 10);
          ctx.clip();
        }

        if (noiseBlend < 0.015) {
          drawSculptedBody(fullPath, isLight, bodyEase, sheenShift, totalYaw, totalPitch, 0);

          // Inner brass aperture bevel warms smoothly as you hold to distill!
          ctx.save();
          ctx.strokeStyle =
            sealedBlend > 0.5 || gesture.superHalo > 0.3
              ? isLight
                ? `rgba(12, 134, 92, ${0.88 * bodyEase})`
                : `rgba(60, 227, 168, ${0.9 * bodyEase})`
              : isLight
                ? `rgba(${Math.round(218 + ch * 32)}, ${Math.round(144 + ch * 52)}, ${Math.round(32 + ch * 65)}, ${(0.82 + ch * 0.18) * bodyEase})`
                : `rgba(255, ${Math.round(192 + ch * 56)}, ${Math.round(82 + ch * 130)}, ${(0.72 + ch * 0.28) * bodyEase})`;
          ctx.lineWidth = (isLight ? 1.85 : 1.75) + ch * 1.4;
          ctx.stroke(innerPath);
          ctx.restore();
        } else {
          const easeSplit = noiseBlend * noiseBlend * (3 - 2 * noiseBlend);
          ctx.save();
          ctx.translate(0, -22 * easeSplit);
          drawSculptedBody(barPath, isLight, bodyEase * (1 - 0.16 * easeSplit), sheenShift, totalYaw, totalPitch, easeSplit);
          ctx.restore();

          ctx.save();
          ctx.translate(198, 240);
          ctx.rotate(-0.075 * easeSplit);
          ctx.translate(-198 - 18 * easeSplit, -240 + 7 * easeSplit);
          drawSculptedBody(leftArmPath, isLight, bodyEase * (1 - 0.16 * easeSplit), sheenShift, totalYaw, totalPitch, easeSplit);
          ctx.restore();

          ctx.save();
          ctx.translate(314, 240);
          ctx.rotate(0.075 * easeSplit);
          ctx.translate(-314 + 18 * easeSplit, -240 + 7 * easeSplit);
          drawSculptedBody(rightArmPath, isLight, bodyEase * (1 - 0.16 * easeSplit), sheenShift, totalYaw, totalPitch, easeSplit);
          ctx.restore();
        }

        if (ent < 0.72) {
          const lineOp = Math.sin((ent / 0.72) * Math.PI) * 0.45;
          ctx.strokeStyle = isLight ? `rgba(18, 32, 63, ${lineOp})` : `rgba(242, 163, 58, ${lineOp})`;
          ctx.lineWidth = 1.1;
          ctx.stroke(outerPath);
          ctx.stroke(innerPath);
        }
        ctx.restore();
      }

      // 5 · Whisper-Delicate Contact Glints
      for (const gl of glints) {
        const p = gl.age / 0.28;
        const r = 1.8 + p * 4.6;
        const op = (1 - p) * 0.36;
        ctx.save();
        ctx.strokeStyle =
          gl.kind === 'verified'
            ? isLight
              ? `rgba(208, 122, 12, ${op})`
              : `rgba(255, 226, 148, ${op})`
            : isLight
              ? `rgba(186, 62, 54, ${op * 0.72})`
              : `rgba(240, 108, 98, ${op * 0.72})`;
        ctx.lineWidth = 0.9 * (1 - p * 0.45);
        ctx.beginPath();
        ctx.arc(gl.x, gl.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 6 · Elastic Liquid-Gold Surface-Tension Tether when User Pulls the Saffron Drop!
      const pullDist = Math.hypot(gesture.pullX, gesture.pullY);
      if (pullDist > 3 && noiseBlend < 0.4) {
        ctx.save();
        const neckW = Math.max(1.2, 5.5 - pullDist * 0.08);
        const grad = ctx.createLinearGradient(256, 330, dropX, dropY);
        grad.addColorStop(0, isLight ? 'rgba(206, 120, 8, 0.85)' : 'rgba(255, 214, 115, 0.9)');
        grad.addColorStop(1, 'rgba(242, 163, 58, 0.95)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = neckW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(256, 330.5);
        ctx.quadraticCurveTo((256 + dropX) * 0.5, (330.5 + dropY) * 0.5 - 4, dropX, dropY - 14);
        ctx.stroke();
        ctx.restore();
      }

      // 7 · Signature Liquid-Gold Teardrop Condensation Across the Exact 0.6S Gap (or Charging Meniscus!)
      if (ch > 0.14 && noiseBlend < 0.4 && cT >= 0.66) {
        // Swelling charged golden meniscus hanging from V-apex tip while holding!
        const tipY = 330.5;
        const bulbY = tipY + 5 + ch * 17;
        const bulbR = 3.2 + ch * 7.2;
        const g = ctx.createRadialGradient(256 - 1.5, bulbY - 1.5, 0.5, 256, bulbY, bulbR);
        g.addColorStop(0, '#fffce8');
        g.addColorStop(0.55, '#ffc957');
        g.addColorStop(1, isLight ? '#c26906' : '#d6780e');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(256 - bulbR * 0.72, tipY);
        ctx.quadraticCurveTo(256 - bulbR * 0.25, (tipY + bulbY) * 0.52, 256 - bulbR, bulbY);
        ctx.arc(256, bulbY, bulbR, Math.PI, 0, true);
        ctx.quadraticCurveTo(256 + bulbR * 0.25, (tipY + bulbY) * 0.52, 256 + bulbR * 0.72, tipY);
        ctx.closePath();
        ctx.fill();
      } else if (cT < 0.66 && noiseBlend < 0.4) {
        ctx.save();
        const sc = condenseSuperRef.current ? 1.22 : 1.0;
        if (cT < 0.40) {
          const p = cT / 0.40;
          const ease = 1 - Math.pow(1 - p, 2);
          const tipY = 330.5;
          const bulbY = tipY + 4 + ease * 21;
          const bulbR = (3.4 + ease * 7.4) * sc;
          const g = ctx.createRadialGradient(256 - 1.6, bulbY - 1.6, 0.6, 256, bulbY, bulbR);
          g.addColorStop(0, '#fffce8');
          g.addColorStop(0.5, '#ffca5a');
          g.addColorStop(1, isLight ? '#bd6406' : '#d6780e');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(256 - bulbR * 0.68, tipY);
          ctx.quadraticCurveTo(256 - bulbR * 0.24, (tipY + bulbY) * 0.52, 256 - bulbR, bulbY);
          ctx.arc(256, bulbY, bulbR, Math.PI, 0, true);
          ctx.quadraticCurveTo(256 + bulbR * 0.24, (tipY + bulbY) * 0.52, 256 + bulbR * 0.68, tipY);
          ctx.closePath();
          ctx.fill();
        } else {
          const p = (cT - 0.40) / 0.26;
          const accelP = p * p;
          const py = 355.5 + accelP * (dropY - 355.5);
          const px = 256 + accelP * (dropX - 256);
          const pr = 8.4 * sc * (1 - p * 0.10);
          // Crisp falling teardrop with luminous outer halo and liquid tip
          ctx.fillStyle = isLight ? 'rgba(218, 128, 12, 0.24)' : 'rgba(255, 206, 102, 0.30)';
          ctx.beginPath();
          ctx.arc(px, py, pr * 1.65, 0, Math.PI * 2);
          ctx.fill();
          const g = ctx.createRadialGradient(px - 1.8, py - 1.8, 0.5, px, py, pr);
          g.addColorStop(0, '#fffce8');
          g.addColorStop(0.5, '#ffc857');
          g.addColorStop(1, '#d97c10');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(px, py - pr * 1.65);
          ctx.quadraticCurveTo(px + pr * 0.95, py - pr * 0.2, px + pr * 0.88, py + pr * 0.15);
          ctx.arc(px, py + pr * 0.15, pr * 0.88, 0, Math.PI, false);
          ctx.quadraticCurveTo(px - pr * 0.95, py - pr * 0.2, px, py - pr * 1.65);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 8 · Press-and-Hold Precision Radial Charge Ring (Appears ONLY While Holding — Zero Static Clutter!)
      if (ch > 0.04 && dropAppear > 0.3) {
        const ringR = 34.5;
        ctx.save();
        ctx.translate(dropX, dropY);
        const col = isLight ? '184, 108, 8' : '248, 190, 82';
        ctx.strokeStyle = `rgba(${col}, ${0.26 * Math.min(1, ch * 3)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${col}, 0.96)`;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + ch * Math.PI * 2);
        ctx.stroke();

        // Crisp leading jewel dot on charge arc
        const headA = -Math.PI / 2 + ch * Math.PI * 2;
        ctx.fillStyle = isLight ? '#b86c08' : '#fff5d6';
        ctx.beginPath();
        ctx.arc(Math.cos(headA) * ringR, Math.sin(headA) * ringR, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 9 · Perpetual Precision Circular Ring Around Bottom Bubble (Calibrated for 1× DPR Full HD -> 2× Retina!)
      const emeraldRingVis = Math.max(sealedBlend, gesture.superHalo);
      if (dropAppear > 0.06) {
        const impactBreath = Math.min(4.2, Math.abs(dropSquashRef.current) * 14);
        const ringR = 34.5 + impactBreath + ch * 1.8;
        const isSealedState = emeraldRingVis > 0.35;
        const isNoiseState = noiseBlend > 0.45;
        const ringCol = isSealedState
          ? isLight ? '12, 134, 92' : '60, 227, 168'
          : isNoiseState
            ? isLight ? '184, 50, 44' : '224, 88, 82'
            : isLight ? '184, 108, 8' : '248, 190, 82';
        ctx.save();
        ctx.translate(dropX, dropY);

        // Continuous precision orbital ring
        ctx.strokeStyle = `rgba(${ringCol}, ${(isSealedState ? 0.50 : isNoiseState ? 0.58 : isLight ? 0.44 : 0.46) * dropAppear})`;
        ctx.lineWidth = isSealedState ? 1.75 : 1.55;
        if (isNoiseState) ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (!isNoiseState) {
          // Two precision caliper arcs anchored cleanly without competing spin
          ctx.strokeStyle = `rgba(${ringCol}, ${(isSealedState ? 0.98 : 0.94) * dropAppear})`;
          ctx.lineWidth = isSealedState ? 2.8 : 2.45;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, ringR, -0.58, 0.58);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, ringR, Math.PI - 0.58, Math.PI + 0.58);
          ctx.stroke();

          // 4 cardinal vernier ticks (delicate gold in Sift, crisp emerald chronometer ticks in Sealed)
          const tickHalf = isSealedState ? 4.2 : 2.6;
          ctx.strokeStyle = `rgba(${ringCol}, ${(isSealedState ? 0.94 : 0.62) * dropAppear})`;
          ctx.lineWidth = isSealedState ? 1.75 : 1.35;
          for (let k = 0; k < 4; k++) {
            const a = (k * Math.PI) / 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (ringR - tickHalf), Math.sin(a) * (ringR - tickHalf));
            ctx.lineTo(Math.cos(a) * (ringR + tickHalf), Math.sin(a) * (ringR + tickHalf));
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 10 · The Single Living Saffron Truth Drop (Cut Citrine / Molten Amber + Spring Squash-Stretch!)
      if (dropAppear > 0.02) {
        const baseR = 21.6 * dropAppear * (1 + ch * 0.09);
        const sq = Math.max(-0.2, Math.min(0.24, dropSquashRef.current));
        const rx = baseR * (1 + sq * 0.85);
        const ry = baseR * (1 - sq * 0.72 + Math.min(0.14, pullDist * 0.0028));

        ctx.save();
        ctx.translate(dropX, dropY);
        if (isLight && noiseBlend < 0.5) {
          ctx.shadowColor =
            emeraldRingVis > 0.5 ? 'rgba(12, 126, 88, 0.24)' : 'rgba(176, 98, 6, 0.28)';
          ctx.shadowBlur = 16 + ch * 8;
          ctx.shadowOffsetY = 6;
        }
        const dg = ctx.createRadialGradient(-rx * 0.34, -ry * 0.34, baseR * 0.06, 0, 0, Math.max(rx, ry));
        if (noiseBlend > 0.5) {
          dg.addColorStop(0, isLight ? '#b8504a' : '#d6564e');
          dg.addColorStop(0.55, isLight ? '#6e282d' : '#702026');
          dg.addColorStop(1, isLight ? '#38151a' : '#2d0c11');
        } else if (isLight) {
          dg.addColorStop(0, '#fff9e6');
          dg.addColorStop(0.28, '#ffd264');
          dg.addColorStop(0.68, '#f09a26');
          dg.addColorStop(1, '#c76906');
        } else {
          dg.addColorStop(0, '#fffce8');
          dg.addColorStop(0.32, '#ffd672');
          dg.addColorStop(0.72, '#f2a33a');
          dg.addColorStop(1, '#b85a08');
        }
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (noiseBlend < 0.5) {
          ctx.save();
          ctx.translate(dropX, dropY);
          if (isLight) {
            ctx.strokeStyle =
              emeraldRingVis > 0.5 ? 'rgba(12, 134, 92, 0.48)' : 'rgba(170, 92, 4, 0.32)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(0, 0, rx - 0.5, ry - 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 238, 184, 0.62)';
            ctx.lineWidth = 2.1;
            ctx.beginPath();
            ctx.arc(0, 0, baseR * 0.76, 0.45, Math.PI - 0.45);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
          ctx.beginPath();
          ctx.ellipse(-rx * 0.33, -ry * 0.33, rx * 0.24, ry * 0.13, -0.65, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      } // end !useFull3D

      // 11 · Whisper-Clean Live Interaction Telemetry (Top-Center Slot — Zero Collision With Bottom-Right Reset/Replay!)
      ctx.restore();
      const showOrbitHud = gesture.mode === 'orbit' || gesture.hudTimer > 0.02 || forceOrbitPreview || forceFlipPreview;
      if (ch > 0.08 || showOrbitHud || gesture.mode === 'pull-drop') {
        const cssW = canvas.clientWidth || 500;
        const dprNow = cw / Math.max(1, cssW);
        const compact = cssW < 390;
        ctx.save();
        ctx.font = `600 ${Math.round(10.2 * dprNow)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isLight ? 'rgba(18, 32, 63, 0.82)' : 'rgba(247, 210, 138, 0.92)';
        let hud = '';
        if (ch > 0.08) {
          hud = `DISTILLING TRUTH · ${Math.round(ch * 100)}%`;
        } else if (showOrbitHud) {
          const deg = quatToEulerDeg(userQuat);
          const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n}°`;
          if (gesture.mode === 'orbit' && gesture.zRoll) {
            hud = compact ? `Z-ROLL · Z ${fmt(deg.z)}` : `Z-ROLL · Z ${fmt(deg.z)} · DBL-CLICK RESET`;
          } else {
            hud = compact
              ? `AXIS · X ${fmt(deg.x)} Y ${fmt(deg.y)} Z ${fmt(deg.z)}`
              : `AXIS LOCKED · X ${fmt(deg.x)}  Y ${fmt(deg.y)}  Z ${fmt(deg.z)} · DBL-CLICK`;
          }
        } else if (gesture.mode === 'pull-drop') {
          hud = 'RELEASE TO CONDENSE';
        }
        if (hud) ctx.fillText(hud, cw * 0.5, Math.round(chH * 0.024));
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishGesture);
      window.removeEventListener('pointercancel', finishGesture);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="logo-canvas2d-host"
      style={{ touchAction: 'none', cursor: 'grab' }}
      aria-hidden="true"
    />
  );
};
