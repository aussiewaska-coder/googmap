# DEBUG: InvertX/InvertY Settings Not Saving

## What I Fixed

1. **Added schema migration** - Old profiles in sessionStorage didn't have `invertX` field
2. **Added debug logging** - Console will show exactly what's being saved/loaded
3. **Migration logic** - Automatically adds `invertX: 'none'` to old profiles

## Test This NOW - Follow Exactly:

### Step 1: Clear Everything First
```javascript
// Open browser DevTools (F12) → Console tab → Run this:
sessionStorage.clear()
location.reload()
```

### Step 2: Open Controller Dashboard
1. Click gamepad button (should apply tactical preset since storage is empty)
2. **Open DevTools Console (F12)** - KEEP IT OPEN
3. Look for: `[Storage] Loaded profile:` message

### Step 3: Change InvertX Setting
1. In dashboard, click **"Left"** under "Invert X-Axis"
2. Click **"Save & Close"**
3. **Check Console** - You should see:
   ```
   [Storage] Saving profile: { invertX: 'left', invertY: 'left', ... }
   [MapController] Updating profile: { invertX: 'left', invertY: 'left', ... }
   ```

### Step 4: Verify It Stuck
1. Refresh page (F5)
2. **Check Console** - Should see:
   ```
   [Storage] Loaded profile: { invertX: 'left', invertY: 'left', ... }
   ```
3. Open dashboard again
4. **"Left"** button should be highlighted in blue

### Step 5: Test It Works
1. Move left stick left/right
2. If invertX='left' is working, map should rotate OPPOSITE direction
3. **Check Console occasionally** - you'll see:
   ```
   [MapController] Current settings: { invertX: 'left', invertY: 'left' }
   ```

## What to Report Back

**If it WORKS:**
- "Settings save correctly now! Console shows correct values"

**If it STILL FAILS:**
Copy/paste the EXACT console output showing:
1. What you see after "Save & Close"
2. What you see after refresh
3. Whether the blue button is on the right option

## Most Likely Issues

### Issue A: Nothing in Console
- You're not looking at Console tab
- You cleared console (don't do that)
- Build didn't update (run `npm run dev` again)

### Issue B: Old Value Keeps Coming Back
- Old profile in sessionStorage has priority
- Run `sessionStorage.clear()` again
- Try "Reset" button instead (clears storage automatically)

### Issue C: Settings Change But Don't Apply to Map
- Console will show if MapController.updateProfile was called
- If not called = bug in ControllerModal.handleSaveClose
- If called but wrong values = bug in MapController.processGamepad

## Nuclear Option

If NOTHING works:
```javascript
// DevTools Console:
sessionStorage.clear()
localStorage.clear()
location.reload(true)
```

Then click "Apply Preset" button (don't load old profile).
