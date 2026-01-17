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
        const buttonValue = b.value ?? (b.pressed ? 1 : 0);

        // If button binding has a sign (for directional axis commands), apply it
        if ('sign' in binding && binding.sign) {
            return buttonValue * binding.sign;
        }

        return buttonValue;
    }
    return 0;
}

export function applyDeadzone(value: number, deadzone: number): number {
    const abs = Math.abs(value);
    if (abs < deadzone) return 0;
    // Linear scaling from deadzone to 1
    const scaled = (abs - deadzone) / (1 - deadzone);
    return Math.sign(value) * Math.max(0, Math.min(1, scaled));
}
