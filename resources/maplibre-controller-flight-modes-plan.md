# MapLibre Controller Flight Modes + Smoothing — Dev-Ready Plan (Vercel)

This document describes **exact implementation steps** to add controller-driven “flight modes” (Joyflight / Fighter Jet / UFO / Satellite) to a MapLibre GL JS map, including **input smoothing**, **MapLibre easing / flyTo settings**, and **settings toggles** in the existing control settings modal.  
Mappings are **session-scoped** (`sessionStorage`) and should apply immediately on returning to the map.

---

## 1) What’s real (grounded in docs)

### Gamepad polling model (why smoothing is on you)
The Web **Gamepad API** reports **current controller state** (axes + buttons). Your app typically **polls** `navigator.getGamepads()` inside an update loop; the API doesn’t do smoothing for you.  
References:
- MDN “Using the Gamepad API” (polling pattern, events, reading axes/buttons): https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- MDN `Navigator.getGamepads()`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads

### MapLibre camera animation knobs you can actually set
MapLibre movement methods share animation options (duration/easing), and `flyTo` provides flight path parameters.
References:
- MapLibre `AnimationOptions` (duration/easing): https://www.maplibre.org/maplibre-gl-js/docs/API/type-aliases/AnimationOptions/
- MapLibre “Customize camera animations” (select easing functions, examples): https://www.maplibre.org/maplibre-gl-js/docs/examples/customize-camera-animations/
- MapLibre `FlyToOptions` (speed/curve): https://www.maplibre.org/maplibre-gl-js/docs/API/type-aliases/FlyToOptions/
- MapLibre `CameraOptions` (bearing/pitch/zoom/center fields used by easeTo/flyTo): https://www.maplibre.org/maplibre-gl-js/docs/API/type-aliases/CameraOptions/

> Key point: **continuous controller steering** is usually best implemented as per-frame incremental updates (panBy / rotateTo / easeTo with very small durations), while **recenter/jump/cinematic** actions use `flyTo` with tuned `speed/curve` + easing.

---

## 2) Feature goals and acceptance criteria

### Goals
1. Add a **Flight Mode** selector:
   - Joyflight (smooth, gentle)
   - Fighter Jet (snappy, fast)
   - UFO (fast, floaty/inertial)
   - Satellite (slow lateral, stronger zoom authority)
2. Add **input smoothing** (inertia) so analog movement isn’t “chattery/steppy”.
3. Add **camera transition settings** for discrete actions (recenter, go-to):
   - `flyTo.speed`, `flyTo.curve`, `flyTo.easing`
4. Add toggles/sliders to the **existing control settings modal**:
   - Enable Controller
   - Flight Mode
   - Deadzone
   - Sensitivity/Response
   - Smoothing (inertia)
   - Speeds (pan/rotate/pitch/zoom)
   - Optional: Glide ms (easeTo duration for continuous updates)
5. Persist settings & mappings for this session using `sessionStorage`.

### Acceptance criteria (must-pass)
- With controller connected, movement is smooth and stable:
  - no drift at rest (deadzone)
  - no jerkiness when lightly moving stick (smoothing + response curve)
- Switching Flight Mode changes “feel” immediately.
- “Recenter” uses `flyTo` and feels distinct per mode (speed/curve/easing).
- All settings persist across in-tab navigation/refresh (session), but reset if tab closes.

---

## 3) Data model additions (session profile)

Use a single session profile key: `controllerMapping.v1`.

### Add “flight” to session profile
```ts
export type FlightMode = "joyflight" | "fighter" | "ufo" | "satellite";

export type ControllerProfile = {
  version: 1;
  settings: {
    enabled: boolean;
    flightMode: FlightMode;

    // input processing
    deadzone: number;            // 0..0.35
    sensitivity: number;         // response curve (>1 more aggressive)
    smoothing: number;           // 0..1, inertia factor (see section 6)
    invertY: "none" | "left" | "right" | "both";

    // continuous camera speeds (per second)
    panSpeedPxPerSec: number;
    rotateDegPerSec: number;
    pitchDegPerSec: number;
    zoomUnitsPerSec: number;

    // continuous camera animation
    glideMs: number;             // 0..80 recommended
    glideEasing: "linear" | "easeOut" | "easeInOut"; // (maps to easing fn)

    // discrete transitions (recenter/go-to)
    flySpeed: number;            // FlyToOptions.speed
    flyCurve: number;            // FlyToOptions.curve
    flyEasing: "easeOut" | "easeInOut" | "easeInCubic" | "easeOutQuint";
  };

  bindings: {
    pan_x?: Binding;
    pan_y?: Binding;
    rotate_x?: Binding;
    pitch_y?: Binding;
    zoom?: Binding;              // analog zoom (optional)
    zoom_in?: Binding;           // button zoom (optional)
    zoom_out?: Binding;
    reset_north?: Binding;
    recenter?: Binding;
    toggle_pitch?: Binding;
  };
};
```

---

## 4) Flight Mode presets (initial values)

These are **starting values** to ship. Expect light tuning after first real-device test.

| Mode | pan px/s | rotate deg/s | pitch deg/s | zoom /s | smoothing | glide ms | fly speed | fly curve | fly easing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Joyflight | 650 | 75 | 45 | 0.8 | 0.18 | 40 | 0.9 | 1.2 | easeInOut |
| Fighter Jet | 1300 | 150 | 95 | 1.4 | 0.10 | 16 | 1.4 | 1.1 | easeOut |
| UFO | 2100 | 230 | 140 | 2.2 | 0.16 | 28 | 1.7 | 1.4 | easeOutQuint |
| Satellite | 380 | 50 | 25 | 1.8 | 0.20 | 55 | 0.7 | 1.8 | easeInOut |

Notes:
- **smoothing higher** = more inertia/float.
- **glideMs** adds subtle map camera interpolation for continuous updates.
- `flySpeed` and `flyCurve` are real `FlyToOptions` fields.

---

## 5) UI changes: existing Control Settings Modal

Add a new section: **Controller / Flight**

### Controls to add
**(A) Enable Controller**
- Toggle: `settings.enabled`

**(B) Flight Mode**
- Dropdown: Joyflight / Fighter Jet / UFO / Satellite
- On change: apply preset values *or* keep user-custom overrides (recommended: “Apply preset” button).

**(C) Input**
- Deadzone slider (0..0.35)
- Sensitivity slider (0.4..2.5)
- Smoothing slider (0..0.30 recommended UI range)
- Invert Y dropdown

**(D) Speeds (Advanced accordion)**
- Pan speed
- Rotate speed
- Pitch speed
- Zoom speed

**(E) Continuous camera animation**
- Glide ms slider (0..80)
- Glide easing dropdown (Linear / Ease-out / Ease-in-out)

**(F) Discrete transitions**
- Fly speed slider (0.4..2.2)
- Fly curve slider (0.8..2.0)
- Fly easing dropdown (matching MapLibre example options)

**(G) Actions**
- Button: “Open Controller Mapping…” (goes to mapping screen)
- Button: “Reset Flight Settings” (reset to mode preset)

---

## 6) Input processing: smoothing, curves, deadzones (controller loop)

### 6.1 Deadzone (required)
```js
function applyDeadzone(v, dz){
  const a = Math.abs(v);
  if (a < dz) return 0;
  // rescale so max still reaches 1
  return Math.sign(v) * ((a - dz) / (1 - dz));
}
```

### 6.2 Response curve (to avoid coarse feel near center)
```js
function applyCurve(v, sensitivity){
  // sensitivity ~ 1: linear
  // > 1: more aggressive (faster ramp)
  // < 1: softer
  const a = Math.abs(v);
  return Math.sign(v) * Math.pow(a, 1 / sensitivity);
}
```

### 6.3 Inertia smoothing (the “flight feel”)
```js
function smoothToward(current, target, smoothing){
  return current + (target - current) * smoothing;
}
```

Use per-axis velocity state so you’re smoothing **velocity**, not just raw input.

---

## 7) MapLibre camera application strategy

### 7.1 Continuous motion (sticks)
Use incremental updates every frame.

**Pattern A: Immediate** (recommended baseline)
```js
map.panBy([dx, dy], { duration: 0 });
map.rotateTo(map.getBearing() + dBearing, { duration: 0 });
map.easeTo({ pitch: nextPitch, zoom: nextZoom, duration: 0 });
```

**Pattern B: Micro-glide**
Use `AnimationOptions.duration` + `easing` (documented):
- https://www.maplibre.org/maplibre-gl-js/docs/API/type-aliases/AnimationOptions/
Example easing functions:
- https://www.maplibre.org/maplibre-gl-js/docs/examples/customize-camera-animations/

```js
map.panBy([dx, dy], { duration: glideMs, easing: easingFn });
map.rotateTo(newBearing, { duration: glideMs, easing: easingFn });
map.easeTo({ pitch: nextPitch, zoom: nextZoom, duration: glideMs, easing: easingFn });
```

### 7.2 Discrete actions (recenter / go-to)
Use `flyTo` with real `FlyToOptions.speed/curve`:
- https://www.maplibre.org/maplibre-gl-js/docs/API/type-aliases/FlyToOptions/

```js
map.flyTo({
  center: targetCenter,
  zoom: targetZoom,
  bearing: targetBearing,
  pitch: targetPitch,
  speed: profile.settings.flySpeed,
  curve: profile.settings.flyCurve,
  easing: flyEasingFn
});
```

---

## 8) Implementation plan (file-by-file)

### New modules
**`src/controller/profile.ts`**
- schema, defaults, sessionStorage helpers
- `applyFlightModePreset(mode)`

**`src/controller/gamepad.ts`**
- `getActiveGamepad()`
- `readBindingValue()`
- `pressedOnceFactory()`

**`src/controller/flight-modes.ts`**
- preset table
- easing registry

**`src/controller/map-controller.ts`**
- RAF loop
- velocity state + smoothing
- map update calls

### Update existing Settings Modal
- Add “Controller / Flight” section
- Persist changes to session profile
- Optional: show “controller connected” indicator

### Routing for mapping screen
- Next.js: new page route under `app/` or `pages/`
- SPA static: ensure `vercel.json` rewrite if using History routes

---

## 9) Map controller loop — reference skeleton

```js
export function startMapController(map, { loadProfile, getEasingFn, getGamepad }){
  let running = true;
  let last = performance.now();

  let vPanX = 0, vPanY = 0, vRot = 0, vPitch = 0, vZoom = 0;
  const prev = new Map();

  const pressedOnce = (key, down) => {
    const was = prev.get(key) || false;
    prev.set(key, down);
    return !was && down;
  };

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

  function applyDeadzone(v, dz){
    const a = Math.abs(v);
    if (a < dz) return 0;
    return Math.sign(v) * ((a - dz) / (1 - dz));
  }
  function applyCurve(v, s){
    const a = Math.abs(v);
    return Math.sign(v) * Math.pow(a, 1/s);
  }
  function smoothToward(c, t, k){
    return c + (t - c) * k;
  }

  function readBindingValue(gp, binding){
    if (!binding) return 0;
    if (binding.type === "axis"){
      const raw = gp.axes[binding.index] ?? 0;
      return raw * binding.sign;
    }
    if (binding.type === "button"){
      const b = gp.buttons[binding.index];
      if (!b) return 0;
      return b.value ?? (b.pressed ? 1 : 0);
    }
    return 0;
  }

  function frame(t){
    if (!running) return;
    const dt = Math.min(0.05, (t - last)/1000);
    last = t;

    const profile = loadProfile();
    if (!profile?.settings?.enabled){
      requestAnimationFrame(frame);
      return;
    }

    const gp = getGamepad(profile) || null;
    if (!gp){
      requestAnimationFrame(frame);
      return;
    }

    const s = profile.settings;
    const easingFn = getEasingFn(s.glideEasing);

    const axis = (binding) => {
      const raw = readBindingValue(gp, binding);
      return applyCurve(applyDeadzone(raw, s.deadzone), s.sensitivity);
    };

    const panX = axis(profile.bindings.pan_x);
    const panY = axis(profile.bindings.pan_y);
    const rot  = axis(profile.bindings.rotate_x);
    const pit  = axis(profile.bindings.pitch_y);
    const zom  = axis(profile.bindings.zoom);

    vPanX = smoothToward(vPanX, panX * s.panSpeedPxPerSec, s.smoothing);
    vPanY = smoothToward(vPanY, panY * s.panSpeedPxPerSec, s.smoothing);
    vRot  = smoothToward(vRot,  rot  * s.rotateDegPerSec, s.smoothing);
    vPitch= smoothToward(vPitch,pit  * s.pitchDegPerSec, s.smoothing);
    vZoom = smoothToward(vZoom, zom  * s.zoomUnitsPerSec, s.smoothing);

    if (vPanX || vPanY){
      map.panBy([vPanX * dt, vPanY * dt], { duration: s.glideMs, easing: easingFn });
    }
    if (vRot){
      map.rotateTo(map.getBearing() + vRot * dt, { duration: s.glideMs, easing: easingFn });
    }
    if (vPitch){
      const nextPitch = clamp(map.getPitch() + vPitch * dt, 0, 60);
      map.easeTo({ pitch: nextPitch, duration: s.glideMs, easing: easingFn });
    }
    if (vZoom){
      map.easeTo({ zoom: map.getZoom() + vZoom * dt, duration: s.glideMs, easing: easingFn });
    }

    const b = profile.bindings.reset_north;
    const down = b?.type === "button" ? !!gp.buttons[b.index]?.pressed : false;
    if (pressedOnce("reset_north", down)){
      map.rotateTo(0, { duration: 150, easing: getEasingFn(s.flyEasing) });
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return () => { running = false; };
}
```

---

## 10) Discrete recenter using flyTo (mode-specific)

```js
function recenter(map, profile, target){
  map.flyTo({
    center: target.center,
    zoom: target.zoom,
    bearing: target.bearing,
    pitch: target.pitch,
    speed: profile.settings.flySpeed,
    curve: profile.settings.flyCurve,
    easing: getEasingFn(profile.settings.flyEasing)
  });
}
```

`flyTo` parameters are documented in FlyToOptions:  
https://www.maplibre.org/maplibre-gl-js/docs/API/type-aliases/FlyToOptions/

---

## 11) QA plan

1. Desktop Chrome: validate loops + sliders.
2. Android Chrome on a Vercel Preview URL:
   - connect controller
   - verify each flight mode’s feel
3. Verify session persistence:
   - refresh tab keeps settings/mapping
   - close tab resets

---

## 12) Deliverables

- New Controller/Flight section in settings modal.
- Flight modes with tuning + smoothing.
- `flyTo` recenter with mode-specific speed/curve/easing.
- Session-scoped persistence via sessionStorage.
- Works on Vercel.

---

## Appendix — Easing registry (simple local)

MapLibre examples demonstrate choosing easing functions:
https://www.maplibre.org/maplibre-gl-js/docs/examples/customize-camera-animations/

```js
export const easing = {
  linear: (t)=>t,
  easeOut: (t)=>1 - Math.pow(1-t, 3),
  easeInOut: (t)=> t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2,
  easeInCubic: (t)=> t*t*t,
  easeOutQuint: (t)=> 1 - Math.pow(1-t, 5),
};
```
