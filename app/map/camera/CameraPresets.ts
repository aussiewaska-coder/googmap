// /map/camera/CameraPresets.ts
// Preset camera configurations for orbit and satellite modes
// Provides consistent fly-in animations with proper easing

import type maplibregl from 'maplibre-gl';

export const ORBIT_START_ZOOM = 13.5; // ~10,000 ft feel
export const ORBIT_START_PITCH = 65; // Ideal tilt for orbit view
export const SATELLITE_ZOOM = 12.8; // ~50km altitude feel
export const SATELLITE_PITCH = 0; // Straight down (nadir)
export const SATELLITE_BEARING = 0; // North-up

export interface OrbitPresetOptions {
  target: maplibregl.LngLatLike;
  currentBearing?: number;
  duration?: number;
}

export interface SatellitePresetOptions {
  target: maplibregl.LngLatLike;
  duration?: number;
}

/**
 * Generate fly-in preset for orbit mode
 * Creates an illusion-based approach with bearing + pitch
 */
export function getOrbitPreset(opts: OrbitPresetOptions): maplibregl.FlyToOptions {
  const {
    target,
    currentBearing = 0,
    duration = 1800,
  } = opts;

  return {
    center: target,
    pitch: ORBIT_START_PITCH,
    bearing: currentBearing,
    zoom: ORBIT_START_ZOOM,
    duration,
    curve: 1.6,
    essential: true,
  } as maplibregl.FlyToOptions;
}

/**
 * Generate fly-in preset for satellite mode
 * Snaps to north-up, straight-down view
 */
export function getSatellitePreset(opts: SatellitePresetOptions): maplibregl.FlyToOptions {
  const {
    target,
    duration = 1600,
  } = opts;

  return {
    center: target,
    pitch: SATELLITE_PITCH,
    bearing: SATELLITE_BEARING,
    zoom: SATELLITE_ZOOM,
    duration,
    curve: 1.8,
    essential: true,
  } as maplibregl.FlyToOptions;
}

/**
 * Easing function for smooth camera movements
 */
export const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
