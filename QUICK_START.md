# Quick Start Guide

## Prerequisites Check

1. **MongoDB** - Make sure MongoDB is running:
   ```bash
   # Windows (if installed as service, it should auto-start)
   # Or start manually:
   mongod
   
   # Linux/Mac
   sudo systemctl start mongod
   # or
   mongod
   ```

2. **Node.js** - Check version:
   ```bash
   node --version  # Should be v14 or higher
   ```

3. **Python** - Check version:
   ```bash
   python --version  # Should be v3.8 or higher
   ```

## Installation Steps

### Step 1: Install Node.js Dependencies

```bash
cd "LM ARENA"
npm install
```

### Step 2: Configure Environment Variables

Create `.env` file in `LM ARENA` directory:

```env
MONGO_URI=mongodb://localhost:27017/safety-monitoring
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-this
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Note:** Twilio credentials are optional. If not provided, SMS notifications will be skipped.

### Step 3: Install Python Dependencies

```bash
cd main
pip install -r requirements.txt
```

### Step 4: Verify Model Files

Ensure these files exist:
- `main/yolov8n-pose.pt` - Pose detection model
- `main/runs/detect/balanced_ppe_gpu/weights/best.pt` - PPE detection model

If models are missing, the system will show warnings but may still run.

### Step 5: Create Admin User (First Time Setup)

```bash
cd "LM ARENA"
node scripts/createAdmin.js
```

Or manually create admin through signup page at `http://localhost:5000/signup`

## Running the System

### Option 1: Unified Runner (Recommended)

```bash
# From project root
python run_integrated_system.py
```

This starts both Node.js backend and Python detection automatically.

### Option 2: Manual Start

**Terminal 1 - Node.js Backend:**
```bash
cd "LM ARENA"
node server.js
```

**Terminal 2 - Python Detection:**
```bash
cd main
python integrated_detection.py
```

## Access the System

1. **Dashboard**: http://localhost:5000
2. **Login**: Use admin/manager/employee credentials
3. **Detection**: Runs automatically when Python script is started

## User Workflow

### Manager Workflow:
1. Manager receives **SMS notification** when violation is detected
2. Manager logs into dashboard at http://localhost:5000/manager-dashboard
3. Manager sees violations in "Recent Violations" table
4. For "Unknown" violations, manager clicks **"Assign"** button
5. Manager selects employee from dropdown and assigns violation
6. Manager can update violation status: pending → resolved
7. Employee can now see the violation in their dashboard

### Employee/Labour Workflow:
1. Employee logs into dashboard at http://localhost:5000/employee-dashboard
2. Employee sees their assigned violations
3. Employee can acknowledge violations
4. Employee views their safety score and violation history

### Admin Workflow:
1. Admin logs into dashboard at http://localhost:5000/admin-dashboard
2. Admin can view all violations, employees, and statistics
3. Admin oversees managers and labour
4. Admin can manage users and system settings

## Testing the Integration

1. **Start the system** using unified runner
2. **Open detection window** - You should see camera feed with detection overlay
3. **Trigger a violation** - Remove helmet/vest or bend over
4. **Check Node.js console** - Should see violation received message
5. **Check manager dashboard** - Violation should appear in table
6. **Check SMS** (if Twilio configured) - Manager should receive SMS

## Troubleshooting

### MongoDB Connection Error
```
Error: MongoDB connection error
```
**Solution:** Make sure MongoDB is running:
```bash
mongod
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:** Change PORT in `.env` file or kill process using port 5000

### Camera Not Found
```
Error: Could not open camera/video source 0
```
**Solution:** 
- Check camera is connected
- Try different camera index (1, 2, etc.)
- Or use video file path instead

### Models Not Found
```
Warning: PPE model not found
```
**Solution:** 
- Check model paths in `integrated_detection.py`
- Download missing models
- Update paths if models are in different location

### API Connection Failed
```
Error sending violation to API: Connection refused
```
**Solution:** 
- Make sure Node.js server is running
- Check API_URL in Python script matches server URL
- Verify server is accessible at http://localhost:5000

## Configuration

### Change Detection Interval

Edit `main/integrated_detection.py`:
```python
DETECTION_INTERVAL = float(os.getenv('DETECTION_INTERVAL', '1.0'))  # Seconds
```

Or set environment variable:
```bash
export DETECTION_INTERVAL=2.0
```

### Enable Risky Area Detection

Edit `main/integrated_detection.py`:
```python
RISKY_AREA = {
    'enabled': True,  # Change to True
    'x1': 100,
    'y1': 100,
    'x2': 500,
    'y2': 400
}
```

Press 'r' key during detection to toggle risky area detection.

### Change Camera Source

Edit `main/integrated_detection.py`:
```python
CAMERA_SOURCE = int(os.getenv('CAMERA_SOURCE', '0'))  # 0 for webcam
```

Or use video file:
```python
CAMERA_SOURCE = 'path/to/video.mp4'
```

## Next Steps

1. Create employee accounts through admin dashboard
2. Configure cameras and locations
3. Set up Twilio for SMS notifications
4. Customize violation detection thresholds
5. Set up risky areas for your facility

For detailed documentation, see `INTEGRATION_README.md`

