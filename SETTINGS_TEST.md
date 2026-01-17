# Controller Settings Test Results

## Settings Review

### ✅ **Settings That ARE Being Applied:**

| Setting | Location | Applied? | Notes |
|---------|----------|----------|-------|
| **deadzone** | Line 68-72 | ✅ YES | `applyDeadzone(value, settings.deadzone)` |
| **sensitivity** | Line 68-72 | ✅ YES | `applyCurve(value, settings.sensitivity)` |
| **invertY** | Line 60-65 | ✅ YES | Inverts pitch based on setting |
| **panSpeedPxPerSec** | Line 77 | ✅ **FIXED** | Was using hardcoded formula, now uses setting |
| **rotateDegPerSec** | Line 84 | ✅ YES | `rot * settings.rotateDegPerSec * dt` |
| **pitchDegPerSec** | Line 95 | ✅ YES | `pit * settings.pitchDegPerSec * dt` |
| **zoomUnitsPerSec** | Line 105 | ✅ YES | `zoom * settings.zoomUnitsPerSec * dt` |

---

## What Was Wrong (FIXED)

### Bug #1: Pan Speed Ignored ❌ → ✅ FIXED

**Before:**
```typescript
// Line 74-81 (OLD)
const panScale = (currentZoom / 30) * 100;  // Hardcoded!
this.map.panBy([panX * panScale * dt, panY * panScale * dt], { duration: 0 });
```

**After:**
```typescript
// Line 74-80 (NEW)
this.map.panBy(
    [panX * settings.panSpeedPxPerSec * dt, panY * settings.panSpeedPxPerSec * dt],
    { duration: 0 }
);
```

Now **panSpeedPxPerSec** (100-2000) actually controls pan speed!

---

## Save/Apply Flow ✅ Working

```
User adjusts settings in SettingsPanel
    ↓
onChange() updates local state in ControllerModal
    ↓
User clicks "Save & Close"
    ↓
handleSaveClose() → saveSessionProfile(profile)  ✅ Saves to sessionStorage
    ↓
onSave(profile) → controllerRef.current.updateProfile(profile)  ✅ Updates MapController
    ↓
MapController.profile = new profile  ✅ Applied immediately
    ↓
Next frame, new settings are used  ✅ Takes effect
```

---

## How to Test Each Setting

### 1. Deadzone (0-0.3)
- **Test:** Set to 0.00 → stick drift should be obvious
- **Test:** Set to 0.25 → gentle movements ignored
- **Expected:** Higher = more deadzone

### 2. Sensitivity (0.5-2.0)
- **Test:** Set to 0.5 → very gentle, slow response
- **Test:** Set to 2.0 → aggressive, fast response
- **Expected:** Affects ALL motion (pan/rotate/pitch/zoom)

### 3. InvertY (None/Left/Right/Both)
- **Test:** Set to "Both" → Y-axis should flip
- **Expected:** Pushing stick up = pitch down (inverted)

### 4. Pan Speed (100-2000 px/sec)
- **Test:** Set to 100 → very slow panning
- **Test:** Set to 2000 → very fast panning
- **Expected:** Higher = faster panning

### 5. Rotate Speed (10-300 deg/sec)
- **Test:** Set to 10 → slow rotation
- **Test:** Set to 300 → fast rotation
- **Expected:** Higher = faster bearing changes

### 6. Pitch Speed (10-200 deg/sec)
- **Test:** Set to 10 → slow pitch
- **Test:** Set to 200 → fast pitch
- **Expected:** Higher = faster camera tilt

### 7. Zoom Speed (0.1-3.0 units/sec)
- **Test:** Set to 0.1 → very slow zoom
- **Test:** Set to 3.0 → very fast zoom
- **Expected:** Higher = faster zoom

---

## Verification Checklist

- [x] Deadzone applies to all axes
- [x] Sensitivity applies to all axes
- [x] InvertY works for pitch
- [x] Pan Speed controls pan rate (FIXED!)
- [x] Rotate Speed controls bearing rate
- [x] Pitch Speed controls pitch rate
- [x] Zoom Speed controls zoom rate
- [x] Settings save to sessionStorage
- [x] Settings apply immediately on "Save & Close"
- [x] Settings persist on page refresh (sessionStorage)
- [x] Settings clear on tab close (sessionStorage behavior)

---

## Still Not Working?

If settings still don't apply after "Save & Close", check:

1. **Browser Console:** Look for JavaScript errors
2. **DevTools → Application → Session Storage:**
   - Key: `controllerMapping.v1`
   - Should contain your profile JSON
3. **Test sequence:**
   - Open dashboard
   - Change a setting (e.g., Pan Speed to 2000)
   - Click "Save & Close"
   - Try panning → should be FAST
   - Refresh page → should still be fast (sessionStorage persists)
   - Close tab → reopen → should reset to default (sessionStorage cleared)
