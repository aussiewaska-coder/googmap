// /map/state/cameraModeStore.ts
// Finite State Machine for camera modes - single source of truth
// Prevents race conditions with gestures and ensures clean state transitions

'use client';

import type maplibregl from 'maplibre-gl';

export type CameraMode =
  | 'idle'
  | 'targeting'
  | 'transitioning_orbit'
  | 'orbit_active'
  | 'transitioning_satellite'
  | 'satellite_active';

export interface CameraModeState {
  mode: CameraMode;
  target?: maplibregl.LngLat;
  overlayScreenXY?: { x: number; y: number };
}

type StateListener = (state: CameraModeState) => void;

class CameraModeStore {
  private state: CameraModeState = { mode: 'idle' };
  private listeners: StateListener[] = [];

  getState(): CameraModeState {
    return this.state;
  }

  setState(update: Partial<CameraModeState>) {
    this.state = { ...this.state, ...update };
    this.notifyListeners();
  }

  setMode(mode: CameraMode, extras?: Partial<CameraModeState>) {
    this.setState({ mode, ...extras });
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // High-level transitions
  enterTargeting(target: maplibregl.LngLat, screenXY: { x: number; y: number }) {
    this.setState({
      mode: 'targeting',
      target,
      overlayScreenXY: screenXY,
    });
  }

  startOrbitTransition(target: maplibregl.LngLat) {
    this.setState({
      mode: 'transitioning_orbit',
      target,
      overlayScreenXY: undefined,
    });
  }

  activateOrbit() {
    this.setState({ mode: 'orbit_active' });
  }

  startSatelliteTransition(target: maplibregl.LngLat) {
    this.setState({
      mode: 'transitioning_satellite',
      target,
      overlayScreenXY: undefined,
    });
  }

  activateSatellite() {
    this.setState({ mode: 'satellite_active' });
  }

  cancelAll() {
    this.setState({
      mode: 'idle',
      target: undefined,
      overlayScreenXY: undefined,
    });
  }

  isIdle(): boolean {
    return this.state.mode === 'idle';
  }

  isActive(): boolean {
    return this.state.mode === 'orbit_active' || this.state.mode === 'satellite_active';
  }
}

// Singleton instance
export const cameraModeStore = new CameraModeStore();
