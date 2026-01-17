/**
 * Migration logic for converting v1 profiles to v2 profiles
 *
 * Strategy:
 * - Preserve all v1 bindings by moving them to MAP context
 * - Initialize empty labels (user needs to run wizard)
 * - Add new v2 settings with sensible defaults
 * - Keep v1 data in sessionStorage for rollback
 */

import { ControllerProfile as ControllerProfileV1 } from './types';
import { ControllerProfileV2, Binding, Context } from './types-v2';

// ============================================================================
// Version Detection
// ============================================================================

export function detectProfileVersion(profile: any): 1 | 2 | null {
    if (!profile || typeof profile !== 'object') return null;
    if (profile.version === 2) return 2;
    if (profile.version === 1) return 1;
    // Legacy profiles without version field are v1
    if (profile.settings && profile.bindings) return 1;
    return null;
}

export function isV1Profile(profile: any): profile is ControllerProfileV1 {
    return detectProfileVersion(profile) === 1;
}

export function isV2Profile(profile: any): profile is ControllerProfileV2 {
    return detectProfileVersion(profile) === 2;
}

// ============================================================================
// V1 to V2 Migration
// ============================================================================

/**
 * Migrate v1 profile to v2, preserving all existing bindings in MAP context
 */
export function migrateV1ToV2(v1: ControllerProfileV1): ControllerProfileV2 {
    console.log('[Migration] Converting v1 profile to v2');

    // Map v1 binding keys to v2 command keys (MAP context)
    const bindingKeyMap: Record<string, string> = {
        'pan_x': 'MAP.PAN_X',
        'pan_y': 'MAP.PAN_Y',
        'rotate_x': 'MAP.ROTATE_X',
        'pitch_y': 'MAP.PITCH_Y',
        'zoom_in': 'MAP.ZOOM_IN',
        'zoom_out': 'MAP.ZOOM_OUT',
        'reset_north': 'MAP.RESET_NORTH',
        'recenter': 'MAP.RECENTER',
        'toggle_pitch': 'MAP.TOGGLE_PITCH',
    };

    // Convert v1 bindings to MAP context bindings
    const mapBindings: Record<string, Binding | undefined> = {};
    for (const [v1Key, v2Key] of Object.entries(bindingKeyMap)) {
        const binding = v1.bindings[v1Key as keyof typeof v1.bindings];
        if (binding) {
            mapBindings[v2Key] = binding;
        }
    }

    // Also copy to drone_gimbal context (same bindings, different behavior)
    const droneBindings: Record<string, Binding | undefined> = {};
    if (mapBindings['MAP.PAN_X']) {
        droneBindings['DRONE.MOVE_FORWARD'] = mapBindings['MAP.PAN_Y']; // Forward/back
        droneBindings['DRONE.STRAFE_LEFT'] = mapBindings['MAP.PAN_X'];  // Strafe left/right
        droneBindings['DRONE.LOOK_X'] = mapBindings['MAP.ROTATE_X'];    // Look left/right
        droneBindings['DRONE.LOOK_Y'] = mapBindings['MAP.PITCH_Y'];     // Look up/down
    }
    if (mapBindings['MAP.RECENTER']) {
        droneBindings['DRONE.RECENTER'] = mapBindings['MAP.RECENTER'];
    }
    if (mapBindings['MAP.RESET_NORTH']) {
        droneBindings['DRONE.RESET_HEADING'] = mapBindings['MAP.RESET_NORTH'];
    }

    // Create v2 profile
    const v2: ControllerProfileV2 = {
        version: 2,

        device: v1.device ? {
            id: v1.device.id,
            mapping: v1.device.mapping,
        } : undefined,

        // Empty labels - user needs to run wizard
        labels: {},

        // Bindings organized by context
        bindings: {
            global: {},          // Empty - user needs to bind global commands
            map: mapBindings,    // Preserved v1 bindings
            menu: {},            // Empty - user needs to bind menu commands
            drone_gimbal: droneBindings, // Copy map bindings for drone
        },

        settings: {
            // Copy v1 settings
            flightMode: v1.settings.flightMode,
            deadzone: v1.settings.deadzone,
            sensitivity: v1.settings.sensitivity,
            smoothing: v1.settings.smoothing,
            panSpeedPxPerSec: v1.settings.panSpeedPxPerSec,
            rotateDegPerSec: v1.settings.rotateDegPerSec,
            pitchDegPerSec: v1.settings.pitchDegPerSec,
            zoomUnitsPerSec: v1.settings.zoomUnitsPerSec,
            zoomIntensity: v1.settings.zoomIntensity,
            flySpeed: v1.settings.flySpeed,
            flyCurve: v1.settings.flyCurve,
            flyEasing: v1.settings.flyEasing,
            unlockMaxPitch: v1.settings.unlockMaxPitch,

            // New v2 settings with defaults
            invertY: "none",              // New in v2
            glideMs: 0,                   // New in v2 (disabled by default)
            glideEasing: "easeInOut",     // New in v2
        },

        uiState: {
            lastContext: 'map',
        },
    };

    console.log('[Migration] Migrated v1 bindings to MAP context:', Object.keys(mapBindings).length);

    return v2;
}

// ============================================================================
// Migration Helpers
// ============================================================================

/**
 * Check if profile needs migration
 */
export function needsMigration(profile: any): boolean {
    const version = detectProfileVersion(profile);
    return version === 1;
}

/**
 * Safe migration with error handling
 */
export function safelyMigrateProfile(profile: any): ControllerProfileV2 | null {
    try {
        if (!needsMigration(profile)) {
            return profile as ControllerProfileV2;
        }

        const migrated = migrateV1ToV2(profile as ControllerProfileV1);
        console.log('[Migration] Successfully migrated profile from v1 to v2');
        return migrated;
    } catch (error) {
        console.error('[Migration] Failed to migrate profile:', error);
        return null;
    }
}

// ============================================================================
// Backwards Compatibility
// ============================================================================

/**
 * Get a safe binding from either v1 or v2 profile
 * Useful during transition period
 */
export function getBinding(
    profile: ControllerProfileV1 | ControllerProfileV2,
    key: string
): Binding | undefined {
    if (isV1Profile(profile)) {
        return profile.bindings[key as keyof typeof profile.bindings];
    }

    if (isV2Profile(profile)) {
        // Try all contexts (global first, then map, menu, drone)
        for (const context of ['global', 'map', 'menu', 'drone_gimbal'] as Context[]) {
            const binding = profile.bindings[context]?.[key];
            if (binding) return binding;
        }
    }

    return undefined;
}

/**
 * Check if profile has any bindings configured
 */
export function hasBindings(profile: ControllerProfileV1 | ControllerProfileV2): boolean {
    if (isV1Profile(profile)) {
        return Object.values(profile.bindings).some(b => b !== undefined);
    }

    if (isV2Profile(profile)) {
        return Object.values(profile.bindings).some(contextBindings =>
            Object.values(contextBindings).some(b => b !== undefined)
        );
    }

    return false;
}
