# Controller Mapping + MapLibre Gamepad Controls — Execution Plan (Vercel)

**Purpose:** Add a polished *Controller Mapping* screen to the current MapLibre web app and wire it into the map so a Bluetooth controller (e.g., Backbone-like) can control **pan / rotate / pitch / zoom**. Mappings persist **for the current browser session** (tab) using `sessionStorage`. On **Save & Close**, the user returns to the map page and the mapping is applied immediately.

---

## 0) Scope, constraints, and success criteria

### In-scope
- A dedicated **Controller Mapping** UI with live input visualization (sticks + buttons).
- Bind workflow: click/tap an action → move/press input → captured binding saved.
- Session persistence using **`sessionStorage`**.
- Integration into MapLibre map controls via a **requestAnimationFrame** loop.
- Mobile-first UX, optimized for **landscape**.
- Works on Vercel (HTTPS + routing).

### Out-of-scope (for now)
- Server-side persistence / user accounts.
- “Global” profiles across devices (e.g., cloud sync).
- Full calibration suite for every controller model.
- Accessibility perfection pass (but we’ll keep basics: focus, readable contrast, large targets).

### Success criteria
- On a phone in landscape, controller connects and moves the map smoothly:
  - Right stick: **pan**
  - Left stick: **rotate** (X) and **pitch** (Y)
  - Zoom: bound (trigger or stick or buttons)
- Mapping screen saves, closes, returns to map; mapping works immediately.
- No “drift” when stick is centered (deadzone).
- No jank: controller loop is lightweight and only runs when enabled.

---

## 1) Project integration discovery (first 30–60 min)

### Tasks
1. Identify app type and routing:
   - **Next.js** (App Router or Pages Router)
   - **Vite/React SPA**
   - **Vanilla multipage / static**
2. Locate MapLibre integration:
   - Where the `maplibre-gl` map is created
   - Where existing input handlers are (touch, mouse, keyboard)
3. Identify UI framework (if any):
   - React/Vue/Svelte or plain HTML
4. Confirm deployment:
   - Vercel project uses Next build or static output (`dist/`)

### Deliverables
- A short note in the PR description:
  - “Map is created in X; router is Y; we will add mapping screen as Z; store in sessionStorage key K.”

---

## 2) Choose the routing approach (Vercel-safe)

Use whichever matches the current project.

### Option A — SPA route (recommended)
- Add route: `/controller-mapping`
- Map page has a “Controller Mapping” button that navigates there.

**Next.js**
- App Router: `app/controller-mapping/page.tsx`
- Pages Router: `pages/controller-mapping.tsx`

**Vite/React Router**
- Add route in router config: `/controller-mapping`

### Option B — Static HTML page
- Add `public/controller-mapping.html` and serve at `/controller-mapping.html`
- Map page links to that URL
- “Save & Close” returns to `/` or `/map`

### Vercel rewrite note (only if NOT Next.js)
If the app is a SPA deployed as static assets and uses History API routing, add `vercel.json` to avoid refresh 404s on deep links:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 3) Data model: mapping schema + session storage

### Storage key
- `controllerMapping.v1`

### Profile schema
```ts
export type Binding =
  | { type: "button"; index: number }
  | { type: "axis"; index: number; sign: 1 | -1 };

export type ControllerProfile = {
  version: 1;
  device?: { id?: string; mapping?: string; index?: number };
  settings: {
    deadzone: number;       // e.g. 0.12
    sensitivity: number;    // e.g. 1.25
    invertY: "none" | "left" | "right" | "both";
    panSpeedPxPerSec: number;      // e.g. 900
    rotateDegPerSec: number;       // e.g. 120
    pitchDegPerSec: number;        // e.g. 80
    zoomUnitsPerSec: number;       // e.g. 1.2 (map zoom units per second)
  };
  bindings: {
    pan_x?: Binding;
    pan_y?: Binding;
    rotate_x?: Binding;
    pitch_y?: Binding;
    zoom?: Binding;                // optional analog zoom
    zoom_in?: Binding;             // optional button zoom
    zoom_out?: Binding;            // optional button zoom
    reset_north?: Binding;
    recenter?: Binding;
    toggle_pitch?: Binding;
  };
};
```

### Session storage helpers
```ts
const KEY = "controllerMapping.v1";

export function loadSessionProfile(): ControllerProfile | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSessionProfile(p: ControllerProfile) {
  sessionStorage.setItem(KEY, JSON.stringify(p));
}

export function clearSessionProfile() {
  sessionStorage.removeItem(KEY);
}
```

---

## 4) UX/UI spec: “Tactical” mapping screen

### Core layout (mobile landscape first)
- Header bar:
  - Connection status pill (Disconnected/Connected + controller name)
  - Buttons: **Preset**, **Export**, **Import**, **Reset**, **Save & Close**
- Main split (two columns on wide screens; stacked on narrow):
  - Left: Live visualization
    - Left stick circle + moving nub + X/Y readouts
    - Right stick circle + moving nub + X/Y readouts
    - Button grid (face + shoulders) lighting up when pressed
    - D-pad + misc grid lighting up
  - Right: Bindings list
    - Each action row: name + description + current binding tag + **Bind** + **Clear**
    - Settings sliders: deadzone, sensitivity, invert
- Bind modal:
  - “Listening…” pulse indicator
  - Live preview of strongest axis or pressed button
  - Cancel + Clear binding

### Actions to expose (minimum viable)
- Pan X (analog)
- Pan Y (analog)
- Rotate X (analog)
- Pitch Y (analog)
- Zoom (analog OR zoom in/out buttons)
- Reset North (button)
- Recenter (button)

### Preset button: “MapLibre Tactical”
- Right stick → pan X/Y
- Left stick → rotate X + pitch Y
- Default deadzone: 0.12
- Default sensitivity: 1.25
- Default pan/rotate/pitch/zoom speeds set to sensible values

**Preset mapping example (standard-ish)**
```js
profile.bindings.pan_x    = { type:"axis", index:2, sign:+1 };
profile.bindings.pan_y    = { type:"axis", index:3, sign:+1 };
profile.bindings.rotate_x = { type:"axis", index:0, sign:+1 };
profile.bindings.pitch_y  = { type:"axis", index:1, sign:+1 };
profile.bindings.reset_north = { type:"button", index:3 }; // rebindable
```

### “Save & Close” behavior
- Save profile to `sessionStorage`
- Navigate back to the map page (router back or `returnTo` query param)
- Map page reads profile and applies it immediately

---

## 5) Gamepad capture logic (mapping screen)

### Gamepad detection notes
- Many browsers only start reporting gamepads after a **user gesture** (button press).
- UI should show “Press any controller button to connect”.

### Poll loop (mapping screen)
- `requestAnimationFrame` loop reads `navigator.getGamepads()`
- Determine active gamepad:
  - If user previously selected one, use that index
  - Else first non-null gamepad
- Render:
  - stick positions (axes)
  - button states

### Binding capture logic
When “Bind” is pressed for an action:
- Start listening mode
- On each frame, compare snapshots:
  - **Button binding:** first button whose `pressed` transitions `false → true`
  - **Axis binding:** first axis that exceeds `threshold = max(0.55, deadzone + 0.25)`
    - Capture `sign = +1/-1` depending on the direction at capture time

Minimal binding capture snippet:
```js
function findNewBinding(prev, curr, deadzone) {
  // button press
  for (let i=0; i<curr.buttons.length; i++) {
    if (!prev?.buttons?.[i]?.pressed && curr.buttons[i].pressed) {
      return { type:"button", index:i };
    }
  }
  // axis move
  const TH = Math.max(0.55, deadzone + 0.25);
  for (let i=0; i<curr.axes.length; i++) {
    const v = curr.axes[i];
    if (Math.abs(v) > TH) return { type:"axis", index:i, sign: v>0 ? 1 : -1 };
  }
  return null;
}
```

---

## 6) Map page integration: applying controller input to MapLibre

### Where to hook
- After MapLibre map is created and ready (e.g., on `load`)
- Start controller loop only if:
  - Profile exists in sessionStorage OR
  - A controller is connected and user enables it

### Core loop design
- Use `requestAnimationFrame` with delta time (`dt`) for frame-rate independence
- Each frame:
  1. Read gamepad state
  2. Convert bound inputs into action values in range [-1..1]
  3. Apply deadzone + sensitivity curve
  4. Translate to map camera changes (pan/rotate/pitch/zoom)
  5. Apply immediate transitions (`duration: 0`)

### Helper functions (deadzone + sensitivity)
```js
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function applyDeadzone(v, dz){
  const a = Math.abs(v);
  if (a < dz) return 0;
  const scaled = (a - dz) / (1 - dz);
  return Math.sign(v) * clamp(scaled, 0, 1);
}

// Optional: smoother response curve
function applyCurve(v, sens){
  // sens ~ 1.0 linear; >1 more aggressive; <1 softer
  const a = Math.abs(v);
  const curved = Math.pow(a, 1 / sens);
  return Math.sign(v) * curved;
}
```

### Reading a binding value
```js
function readBindingValue(gp, binding){
  if (!binding) return 0;

  if (binding.type === "axis") {
    const raw = gp.axes[binding.index] ?? 0;
    return raw * binding.sign;
  }
  if (binding.type === "button") {
    const b = gp.buttons[binding.index];
    if (!b) return 0;
    // analog triggers often expose .value [0..1]
    return b.value ?? (b.pressed ? 1 : 0);
  }
  return 0;
}
```

### Apply to MapLibre (recommended actions)
**Pan**
- Use `map.panBy([dx, dy], { duration: 0 })`
- Convert stick value [-1..1] into px/sec scaled by dt

```js
const panX = /* -1..1 */;
const panY = /* -1..1 */;
const pxPerSec = profile.settings.panSpeedPxPerSec;
map.panBy([panX * pxPerSec * dt, panY * pxPerSec * dt], { duration: 0 });
```

**Rotate (bearing)**
- `map.getBearing()` returns degrees
- `map.setBearing(newBearing)` or `map.rotateTo(newBearing, { duration: 0 })`

```js
const rot = /* -1..1 */;
const degPerSec = profile.settings.rotateDegPerSec;
const newBearing = map.getBearing() + rot * degPerSec * dt;
map.rotateTo(newBearing, { duration: 0 });
```

**Pitch**
- Clamp to MapLibre pitch bounds (usually 0..60, but check style/settings)
```js
const pitch = /* -1..1 */;
const degPerSec = profile.settings.pitchDegPerSec;
const next = clamp(map.getPitch() + pitch * degPerSec * dt, 0, 60);
map.easeTo({ pitch: next, duration: 0 });
```

**Zoom**
- Zoom is continuous in “zoom units” (e.g., 0.1 per step)
```js
const z = /* -1..1 */;
const zuPerSec = profile.settings.zoomUnitsPerSec;
const nextZoom = map.getZoom() + z * zuPerSec * dt;
map.easeTo({ zoom: nextZoom, duration: 0 });
```

**Reset North (button)**
```js
if (pressedOnce("reset_north")) {
  map.rotateTo(0, { duration: 150 });
}
```

### Button edge detection
You want “fire once” actions. Store prior pressed states per button binding key.

```js
const prevPressed = new Map(); // key -> boolean

function pressedOnce(key, isDown){
  const was = prevPressed.get(key) || false;
  prevPressed.set(key, isDown);
  return !was && isDown;
}
```

---

## 7) Integration architecture (common-sense layout)

### Minimal module structure (works in most stacks)
- `src/controller/`
  - `profile.ts` — schema + load/save helpers
  - `gamepad.ts` — low-level read utilities
  - `map-controller.ts` — MapLibre control loop
  - `mapping-ui/` (if componentized)
    - `ControllerMappingScreen.tsx` (or .vue / .svelte)
    - `styles.css`
    - `bind-modal.tsx`

### If using a static HTML page
- `public/controller-mapping.html` (UI)
- `src/controller/map-controller.ts` (map side)
- Shared mapping code can be duplicated initially, but better:
  - `public/controller-mapping.js` built from source OR
  - bundle the mapping page through the same build pipeline

---

## 8) Navigation and “return to map”

### Preferred pattern
When opening mapping screen, include a return URL:
- `/controller-mapping?returnTo=/map`

On “Save & Close”:
- `saveSessionProfile(profile)`
- `navigate(returnTo)` or `location.href = returnTo`

Example:
```js
const params = new URLSearchParams(location.search);
const returnTo = params.get("returnTo") || "/";

saveSessionProfile(profile);
location.href = returnTo;
```

---

## 9) QA matrix and test steps

### Devices
- Desktop Chrome (macOS) + controller (development)
- Android Chrome + Backbone-like controller (primary)
- iOS Safari (secondary / best-effort)

### Scenarios (must pass)
1. **Connect after load:** open mapping page → press controller button → status updates, live input animates.
2. **Bind axis:** Bind “Pan X” → move right stick left/right → binds correct axis + sign.
3. **Bind button:** Bind “Reset North” → press a button → binds.
4. **Save & Close:** returns to map, controller moves map immediately.
5. **Deadzone works:** stick centered → map does not drift.
6. **Disconnect/reconnect:** no crashes; re-detection works.
7. **Session persistence:** refresh within tab keeps mapping; closing tab loses mapping.

### Useful dev toggles
- Display raw axes/button indices (small debug panel)
- Highlight “active gamepad” id/mapping/index

---

## 10) Vercel deployment notes (explicit)

### If Next.js
- No special rewrite needed for routes.
- Ensure mapping page is client-side only when using Gamepad API:
  - mark component `"use client"` (App Router) or only access `navigator` in `useEffect`.

### If SPA static deployment (Vite/CRA)
- Add `vercel.json` rewrite (see section 2).
- Verify `/controller-mapping` can be refreshed on production.

### HTTPS note
- Vercel provides HTTPS; this avoids many “secure context” issues and is recommended.

### Preview testing
- Use a **Vercel Preview URL** on your phone to validate controller access and routing.

---

## 11) Implementation tickets (detailed)

### Ticket A — Add profile schema + session storage
**Done when**
- `loadSessionProfile/saveSessionProfile/clearSessionProfile` exist
- Default profile available via `makeDefaultProfile()`

### Ticket B — Add mapping screen route/page
**Done when**
- `/controller-mapping` loads on dev + prod
- Displays status pill and layout

### Ticket C — Live visualization + polling
**Done when**
- Sticks animate with nub position
- Buttons light up when pressed
- UI works in phone landscape without scrolling issues

### Ticket D — Bind workflow + modal capture
**Done when**
- Bind captures button press and axis motion reliably
- “Clear” works
- Works on mobile touch

### Ticket E — Save & Close + returnTo navigation
**Done when**
- Save writes to `sessionStorage`
- Navigates back to map page

### Ticket F — MapLibre controller loop
**Done when**
- Map reads profile and starts RAF loop
- Right stick pans, left stick rotates/pitches
- Optional zoom works (analog or buttons)

### Ticket G — Polish + stability
**Done when**
- Deadzone defaults feel good
- No drift
- Disconnect doesn’t crash
- Debug info can be toggled off for production

---

## 12) Reference implementation seeds (copy/paste)

### Default profile factory
```js
function makeDefaultProfile(){
  return {
    version: 1,
    settings: {
      deadzone: 0.12,
      sensitivity: 1.25,
      invertY: "none",
      panSpeedPxPerSec: 900,
      rotateDegPerSec: 120,
      pitchDegPerSec: 80,
      zoomUnitsPerSec: 1.2
    },
    bindings: {}
  };
}
```

### Tactical preset application
```js
function applyTacticalPreset(profile){
  profile.bindings.pan_x    = { type:"axis", index:2, sign:+1 };
  profile.bindings.pan_y    = { type:"axis", index:3, sign:+1 };
  profile.bindings.rotate_x = { type:"axis", index:0, sign:+1 };
  profile.bindings.pitch_y  = { type:"axis", index:1, sign:+1 };
  profile.bindings.reset_north = { type:"button", index:3 };
  return profile;
}
```

### Map controller loop skeleton
```js
export function startMapController(map, profile){
  let running = true;
  let last = performance.now();
  const prevButtonState = new Map();

  function getGamepad(){
    const gps = navigator.getGamepads?.() || [];
    return gps.find(Boolean) || null;
  }

  function pressedOnce(key, down){
    const was = prevButtonState.get(key) || false;
    prevButtonState.set(key, down);
    return !was && down;
  }

  function frame(t){
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    const gp = getGamepad();
    if (gp && profile){
      const dz = profile.settings.deadzone;
      const sens = profile.settings.sensitivity;

      const panXRaw = readBindingValue(gp, profile.bindings.pan_x);
      const panYRaw = readBindingValue(gp, profile.bindings.pan_y);
      const rotRaw  = readBindingValue(gp, profile.bindings.rotate_x);
      const pitRaw  = readBindingValue(gp, profile.bindings.pitch_y);
      const zoomRaw = readBindingValue(gp, profile.bindings.zoom);

      const panX = applyCurve(applyDeadzone(panXRaw, dz), sens);
      const panY = applyCurve(applyDeadzone(panYRaw, dz), sens);
      const rot  = applyCurve(applyDeadzone(rotRaw,  dz), sens);
      const pit  = applyCurve(applyDeadzone(pitRaw,  dz), sens);
      const zoom = applyCurve(applyDeadzone(zoomRaw, dz), sens);

      if (panX || panY){
        map.panBy([panX * profile.settings.panSpeedPxPerSec * dt,
                   panY * profile.settings.panSpeedPxPerSec * dt], { duration: 0 });
      }
      if (rot){
        map.rotateTo(map.getBearing() + rot * profile.settings.rotateDegPerSec * dt, { duration: 0 });
      }
      if (pit){
        const next = clamp(map.getPitch() + pit * profile.settings.pitchDegPerSec * dt, 0, 60);
        map.easeTo({ pitch: next, duration: 0 });
      }
      if (zoom){
        map.easeTo({ zoom: map.getZoom() + zoom * profile.settings.zoomUnitsPerSec * dt, duration: 0 });
      }

      // Reset north example
      const b = profile.bindings.reset_north;
      const down = b?.type === "button" ? !!gp.buttons[b.index]?.pressed : false;
      if (pressedOnce("reset_north", down)){
        map.rotateTo(0, { duration: 150 });
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return () => { running = false; };
}
```

---

## 13) Deliverable definition (what “done” looks like)

- A **Controller Mapping** screen reachable from the map.
- A saved session mapping that controls MapLibre immediately after closing mapping screen.
- Works on Vercel production URL and on at least one real mobile controller setup.
- Clean separation:
  - mapping UI concerns (capture + UX)
  - map controller concerns (apply + smooth motion)

---

## 14) Next iteration ideas (optional, not in this scope)
- “Remember on this device” toggle → switch to `localStorage`.
- Multiple profiles per device id + rename profiles.
- On-screen “calibration” step for deadzones / drift.
- Export/import as QR code for fast phone sharing.
