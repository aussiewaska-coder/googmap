import { ControllerProfile as ControllerProfileV1 } from './types';
import { ControllerProfileV2 } from './types-v2';
import { DEFAULT_PROFILE } from './defaults';
import { DEFAULT_PROFILE_V2, makeDefaultProfileV2 } from './defaults-v2';
import { migrateV1ToV2, detectProfileVersion, isV2Profile } from './migration';

const KEY_V1 = 'controllerMapping.v1';
const KEY_V2 = 'controllerMapping.v2';

/**
 * Load controller profile from sessionStorage with automatic v1→v2 migration
 */
export function loadSessionProfile(): ControllerProfileV2 | null {
    try {
        if (typeof window === 'undefined') return null;

        // Try v2 first
        const v2Raw = sessionStorage.getItem(KEY_V2);
        if (v2Raw) {
            const profile = JSON.parse(v2Raw) as ControllerProfileV2;
            console.log('[Storage] Loaded v2 profile from sessionStorage');
            return profile;
        }

        // Check for v1 profile and migrate
        const v1Raw = sessionStorage.getItem(KEY_V1);
        if (v1Raw) {
            const v1Profile = JSON.parse(v1Raw) as ControllerProfileV1;

            // Migrate legacy v1 settings (from old storage.ts logic)
            if (v1Profile.settings) {
                const s = v1Profile.settings as any;
                delete s.invertX;
                delete s.invertY;
                delete s.leftStickInvertX;
                delete s.leftStickInvertY;
                delete s.rightStickInvertX;
                delete s.rightStickInvertY;

                if (s.flightMode === undefined) s.flightMode = DEFAULT_PROFILE.settings.flightMode;
                if (s.smoothing === undefined) s.smoothing = DEFAULT_PROFILE.settings.smoothing;
                if (s.zoomIntensity === undefined) s.zoomIntensity = DEFAULT_PROFILE.settings.zoomIntensity;
                if (s.flySpeed === undefined) s.flySpeed = DEFAULT_PROFILE.settings.flySpeed;
                if (s.flyCurve === undefined) s.flyCurve = DEFAULT_PROFILE.settings.flyCurve;
                if (s.flyEasing === undefined) s.flyEasing = DEFAULT_PROFILE.settings.flyEasing;
            }

            console.log('[Storage] Found v1 profile, migrating to v2...');
            const v2Profile = migrateV1ToV2(v1Profile);

            // Save migrated profile (keep v1 for rollback)
            saveSessionProfile(v2Profile);
            console.log('[Storage] Migration complete, saved as v2');

            return v2Profile;
        }

        // No profile found
        return null;
    } catch (error) {
        console.error('[Storage] Error loading profile:', error);
        return null;
    }
}

/**
 * Save controller profile to sessionStorage
 */
export function saveSessionProfile(profile: ControllerProfileV2): void {
    if (typeof window === 'undefined') return;

    if (!isV2Profile(profile)) {
        console.error('[Storage] Attempted to save non-v2 profile');
        return;
    }

    sessionStorage.setItem(KEY_V2, JSON.stringify(profile));
    console.log('[Storage] Saved v2 profile');
}

/**
 * Clear controller profiles from sessionStorage (both v1 and v2)
 */
export function clearSessionProfile(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(KEY_V1);
    sessionStorage.removeItem(KEY_V2);
    console.log('[Storage] Cleared all profiles');
}

/**
 * Revert to v1 profile (rollback)
 */
export function revertToV1(): ControllerProfileV1 | null {
    if (typeof window === 'undefined') return null;

    try {
        const v1Raw = sessionStorage.getItem(KEY_V1);
        if (!v1Raw) {
            console.warn('[Storage] No v1 profile to revert to');
            return null;
        }

        // Remove v2 profile
        sessionStorage.removeItem(KEY_V2);

        const v1Profile = JSON.parse(v1Raw) as ControllerProfileV1;
        console.log('[Storage] Reverted to v1 profile');
        return v1Profile;
    } catch (error) {
        console.error('[Storage] Error reverting to v1:', error);
        return null;
    }
}

/**
 * Export profile to downloadable JSON file
 */
export function exportProfile(profile: ControllerProfileV2): void {
    const json = JSON.stringify(profile, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const version = isV2Profile(profile) ? 'v2' : 'v1';
    a.download = `controller-profile-${version}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[Storage] Exported profile');
}

/**
 * Import profile from JSON file (handles v1 and v2)
 */
export function importProfile(): Promise<ControllerProfileV2> {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                reject(new Error('No file selected'));
                return;
            }

            try {
                const text = await file.text();
                const profile = JSON.parse(text);

                const version = detectProfileVersion(profile);

                if (version === 2) {
                    console.log('[Storage] Imported v2 profile');
                    resolve(profile as ControllerProfileV2);
                } else if (version === 1) {
                    console.log('[Storage] Imported v1 profile, migrating to v2...');
                    const migrated = migrateV1ToV2(profile as ControllerProfileV1);
                    resolve(migrated);
                } else {
                    throw new Error('Invalid or unknown profile version');
                }
            } catch (error) {
                console.error('[Storage] Error importing profile:', error);
                reject(error);
            }
        };

        input.click();
    });
}
