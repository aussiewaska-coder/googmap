import { ControllerProfile } from './types';

export const DEFAULT_PROFILE: ControllerProfile = {
    version: 1,
    settings: {
        deadzone: 0.12,
        sensitivity: 1.25,
        invertY: 'none',
        panSpeedPxPerSec: 900,
        rotateDegPerSec: 120,
        pitchDegPerSec: 80,
        zoomUnitsPerSec: 1.2,
    },
    bindings: {},
};

export function applyTacticalPreset(): ControllerProfile {
    return {
        ...DEFAULT_PROFILE,
        settings: {
            ...DEFAULT_PROFILE.settings,
            invertY: 'left', // Default to inverted (flight controls)
        },
        bindings: {
            // RIGHT stick → pan (axes 2, 3)
            pan_x: { type: 'axis', index: 2, sign: 1 },
            pan_y: { type: 'axis', index: 3, sign: 1 },
            // LEFT stick → rotate + pitch (axes 0, 1)
            rotate_x: { type: 'axis', index: 0, sign: 1 },
            pitch_y: { type: 'axis', index: 1, sign: 1 },  // Normal (invertY setting handles inversion)
            reset_north: { type: 'button', index: 3 },      // Y button
        },
    };
}
