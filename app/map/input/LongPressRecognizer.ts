// /map/input/LongPressRecognizer.ts
// Mobile-safe long-press recognizer for target selection
// Rules: 500-650ms timer, cancel on movement, cancel on second finger, cancel on drag

import type maplibregl from 'maplibre-gl';

export interface LongPressEvent {
  lngLat: maplibregl.LngLat;
  screenXY: { x: number; y: number };
}

export type LongPressCallback = (event: LongPressEvent) => void;

export class LongPressRecognizer {
  private map: maplibregl.Map;
  private container: HTMLElement;
  private callback: LongPressCallback;

  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private isRecognizing = false;

  // Tuning parameters
  private readonly LONG_PRESS_DURATION = 550; // milliseconds
  private readonly MOVEMENT_THRESHOLD = 10; // pixels

  constructor(map: maplibregl.Map, callback: LongPressCallback) {
    this.map = map;
    this.container = map.getContainer();
    this.callback = callback;

    this.setupListeners();
  }

  private setupListeners() {
    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd);
    this.container.addEventListener('touchcancel', this.onTouchCancel);

    // Also support mouse for desktop testing
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mouseleave', this.onMouseLeave);
  }

  private onTouchStart = (e: TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) {
      this.cancel();
      return;
    }

    const touch = e.touches[0];
    this.startRecognition(touch.clientX, touch.clientY);
  };

  private onTouchMove = (e: TouchEvent) => {
    if (!this.isRecognizing) return;

    // Cancel if second finger appears
    if (e.touches.length > 1) {
      this.cancel();
      return;
    }

    const touch = e.touches[0];
    this.checkMovement(touch.clientX, touch.clientY);
  };

  private onTouchEnd = () => {
    this.cancel();
  };

  private onTouchCancel = () => {
    this.cancel();
  };

  private onMouseDown = (e: MouseEvent) => {
    // Only left button
    if (e.button !== 0) return;
    this.startRecognition(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isRecognizing) return;
    this.checkMovement(e.clientX, e.clientY);
  };

  private onMouseUp = () => {
    this.cancel();
  };

  private onMouseLeave = () => {
    this.cancel();
  };

  private startRecognition(x: number, y: number) {
    this.isRecognizing = true;
    this.touchStartTime = Date.now();
    this.touchStartPos = { x, y };

    // Start timer
    this.longPressTimer = setTimeout(() => {
      this.onLongPressComplete();
    }, this.LONG_PRESS_DURATION);
  }

  private checkMovement(x: number, y: number) {
    if (!this.touchStartPos) return;

    const dx = Math.abs(x - this.touchStartPos.x);
    const dy = Math.abs(y - this.touchStartPos.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cancel if moved too much
    if (distance > this.MOVEMENT_THRESHOLD) {
      this.cancel();
    }
  }

  private onLongPressComplete() {
    if (!this.isRecognizing || !this.touchStartPos) return;

    console.log('🎯 [LongPress] Target selected');

    // Convert screen coordinates to map coordinates
    const lngLat = this.map.unproject([
      this.touchStartPos.x,
      this.touchStartPos.y
    ]);

    // Trigger callback
    this.callback({
      lngLat,
      screenXY: { ...this.touchStartPos },
    });

    this.reset();
  }

  private cancel() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.reset();
  }

  private reset() {
    this.isRecognizing = false;
    this.touchStartTime = 0;
    this.touchStartPos = null;
  }

  cleanup() {
    this.cancel();

    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchEnd);
    this.container.removeEventListener('touchcancel', this.onTouchCancel);

    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mouseleave', this.onMouseLeave);
  }
}
