/**
 * Controller Profile V2 - Enhanced schema with button labels and contextual command mapping
 *
 * New features:
 * - Button label identification (A/B/X/Y, D-pad, triggers, etc.)
 * - Context-based command bindings (Global, Map, Menu, Drone)
 * - Command system for app-level actions
 * - Drone gimbal mode support
 */

// ============================================================================
// Button Labels
// ============================================================================

export type ButtonLabel =
    | "A" | "B" | "X" | "Y"
    | "L1" | "R1" | "L2" | "R2"
    | "L3" | "R3"
    | "DPAD_UP" | "DPAD_DOWN" | "DPAD_LEFT" | "DPAD_RIGHT"
    | "START" | "SELECT";

// ============================================================================
// Contexts
// ============================================================================

export type Context = "global" | "map" | "menu" | "drone_gimbal";

// ============================================================================
// Commands
// ============================================================================

export type Command =
    // Global commands (always active regardless of context)
    | "GLOBAL.GEOLOCATE"
    | "GLOBAL.REPORT_TRAFFIC_POLICE"
    | "GLOBAL.TOGGLE_SETTINGS"

    // Map context commands
    | "MAP.PAN_X"
    | "MAP.PAN_Y"
    | "MAP.ROTATE_X"
    | "MAP.PITCH_Y"
    | "MAP.ZOOM_IN"
    | "MAP.ZOOM_OUT"
    | "MAP.RECENTER"
    | "MAP.RESET_NORTH"
    | "MAP.TOGGLE_PITCH"
    | "MAP.CYCLE_FLIGHT_MODE"

    // Menu context commands
    | "MENU.UP"
    | "MENU.DOWN"
    | "MENU.LEFT"
    | "MENU.RIGHT"
    | "MENU.SELECT"
    | "MENU.BACK"
    | "MENU.CLOSE"

    // Drone gimbal context commands
    | "DRONE.MOVE_FORWARD"
    | "DRONE.MOVE_BACKWARD"
    | "DRONE.STRAFE_LEFT"
    | "DRONE.STRAFE_RIGHT"
    | "DRONE.LOOK_X"
    | "DRONE.LOOK_Y"
    | "DRONE.RECENTER"
    | "DRONE.RESET_HEADING";

// ============================================================================
// Bindings
// ============================================================================

export type Binding =
    | { type: 'button'; index: number }
    | { type: 'button'; index: number; analog: true }
    | { type: 'button'; index: number; sign: 1 | -1 }  // Button with direction (for axis commands)
    | { type: 'axis'; index: number; sign: 1 | -1 };

// ============================================================================
// Flight Modes
// ============================================================================

export type FlightMode = "joyflight" | "fighter" | "ufo" | "satellite" | "drone_gimbal";

export type FlyEasing = "easeOut" | "easeInOut" | "easeInCubic" | "easeOutQuint";

export type GlideEasing = "linear" | "easeOut" | "easeInOut";

// ============================================================================
// Profile V2
// ============================================================================

export interface ControllerProfileV2 {
    version: 2;

    device?: {
        id?: string;
        mapping?: string;
    };

    // Button label mappings (from wizard)
    labels: Partial<Record<ButtonLabel, number>>;

    // Context-based command bindings
    bindings: Record<Context, Record<string, Binding | undefined>>;

    settings: {
        // Flight mode
        flightMode: FlightMode;

        // Input processing
        deadzone: number;           // 0..0.35
        sensitivity: number;        // 0.4..2.5 (global multiplier)
        smoothing: number;          // 0..0.30 (inertia factor)
        invertY: "none" | "left" | "right" | "both";

        // Continuous camera speeds (per second)
        panSpeedPxPerSec: number;
        rotateDegPerSec: number;
        pitchDegPerSec: number;
        zoomUnitsPerSec: number;
        zoomIntensity: number;      // 0.1..1.0

        // Continuous camera micro-glide
        glideMs: number;            // 0..80 (milliseconds)
        glideEasing: GlideEasing;

        // Discrete transitions (recenter, flyTo, etc.)
        flySpeed: number;
        flyCurve: number;
        flyEasing: FlyEasing;

        // Advanced
        unlockMaxPitch: boolean;    // Allow pitch up to 85° (vs 60°)
    };

    // Runtime state (optional, can keep outside storage)
    uiState?: {
        lastContext?: Context;
    };
}

// ============================================================================
// Command Definitions (for UI)
// ============================================================================

export interface CommandDefinition {
    key: string;                    // Command key (e.g., "GLOBAL.GEOLOCATE")
    label: string;                  // Display name
    description: string;            // Help text
    type: 'button' | 'axis';        // Expected binding type
    context: Context;               // Which context this belongs to
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
    // Global commands
    { key: 'GLOBAL.GEOLOCATE', label: 'Geolocate', description: 'Center map on your current location', type: 'button', context: 'global' },
    { key: 'GLOBAL.REPORT_TRAFFIC_POLICE', label: 'Report Traffic/Police', description: 'Trigger Waze-like traffic report', type: 'button', context: 'global' },
    { key: 'GLOBAL.TOGGLE_SETTINGS', label: 'Toggle Settings', description: 'Open/close settings panel', type: 'button', context: 'global' },

    // Map commands - buttons
    { key: 'MAP.RECENTER', label: 'Recenter', description: 'Return to starting location', type: 'button', context: 'map' },
    { key: 'MAP.RESET_NORTH', label: 'Reset North', description: 'Point camera north (bearing 0°)', type: 'button', context: 'map' },
    { key: 'MAP.TOGGLE_PITCH', label: 'Toggle Pitch', description: 'Toggle between 0° and 60° pitch', type: 'button', context: 'map' },
    { key: 'MAP.CYCLE_FLIGHT_MODE', label: 'Cycle Flight Mode', description: 'Switch between flight presets', type: 'button', context: 'map' },
    { key: 'MAP.ZOOM_IN', label: 'Zoom In', description: 'Tap to cycle zoom speed (1→2→4→8→stop)', type: 'button', context: 'map' },
    { key: 'MAP.ZOOM_OUT', label: 'Zoom Out', description: 'Tap to cycle zoom speed (1→2→4→8→stop)', type: 'button', context: 'map' },

    // Map commands - analog axes
    { key: 'MAP.PAN_X', label: 'Pan Horizontal', description: 'Move left/right across the map', type: 'axis', context: 'map' },
    { key: 'MAP.PAN_Y', label: 'Pan Vertical', description: 'Move up/down across the map', type: 'axis', context: 'map' },
    { key: 'MAP.ROTATE_X', label: 'Rotate Map', description: 'Change camera bearing (compass direction)', type: 'axis', context: 'map' },
    { key: 'MAP.PITCH_Y', label: 'Pitch Camera', description: 'Tilt camera angle up/down', type: 'axis', context: 'map' },

    // Menu commands
    { key: 'MENU.UP', label: 'Navigate Up', description: 'Move selection up in menu', type: 'button', context: 'menu' },
    { key: 'MENU.DOWN', label: 'Navigate Down', description: 'Move selection down in menu', type: 'button', context: 'menu' },
    { key: 'MENU.LEFT', label: 'Navigate Left', description: 'Move selection left or decrease value', type: 'button', context: 'menu' },
    { key: 'MENU.RIGHT', label: 'Navigate Right', description: 'Move selection right or increase value', type: 'button', context: 'menu' },
    { key: 'MENU.SELECT', label: 'Select', description: 'Confirm selection or activate control', type: 'button', context: 'menu' },
    { key: 'MENU.BACK', label: 'Back', description: 'Go back or close menu', type: 'button', context: 'menu' },

    // Drone gimbal commands - analog axes
    { key: 'DRONE.MOVE_FORWARD', label: 'Move Forward/Back', description: 'Move drone along heading direction', type: 'axis', context: 'drone_gimbal' },
    { key: 'DRONE.STRAFE_LEFT', label: 'Strafe Left/Right', description: 'Move drone sideways relative to heading', type: 'axis', context: 'drone_gimbal' },
    { key: 'DRONE.LOOK_X', label: 'Look Left/Right', description: 'Rotate camera bearing (independent of drone)', type: 'axis', context: 'drone_gimbal' },
    { key: 'DRONE.LOOK_Y', label: 'Look Up/Down', description: 'Tilt camera pitch', type: 'axis', context: 'drone_gimbal' },

    // Drone gimbal commands - buttons
    { key: 'DRONE.RECENTER', label: 'Recenter', description: 'Return drone to starting location', type: 'button', context: 'drone_gimbal' },
    { key: 'DRONE.RESET_HEADING', label: 'Reset Heading', description: 'Point drone north (heading 0°)', type: 'button', context: 'drone_gimbal' },
] as const;

// ============================================================================
// Command Context (for execution)
// ============================================================================

export interface CommandContext {
    map: any; // maplibregl.Map (avoiding import)
    ui: {
        openSettings: () => void;
        closeSettings: () => void;
        toggleSettings: () => void;
        isSettingsOpen: () => boolean;
        menuNavigate: (dir: 'up' | 'down' | 'left' | 'right') => void;
        menuSelect: () => void;
        menuBack: () => void;
    };
    integrations: {
        reportTrafficPolice: () => void;
    };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isV2Profile(profile: any): profile is ControllerProfileV2 {
    return profile && profile.version === 2;
}

export function hasLabels(profile: ControllerProfileV2): boolean {
    return Object.keys(profile.labels || {}).length > 0;
}

// ============================================================================
// Exports
// ============================================================================

export type { ControllerProfileV2 as ControllerProfile };
