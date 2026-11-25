/**
 * Pure 3D Quaternion & Canonical Vivechak Monolith Extrusion Math (Zero Dependencies).
 * Implements exact docs/BRAND.md S=36 geometry (512x512 canvas) for true 360° X/Y/Z
 * unconstrained trackball rotation, flick momentum, smooth slerp home-return,
 * and depth-sorted 3D polygonal extrusion in Canvas2D (including 3-piece aperture split).
 */

export type Quat = [number, number, number, number]; // [x, y, z, w]
export type Vec3 = [number, number, number];

export const QUAT_IDENTITY: Quat = [0, 0, 0, 1];

export function quatNormalize(q: Quat): Quat {
  const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatFromAxisAngle(axis: Vec3, angleRad: number): Quat {
  const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const half = angleRad * 0.5;
  const s = Math.sin(half) / len;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let [bx, by, bz, bw] = b;
  let dot = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (dot < 0) {
    dot = -dot;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  if (dot > 0.9995) {
    return quatNormalize([
      a[0] + (bx - a[0]) * t,
      a[1] + (by - a[1]) * t,
      a[2] + (bz - a[2]) * t,
      a[3] + (bw - a[3]) * t,
    ]);
  }
  const theta = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sinT = Math.sin(theta);
  const w1 = Math.sin((1 - t) * theta) / sinT;
  const w2 = Math.sin(t * theta) / sinT;
  return [
    a[0] * w1 + bx * w2,
    a[1] * w1 + by * w2,
    a[2] * w1 + bz * w2,
    a[3] * w1 + bw * w2,
  ];
}

export function quatAngleToIdentity(q: Quat): number {
  const w = Math.min(1, Math.abs(q[3]));
  return 2 * Math.acos(w);
}

export function quatRotateVec(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

/** Extract readable X/Y/Z degrees (-180..+180) from quaternion for live HUD telemetry. */
export function quatToEulerDeg(q: Quat): { x: number; y: number; z: number } {
  const [x, y, z, w] = q;
  const sinr = 2 * (w * x + y * z);
  const cosr = 1 - 2 * (x * x + y * y);
  const rx = Math.atan2(sinr, cosr);

  const sinp = 2 * (w * y - z * x);
  const ry = Math.abs(sinp) >= 1 ? (Math.PI / 2) * Math.sign(sinp) : Math.asin(sinp);

  const siny = 2 * (w * z + x * y);
  const cosy = 1 - 2 * (y * y + z * z);
  const rz = Math.atan2(siny, cosy);

  const radToDeg = 180 / Math.PI;
  return {
    x: Math.round(rx * radToDeg),
    y: Math.round(ry * radToDeg),
    z: Math.round(rz * radToDeg),
  };
}

export interface Point2D {
  x: number;
  y: number;
}

function sampleArc(cx: number, cy: number, r: number, a0: number, a1: number, segs: number): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function sampleSvgArc(
  p0: Point2D,
  p1: Point2D,
  r: number,
  sweep: 0 | 1,
  segs: number
): Point2D[] {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-4) return [p1];
  const rad = Math.max(r, d * 0.5);
  const mx = (p0.x + p1.x) * 0.5;
  const my = (p0.y + p1.y) * 0.5;
  const h = Math.sqrt(Math.max(0, rad * rad - (d * 0.5) * (d * 0.5)));
  // Unit perpendicular (screen Y-down): sweep=1 places center to the right of p0->p1
  const nx = -dy / d;
  const ny = dx / d;
  const sign = sweep === 1 ? 1 : -1;
  const cx = mx + nx * h * sign;
  const cy = my + ny * h * sign;
  const a0 = Math.atan2(p0.y - cy, p0.x - cx);
  let a1 = Math.atan2(p1.y - cy, p1.x - cx);
  if (sweep === 1 && a1 < a0) a1 += Math.PI * 2;
  if (sweep === 0 && a1 > a0) a1 -= Math.PI * 2;
  const pts: Point2D[] = [];
  for (let i = 1; i <= segs; i++) {
    const a = a0 + ((a1 - a0) * i) / segs;
    pts.push({ x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad });
  }
  return pts;
}

const CX = 256;
const CY = 246;
const norm = (p: Point2D): Point2D => ({ x: p.x - CX, y: p.y - CY });

/**
 * Exact sampled canonical docs/BRAND.md (S=36 on 512x512 canvas) outer & inner loops,
 * using true circular arcs matching the SVG A-commands (0.07° tangent continuity),
 * centered at (256, 246) with Y-down screen coordinates for Canvas2D 3D projection.
 */
export function buildCanonicalContours(): { outer: Point2D[]; inner: Point2D[] } {
  const outerRaw: Point2D[] = [
    { x: 112, y: 116.25 },
    { x: 400, y: 116.25 },
    ...sampleArc(400, 134.25, 18, -Math.PI / 2, Math.PI / 2, 12).slice(1),
    { x: 375.8, y: 152.25 },
    ...sampleSvgArc({ x: 375.8, y: 152.25 }, { x: 366.45, y: 157.65 }, 10.8, 0, 6),
    { x: 271.59, y: 321.96 },
    ...sampleSvgArc({ x: 271.59, y: 321.96 }, { x: 240.41, y: 321.96 }, 18, 1, 10),
    { x: 145.55, y: 157.65 },
    ...sampleSvgArc({ x: 145.55, y: 157.65 }, { x: 136.2, y: 152.25 }, 10.8, 0, 6),
    { x: 112, y: 152.25 },
    ...sampleArc(112, 134.25, 18, Math.PI / 2, (Math.PI * 3) / 2, 12).slice(1, -1),
  ];

  const innerRaw: Point2D[] = [
    { x: 315.53, y: 152.25 },
    { x: 196.47, y: 152.25 },
    ...sampleSvgArc({ x: 196.47, y: 152.25 }, { x: 190.24, y: 163.05 }, 7.2, 0, 6),
    { x: 249.76, y: 266.16 },
    ...sampleSvgArc({ x: 249.76, y: 266.16 }, { x: 262.24, y: 266.16 }, 7.2, 0, 6),
    { x: 321.76, y: 163.05 },
    ...sampleSvgArc({ x: 321.76, y: 163.05 }, { x: 315.53, y: 152.25 }, 7.2, 0, 6).slice(0, -1),
  ];

  return {
    outer: outerRaw.map(norm),
    inner: innerRaw.map(norm),
  };
}

/**
 * 3-piece kinematic decomposition contours for full 360° 3D Raw Chat aperture split in Canvas2D.
 */
export function buildSplitContours(): { bar: Point2D[]; left: Point2D[]; right: Point2D[] } {
  const barRaw: Point2D[] = [
    { x: 112, y: 116.25 },
    { x: 400, y: 116.25 },
    ...sampleArc(400, 134.25, 18, -Math.PI / 2, Math.PI / 2, 10).slice(1),
    { x: 112, y: 152.25 },
    ...sampleArc(112, 134.25, 18, Math.PI / 2, (Math.PI * 3) / 2, 10).slice(1, -1),
  ];

  const leftRaw: Point2D[] = [
    { x: 145.55, y: 154 },
    { x: 188, y: 154 },
    { x: 254.5, y: 270 },
    { x: 254.5, y: 329 },
    ...sampleSvgArc({ x: 254.5, y: 329 }, { x: 240.41, y: 321.96 }, 18, 1, 5),
    { x: 145.55, y: 157.65 },
  ];

  const rightRaw: Point2D[] = [
    { x: 366.45, y: 154 },
    { x: 324, y: 154 },
    { x: 257.5, y: 270 },
    { x: 257.5, y: 329 },
    ...sampleSvgArc({ x: 257.5, y: 329 }, { x: 271.59, y: 321.96 }, 18, 0, 5),
    { x: 366.45, y: 157.65 },
  ];

  return {
    bar: barRaw.map(norm),
    left: leftRaw.map(norm),
    right: rightRaw.map(norm),
  };
}
