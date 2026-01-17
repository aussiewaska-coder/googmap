import maplibregl from 'maplibre-gl';
import { ControllerProfile, Binding } from './types';
import { loadSessionProfile } from './storage';
import { DEFAULT_PROFILE, applyTacticalPreset } from './defaults';
import { getActiveGamepad, readBindingValue, applyDeadzone, applyCurve } from './gamepad-reader';

export class MapController {
    private map: maplibregl.Map;
    private profile: ControllerProfile;
    private running = false;
    private animationFrameId: number | null = null;
    private lastTime = 0;
    private prevButtonState = new Map<string, boolean>();
    private accumulators = { zoom: 0, bearing: 0, pitch: 0 };
    private zoomVelocity = 0; // Smooth velocity for button zoom (ramps up/down)

    constructor(map: maplibregl.Map) {
        this.map = map;

        // Load profile: sessionStorage → preset → default
        const saved = loadSessionProfile();
        this.profile = saved || applyTacticalPreset();

        this.start();
    }

    updateProfile(profile: ControllerProfile) {
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

    private processGamepad(gp: Gamepad, dt: number) {
        const { settings, bindings } = this.profile;

        // Read raw values
        const panXRaw = readBindingValue(gp, bindings.pan_x);
        const panYRaw = readBindingValue(gp, bindings.pan_y);
        const rotRaw = readBindingValue(gp, bindings.rotate_x);
        let pitRaw = readBindingValue(gp, bindings.pitch_y);
        const zoomRaw = readBindingValue(gp, bindings.zoom);

        // Apply invertY
        if (settings.invertY === 'both' ||
            (settings.invertY === 'left' && bindings.pitch_y?.index === 1) ||
            (settings.invertY === 'right' && bindings.pitch_y?.index === 3)) {
            pitRaw = -pitRaw;
        }

        // Apply deadzone + sensitivity with improved curve
        const panX = applyCurve(applyDeadzone(panXRaw, settings.deadzone), settings.sensitivity);
        const panY = applyCurve(applyDeadzone(panYRaw, settings.deadzone), settings.sensitivity);
        const rot = applyCurve(applyDeadzone(rotRaw, settings.deadzone), settings.sensitivity);
        const pit = applyCurve(applyDeadzone(pitRaw, settings.deadzone), settings.sensitivity);
        const zoom = applyCurve(applyDeadzone(zoomRaw, settings.deadzone), settings.sensitivity);

        // Pan (using user-configured pan speed)
        if (panX || panY) {
            this.map.panBy(
                [panX * settings.panSpeedPxPerSec * dt, panY * settings.panSpeedPxPerSec * dt],
                { duration: 0 }
            );
        }

        // Rotate (accumulator pattern - preserve existing behavior)
        if (rot) {
            this.accumulators.bearing += rot * settings.rotateDegPerSec * dt;
            if (Math.abs(this.accumulators.bearing) > 1) {
                this.map.setBearing(this.map.getBearing() + this.accumulators.bearing);
                this.accumulators.bearing = 0;
            }
        }

        // Pitch (accumulator pattern with clamping)
        if (pit) {
            this.accumulators.pitch += pit * settings.pitchDegPerSec * dt;
            if (Math.abs(this.accumulators.pitch) > 1) {
                const newPitch = Math.max(0, Math.min(60, this.map.getPitch() + this.accumulators.pitch));
                this.map.setPitch(newPitch);
                this.accumulators.pitch = 0;
            }
        }

        // Zoom
        if (zoom) {
            this.accumulators.zoom += zoom * settings.zoomUnitsPerSec * dt;
            if (Math.abs(this.accumulators.zoom) > 0.1) {
                this.map.setZoom(this.map.getZoom() + this.accumulators.zoom);
                this.accumulators.zoom = 0;
            }
        }

        // Button actions
        this.handleButtonActions(gp, bindings, dt);
    }

    private handleButtonActions(gp: Gamepad, bindings: ControllerProfile['bindings'], dt: number) {
        // Reset North
        if (bindings.reset_north?.type === 'button') {
            const down = !!gp.buttons[bindings.reset_north.index]?.pressed;
            if (this.pressedOnce('reset_north', down)) {
                this.map.rotateTo(0, { duration: 150 });
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
                    duration: 1500,
                });
            }
        }

        // Toggle Pitch
        if (bindings.toggle_pitch?.type === 'button') {
            const down = !!gp.buttons[bindings.toggle_pitch.index]?.pressed;
            if (this.pressedOnce('toggle_pitch', down)) {
                const currentPitch = this.map.getPitch();
                const targetPitch = currentPitch < 30 ? 60 : 0;
                this.map.easeTo({ pitch: targetPitch, duration: 300 });
            }
        }

        // Smooth Digital-to-Analog Button Zoom with Ramping
        let targetVelocity = 0;

        // Check zoom in button
        if (bindings.zoom_in?.type === 'button') {
            const button = gp.buttons[bindings.zoom_in.index];
            if (button) {
                const intensity = button.value ?? (button.pressed ? 1.0 : 0.0);
                if (intensity > 0) {
                    targetVelocity += intensity;
                }
            }
        }

        // Check zoom out button
        if (bindings.zoom_out?.type === 'button') {
            const button = gp.buttons[bindings.zoom_out.index];
            if (button) {
                const intensity = button.value ?? (button.pressed ? 1.0 : 0.0);
                if (intensity > 0) {
                    targetVelocity -= intensity;
                }
            }
        }

        // Smoothly ramp velocity toward target (ease-in/ease-out)
        // Fast ramp up (0.15s), slower ramp down (0.25s) for natural feel
        const rampSpeed = targetVelocity === 0 ? 4.0 : 6.5; // Slower decay, faster attack
        const velocityDiff = targetVelocity - this.zoomVelocity;
        
        // Cubic easing for ultra-smooth acceleration
        const easedDiff = velocityDiff > 0 
            ? velocityDiff * velocityDiff * velocityDiff // Ease-in cubic for attack
            : velocityDiff * Math.abs(velocityDiff) * Math.abs(velocityDiff); // Ease-out cubic for decay
        
        this.zoomVelocity += easedDiff * rampSpeed * dt;

        // Apply smoothed zoom velocity
        if (Math.abs(this.zoomVelocity) > 0.001) {
            const zoomDelta = this.zoomVelocity * this.profile.settings.zoomUnitsPerSec * dt;
            this.map.setZoom(this.map.getZoom() + zoomDelta);
        } else {
            this.zoomVelocity = 0; // Clamp to zero when very small
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
