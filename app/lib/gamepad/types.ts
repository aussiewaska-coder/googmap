export type Binding =
    | { type: 'button'; index: number }
    | { type: 'axis'; index: number; sign: 1 | -1 };

export type FlightMode = "joyflight" | "fighter" | "ufo" | "satellite";
export type FlyEasing = "easeOut" | "easeInOut" | "easeInCubic" | "easeOutQuint";

export interface ControllerProfile {
    version: 1;
    device?: { id?: string; mapping?: string; index?: number };
    settings: {
        flightMode: FlightMode;

        // input processing
        deadzone: number;           // 0..0.35
        sensitivity: number;        // global speed multiplier (0.5-2.0, default 1.0)
        smoothing: number;          // 0..1, inertia factor

        // continuous camera speeds (per second)
        panSpeedPxPerSec: number;
        rotateDegPerSec: number;
        pitchDegPerSec: number;
        zoomUnitsPerSec: number;
        zoomIntensity: number;      // 0.1-1.0, button zoom feel (default 0.2)

        // discrete transitions (recenter/go-to)
        flySpeed: number;           // FlyToOptions.speed
        flyCurve: number;           // FlyToOptions.curve
        flyEasing: FlyEasing;

        unlockMaxPitch: boolean;    // Allow pitch beyond 60° (up to 85° - MapLibre max)
    };
    bindings: {
        pan_x?: Binding;
        pan_y?: Binding;
        rotate_x?: Binding;
        pitch_y?: Binding;
        zoom_in?: Binding;          // button zoom (optional)
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
    { key: 'zoom_in', label: 'Zoom In', description: 'Tap to cycle speed (1→2→4→8→stop) × zoomIntensity', type: 'button' },
    { key: 'zoom_out', label: 'Zoom Out', description: 'Tap to cycle speed (1→2→4→8→stop) × zoomIntensity', type: 'button' },
    { key: 'reset_north', label: 'Reset North', description: 'Point map north', type: 'button' },
    { key: 'recenter', label: 'Recenter', description: 'Return to starting view', type: 'button' },
    { key: 'toggle_pitch', label: 'Toggle Pitch', description: '0° ↔ 60° pitch', type: 'button' },
] as const;
