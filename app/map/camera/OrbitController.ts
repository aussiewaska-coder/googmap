// /map/camera/OrbitController.ts
// Drop-in orbit controller for MapLibre GL JS (v5.x) + Next.js client.
// Orbit illusion: keep center locked on target, rotate bearing continuously, use zoom as "radius" proxy.
// Touch/gesture cancel should be handled outside (recommended), but this controller also offers stop().
//
// Usage:
//   const orbit = new OrbitController(map);
//   orbit.start({ target, zoom: 13.2, pitch: 65 });
//   orbit.setSpeedDegPerSec(20);
//   orbit.setRadiusZoom(12.7);
//   orbit.stop();

import type maplibregl from "maplibre-gl";

export type OrbitStartOptions = {
  target: maplibregl.LngLatLike;

  // "10,000 ft feel" is typically around zoom 12–14 depending on style/terrain.
  // Treat zoom as radius proxy for now.
  zoom?: number;

  // Tilt angle for orbit. 55–75 feels good.
  pitch?: number;

  // Initial bearing. If omitted, starts from current map bearing.
  bearing?: number;

  // Degrees per second (positive = clockwise).
  speedDegPerSec?: number;

  // If true, uses map.easeTo with duration=0 every frame (default).
  // If false, uses jumpTo every frame (sometimes smoother on low-end devices).
  useEaseTo?: boolean;

  // Clamp pitch / zoom
  minZoom?: number;
  maxZoom?: number;
  minPitch?: number;
  maxPitch?: number;
};

export type OrbitUpdateFromInput = {
  // Normalized inputs [-1..1]
  leftY?: number; // radius control
  rightY?: number; // speed control
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class OrbitController {
  private map: maplibregl.Map;

  private running = false;
  private rafId: number | null = null;

  private target: maplibregl.LngLatLike | null = null;

  // Current values (smoothed)
  private zoom = 13;
  private pitch = 65;
  private bearing = 0;
  private speedDegPerSec = 18;

  // Targets (for smoothing)
  private zoomTarget = 13;
  private speedTarget = 18;

  // Config
  private useEaseTo = true;

  private minZoom = 6;
  private maxZoom = 18;
  private minPitch = 0;
  private maxPitch = 85;

  // Smoothing factors (0..1); higher = snappier
  private zoomSmooth = 0.12;
  private speedSmooth = 0.12;

  private lastTs = 0;

  constructor(map: maplibregl.Map) {
    this.map = map;
  }

  isRunning() {
    return this.running;
  }

  getTarget() {
    return this.target;
  }

  /** Start orbit immediately (assumes you've already flown to a good pose). */
  start(opts: OrbitStartOptions) {
    this.stop(); // clean restart

    this.target = opts.target;

    const currentZoom = this.map.getZoom();
    const currentPitch = this.map.getPitch();
    const currentBearing = this.map.getBearing();

    this.zoom = clamp(opts.zoom ?? currentZoom, opts.minZoom ?? this.minZoom, opts.maxZoom ?? this.maxZoom);
    this.zoomTarget = this.zoom;

    this.pitch = clamp(opts.pitch ?? currentPitch, opts.minPitch ?? this.minPitch, opts.maxPitch ?? this.maxPitch);
    this.bearing = (opts.bearing ?? currentBearing) % 360;

    this.speedDegPerSec = opts.speedDegPerSec ?? this.speedDegPerSec;
    this.speedTarget = this.speedDegPerSec;

    this.useEaseTo = opts.useEaseTo ?? true;

    this.minZoom = opts.minZoom ?? this.minZoom;
    this.maxZoom = opts.maxZoom ?? this.maxZoom;
    this.minPitch = opts.minPitch ?? this.minPitch;
    this.maxPitch = opts.maxPitch ?? this.maxPitch;

    this.running = true;
    this.lastTs = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Stop orbit loop. Does not change the camera pose; caller decides what happens next. */
  stop() {
    this.running = false;
    this.target = null;

    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTs = 0;
  }

  /** Hard set orbit target (keeps orbit running). */
  setTarget(target: maplibregl.LngLatLike) {
    this.target = target;
  }

  /** Set orbit speed (deg/sec). Positive = clockwise. */
  setSpeedDegPerSec(speed: number) {
    // Reasonable clamp to prevent nausea / runaway
    this.speedTarget = clamp(speed, -120, 120);
  }

  /** Set "radius" using zoom as proxy (higher zoom = closer = smaller radius). */
  setRadiusZoom(zoom: number) {
    this.zoomTarget = clamp(zoom, this.minZoom, this.maxZoom);
  }

  /** Set pitch (tilt). */
  setPitch(pitch: number) {
    this.pitch = clamp(pitch, this.minPitch, this.maxPitch);
  }

  /** Optional helper: map joystick input to speed + radius (hardcoded tuning). */
  applyInput(input: OrbitUpdateFromInput) {
    // leftY: up/down radius -> zoom delta
    // rightY: up/down speed
    // Inputs are typically [-1..1], where up is -1 on most gamepads.
    const leftY = input.leftY ?? 0;
    const rightY = input.rightY ?? 0;

    // Tuning knobs (change later)
    const zoomPerUnit = 0.9; // how much zoom changes at full stick deflection
    const speedPerUnit = 40; // deg/sec at full stick deflection

    // Invert if needed depending on your gamepad mapping.
    const zoomDelta = (-leftY) * zoomPerUnit;
    const speed = rightY * speedPerUnit;

    this.setRadiusZoom(this.zoomTarget + zoomDelta);
    this.setSpeedDegPerSec(speed);
  }

  private tick = (ts: number) => {
    if (!this.running || !this.target) return;

    if (this.lastTs === 0) this.lastTs = ts;
    const dt = (ts - this.lastTs) / 1000;
    this.lastTs = ts;

    // Smooth toward targets
    this.zoom = lerp(this.zoom, this.zoomTarget, this.zoomSmooth);
    this.speedDegPerSec = lerp(this.speedDegPerSec, this.speedTarget, this.speedSmooth);

    // Advance bearing
    this.bearing = (this.bearing + this.speedDegPerSec * dt) % 360;

    // Apply camera update
    try {
      if (this.useEaseTo) {
        // duration: 0 makes it "immediate" but still uses internal easing path.
        this.map.easeTo({
          center: this.target,
          zoom: this.zoom,
          pitch: this.pitch,
          bearing: this.bearing,
          duration: 0,
          easing: (t: number) => t,
          // MapLibre has 'essential' in flyTo/easeTo in many builds; safe to omit if TS complains.
          essential: true as any,
        } as any);
      } else {
        this.map.jumpTo({
          center: this.target,
          zoom: this.zoom,
          pitch: this.pitch,
          bearing: this.bearing,
        });
      }
    } catch {
      // If map is destroyed/unmounted, fail closed.
      this.stop();
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}
