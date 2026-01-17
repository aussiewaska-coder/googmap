// /map/camera/CameraController.ts
// Camera abstraction layer - never manipulate the map directly from UI
// Responsibilities: FlyTo presets, Orbit animation, Satellite positioning, Emergency cancel

import type maplibregl from 'maplibre-gl';
import { OrbitController, OrbitStartOptions } from './OrbitController';
import { getOrbitPreset, getSatellitePreset, easeInOutCubic } from './CameraPresets';
import { cameraModeStore } from '../state/cameraModeStore';

export class CameraController {
  private map: maplibregl.Map;
  private orbitController: OrbitController;
  private currentTerrainExaggeration: number = 1.5;

  constructor(map: maplibregl.Map) {
    this.map = map;
    this.orbitController = new OrbitController(map);
  }

  /**
   * Start orbit mode with graceful fly-in
   */
  async startOrbit(target: maplibregl.LngLat): Promise<void> {
    console.log('🛸 [CameraController] Starting orbit mode');

    // Update state
    cameraModeStore.startOrbitTransition(target);

    // Temporarily disable terrain exaggeration for smooth transition
    const hadTerrain = this.map.getTerrain();
    if (hadTerrain) {
      this.currentTerrainExaggeration = (hadTerrain as any).exaggeration ?? 1.5;
      this.map.setTerrain({ source: 'terrain-source', exaggeration: 0.5 });
    }

    // Fly to orbit starting position
    const currentBearing = this.map.getBearing();
    const preset = getOrbitPreset({ target, currentBearing });

    return new Promise((resolve) => {
      this.map.once('moveend', () => {
        // Re-enable terrain with original exaggeration
        if (hadTerrain) {
          this.map.setTerrain({
            source: 'terrain-source',
            exaggeration: this.currentTerrainExaggeration
          });
        }

        // Start orbit loop
        const orbitOpts: OrbitStartOptions = {
          target,
          zoom: preset.zoom,
          pitch: preset.pitch,
          bearing: currentBearing,
          speedDegPerSec: 18,
          useEaseTo: true,
          minZoom: 10,
          maxZoom: 16,
          minPitch: 45,
          maxPitch: 75,
        };

        this.orbitController.start(orbitOpts);
        cameraModeStore.activateOrbit();

        console.log('✅ [CameraController] Orbit mode active');
        resolve();
      });

      this.map.flyTo({
        ...preset,
        easing: easeInOutCubic,
      });
    });
  }

  /**
   * Start satellite mode with graceful fly-in
   */
  async startSatellite(target: maplibregl.LngLat): Promise<void> {
    console.log('🛰️ [CameraController] Starting satellite mode');

    // Update state
    cameraModeStore.startSatelliteTransition(target);

    // Temporarily disable terrain exaggeration
    const hadTerrain = this.map.getTerrain();
    if (hadTerrain) {
      this.currentTerrainExaggeration = (hadTerrain as any).exaggeration ?? 1.5;
      this.map.setTerrain({ source: 'terrain-source', exaggeration: 0.5 });
    }

    const preset = getSatellitePreset({ target });

    return new Promise((resolve) => {
      this.map.once('moveend', () => {
        // Re-enable terrain with original exaggeration
        if (hadTerrain) {
          this.map.setTerrain({
            source: 'terrain-source',
            exaggeration: this.currentTerrainExaggeration
          });
        }

        cameraModeStore.activateSatellite();
        console.log('✅ [CameraController] Satellite mode active');
        resolve();
      });

      this.map.flyTo({
        ...preset,
        easing: easeInOutCubic,
      });
    });
  }

  /**
   * Emergency cancel - stops all camera modes immediately
   */
  cancelAll(): void {
    console.log('🛑 [CameraController] Cancelling all camera modes');

    // Stop orbit if running
    if (this.orbitController.isRunning()) {
      this.orbitController.stop();
    }

    // Stop any ongoing map animations
    this.map.stop();

    // Reset state
    cameraModeStore.cancelAll();

    // Restore terrain if needed
    const hadTerrain = this.map.getTerrain();
    if (hadTerrain && (hadTerrain as any).exaggeration !== this.currentTerrainExaggeration) {
      this.map.setTerrain({
        source: 'terrain-source',
        exaggeration: this.currentTerrainExaggeration
      });
    }
  }

  /**
   * Get orbit controller for gamepad input
   */
  getOrbitController(): OrbitController {
    return this.orbitController;
  }

  /**
   * Check if any camera mode is active (orbit or satellite, not transitioning)
   */
  isActive(): boolean {
    return cameraModeStore.isActive();
  }

  /**
   * Get current camera mode state
   */
  getCurrentMode() {
    return cameraModeStore.getState().mode;
  }

  /**
   * Update terrain exaggeration setting
   */
  setTerrainExaggeration(value: number): void {
    this.currentTerrainExaggeration = value;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.cancelAll();
  }
}
