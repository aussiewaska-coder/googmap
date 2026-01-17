import { Binding } from './types-v2';

export interface GamepadSnapshot {
    buttons: readonly GamepadButton[];
    axes: readonly number[];
}

export function createSnapshot(gamepad: Gamepad | null): GamepadSnapshot | null {
    if (!gamepad) return null;
    return {
        buttons: Array.from(gamepad.buttons),
        axes: Array.from(gamepad.axes),
    };
}

export function detectNewBinding(
    prev: GamepadSnapshot | null,
    curr: GamepadSnapshot | null,
    deadzone: number
): Binding | null {
    if (!curr) return null;

    // Button press detection
    for (let i = 0; i < curr.buttons.length; i++) {
        const wasPressed = prev?.buttons?.[i]?.pressed || false;
        const isPressed = curr.buttons[i].pressed;

        if (!wasPressed && isPressed) {
            return { type: 'button', index: i };
        }
    }

    // Axis movement detection
    const threshold = Math.max(0.55, deadzone + 0.25);
    for (let i = 0; i < curr.axes.length; i++) {
        const value = curr.axes[i];
        if (Math.abs(value) > threshold) {
            return { type: 'axis', index: i, sign: value > 0 ? 1 : -1 };
        }
    }

    return null;
}
