/**
 * Pure 3D Quaternion & Canonical Vivechak Monolith Extrusion Math (Zero Dependencies).
 * Shared for true 360° X/Y/Z unconstrained trackball rotation, flick momentum,
 * smooth slerp home-return, and 3D depth-sorted polygonal projection in Canvas2D.
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

function sampleQuad(p0: Point2D, p1: Point2D, p2: Point2D, segs: number): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const u = 1 - t;
    pts.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
  return pts;
}

/**
 * Sampled canonical docs/BRAND.md (S=36 on 512x512 canvas) outer & inner loops,
 * centered at (256, 246) with Y-down screen coordinates for Canvas2D 3D projection.
 */
export function buildCanonicalContours(): { outer: Point2D[]; inner: Point2D[] } {
  const CX = 256;
  const CY = 246;
  const norm = (p: Point2D): Point2D => ({ x: p.x - CX, y: p.y - CY });

  const outerRaw: Point2D[] = [
    { x: 112, y: 116.25 },
    { x: 400, y: 116.25 },
    ...sampleArc(400, 134.25, 18, -Math.PI / 2, Math.PI / 2, 10).slice(1),
    { x: 375.8, y: 152.25 },
    ...sampleQuad({ x: 375.8, y: 152.25 }, { x: 370.2, y: 152.25 }, { x: 366.45, y: 157.65 }, 4),
    { x: 271.59, y: 321.96 },
    ...sampleQuad({ x: 271.59, y: 321.96 }, { x: 256, y: 338.8 }, { x: 240.41, y: 321.96 }, 8),
    { x: 145.55, y: 157.65 },
    ...sampleQuad({ x: 145.55, y: 157.65 }, { x: 141.8, y: 152.25 }, { x: 136.2, y: 152.25 }, 4),
    { x: 112, y: 152.25 },
    ...sampleArc(112, 134.25, 18, Math.PI / 2, (Math.PI * 3) / 2, 10).slice(1, -1),
  ];

  const innerRaw: Point2D[] = [
    { x: 315.53, y: 152.25 },
    { x: 196.47, y: 152.25 },
    ...sampleQuad({ x: 196.47, y: 152.25 }, { x: 187.8, y: 152.25 }, { x: 190.24, y: 163.05 }, 4),
    { x: 249.76, y: 266.16 },
    ...sampleQuad({ x: 249.76, y: 266.16 }, { x: 256, y: 275.5 }, { x: 262.24, y: 266.16 }, 5),
    { x: 321.76, y: 163.05 },
    ...sampleQuad({ x: 321.76, y: 163.05 }, { x: 324.2, y: 152.25 }, { x: 315.53, y: 152.25 }, 4).slice(0, -1),
  ];

  return {
    outer: outerRaw.map(norm),
    inner: innerRaw.map(norm),
  };
}
