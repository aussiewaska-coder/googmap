// /map/input/GestureCancelGuard.ts
// Gesture dominance - any map interaction immediately cancels camera modes
// Listens to: dragstart, zoomstart, rotatestart, pitchstart, touchstart

import type maplibregl from 'maplibre-gl';
import { CameraController } from '../camera/CameraController';

export class GestureCancelGuard {
  private map: maplibregl.Map;
  private cameraController: CameraController;

  constructor(map: maplibregl.Map, cameraController: CameraController) {
    this.map = map;
    this.cameraController = cameraController;

    this.setupListeners();
  }

  private setupListeners() {
    // Map gesture events
    this.map.on('dragstart', this.onGesture);
    this.map.on('zoomstart', this.onGesture);
    this.map.on('rotatestart', this.onGesture);
    this.map.on('pitchstart', this.onGesture);

    // Touch events (catch-all for mobile)
    this.map.getContainer().addEventListener('touchstart', this.onTouchStart, { passive: true });
  }

  private onGesture = () => {
    // Cancel ANY non-idle state (includes transitions)
    const mode = this.cameraController.getCurrentMode();
    if (mode !== 'idle') {
      console.log('🚫 [GestureCancelGuard] User gesture detected - cancelling camera mode');
      this.cameraController.cancelAll();
    }
  };

  private onTouchStart = () => {
    // Cancel ANY active mode including transitions (but not targeting - targeting has its own dismiss)
    const mode = this.cameraController.getCurrentMode();
    if (mode !== 'idle' && mode !== 'targeting') {
      console.log('🚫 [GestureCancelGuard] Touch detected - cancelling camera mode');
      this.cameraController.cancelAll();
    }
  };

  cleanup() {
    this.map.off('dragstart', this.onGesture);
    this.map.off('zoomstart', this.onGesture);
    this.map.off('rotatestart', this.onGesture);
    this.map.off('pitchstart', this.onGesture);

    this.map.getContainer().removeEventListener('touchstart', this.onTouchStart);
  }
}
