import maplibregl from 'maplibre-gl';
import { ControllerProfile, Binding } from './types';
import { loadSessionProfile } from './storage';
import { DEFAULT_PROFILE, applyTacticalPreset } from './defaults';
import { getActiveGamepad, readBindingValue, applyDeadzone } from './gamepad-reader';
import { getFlyEasingFn } from './flight-modes';

export class MapController {
    private map: maplibregl.Map;
    private profile: ControllerProfile;
    private running = false;
    private animationFrameId: number | null = null;
    private lastTime = 0;
    private prevButtonState = new Map<string, boolean>();
    private accumulators = { bearing: 0, pitch: 0 };
    private zoomInSpeed = 0; // Tap-based speed: 0, 1, 2, 4, 8
    private zoomOutSpeed = 0; // Tap-based speed: 0, 1, 2, 4, 8

    // Velocity state for smoothing/inertia
    private velocities = {
        panX: 0,
        panY: 0,
        rotate: 0,
        pitch: 0,
        zoom: 0
    };

    constructor(map: maplibregl.Map) {
        this.map = map;

        // Load profile: sessionStorage → preset → default
        const saved = loadSessionProfile();
        this.profile = saved || applyTacticalPreset();

        this.start();
    }

    updateProfile(profile: ControllerProfile) {
        // Debug: console.log('[MapController] Updated:', profile.settings.invertX, profile.settings.invertY);
        this.profile = profile;
    }

    private start() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    private loop = (time: number) => {
        if (!this.running) return;

        const dt = Math.min(0.05, (time - this.lastTime) / 1000);
        this.lastTime = time;

        const gamepad = getActiveGamepad();
        if (gamepad) {
            this.processGamepad(gamepad, dt);
        }

        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    /**
     * Apply inertia smoothing to velocity.
     * Higher smoothing = more inertia/float.
     */
    private smoothToward(current: number, target: number, smoothing: number): number {
        return current + (target - current) * smoothing;
    }

    /**
     * Get the pivot point for pitch rotation (70% down the viewport, closer to camera).
     */
    private getPitchPivotPoint(): maplibregl.LngLat {
        const container = this.map.getContainer();
        const centerPoint = { x: container.offsetWidth / 2, y: container.offsetHeight * 0.7 };
        return this.map.unproject([centerPoint.x, centerPoint.y]);
    }

    /**
     * Cycle zoom speed through progression: 0 → 1 → 2 → 4 → 8 → 0
     */
    private cycleZoomSpeed(current: number): number {
        if (current === 0) return 1;
        if (current === 1) return 2;
        if (current === 2) return 4;
        if (current === 4) return 8;
        return 0;
    }

    private processGamepad(gp: Gamepad, dt: number) {
        const { settings, bindings } = this.profile;

        // Read raw values and apply deadzone only (linear scaling)
        const panX = applyDeadzone(readBindingValue(gp, bindings.pan_x), settings.deadzone);
        const panY = applyDeadzone(readBindingValue(gp, bindings.pan_y), settings.deadzone);
        const rot = applyDeadzone(readBindingValue(gp, bindings.rotate_x), settings.deadzone);
        const pit = applyDeadzone(readBindingValue(gp, bindings.pitch_y), settings.deadzone);

        // Apply smoothing/inertia to velocities
        // Sensitivity is a global multiplier applied to all speed settings
        this.velocities.panX = this.smoothToward(this.velocities.panX, panX * settings.panSpeedPxPerSec * settings.sensitivity, settings.smoothing);
        this.velocities.panY = this.smoothToward(this.velocities.panY, panY * settings.panSpeedPxPerSec * settings.sensitivity, settings.smoothing);
        this.velocities.rotate = this.smoothToward(this.velocities.rotate, rot * settings.rotateDegPerSec * settings.sensitivity, settings.smoothing);
        this.velocities.pitch = this.smoothToward(this.velocities.pitch, pit * settings.pitchDegPerSec * settings.sensitivity, settings.smoothing);

        // Pan (using smoothed velocity, instant application)
        // NOTE: Duration 0 to avoid animation stacking - smoothing is handled by velocity interpolation
        if (this.velocities.panX || this.velocities.panY) {
            this.map.panBy(
                [this.velocities.panX * dt, this.velocities.panY * dt],
                { duration: 0 }
            );
        }

        // Rotate (using smoothed velocity, instant application)
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

        // Pitch (using smoothed velocity, instant application)
        if (this.velocities.pitch) {
            this.accumulators.pitch += this.velocities.pitch * dt;
            if (Math.abs(this.accumulators.pitch) > 1) {
                const maxPitch = settings.unlockMaxPitch ? 85 : 60;
                const newPitch = Math.max(0, Math.min(maxPitch, this.map.getPitch() + this.accumulators.pitch));

                this.map.easeTo({
                    pitch: newPitch,
                    duration: 0,
                    around: this.getPitchPivotPoint()
                });
                this.accumulators.pitch = 0;
            }
        }

        // Button actions
        this.handleButtonActions(gp, bindings, settings, dt);
    }

    private handleButtonActions(gp: Gamepad, bindings: ControllerProfile['bindings'], settings: ControllerProfile['settings'], dt: number) {
        // Get easing function for flyTo actions
        const flyEasingFn = getFlyEasingFn(settings.flyEasing);

        // Reset North
        if (bindings.reset_north?.type === 'button') {
            const down = !!gp.buttons[bindings.reset_north.index]?.pressed;
            if (this.pressedOnce('reset_north', down)) {
                this.map.rotateTo(0, { duration: 150, easing: flyEasingFn });
            }
        }

        // Recenter
        if (bindings.recenter?.type === 'button') {
            const down = !!gp.buttons[bindings.recenter.index]?.pressed;
            if (this.pressedOnce('recenter', down)) {
                this.map.flyTo({
                    center: [120.953100, -27.946800],
                    zoom: 3.92,
                    pitch: 0,
                    bearing: 0,
                    speed: settings.flySpeed,
                    curve: settings.flyCurve,
                    easing: flyEasingFn,
                });
            }
        }

        // Toggle Pitch
        if (bindings.toggle_pitch?.type === 'button') {
            const down = !!gp.buttons[bindings.toggle_pitch.index]?.pressed;
            if (this.pressedOnce('toggle_pitch', down)) {
                const currentPitch = this.map.getPitch();
                const maxPitch = settings.unlockMaxPitch ? 85 : 60;
                const targetPitch = currentPitch < 30 ? maxPitch : 0;

                this.map.easeTo({
                    pitch: targetPitch,
                    duration: 300,
                    around: this.getPitchPivotPoint()
                });
            }
        }

        // Tap-to-speed zoom: 0 → 1 → 2 → 4 → 8 → 0
        // Zoom In Button
        if (bindings.zoom_in?.type === 'button') {
            const button = gp.buttons[bindings.zoom_in.index];
            if (button && this.pressedOnce('zoom_in', button.pressed)) {
                // If zooming out, tap zoom in to stop (cross-cancel)
                if (this.zoomOutSpeed > 0) {
                    this.zoomOutSpeed = 0;
                    this.zoomInSpeed = 0;
                } else {
                    this.zoomInSpeed = this.cycleZoomSpeed(this.zoomInSpeed);
                }
            }
        }

        // Zoom Out Button
        if (bindings.zoom_out?.type === 'button') {
            const button = gp.buttons[bindings.zoom_out.index];
            if (button && this.pressedOnce('zoom_out', button.pressed)) {
                // If zooming in, tap zoom out to stop (cross-cancel)
                if (this.zoomInSpeed > 0) {
                    this.zoomInSpeed = 0;
                    this.zoomOutSpeed = 0;
                } else {
                    this.zoomOutSpeed = this.cycleZoomSpeed(this.zoomOutSpeed);
                }
            }
        }

        // Apply continuous zoom based on current speed
        if (this.zoomInSpeed > 0) {
            const zoomDelta = this.zoomInSpeed * settings.zoomUnitsPerSec * settings.sensitivity * settings.zoomIntensity * dt;
            this.map.setZoom(this.map.getZoom() + zoomDelta);
        } else if (this.zoomOutSpeed > 0) {
            const zoomDelta = this.zoomOutSpeed * settings.zoomUnitsPerSec * settings.sensitivity * settings.zoomIntensity * dt;
            this.map.setZoom(this.map.getZoom() - zoomDelta);
        }
    }

    private pressedOnce(key: string, down: boolean): boolean {
        const was = this.prevButtonState.get(key) || false;
        this.prevButtonState.set(key, down);
        return !was && down;
    }

    cleanup() {
        this.running = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}
