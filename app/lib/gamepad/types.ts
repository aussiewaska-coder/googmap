export type Binding =
    | { type: 'button'; index: number }
    | { type: 'axis'; index: number; sign: 1 | -1 };

export interface ControllerProfile {
    version: 1;
    device?: { id?: string; mapping?: string; index?: number };
    settings: {
        deadzone: number;           // e.g. 0.12
        sensitivity: number;        // e.g. 1.25
        leftStickInvertX: boolean;  // Left stick X (rotate)
        leftStickInvertY: boolean;  // Left stick Y (pitch)
        rightStickInvertX: boolean; // Right stick X (pan horizontal)
        rightStickInvertY: boolean; // Right stick Y (pan vertical)
        panSpeedPxPerSec: number;   // e.g. 900
        rotateDegPerSec: number;    // e.g. 120
        pitchDegPerSec: number;     // e.g. 80
        zoomUnitsPerSec: number;    // e.g. 1.2
        unlockMaxPitch: boolean;    // Allow pitch beyond 60° (up to 85° - MapLibre max)
    };
    bindings: {
        pan_x?: Binding;
        pan_y?: Binding;
        rotate_x?: Binding;
        pitch_y?: Binding;
        zoom_in?: Binding;
        zoom_out?: Binding;
        reset_north?: Binding;
        recenter?: Binding;
        toggle_pitch?: Binding;
    };
}

export interface ActionDefinition {
    key: keyof ControllerProfile['bindings'];
    label: string;
    description: string;
    type: 'axis' | 'button';
}

export const ACTION_DEFINITIONS: readonly ActionDefinition[] = [
    { key: 'pan_x', label: 'Pan Horizontal', description: 'Move left/right', type: 'axis' },
    { key: 'pan_y', label: 'Pan Vertical', description: 'Move up/down', type: 'axis' },
    { key: 'rotate_x', label: 'Rotate Map', description: 'Change bearing', type: 'axis' },
    { key: 'pitch_y', label: 'Pitch Camera', description: 'Tilt view angle', type: 'axis' },
    { key: 'zoom_in', label: 'Zoom In', description: 'Tap to increase speed: 1x→2x→4x→8x→stop', type: 'button' },
    { key: 'zoom_out', label: 'Zoom Out', description: 'Tap to increase speed: 1x→2x→4x→8x→stop', type: 'button' },
    { key: 'reset_north', label: 'Reset North', description: 'Point map north', type: 'button' },
    { key: 'recenter', label: 'Recenter', description: 'Return to starting view', type: 'button' },
    { key: 'toggle_pitch', label: 'Toggle Pitch', description: '0° ↔ 60° pitch', type: 'button' },
] as const;
