// /map/input/GamepadRouter.ts
// Routes gamepad joystick inputs to orbit controller
// Only active when orbit mode is running

import { getActiveGamepad, readBindingValue, applyDeadzone } from '../../lib/gamepad/gamepad-reader';
import type { OrbitController } from '../camera/OrbitController';
import { cameraModeStore } from '../state/cameraModeStore';

export class GamepadRouter {
  private orbitController: OrbitController;
  private rafId: number | null = null;
  private isRunning = false;

  // Hardcoded bindings for now (can be made configurable later)
  private readonly LEFT_STICK_Y = { type: 'axis' as const, index: 1, sign: 1 as 1 | -1 };
  private readonly RIGHT_STICK_Y = { type: 'axis' as const, index: 3, sign: 1 as 1 | -1 };
  private readonly DEADZONE = 0.15;

  constructor(orbitController: OrbitController) {
    this.orbitController = orbitController;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.rafId = requestAnimationFrame(this.tick);
    console.log('🎮 [GamepadRouter] Started');
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    console.log('🎮 [GamepadRouter] Stopped');
  }

  private tick = () => {
    if (!this.isRunning) return;

    // Only route input when orbit is active
    const state = cameraModeStore.getState();
    if (state.mode === 'orbit_active') {
      const gamepad = getActiveGamepad();
      if (gamepad) {
        // Read joystick values
        const leftY = readBindingValue(gamepad, this.LEFT_STICK_Y);
        const rightY = readBindingValue(gamepad, this.RIGHT_STICK_Y);

        // Apply deadzone
        const leftYFiltered = applyDeadzone(leftY, this.DEADZONE);
        const rightYFiltered = applyDeadzone(rightY, this.DEADZONE);

        // Apply to orbit controller
        if (leftYFiltered !== 0 || rightYFiltered !== 0) {
          this.orbitController.applyInput({
            leftY: leftYFiltered,
            rightY: rightYFiltered,
          });
        }
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  cleanup() {
    this.stop();
  }
}
