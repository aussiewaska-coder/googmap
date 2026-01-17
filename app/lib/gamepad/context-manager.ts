/**
 * Context Manager - Handles context switching for controller bindings
 *
 * Contexts determine which commands are active:
 * - GLOBAL: Always active regardless of UI state
 * - MAP: Active during normal map navigation
 * - MENU: Active when settings panel is open
 * - DRONE_GIMBAL: Active when flight mode is drone_gimbal
 */

import { Context, FlightMode } from './types-v2';

export interface UIState {
    isSettingsOpen: boolean;
}

export class ContextManager {
    private activeContext: Context = 'map';
    private contextHistory: Context[] = [];
    private listeners: Set<(context: Context) => void> = new Set();

    constructor() {
        this.contextHistory.push('map');
    }

    /**
     * Update active context based on UI state and flight mode
     */
    updateContext(uiState: UIState, flightMode: FlightMode): Context {
        let newContext: Context;

        // Priority 1: Settings open → MENU context
        if (uiState.isSettingsOpen) {
            newContext = 'menu';
        }
        // Priority 2: Drone gimbal mode → DRONE_GIMBAL context
        else if (flightMode === 'drone_gimbal') {
            newContext = 'drone_gimbal';
        }
        // Priority 3: Default → MAP context
        else {
            newContext = 'map';
        }

        // Update context if changed
        if (newContext !== this.activeContext) {
            this.setActiveContext(newContext);
        }

        return newContext;
    }

    /**
     * Get current active context
     */
    getActiveContext(): Context {
        return this.activeContext;
    }

    /**
     * Manually set active context (for testing or special cases)
     */
    setActiveContext(context: Context): void {
        if (context === this.activeContext) return;

        const previousContext = this.activeContext;
        this.activeContext = context;

        // Update history (for returning to previous context)
        if (previousContext !== 'menu') {
            this.contextHistory.push(previousContext);
            // Keep history limited to last 5 contexts
            if (this.contextHistory.length > 5) {
                this.contextHistory.shift();
            }
        }

        console.log('[ContextManager] Context changed:', previousContext, '→', context);

        // Notify listeners
        this.notifyListeners(context);
    }

    /**
     * Get previous context (before current)
     */
    getPreviousContext(): Context | null {
        return this.contextHistory[this.contextHistory.length - 1] || null;
    }

    /**
     * Check if a specific context is active
     */
    isContextActive(context: Context): boolean {
        return this.activeContext === context;
    }

    /**
     * Check if global context is active (always true, global is always active)
     */
    isGlobalActive(): boolean {
        return true; // Global is always active
    }

    /**
     * Subscribe to context changes
     */
    onContextChange(listener: (context: Context) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Notify all listeners of context change
     */
    private notifyListeners(context: Context): void {
        this.listeners.forEach(listener => {
            try {
                listener(context);
            } catch (error) {
                console.error('[ContextManager] Error in listener:', error);
            }
        });
    }

    /**
     * Reset to default context
     */
    reset(): void {
        this.setActiveContext('map');
        this.contextHistory = ['map'];
    }

    /**
     * Get context display name for UI
     */
    static getContextDisplayName(context: Context): string {
        const names: Record<Context, string> = {
            'global': 'Global',
            'map': 'Map',
            'menu': 'Menu',
            'drone_gimbal': 'Drone',
        };
        return names[context] || context;
    }

    /**
     * Get context description for UI
     */
    static getContextDescription(context: Context): string {
        const descriptions: Record<Context, string> = {
            'global': 'Always active commands (geolocate, reports, settings)',
            'map': 'Map navigation commands (recenter, reset north, etc.)',
            'menu': 'Menu navigation commands (D-pad, select, back)',
            'drone_gimbal': 'Drone gimbal mode (DJI-style camera control)',
        };
        return descriptions[context] || '';
    }

    /**
     * Get recommended bindings for a context
     */
    static getRecommendedBindings(context: Context): string[] {
        const recommendations: Record<Context, string[]> = {
            'global': [
                'GLOBAL.TOGGLE_SETTINGS',
                'GLOBAL.GEOLOCATE',
                'GLOBAL.REPORT_TRAFFIC_POLICE',
            ],
            'map': [
                'MAP.PAN_X',
                'MAP.PAN_Y',
                'MAP.ROTATE_X',
                'MAP.PITCH_Y',
                'MAP.ZOOM_IN',
                'MAP.ZOOM_OUT',
                'MAP.RECENTER',
                'MAP.RESET_NORTH',
            ],
            'menu': [
                'MENU.UP',
                'MENU.DOWN',
                'MENU.LEFT',
                'MENU.RIGHT',
                'MENU.SELECT',
                'MENU.BACK',
            ],
            'drone_gimbal': [
                'DRONE.MOVE_FORWARD',
                'DRONE.STRAFE_LEFT',
                'DRONE.LOOK_X',
                'DRONE.LOOK_Y',
                'DRONE.RECENTER',
                'DRONE.RESET_HEADING',
            ],
        };
        return recommendations[context] || [];
    }
}
