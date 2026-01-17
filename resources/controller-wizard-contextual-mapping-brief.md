# Controller Button Label Wizard + Contextual Command Mapping — Mega Brief (for the AI Dev)
*(MapLibre + Gamepad API + Vercel, with just enough gallows humor to keep everyone calm.)*

---

## 0) Executive summary

You already have:
- A controller mapping panel that can capture axes/buttons.
- A settings panel for joystick sensitivity/presets/flight modes.

You now need to add:
1) A **Button Label Wizard** so the user can identify what physical **A/B/X/Y, L2/R2, D‑pad** map to which `Gamepad.buttons[]` indices **on their device**.
2) A **Contextual mapping system** so the same buttons can mean different things depending on state:
   - **MAP** (free flight)
   - **MENU** (settings open; D-pad navigation)
   - **DRONE_GIMBAL** (DJI-ish motion)
   - **GLOBAL** (always active: geolocate, report, toggle settings)
3) Bind app actions (commands) to buttons:
   - **Geolocate / get my location**
   - **Trigger traffic/police report (Waze scan workflow)**
   - **Open/close settings with D‑pad**
   - Menu navigation with D‑pad, select/back with A/B (etc.)

Persistence: **session-only** (`sessionStorage`) for now.

If something goes wrong, remember: *the controller is not angry at you; it’s just disappointed in the browser’s opinionated indices.*

---

## 1) Definitions (so we stop arguing later)

### 1.1 Raw input
From Gamepad API:
- `gamepad.buttons[i].pressed` boolean
- `gamepad.buttons[i].value` analog 0..1 (often triggers)
- `gamepad.axes[i]` analog -1..1 (sticks)

### 1.2 Labels vs bindings
- **Label map**: “Button index 3 = Y” (human-readable designation)
- **Binding map**: “Action GLOBAL.GEOLOCATE = Button index 3”

We need both.

### 1.3 Commands (actions)
Commands are app-level intents. Controller input emits commands; app executes them.

Examples:
- `GLOBAL.GEOLOCATE`
- `GLOBAL.REPORT_TRAFFIC_POLICE`
- `GLOBAL.TOGGLE_SETTINGS`
- `MENU.UP`, `MENU.SELECT`, `MENU.BACK`
- `MAP.RECENTER`, `MAP.RESET_NORTH`, etc.

---

## 2) Storage model (session only)

Use one storage key:
- `controllerProfile.v2` (new version so we don’t break prior v1)

```ts
type FlightMode = "joyflight" | "fighter" | "ufo" | "satellite" | "drone_gimbal";

type ButtonLabel =
  | "A" | "B" | "X" | "Y"
  | "L1" | "R1" | "L2" | "R2"
  | "L3" | "R3"
  | "DPAD_UP" | "DPAD_DOWN" | "DPAD_LEFT" | "DPAD_RIGHT"
  | "START" | "SELECT";

type Binding =
  | { type: "button"; index: number }                          // digital
  | { type: "button"; index: number; analog: true }            // triggers as analog buttons
  | { type: "axis"; index: number; sign: 1 | -1 };             // sticks

type Context = "global" | "map" | "menu" | "drone_gimbal";

type ControllerProfile = {
  version: 2;
  device?: {
    id?: string;                 // gamepad.id
    mapping?: string;            // gamepad.mapping
  };

  // Identify Wizard output: label -> button index
  labels: Partial<Record<ButtonLabel, number>>;

  // Bindings: context -> commandKey -> binding(s)
  // (Allow arrays later if you want multi-bind; keep single for v1.)
  bindings: Record<Context, Record<string, Binding | undefined>>;

  settings: {
    enabled: boolean;

    // input shaping
    deadzone: number;            // 0..0.35
    sensitivity: number;         // 0.4..2.5
    smoothing: number;           // 0..0.30 UI range
    invertY: "none" | "left" | "right" | "both";

    // flight / mode
    flightMode: FlightMode;

    // continuous speeds
    panSpeedPxPerSec: number;
    rotateDegPerSec: number;
    pitchDegPerSec: number;
    zoomUnitsPerSec: number;

    // continuous camera micro-glide
    glideMs: number;             // 0..80
    glideEasing: "linear" | "easeOut" | "easeInOut";

    // discrete transitions (recenter etc.)
    flySpeed: number;
    flyCurve: number;
    flyEasing: "easeOut" | "easeInOut" | "easeInCubic" | "easeOutQuint";
  };

  // runtime state (optional; can keep outside storage)
  uiState?: {
    lastContext?: Context;
  };
};
```

### 2.1 Storage helpers
```js
const KEY = "controllerProfile.v2";

export function loadProfile() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); }
  catch { return null; }
}
export function saveProfile(p) {
  sessionStorage.setItem(KEY, JSON.stringify(p));
}
export function makeDefaultProfile() {
  return {
    version: 2,
    labels: {},
    bindings: { global:{}, map:{}, menu:{}, drone_gimbal:{} },
    settings: {
      enabled: true,
      deadzone: 0.12,
      sensitivity: 1.25,
      smoothing: 0.14,
      invertY: "none",
      flightMode: "joyflight",
      panSpeedPxPerSec: 650,
      rotateDegPerSec: 75,
      pitchDegPerSec: 45,
      zoomUnitsPerSec: 0.8,
      glideMs: 40,
      glideEasing: "easeInOut",
      flySpeed: 0.9,
      flyCurve: 1.2,
      flyEasing: "easeInOut"
    }
  };
}
```

---

## 3) Button Label Wizard (the new feature)

### 3.1 UX goals
- Make the user’s mental model match reality:
  - They press **“A”** on the controller → UI learns which index that is.
- After wizard:
  - mapping panel shows both: `Button 3 (Y)` not just `Button 3`.

### 3.2 Wizard entry points
Add in Mapping UI:
- **Button: “Identify Controller Buttons…”**
- Opens full-screen (mobile-friendly) wizard overlay.

### 3.3 Wizard flow (step-by-step)
Wizard steps (suggested order):
1. A
2. B
3. X
4. Y
5. L2
6. R2
7. D-pad Up
8. D-pad Down
9. D-pad Left
10. D-pad Right
11. Start
12. Select
13. (Optional) L3, R3, L1, R1

Each step:
- Shows big icon + text: “Press **A** now”
- Shows live detection: “Detected: Button 0” (but do not commit until edge press)
- On capture:
  - Store `labels["A"] = detectedIndex`
  - Advance to next step automatically
- Buttons:
  - Back
  - Skip (store nothing)
  - Re-try step (clears last capture for this label)
  - Finish

### 3.4 Capture logic (robust)
Use edge detection: “first button pressed after the step starts”.

```js
function findFirstPressedButton(prevButtons, currButtons) {
  for (let i=0; i<currButtons.length; i++) {
    const was = prevButtons?.[i]?.pressed || false;
    const now = !!currButtons[i]?.pressed;
    if (!was && now) return i;
  }
  return null;
}
```

Wizard loop:
- poll in `requestAnimationFrame`
- keep `prevSnapshot.buttons` for edge detection

### 3.5 Conflict handling
If user presses the same physical button for two labels (duplicate index):
- show warning:
  - “Button 0 already assigned to A — replace?”
- allow replace (updates previous label to undefined) or cancel

### 3.6 Save behavior
- Save into session profile (`labels`) immediately on each capture.
- Provide **Finish** that closes wizard and returns to mapping screen.

### 3.7 Rendering labels in dashboard
When showing a binding, display:
- `Button 3 (Y)` if `labels.Y === 3`
- Otherwise: `Button 3`

Helper:
```js
function labelForIndex(profile, idx) {
  const labels = profile.labels || {};
  const entry = Object.entries(labels).find(([,v]) => v === idx);
  return entry ? entry[0] : null;
}
```

---

## 4) Contextual mapping (GLOBAL / MAP / MENU / DRONE_GIMBAL)

### 4.1 Core idea
Controller input is routed through:
1. **Global bindings** (always active)
2. **Active context bindings**
3. Default: none

### 4.2 State machine
State:
- `activeContext: "map" | "menu" | "drone_gimbal"`

Transitions:
- `GLOBAL.TOGGLE_SETTINGS`:
  - if menu closed → open menu → context = `menu`
  - if menu open → close menu → context returns to last non-menu context (`map` or `drone_gimbal`)
- `MAP.CYCLE_FLIGHT_MODE`:
  - toggles between flight presets OR sets `drone_gimbal`

### 4.3 Commands: required list
#### Global commands
- `GLOBAL.GEOLOCATE`
- `GLOBAL.REPORT_TRAFFIC_POLICE`
- `GLOBAL.TOGGLE_SETTINGS`

#### Menu commands (when settings open)
- `MENU.UP`
- `MENU.DOWN`
- `MENU.LEFT`
- `MENU.RIGHT`
- `MENU.SELECT`
- `MENU.BACK`
- `MENU.CLOSE` (optional alias to toggle)

#### Map commands (flight)
- `MAP.RECENTER`
- `MAP.RESET_NORTH`
- (plus your analog axes already: pan/rotate/pitch/zoom)

#### Drone gimbal mode commands
- same as map, plus special mode behavior (section 7)

---

## 5) Binding UI changes (mapping screen)

### 5.1 Tabs for context
Add tabs:
- **Global**
- **Map**
- **Menu**
- **Drone**

Each tab shows bindable actions relevant to that context.

### 5.2 New bindable actions
Add to **Global** tab:
- Geolocate
- Report: Traffic/Police
- Toggle Settings

Add to **Menu** tab:
- Up/Down/Left/Right
- Select
- Back
- Close

### 5.3 D-pad open/close settings requirement
User asked:
- “Open settings panel with D-pad”
Implement by binding `GLOBAL.TOGGLE_SETTINGS` to one of:
- D-pad Down (recommended default)
- or D-pad Right

Wizard labels will identify D-pad indices, so the user can bind this confidently.

---

## 6) Command execution (app integration)

Commands should be implemented in a single module so we don’t scatter business logic everywhere.

### 6.1 Command dispatcher signature
```ts
type Command =
  | "GLOBAL.GEOLOCATE"
  | "GLOBAL.REPORT_TRAFFIC_POLICE"
  | "GLOBAL.TOGGLE_SETTINGS"
  | "MENU.UP" | "MENU.DOWN" | "MENU.LEFT" | "MENU.RIGHT"
  | "MENU.SELECT" | "MENU.BACK" | "MENU.CLOSE"
  | "MAP.RECENTER" | "MAP.RESET_NORTH"
  | "MAP.CYCLE_FLIGHT_MODE";

type CommandContext = {
  map: any;                          // MapLibre map instance
  ui: {
    openSettings: ()=>void;
    closeSettings: ()=>void;
    toggleSettings: ()=>void;
    menuNavigate: (dir:"up"|"down"|"left"|"right")=>void;
    menuSelect: ()=>void;
    menuBack: ()=>void;
    isSettingsOpen: ()=>boolean;
  };
  integrations: {
    reportTrafficPolice: ()=>void;   // hook into your Waze scan / report flow
  };
};
```

### 6.2 Implementations (examples)

#### Geolocate
```js
async function geolocateAndCenter(map) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.easeTo({ center: [longitude, latitude], duration: 650 });
        resolve();
      },
      reject,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
  });
}
```

#### Report Traffic/Police
This is app-specific. Make it a single function:
```js
function reportTrafficPolice(integrations) {
  integrations.reportTrafficPolice();
}
```

#### Toggle settings
```js
function toggleSettings(ui) {
  ui.toggleSettings();
}
```

#### Menu nav
```js
function menuNav(ui, dir) { ui.menuNavigate(dir); }
function menuSelect(ui) { ui.menuSelect(); }
function menuBack(ui) { ui.menuBack(); }
```

---

## 7) Drone gimbal mode (DJI-ish) behavior

### 7.1 Concept
- “Drone” has its own heading (travel direction).
- Camera can look around independently (bearing/pitch).
- Movement uses drone heading, not camera bearing.

### 7.2 State variables
```js
let droneHeading = 0;      // degrees
let cameraBearing = 0;     // degrees (map bearing)
let cameraPitch = 0;       // degrees
```

### 7.3 Control mapping suggestion
- Left stick:
  - Y: forward/back along **droneHeading**
  - X: strafe left/right relative to droneHeading
- Right stick:
  - X: cameraBearing delta
  - Y: cameraPitch delta

### 7.4 Applying movement on a map
MapLibre has `panBy` in screen pixels. For a true world-direction move you’d project direction to screen.
For v1 we can approximate:
- Convert droneHeading into screen direction by comparing to current camera bearing and panning accordingly.

Approximation:
- Let `relative = droneHeading - map.getBearing()`
- Map “forward” to screen vector `(sin, -cos)` using relative angle

```js
function forwardVectorPx(relativeDeg) {
  const a = relativeDeg * Math.PI/180;
  return { x: Math.sin(a), y: -Math.cos(a) }; // y negative is “up” on screen
}
```

Then:
```js
const rel = droneHeading - map.getBearing();
const v = forwardVectorPx(rel);
map.panBy([v.x * speed * dt, v.y * speed * dt], { duration: 0 });
```

Camera look:
```js
map.rotateTo(map.getBearing() + lookX * rotateSpeed * dt, { duration: 0 });
map.easeTo({ pitch: clamp(map.getPitch() + lookY * pitchSpeed * dt, 0, 60), duration: 0 });
```

---

## 8) Input router + edge detection

### 8.1 Why edge detection matters
- “Geolocate” should trigger once per press, not 60 times per second.
- Menu navigation should repeat at a controlled rate (repeat delay).

### 8.2 Press-once helper
```js
function makePressedOnce() {
  const prev = new Map();
  return (key, down) => {
    const was = prev.get(key) || false;
    prev.set(key, down);
    return !was && down;
  };
}
```

### 8.3 Optional: menu key repeat (nice UX)
Implement repeat with initial delay + repeat interval:
- initial: 250ms
- repeat: 90ms

```js
function makeRepeater() {
  const state = new Map(); // key -> {downSince,lastFire,wasDown}
  return (key, isDown, nowMs, fire) => {
    const s = state.get(key) || { downSince: 0, lastFire: 0, wasDown: false };
    if (!isDown) { state.set(key, { downSince: 0, lastFire: 0, wasDown: false }); return; }
    if (!s.wasDown) {
      fire(); state.set(key, { downSince: nowMs, lastFire: nowMs, wasDown: true }); return;
    }
    const held = nowMs - s.downSince;
    const since = nowMs - s.lastFire;
    if (held > 250 && since > 90) {
      fire(); state.set(key, { ...s, lastFire: nowMs });
    } else {
      state.set(key, s);
    }
  };
}
```

---

## 9) Controller loop (where it all plugs in)

### 9.1 High-level loop stages
Per animation frame:
1. Load profile (or keep cached + subscribe to changes)
2. If disabled: return
3. Get gamepad
4. Compute pressed edges
5. Emit commands from bindings:
   - Global commands first
   - Context commands second
6. Apply analog flight controls (only in MAP or DRONE_GIMBAL)
7. Render / continue

### 9.2 Pseudocode skeleton
```js
const pressedOnce = makePressedOnce();
const repeater = makeRepeater();

function tick(now) {
  const profile = loadProfile() ?? makeDefaultProfile();
  if (!profile.settings.enabled) return requestAnimationFrame(tick);

  const gp = getActiveGamepad(profile);
  if (!gp) return requestAnimationFrame(tick);

  const ctx = ui.isSettingsOpen()
    ? "menu"
    : (profile.settings.flightMode === "drone_gimbal" ? "drone_gimbal" : "map");

  // 1) Global commands
  fireBoundCommands(profile.bindings.global, gp, now, { ui, map, integrations }, pressedOnce);

  // 2) Context commands + analog behavior
  if (ctx === "menu") {
    fireMenuCommands(profile.bindings.menu, gp, now, { ui, map, integrations }, repeater);
  } else if (ctx === "map") {
    fireBoundCommands(profile.bindings.map, gp, now, { ui, map, integrations }, pressedOnce);
    applyMapFlightAnalogs(profile, gp, dt, map);
  } else if (ctx === "drone_gimbal") {
    fireBoundCommands(profile.bindings.drone_gimbal, gp, now, { ui, map, integrations }, pressedOnce);
    applyDroneGimbalAnalogs(profile, gp, dt, map);
  }

  requestAnimationFrame(tick);
}
```

---

## 10) Default controller mapping recommendations (sensible starting point)

Apply when:
- wizard labels exist OR
- controller is standard mapping and you choose to prefill anyway

**Defaults (overridable):**
- `GLOBAL.TOGGLE_SETTINGS` = `DPAD_DOWN`
- `GLOBAL.GEOLOCATE` = `Y`
- `GLOBAL.REPORT_TRAFFIC_POLICE` = `X`
- `MENU.UP/DOWN/LEFT/RIGHT` = D-pad directions
- `MENU.SELECT` = `A`
- `MENU.BACK` = `B`

```js
function bindByLabel(profile, context, cmd, label) {
  const idx = profile.labels?.[label];
  if (typeof idx === "number") profile.bindings[context][cmd] = { type:"button", index: idx };
}
```

---

## 11) UI additions in Settings Modal (existing modal)

Add section: **Controller**
- Toggle: Enable controller
- Button: **Open Mapping**
- Button: **Run Button Wizard**
- Dropdown: Flight Mode (Joyflight/Fighter/UFO/Satellite/Drone Gimbal)
- Sliders: deadzone, sensitivity, smoothing, glideMs
- Optional: “Advanced speeds” accordion

Menu navigation:
- When settings open, controller context becomes MENU automatically.

---

## 12) Vercel + mobile caveats
- Gamepad API may require a user gesture: show “Press any controller button to activate”.
- sessionStorage is per-tab; this is desired for session-only.

---

## 13) Testing checklist (the “please don’t ship a haunted controller” section)

### Wizard tests
- Each label captures exactly one index.
- Duplicate detection prompts replace/cancel.
- After wizard, UI shows `Button 3 (Y)` etc.

### Command tests
- Geolocate triggers once, recenters.
- Report triggers once, opens workflow.
- D-pad toggles settings open/closed.
- In MENU: D-pad navigates with repeat, A selects, B backs.

### Mode tests
- MAP free flight works as before.
- Drone gimbal feels distinct: camera look independent of travel direction.

---

## 14) Implementation order
1. Profile v2 schema + session storage migration
2. Wizard overlay + capture + label rendering
3. Context tabs + Global/Menu bindings UI
4. Command dispatcher + integrate geolocate/report/toggle settings
5. Input router + context switching + menu repeat
6. Drone gimbal mode (can be feature-flagged)

---

## 15) Deliverables
- Wizard + context tabs + new commands implemented and bindable
- Settings modal updated with controller controls + wizard launcher
- Controller loop routes commands by context and supports menu nav

---

## 16) Gallows jokes (mandatory)
- If the D-pad opens Settings but also starts a police report, congratulations: you’ve invented **panic mode**.
- “Button 0” is not a personality type, but after enough debugging it will feel like one.
- If it still jitters after smoothing, that’s not a bug—your map is just nervous about being driven by a gamepad.

---

### Final note
This is all doable. The only thing truly impossible is making every controller vendor agree on button indices.
But we have a wizard, and we have spite. That’s enough.
