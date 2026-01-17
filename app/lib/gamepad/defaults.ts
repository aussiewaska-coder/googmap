import { ControllerProfile } from './types';

export const DEFAULT_PROFILE: ControllerProfile = {
    version: 1,
    settings: {
        flightMode: 'joyflight',

        // input processing
        deadzone: 0.12,
        sensitivity: 1.0,
        smoothing: 0.18,

        // continuous camera speeds (per second) - defaults from joyflight preset
        panSpeedPxPerSec: 650,
        rotateDegPerSec: 75,
        pitchDegPerSec: 45,
        zoomUnitsPerSec: 0.8,
        zoomIntensity: 0.2,

        // discrete transitions (recenter/go-to)
        flySpeed: 0.9,
        flyCurve: 1.2,
        flyEasing: 'easeInOut',

        unlockMaxPitch: false,
    },
    bindings: {},
};

export function applyTacticalPreset(): ControllerProfile {
    return {
        ...DEFAULT_PROFILE,
        bindings: {
            // RIGHT stick → pan (axes 2, 3)
            pan_x: { type: 'axis', index: 2, sign: 1 },
            pan_y: { type: 'axis', index: 3, sign: 1 },
            // LEFT stick → rotate + pitch (axes 0, 1)
            rotate_x: { type: 'axis', index: 0, sign: 1 },
            pitch_y: { type: 'axis', index: 1, sign: 1 },
            reset_north: { type: 'button', index: 3 },      // Y button
        },
    };
}
