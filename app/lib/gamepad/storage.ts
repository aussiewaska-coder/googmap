import { ControllerProfile } from './types';

const KEY = 'controllerMapping.v1';

export function loadSessionProfile(): ControllerProfile | null {
    try {
        if (typeof window === 'undefined') return null;
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        
        const profile = JSON.parse(raw) as ControllerProfile;
        
        // Migrate old profiles from invertX/invertY strings to boolean flags
        if (profile.settings) {
            const s = profile.settings as any;
            
            // Check if using old schema
            if (s.invertX !== undefined || s.invertY !== undefined) {
                // Migrate from old 'none'|'left'|'right'|'both' to new booleans
                s.leftStickInvertX = s.invertX === 'left' || s.invertX === 'both';
                s.leftStickInvertY = s.invertY === 'left' || s.invertY === 'both';
                s.rightStickInvertX = s.invertX === 'right' || s.invertX === 'both';
                s.rightStickInvertY = s.invertY === 'right' || s.invertY === 'both';
                
                // Remove old properties
                delete s.invertX;
                delete s.invertY;
            }
            
            // Set defaults if missing
            if (s.leftStickInvertX === undefined) s.leftStickInvertX = false;
            if (s.leftStickInvertY === undefined) s.leftStickInvertY = true; // Default inverted
            if (s.rightStickInvertX === undefined) s.rightStickInvertX = false;
            if (s.rightStickInvertY === undefined) s.rightStickInvertY = false;
        }
        
        // Removed debug logging - settings load correctly
        
        return profile;
    } catch {
        return null;
    }
}

export function saveSessionProfile(profile: ControllerProfile): void {
    if (typeof window === 'undefined') return;
    // Debug: console.log('[Storage] Saving:', profile.settings.invertX, profile.settings.invertY);
    sessionStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearSessionProfile(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(KEY);
}

// Export profile to downloadable JSON file
export function exportProfile(profile: ControllerProfile): void {
    const json = JSON.stringify(profile, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `controller-profile-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import profile from JSON file
export function importProfile(): Promise<ControllerProfile> {
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
                const profile = JSON.parse(text) as ControllerProfile;

                // Basic validation
                if (profile.version !== 1) {
                    throw new Error('Invalid profile version');
                }

                resolve(profile);
            } catch (error) {
                reject(error);
            }
        };

        input.click();
    });
}
