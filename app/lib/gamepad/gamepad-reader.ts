import { Binding } from './types';

export function getActiveGamepad(): Gamepad | null {
    if (typeof window === 'undefined' || !navigator.getGamepads) return null;
    const gamepads = navigator.getGamepads();
    return gamepads ? Array.from(gamepads).find(Boolean) || null : null;
}

export function readBindingValue(gp: Gamepad, binding?: Binding): number {
    if (!binding) return 0;

    if (binding.type === 'axis') {
        const raw = gp.axes[binding.index] ?? 0;
        return raw * binding.sign;
    }
    if (binding.type === 'button') {
        const b = gp.buttons[binding.index];
        if (!b) return 0;
        return b.value ?? (b.pressed ? 1 : 0);
    }
    return 0;
}

export function applyDeadzone(value: number, deadzone: number): number {
    const abs = Math.abs(value);
    if (abs < deadzone) return 0;
    const scaled = (abs - deadzone) / (1 - deadzone);
    return Math.sign(value) * Math.max(0, Math.min(1, scaled));
}

// Improved curve with smoothing gradient
export function applyCurve(value: number, sensitivity: number): number {
    const abs = Math.abs(value);

    // Exponential curve for fine control at low values
    const curved = Math.pow(abs, 1 / sensitivity);

    // Optional: Add smoothing for ultra-smooth motion
    // Quadratic ease-in-out for gradient-like smoothness
    const smoothed = abs < 0.5
        ? 2 * curved * curved
        : 1 - Math.pow(-2 * curved + 2, 2) / 2;

    return Math.sign(value) * smoothed;
}

// Alternative: Bezier-like curve for silky smooth action
export function applyBezierCurve(value: number, sensitivity: number): number {
    const abs = Math.abs(value);

    // Cubic Bezier approximation (control points for smoothness)
    const t = abs;
    const p0 = 0;
    const p1 = 0.1 / sensitivity;  // Low-end sensitivity
    const p2 = 0.9 * sensitivity;   // High-end power
    const p3 = 1;

    const curved =
        Math.pow(1 - t, 3) * p0 +
        3 * Math.pow(1 - t, 2) * t * p1 +
        3 * (1 - t) * Math.pow(t, 2) * p2 +
        Math.pow(t, 3) * p3;

    return Math.sign(value) * curved;
}
