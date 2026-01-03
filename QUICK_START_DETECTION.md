# Quick Start Guide - Running Detection with SMS Alerts

## ✅ What Was Fixed

Your `violation_detect.py` script now:
1. ✅ Detects violations (helmet, vest) on screen
2. ✅ Saves to local SQLite database
3. ✅ **NEW: Sends to API for SMS alerts and web dashboard**
4. ✅ **NEW: Has 60-second cooldown to prevent spam**

## 🚀 How to Run

### Step 1: Start the Backend Server (Already Running)
The Node.js server is already running on port 5000 ✅

### Step 2: Run the Detection Script
```bash
cd "d:\OMKAR\VITP\SEM 3\EDI\Integrate\main"
python violation_detect.py
```

## 📱 What Happens When Violation is Detected

1. **On Screen**: Shows "NO HELMET!" or "NO VEST!" in red
2. **Local Save**: Saves image to `violations/` folder
3. **Database**: Logs to local `safety.db`
4. **API Call**: Sends to http://localhost:5000/api/violations/detect
5. **SMS Alert**: Managers receive enhanced SMS with:
   - Violation type
   - Camera ID
   - Timestamp
   - Severity
   - Dashboard link
6. **Web Dashboard**: Violation appears at http://localhost:5000

## 🔇 Alert Cooldown

- **First violation**: Alert sent immediately ✅
- **Same violation within 60s**: Cooldown active 🔇
- **After 60s**: New alert can be sent ✅

**Console Output:**
```
✅ Alert sent to API: NO HELMET!
🔇 Alert cooldown active for NO HELMET! (45s remaining)
🔇 Alert cooldown active for NO HELMET! (30s remaining)
✅ Alert sent to API: NO HELMET!  # After 60s
```

## 📊 Check Violations

### Web Dashboard
Visit: http://localhost:5000
- View all violations
- See images
- Check statistics

### Local Database
```bash
sqlite3 safety.db
SELECT * FROM violations;
```

## ⚙️ Configuration

Edit the script to change:
```python
ALERT_COOLDOWN = 60.0  # Change to 30, 120, etc.
API_URL = 'http://localhost:5000/api/violations/detect'
```

## 🎯 Testing Checklist

- [ ] Remove helmet from camera view
- [ ] Check console shows "✅ Alert sent to API"
- [ ] Verify SMS received by manager
- [ ] Check violation appears on dashboard
- [ ] Trigger same violation again within 60s
- [ ] Verify cooldown message appears
- [ ] Wait 60s and trigger again
- [ ] Verify new alert is sent
