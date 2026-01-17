/**
 * Default Controller Profile V2 and preset configurations
 */

import { ControllerProfileV2, ButtonLabel, Binding } from './types-v2';

// ============================================================================
// Default Profile V2
// ============================================================================

export const DEFAULT_PROFILE_V2: ControllerProfileV2 = {
    version: 2,

    device: undefined,

    labels: {},

    bindings: {
        global: {},
        map: {},
        menu: {},
        drone_gimbal: {},
    },

    settings: {
        flightMode: 'joyflight',

        // Input processing
        deadzone: 0.12,
        sensitivity: 1.25,
        smoothing: 0.14,
        invertY: 'none',

        // Continuous speeds (per second)
        panSpeedPxPerSec: 650,
        rotateDegPerSec: 75,
        pitchDegPerSec: 45,
        zoomUnitsPerSec: 0.8,
        zoomIntensity: 0.5,

        // Continuous camera micro-glide
        glideMs: 40,
        glideEasing: 'easeInOut',

        // Discrete transitions
        flySpeed: 0.9,
        flyCurve: 1.2,
        flyEasing: 'easeInOut',

        unlockMaxPitch: true,
    },

    uiState: {
        lastContext: 'map',
    },
};

// ============================================================================
// Tactical Preset (same as v1 for compatibility)
// ============================================================================

/**
 * Standard Xbox controller layout preset
 * - LEFT stick (axes 0,1): Rotate + Pitch
 * - RIGHT stick (axes 2,3): Pan X/Y
 * - Buttons: Various actions
 */
export function applyTacticalPresetV2(): ControllerProfileV2 {
    return {
        ...DEFAULT_PROFILE_V2,
        bindings: {
            global: {},
            map: {
                // RIGHT stick → Pan
                'MAP.PAN_X': { type: 'axis', index: 2, sign: 1 },
                'MAP.PAN_Y': { type: 'axis', index: 3, sign: 1 },

                // LEFT stick → Rotate + Pitch
                'MAP.ROTATE_X': { type: 'axis', index: 0, sign: 1 },
                'MAP.PITCH_Y': { type: 'axis', index: 1, sign: 1 },

                // Buttons
                'MAP.RESET_NORTH': { type: 'button', index: 6 },  // LB
                'MAP.ZOOM_IN': { type: 'button', index: 11 },     // Y
                'MAP.ZOOM_OUT': { type: 'button', index: 10 },    // X
                'MAP.RECENTER': { type: 'button', index: 7 },     // RB
            },
            menu: {},
            drone_gimbal: {
                // Copy map bindings for drone (different behavior)
                'DRONE.STRAFE_LEFT': { type: 'axis', index: 2, sign: 1 },
                'DRONE.MOVE_FORWARD': { type: 'axis', index: 3, sign: 1 },
                'DRONE.LOOK_X': { type: 'axis', index: 0, sign: 1 },
                'DRONE.LOOK_Y': { type: 'axis', index: 1, sign: 1 },
                'DRONE.RESET_HEADING': { type: 'button', index: 6 },
                'DRONE.RECENTER': { type: 'button', index: 7 },
            },
        },
    };
}

// ============================================================================
// Default Command Bindings (Applied after wizard)
// ============================================================================

/**
 * Apply default command bindings based on button labels
 * Called after wizard completion
 */
export function applyDefaultCommandBindings(
    profile: ControllerProfileV2
): ControllerProfileV2 {
    const { labels } = profile;

    // Helper to get button index from label
    const getButtonIndex = (label: ButtonLabel): number | undefined => {
        return labels[label];
    };

    // Default global bindings
    const globalBindings: Record<string, Binding | undefined> = {};

    // TOGGLE_SETTINGS = DPAD_DOWN (or START if DPAD_DOWN not available)
    const toggleSettingsIdx = getButtonIndex('DPAD_DOWN') ?? getButtonIndex('START');
    if (toggleSettingsIdx !== undefined) {
        globalBindings['GLOBAL.TOGGLE_SETTINGS'] = { type: 'button', index: toggleSettingsIdx };
    }

    // GEOLOCATE = Y
    const geolocateIdx = getButtonIndex('Y');
    if (geolocateIdx !== undefined) {
        globalBindings['GLOBAL.GEOLOCATE'] = { type: 'button', index: geolocateIdx };
    }

    // REPORT_TRAFFIC = X
    const reportIdx = getButtonIndex('X');
    if (reportIdx !== undefined) {
        globalBindings['GLOBAL.REPORT_TRAFFIC_POLICE'] = { type: 'button', index: reportIdx };
    }

    // Default menu bindings
    const menuBindings: Record<string, Binding | undefined> = {};

    // Menu navigation = D-pad
    const upIdx = getButtonIndex('DPAD_UP');
    const downIdx = getButtonIndex('DPAD_DOWN');
    const leftIdx = getButtonIndex('DPAD_LEFT');
    const rightIdx = getButtonIndex('DPAD_RIGHT');

    if (upIdx !== undefined) menuBindings['MENU.UP'] = { type: 'button', index: upIdx };
    if (downIdx !== undefined) menuBindings['MENU.DOWN'] = { type: 'button', index: downIdx };
    if (leftIdx !== undefined) menuBindings['MENU.LEFT'] = { type: 'button', index: leftIdx };
    if (rightIdx !== undefined) menuBindings['MENU.RIGHT'] = { type: 'button', index: rightIdx };

    // Menu select/back = A/B
    const selectIdx = getButtonIndex('A');
    const backIdx = getButtonIndex('B');

    if (selectIdx !== undefined) menuBindings['MENU.SELECT'] = { type: 'button', index: selectIdx };
    if (backIdx !== undefined) menuBindings['MENU.BACK'] = { type: 'button', index: backIdx };

    // Apply bindings to profile (preserve existing bindings)
    return {
        ...profile,
        bindings: {
            global: { ...profile.bindings.global, ...globalBindings },
            map: profile.bindings.map,  // Don't override map bindings
            menu: { ...profile.bindings.menu, ...menuBindings },
            drone_gimbal: profile.bindings.drone_gimbal,  // Don't override drone bindings
        },
    };
}

// ============================================================================
// Standard Label Mappings (for standard mapping controllers)
// ============================================================================

/**
 * Standard button label mappings for Xbox/PlayStation controllers
 * with gamepad.mapping === "standard"
 */
export const STANDARD_LABEL_MAPPING: Record<ButtonLabel, number> = {
    'A': 0,
    'B': 1,
    'X': 2,
    'Y': 3,
    'L1': 4,
    'R1': 5,
    'L2': 6,
    'R2': 7,
    'SELECT': 8,
    'START': 9,
    'L3': 10,
    'R3': 11,
    'DPAD_UP': 12,
    'DPAD_DOWN': 13,
    'DPAD_LEFT': 14,
    'DPAD_RIGHT': 15,
};

/**
 * Apply standard label mappings if controller reports "standard" mapping
 */
export function applyStandardLabels(
    profile: ControllerProfileV2,
    gamepadMapping: string
): ControllerProfileV2 {
    if (gamepadMapping !== 'standard') {
        return profile;
    }

    console.log('[Defaults] Applying standard label mappings for standard gamepad');

    return {
        ...profile,
        labels: {
            ...profile.labels,
            ...STANDARD_LABEL_MAPPING,
        },
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a fresh default profile with optional label auto-detection
 */
export function makeDefaultProfileV2(gamepadMapping?: string): ControllerProfileV2 {
    let profile = { ...DEFAULT_PROFILE_V2 };

    // Auto-apply standard labels if gamepad reports standard mapping
    if (gamepadMapping === 'standard') {
        profile = applyStandardLabels(profile, gamepadMapping);
        profile = applyDefaultCommandBindings(profile);
    }

    return profile;
}

/**
 * Check if profile has default bindings (empty profile)
 */
export function isDefaultProfile(profile: ControllerProfileV2): boolean {
    const hasGlobalBindings = Object.keys(profile.bindings.global).length > 0;
    const hasMapBindings = Object.keys(profile.bindings.map).length > 0;
    const hasMenuBindings = Object.keys(profile.bindings.menu).length > 0;
    const hasDroneBindings = Object.keys(profile.bindings.drone_gimbal).length > 0;

    return !hasGlobalBindings && !hasMapBindings && !hasMenuBindings && !hasDroneBindings;
}
