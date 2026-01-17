/**
 * Command Dispatcher - Central command execution engine
 *
 * Handles all controller commands:
 * - GLOBAL: Geolocate, report traffic/police, toggle settings
 * - MAP: Recenter, reset north, toggle pitch, cycle flight mode
 * - MENU: Navigation (up/down/left/right), select, back
 * - DRONE: Recenter, reset heading
 *
 * Includes edge detection and menu key repeat logic
 */

import { Command, CommandContext } from './types-v2';

// ============================================================================
// Edge Detection (for one-shot commands)
// ============================================================================

/**
 * Creates an edge detector for one-shot button presses
 * Returns true only on false → true transition
 */
export function makePressedOnce() {
    const prevState = new Map<string, boolean>();

    return (key: string, isPressed: boolean): boolean => {
        const wasPressed = prevState.get(key) || false;
        prevState.set(key, isPressed);

        // Edge detected: was not pressed, now is pressed
        return !wasPressed && isPressed;
    };
}

// ============================================================================
// Menu Key Repeat (for menu navigation)
// ============================================================================

interface RepeatState {
    downSince: number;
    lastFire: number;
    wasDown: boolean;
}

/**
 * Creates a key repeater for menu navigation
 * Initial delay: 250ms, Repeat interval: 90ms
 */
export function makeRepeater() {
    const state = new Map<string, RepeatState>();

    const INITIAL_DELAY = 250; // ms
    const REPEAT_INTERVAL = 90; // ms

    return (key: string, isDown: boolean, nowMs: number, fire: () => void): void => {
        const s = state.get(key) || { downSince: 0, lastFire: 0, wasDown: false };

        // Button released - reset state
        if (!isDown) {
            state.set(key, { downSince: 0, lastFire: 0, wasDown: false });
            return;
        }

        // First press - fire immediately
        if (!s.wasDown) {
            fire();
            state.set(key, { downSince: nowMs, lastFire: nowMs, wasDown: true });
            return;
        }

        // Button held - check for repeat
        const heldDuration = nowMs - s.downSince;
        const timeSinceLastFire = nowMs - s.lastFire;

        if (heldDuration > INITIAL_DELAY && timeSinceLastFire > REPEAT_INTERVAL) {
            fire();
            state.set(key, { ...s, lastFire: nowMs });
        } else {
            state.set(key, s);
        }
    };
}

// ============================================================================
// Command Dispatcher Class
// ============================================================================

export class CommandDispatcher {
    private pressedOnceHelper = makePressedOnce();
    private repeaterHelper = makeRepeater();

    /**
     * Dispatch a command (public method for testing)
     */
    dispatch(command: Command, context: CommandContext, timestamp: number): void {
        this.executeCommand(command, context);
    }

    /**
     * Check if button was pressed (edge detection)
     */
    pressedOnce(key: string, isPressed: boolean): boolean {
        return this.pressedOnceHelper(key, isPressed);
    }

    /**
     * Handle menu repeat (for navigation)
     */
    repeater(key: string, isDown: boolean, timestamp: number, fire: () => void): void {
        this.repeaterHelper(key, isDown, timestamp, fire);
    }

    /**
     * Execute command (main dispatcher)
     */
    private executeCommand(command: Command, context: CommandContext): void {
        try {
            switch (command) {
                // ========== GLOBAL COMMANDS ==========
                case 'GLOBAL.GEOLOCATE':
                    this.geolocate(context);
                    break;

                case 'GLOBAL.REPORT_TRAFFIC_POLICE':
                    this.reportTrafficPolice(context);
                    break;

                case 'GLOBAL.TOGGLE_SETTINGS':
                    this.toggleSettings(context);
                    break;

                // ========== MAP COMMANDS ==========
                case 'MAP.RECENTER':
                    this.mapRecenter(context);
                    break;

                case 'MAP.RESET_NORTH':
                    this.mapResetNorth(context);
                    break;

                case 'MAP.TOGGLE_PITCH':
                    this.mapTogglePitch(context);
                    break;

                case 'MAP.CYCLE_FLIGHT_MODE':
                    this.mapCycleFlightMode(context);
                    break;

                // ========== MENU COMMANDS ==========
                case 'MENU.UP':
                    this.menuNavigate(context, 'up');
                    break;

                case 'MENU.DOWN':
                    this.menuNavigate(context, 'down');
                    break;

                case 'MENU.LEFT':
                    this.menuNavigate(context, 'left');
                    break;

                case 'MENU.RIGHT':
                    this.menuNavigate(context, 'right');
                    break;

                case 'MENU.SELECT':
                    this.menuSelect(context);
                    break;

                case 'MENU.BACK':
                case 'MENU.CLOSE':
                    this.menuBack(context);
                    break;

                // ========== DRONE COMMANDS ==========
                case 'DRONE.RECENTER':
                    this.droneRecenter(context);
                    break;

                case 'DRONE.RESET_HEADING':
                    this.droneResetHeading(context);
                    break;

                default:
                    console.warn('[CommandDispatcher] Unknown command:', command);
            }
        } catch (error) {
            console.error('[CommandDispatcher] Error executing command:', command, error);
        }
    }

    // ========================================================================
    // GLOBAL COMMAND IMPLEMENTATIONS
    // ========================================================================

    /**
     * GLOBAL.GEOLOCATE - Get user location and center map
     */
    private async geolocate(context: CommandContext): Promise<void> {
        console.log('[Command] Executing GEOLOCATE');

        if (!navigator.geolocation) {
            console.error('[Command] Geolocation not supported');
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 8000,
                        maximumAge: 5000,
                    }
                );
            });

            const { latitude, longitude } = position.coords;

            console.log('[Command] Geolocate success:', latitude, longitude);

            // Graceful eased flight to user location
            context.map.flyTo({
                center: [longitude, latitude],
                zoom: 15,
                duration: 1800,
                curve: 1.4,
                easing: (t: number) => {
                    // easeInOutCubic for smooth acceleration and deceleration
                    return t < 0.5
                        ? 4 * t * t * t
                        : 1 - Math.pow(-2 * t + 2, 3) / 2;
                },
                essential: true,
            });
        } catch (error) {
            console.error('[Command] Geolocate failed:', error);
        }
    }

    /**
     * GLOBAL.REPORT_TRAFFIC_POLICE - Trigger Waze-like report workflow
     */
    private reportTrafficPolice(context: CommandContext): void {
        console.log('[Command] Executing REPORT_TRAFFIC_POLICE');
        context.integrations.reportTrafficPolice();
    }

    /**
     * GLOBAL.TOGGLE_SETTINGS - Open/close settings panel
     */
    private toggleSettings(context: CommandContext): void {
        console.log('[Command] Executing TOGGLE_SETTINGS');
        context.ui.toggleSettings();
    }

    // ========================================================================
    // MAP COMMAND IMPLEMENTATIONS
    // ========================================================================

    /**
     * MAP.RECENTER - Return to starting location
     */
    private mapRecenter(context: CommandContext): void {
        console.log('[Command] Executing MAP.RECENTER');

        // Default recenter location (Australia center from constants)
        context.map.flyTo({
            center: [120.953100, -27.946800],
            zoom: 3.92,
            pitch: 0,
            bearing: 0,
            duration: 900,
        });
    }

    /**
     * MAP.RESET_NORTH - Point camera north (bearing 0°)
     */
    private mapResetNorth(context: CommandContext): void {
        console.log('[Command] Executing MAP.RESET_NORTH');

        context.map.rotateTo(0, {
            duration: 150,
            easing: (t: number) => 1 - Math.pow(1 - t, 3), // easeOut
        });
    }

    /**
     * MAP.TOGGLE_PITCH - Toggle between 0° and 60° pitch
     */
    private mapTogglePitch(context: CommandContext): void {
        console.log('[Command] Executing MAP.TOGGLE_PITCH');

        const currentPitch = context.map.getPitch();
        const targetPitch = currentPitch < 30 ? 60 : 0;

        context.map.easeTo({
            pitch: targetPitch,
            duration: 300,
        });
    }

    /**
     * MAP.CYCLE_FLIGHT_MODE - Switch between flight presets
     * Note: This requires access to profile settings, which should be passed via context
     */
    private mapCycleFlightMode(context: CommandContext): void {
        console.log('[Command] Executing MAP.CYCLE_FLIGHT_MODE');
        // This would need to be implemented with access to profile state
        // For now, log that it's not fully implemented
        console.warn('[Command] CYCLE_FLIGHT_MODE needs profile access to implement');
    }

    // ========================================================================
    // MENU COMMAND IMPLEMENTATIONS
    // ========================================================================

    /**
     * MENU.UP/DOWN/LEFT/RIGHT - Navigate menu
     */
    private menuNavigate(context: CommandContext, direction: 'up' | 'down' | 'left' | 'right'): void {
        console.log('[Command] Executing MENU.NAVIGATE:', direction);
        context.ui.menuNavigate(direction);
    }

    /**
     * MENU.SELECT - Activate selected menu item
     */
    private menuSelect(context: CommandContext): void {
        console.log('[Command] Executing MENU.SELECT');
        context.ui.menuSelect();
    }

    /**
     * MENU.BACK - Go back or close menu
     */
    private menuBack(context: CommandContext): void {
        console.log('[Command] Executing MENU.BACK');
        context.ui.menuBack();
    }

    // ========================================================================
    // DRONE COMMAND IMPLEMENTATIONS
    // ========================================================================

    /**
     * DRONE.RECENTER - Return drone to starting location
     */
    private droneRecenter(context: CommandContext): void {
        console.log('[Command] Executing DRONE.RECENTER');

        // Same as map recenter for now
        context.map.flyTo({
            center: [120.953100, -27.946800],
            zoom: 3.92,
            pitch: 0,
            bearing: 0,
            duration: 900,
        });
    }

    /**
     * DRONE.RESET_HEADING - Point drone north (heading 0°)
     */
    private droneResetHeading(context: CommandContext): void {
        console.log('[Command] Executing DRONE.RESET_HEADING');

        // Reset camera bearing (drone heading would be handled in map-controller)
        context.map.rotateTo(0, {
            duration: 150,
            easing: (t: number) => 1 - Math.pow(1 - t, 3),
        });
    }
}
