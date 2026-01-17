/**
 * MapController V2 - Enhanced gamepad controller with context-aware command dispatch
 *
 * Features:
 * - Context-based command bindings (Global/Map/Menu/Drone)
 * - Command dispatcher integration
 * - Drone gimbal mode support
 * - Backward compatible with v1 analog processing
 */

import maplibregl from 'maplibre-gl';
import { ControllerProfileV2, Context, CommandContext } from './types-v2';
import { loadSessionProfile } from './storage';
import { makeDefaultProfileV2, applyTacticalPresetV2 } from './defaults-v2';
import { getActiveGamepad, readBindingValue, applyDeadzone } from './gamepad-reader';
import { getFlyEasingFn } from './flight-modes';
import { CommandDispatcher } from './commands';
import { ContextManager } from './context-manager';

export class MapController {
    private map: maplibregl.Map;
    private profile: ControllerProfileV2;
    private commandContext: CommandContext;
    private contextManager: ContextManager;
    private dispatcher: CommandDispatcher;

    private running = false;
    private animationFrameId: number | null = null;
    private lastTime = 0;

    // Accumulators (for batching small updates)
    private accumulators = { bearing: 0, pitch: 0 };

    // Tap-based zoom speeds
    private zoomInSpeed = 0; // 0, 1, 2, 4, 8
    private zoomOutSpeed = 0;

    // Velocity state for smoothing/inertia
    private velocities = {
        panX: 0,
        panY: 0,
        rotate: 0,
        pitch: 0,
        zoom: 0
    };

    // Drone gimbal state (for drone_gimbal mode)
    private droneHeading = 0; // degrees

    constructor(
        map: maplibregl.Map,
        commandContext: CommandContext,
        contextManager: ContextManager
    ) {
        this.map = map;
        this.commandContext = commandContext;
        this.contextManager = contextManager;
        this.dispatcher = new CommandDispatcher();

        // Load profile: sessionStorage → preset → default
        const saved = loadSessionProfile();
        this.profile = saved || applyTacticalPresetV2();

        console.log('[MapController] Initialized with v2 profile');
        this.start();
    }

    updateProfile(profile: ControllerProfileV2) {
        this.profile = profile;
        console.log('[MapController] Profile updated');
    }

    private start() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    cleanup() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        console.log('[MapController] Cleaned up');
    }

    private loop = (time: number) => {
        if (!this.running) return;

        const dt = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;

        const gamepad = getActiveGamepad();
        if (!gamepad) {
            this.animationFrameId = requestAnimationFrame(this.loop);
            return;
        }

        // Determine active context
        const activeContext = this.contextManager.updateContext(
            { isSettingsOpen: this.commandContext.ui.isSettingsOpen() },
            this.profile.settings.flightMode
        );

        // Process GLOBAL bindings (always active)
        this.processBindings(gamepad, 'global', time);

        // Process context-specific bindings and analog controls
        if (activeContext === 'menu') {
            // Menu context: process menu commands only (no analog)
            this.processBindings(gamepad, 'menu', time);
        } else if (activeContext === 'map') {
            // Map context: process map commands + analog flight
            this.processBindings(gamepad, 'map', time);
            this.processMapAnalog(gamepad, dt);
        } else if (activeContext === 'drone_gimbal') {
            // Drone context: process drone commands + drone analog
            this.processBindings(gamepad, 'drone_gimbal', time);
            this.processDroneAnalog(gamepad, dt);
        }

        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    /**
     * Process bindings for a specific context
     */
    private processBindings(gamepad: Gamepad, context: Context, timestamp: number) {
        const bindings = this.profile.bindings[context];
        if (!bindings) return;

        for (const [commandKey, binding] of Object.entries(bindings)) {
            if (!binding || binding.type !== 'button') continue;

            const isPressed = !!gamepad.buttons[binding.index]?.pressed;

            // Menu commands use repeater, others use edge detection
            if (context === 'menu' && commandKey.startsWith('MENU.')) {
                this.dispatcher.repeater(commandKey, isPressed, timestamp, () => {
                    this.dispatcher.dispatch(commandKey as any, this.commandContext, timestamp);
                });
            } else {
                // One-shot commands (edge detection)
                if (this.dispatcher.pressedOnce(commandKey, isPressed)) {
                    this.dispatcher.dispatch(commandKey as any, this.commandContext, timestamp);
                }
            }
        }
    }

    /**
     * Process analog controls for MAP context (existing v1 behavior)
     */
    private processMapAnalog(gamepad: Gamepad, dt: number) {
        const { settings, bindings } = this.profile;
        const mapBindings = bindings.map;

        // Read raw values and apply deadzone
        const panX = applyDeadzone(readBindingValue(gamepad, mapBindings['MAP.PAN_X']), settings.deadzone);
        const panY = applyDeadzone(readBindingValue(gamepad, mapBindings['MAP.PAN_Y']), settings.deadzone);
        const rot = applyDeadzone(readBindingValue(gamepad, mapBindings['MAP.ROTATE_X']), settings.deadzone);
        const pit = applyDeadzone(readBindingValue(gamepad, mapBindings['MAP.PITCH_Y']), settings.deadzone);

        // Apply smoothing/inertia to velocities
        this.velocities.panX = this.smoothToward(this.velocities.panX, panX * settings.panSpeedPxPerSec * settings.sensitivity, settings.smoothing);
        this.velocities.panY = this.smoothToward(this.velocities.panY, panY * settings.panSpeedPxPerSec * settings.sensitivity, settings.smoothing);
        this.velocities.rotate = this.smoothToward(this.velocities.rotate, rot * settings.rotateDegPerSec * settings.sensitivity, settings.smoothing);
        this.velocities.pitch = this.smoothToward(this.velocities.pitch, pit * settings.pitchDegPerSec * settings.sensitivity, settings.smoothing);

        // Pan (using smoothed velocity, instant application)
        if (this.velocities.panX || this.velocities.panY) {
            this.map.panBy(
                [this.velocities.panX * dt, this.velocities.panY * dt],
                { duration: 0 }
            );
        }

        // Rotate (accumulate then apply in batches)
        if (this.velocities.rotate) {
            this.accumulators.bearing += this.velocities.rotate * dt;
            if (Math.abs(this.accumulators.bearing) > 1) {
                this.map.rotateTo(
                    this.map.getBearing() + this.accumulators.bearing,
                    { duration: 0 }
                );
                this.accumulators.bearing = 0;
            }
        }

        // Pitch (use jumpTo for true first-person camera)
        if (this.velocities.pitch) {
            this.accumulators.pitch += this.velocities.pitch * dt;
            if (Math.abs(this.accumulators.pitch) > 1) {
                const maxPitch = settings.unlockMaxPitch ? 85 : 60;
                const newPitch = Math.max(0, Math.min(maxPitch, this.map.getPitch() + this.accumulators.pitch));

                this.map.jumpTo({ pitch: newPitch });
                this.accumulators.pitch = 0;
            }
        }

        // Zoom (tap-to-speed, handled via commands now)
        this.processZoom(gamepad, dt, settings);
    }

    /**
     * Process analog controls for DRONE_GIMBAL context
     */
    private processDroneAnalog(gamepad: Gamepad, dt: number) {
        const { settings, bindings } = this.profile;
        const droneBindings = bindings.drone_gimbal;

        // Left stick: movement along drone heading
        const forward = applyDeadzone(readBindingValue(gamepad, droneBindings['DRONE.MOVE_FORWARD']), settings.deadzone);
        const strafe = applyDeadzone(readBindingValue(gamepad, droneBindings['DRONE.STRAFE_LEFT']), settings.deadzone);

        // Right stick: camera look (independent of drone heading)
        const lookX = applyDeadzone(readBindingValue(gamepad, droneBindings['DRONE.LOOK_X']), settings.deadzone);
        const lookY = applyDeadzone(readBindingValue(gamepad, droneBindings['DRONE.LOOK_Y']), settings.deadzone);

        // Apply camera look (rotates camera bearing/pitch independently)
        if (lookX) {
            this.accumulators.bearing += lookX * settings.rotateDegPerSec * settings.sensitivity * dt;
            if (Math.abs(this.accumulators.bearing) > 1) {
                this.map.rotateTo(
                    this.map.getBearing() + this.accumulators.bearing,
                    { duration: 0 }
                );
                this.accumulators.bearing = 0;
            }
        }

        if (lookY) {
            this.accumulators.pitch += lookY * settings.pitchDegPerSec * settings.sensitivity * dt;
            if (Math.abs(this.accumulators.pitch) > 1) {
                const maxPitch = settings.unlockMaxPitch ? 85 : 60;
                const newPitch = Math.max(0, Math.min(maxPitch, this.map.getPitch() + this.accumulators.pitch));

                this.map.jumpTo({ pitch: newPitch });
                this.accumulators.pitch = 0;
            }
        }

        // Apply movement along drone heading (world-space)
        if (forward || strafe) {
            // Calculate relative angle between drone heading and camera bearing
            const relativeAngle = this.droneHeading - this.map.getBearing();
            const rad = relativeAngle * Math.PI / 180;

            // Forward vector in screen space
            const fwdX = Math.sin(rad) * forward;
            const fwdY = -Math.cos(rad) * forward;

            // Strafe vector in screen space (perpendicular to forward)
            const strafeX = Math.cos(rad) * strafe;
            const strafeY = Math.sin(rad) * strafe;

            // Combine and apply
            const totalX = (fwdX + strafeX) * settings.panSpeedPxPerSec * settings.sensitivity * dt;
            const totalY = (fwdY + strafeY) * settings.panSpeedPxPerSec * settings.sensitivity * dt;

            this.map.panBy([totalX, totalY], { duration: 0 });
        }
    }

    /**
     * Process zoom buttons (tap-to-speed)
     */
    private processZoom(gamepad: Gamepad, dt: number, settings: ControllerProfileV2['settings']) {
        const mapBindings = this.profile.bindings.map;

        // Zoom In
        if (mapBindings['MAP.ZOOM_IN']?.type === 'button') {
            const button = gamepad.buttons[mapBindings['MAP.ZOOM_IN'].index];
            if (button && this.dispatcher.pressedOnce('MAP.ZOOM_IN', button.pressed)) {
                if (this.zoomOutSpeed > 0) {
                    this.zoomOutSpeed = 0;
                    this.zoomInSpeed = 0;
                } else {
                    this.zoomInSpeed = this.cycleZoomSpeed(this.zoomInSpeed);
                }
            }
        }

        // Zoom Out
        if (mapBindings['MAP.ZOOM_OUT']?.type === 'button') {
            const button = gamepad.buttons[mapBindings['MAP.ZOOM_OUT'].index];
            if (button && this.dispatcher.pressedOnce('MAP.ZOOM_OUT', button.pressed)) {
                if (this.zoomInSpeed > 0) {
                    this.zoomInSpeed = 0;
                    this.zoomOutSpeed = 0;
                } else {
                    this.zoomOutSpeed = this.cycleZoomSpeed(this.zoomOutSpeed);
                }
            }
        }

        // Apply continuous zoom
        if (this.zoomInSpeed > 0) {
            const zoomDelta = this.zoomInSpeed * settings.zoomUnitsPerSec * settings.sensitivity * settings.zoomIntensity * dt;
            this.map.setZoom(this.map.getZoom() + zoomDelta);
        } else if (this.zoomOutSpeed > 0) {
            const zoomDelta = this.zoomOutSpeed * settings.zoomUnitsPerSec * settings.sensitivity * settings.zoomIntensity * dt;
            this.map.setZoom(this.map.getZoom() - zoomDelta);
        }
    }

    /**
     * Helpers
     */
    private smoothToward(current: number, target: number, smoothing: number): number {
        return current + (target - current) * smoothing;
    }

    private cycleZoomSpeed(current: number): number {
        if (current === 0) return 1;
        if (current === 1) return 2;
        if (current === 2) return 4;
        if (current === 4) return 8;
        return 0;
    }
}
