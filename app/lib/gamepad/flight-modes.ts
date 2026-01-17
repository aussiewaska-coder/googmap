import { FlightMode, FlyEasing } from './types';

export interface FlightModePreset {
    panSpeedPxPerSec: number;
    rotateDegPerSec: number;
    pitchDegPerSec: number;
    zoomUnitsPerSec: number;
    zoomIntensity: number;
    smoothing: number;
    flySpeed: number;
    flyCurve: number;
    flyEasing: FlyEasing;
}

export const FLIGHT_MODE_PRESETS: Record<FlightMode, FlightModePreset> = {
    joyflight: {
        panSpeedPxPerSec: 650,
        rotateDegPerSec: 75,
        pitchDegPerSec: 45,
        zoomUnitsPerSec: 0.8,
        zoomIntensity: 0.2,
        smoothing: 0.18,
        flySpeed: 0.9,
        flyCurve: 1.2,
        flyEasing: 'easeInOut',
    },
    fighter: {
        panSpeedPxPerSec: 1300,
        rotateDegPerSec: 150,
        pitchDegPerSec: 95,
        zoomUnitsPerSec: 1.4,
        zoomIntensity: 0.2,
        smoothing: 0.10,
        flySpeed: 1.4,
        flyCurve: 1.1,
        flyEasing: 'easeOut',
    },
    ufo: {
        panSpeedPxPerSec: 2100,
        rotateDegPerSec: 230,
        pitchDegPerSec: 140,
        zoomUnitsPerSec: 2.2,
        zoomIntensity: 0.2,
        smoothing: 0.16,
        flySpeed: 1.7,
        flyCurve: 1.4,
        flyEasing: 'easeOutQuint',
    },
    satellite: {
        panSpeedPxPerSec: 380,
        rotateDegPerSec: 50,
        pitchDegPerSec: 25,
        zoomUnitsPerSec: 1.8,
        zoomIntensity: 0.2,
        smoothing: 0.20,
        flySpeed: 0.7,
        flyCurve: 1.8,
        flyEasing: 'easeInOut',
    },
};

// Easing functions for discrete transitions (flyTo)
export const FLY_EASING_FUNCTIONS: Record<FlyEasing, (t: number) => number> = {
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeInCubic: (t) => t * t * t,
    easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
};

/**
 * Apply a flight mode preset to the given settings.
 * Updates all speed, smoothing, and fly settings based on the selected mode.
 */
export function applyFlightModePreset(mode: FlightMode, currentSettings: any): any {
    const preset = FLIGHT_MODE_PRESETS[mode];
    return {
        ...currentSettings,
        flightMode: mode,
        panSpeedPxPerSec: preset.panSpeedPxPerSec,
        rotateDegPerSec: preset.rotateDegPerSec,
        pitchDegPerSec: preset.pitchDegPerSec,
        zoomUnitsPerSec: preset.zoomUnitsPerSec,
        zoomIntensity: preset.zoomIntensity,
        smoothing: preset.smoothing,
        flySpeed: preset.flySpeed,
        flyCurve: preset.flyCurve,
        flyEasing: preset.flyEasing,
    };
}

/**
 * Get the appropriate easing function for flyTo animation.
 */
export function getFlyEasingFn(easing: FlyEasing): (t: number) => number {
    return FLY_EASING_FUNCTIONS[easing] || FLY_EASING_FUNCTIONS.easeOut;
}

/**
 * Check if the current settings match the preset for the given flight mode.
 * Returns true if all flight-mode-controlled settings match the preset.
 */
export function isPresetActive(settings: any, mode: FlightMode): boolean {
    const preset = FLIGHT_MODE_PRESETS[mode];

    return (
        settings.panSpeedPxPerSec === preset.panSpeedPxPerSec &&
        settings.rotateDegPerSec === preset.rotateDegPerSec &&
        settings.pitchDegPerSec === preset.pitchDegPerSec &&
        settings.zoomUnitsPerSec === preset.zoomUnitsPerSec &&
        settings.zoomIntensity === preset.zoomIntensity &&
        settings.smoothing === preset.smoothing &&
        settings.flySpeed === preset.flySpeed &&
        settings.flyCurve === preset.flyCurve &&
        settings.flyEasing === preset.flyEasing
    );
}

/**
 * Detect if current settings are custom (don't match any preset).
 * Returns the flight mode if it matches, or null if custom.
 */
export function detectFlightMode(settings: any): FlightMode | null {
    const modes: FlightMode[] = ['joyflight', 'fighter', 'ufo', 'satellite'];

    for (const mode of modes) {
        if (isPresetActive(settings, mode)) {
            return mode;
        }
    }

    return null; // Custom settings
}
