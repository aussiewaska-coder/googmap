# InvertY Fix - IMPORTANT

## The Bug
The tactical preset had pitch Y axis with `sign: -1` (already inverted), but the invertY setting ALSO inverted, causing **double-inversion** and backwards behavior:

- `invertY: 'none'` = Used binding sign (-1) = **INVERTED** ❌
- `invertY: 'left'` = Double inverted (-1 × -1 = 1) = **NORMAL** ❌

This was backwards from what users expect!

## The Fix
1. **Changed tactical preset** pitch binding to `sign: 1` (neutral/normal)
2. **Changed tactical preset default** invertY to `'left'` (inverted by default, like flight controls)
3. Now the invertY setting works correctly:
   - `invertY: 'none'` = **NORMAL** (push up = look up) ✅
   - `invertY: 'left'` = **INVERTED** (push up = look down) ✅
   - `invertY: 'right'` = Invert right stick only ✅
   - `invertY: 'both'` = Invert both sticks ✅

## IMPORTANT: Clear Your Session Storage!

**You MUST clear your browser's sessionStorage** to remove old saved profiles with the wrong sign values:

### Quick Clear Method:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Run: `sessionStorage.clear()`
4. Refresh the page

### Or Manual Clear:
1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **Session Storage**
4. Find your domain
5. Delete the `controllerMapping.v1` key
6. Refresh the page

## Testing After Clear

1. **Connect gamepad**
2. **Open controller dashboard**
3. **Test pitch control** (left stick up/down):
   - Default (`invertY: 'left'`) should be **INVERTED** (flight controls)
   - Change to `invertY: 'none'` → should be **NORMAL** (FPS controls)
4. **Save & Close** to test persistence
5. **Refresh page** → settings should persist correctly

## If Still Broken

If invertY still doesn't work after clearing sessionStorage:
1. Click **"Apply Preset"** button in dashboard
2. This will apply the new tactical preset with correct values
3. Save & Close
4. Test again
