# Integrated Safety Monitoring System

This document describes the integrated system that combines the **LM ARENA** (Node.js dashboard) and **main** (Python detection) systems.

## System Overview

The integrated system provides:
- **PPE Detection**: Detects missing safety equipment (helmet, vest, goggles, gloves, boots)
- **Posture Detection**: Detects improper posture (bending, unsafe positions)
- **Risky Area Detection**: Detects when personnel enter restricted/risky areas
- **SMS Notifications**: Sends SMS alerts to managers when violations are detected
- **Multi-role Dashboard**: Admin, Manager, and Employee/Labour dashboards

## Architecture

```
┌─────────────────────┐
│  Python Detection   │
│  (integrated_       │
│   detection.py)     │
│                     │
│  - PPE Detection    │
│  - Posture Detection│
│  - Risky Area       │
└──────────┬──────────┘
           │ HTTP POST
           │ /api/violations/detect
           ▼
┌─────────────────────┐
│  Node.js Backend     │
│  (LM ARENA)          │
│                     │
│  - MongoDB Storage   │
│  - SMS Notifications │
│  - API Endpoints     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Dashboard          │
│  - Admin            │
│  - Manager         │
│  - Employee/Labour │
└─────────────────────┘
```

## Setup Instructions

### Prerequisites

1. **Node.js** (v14 or higher)
2. **Python** (v3.8 or higher)
3. **MongoDB** (running locally or remote)
4. **Twilio Account** (optional, for SMS notifications)

### Installation

#### 1. Node.js Backend (LM ARENA)

```bash
cd "LM ARENA"
npm install
```

Create a `.env` file in the `LM ARENA` directory:

```env
MONGO_URI=mongodb://localhost:27017/safety-monitoring
PORT=5000
NODE_ENV=development
SESSION_SECRET=your-secret-key-here
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

#### 2. Python Detection System (main)

```bash
cd main
pip install -r requirements.txt
```

Create a `.env` file in the `main` directory (optional):

```env
API_URL=http://localhost:5000/api/violations/detect
CAMERA_SOURCE=0
DETECTION_INTERVAL=1.0
```

Ensure you have:
- `yolov8n-pose.pt` in the `main` directory
- `runs/detect/balanced_ppe_gpu/weights/best.pt` (your trained PPE model)

### Running the System

#### Option 1: Unified Runner (Recommended)

```bash
python run_integrated_system.py
```

This will start both the Node.js backend and Python detection system.

#### Option 2: Manual Start

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

## User Roles and Workflow

### 1. Admin
- **Supreme authority** - oversees managers and labour
- Can view all violations, employees, and statistics
- Can manage users and system settings

### 2. Manager
- Receives **SMS notifications** when violations are detected
- Views violations in dashboard
- **Updates violation status** (pending → acknowledged → resolved)
- Can view team statistics and employee profiles

### 3. Employee/Labour
- Views their own violations
- Can acknowledge violations
- Views their safety score and violation history

## Violation Types

The system detects three types of violations:

1. **PPE Violations**:
   - `helmet` - Missing hard hat
   - `safety_jacket` - Missing safety vest/jacket
   - `goggles` - Missing safety goggles
   - `gloves` - Missing safety gloves
   - `boots` - Missing safety boots

2. **Posture Violations**:
   - `posture` - Improper posture detected (bending, unsafe position)

3. **Risky Area Violations**:
   - `risky_area` - Person detected in restricted/risky area

## API Endpoints

### Detection Endpoint (Used by Python system)

**POST** `/api/violations/detect`

Receives violations from the Python detection system.

**Request:**
- `violationType` (string): Type of violation
- `description` (string): Description of violation
- `location` (string): Location/area where violation occurred
- `employeeId` (string, optional): Employee ID if known
- `cameraId` (string): Camera identifier
- `image` (file): Violation image

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Violation recorded and alerts sent"
}
```

### Manager Endpoints

**GET** `/api/manager/violations` - Get all violations
**PUT** `/api/manager/violations/:id` - Update violation status

### Employee Endpoints

**GET** `/api/employee/violations` - Get employee's violations
**PUT** `/api/employee/violations/:id/acknowledge` - Acknowledge violation

## Configuration

### Risky Area Detection

To enable risky area detection, edit `main/integrated_detection.py`:

```python
RISKY_AREA = {
    'enabled': True,  # Set to True to enable
    'x1': 100,  # Top-left x coordinate
    'y1': 100,  # Top-left y coordinate
    'x2': 500,  # Bottom-right x coordinate
    'y2': 400   # Bottom-right y coordinate
}
```

You can also toggle risky area detection during runtime by pressing 'r' key.

### SMS Notifications

SMS notifications are sent to all active managers when a violation is detected. Configure Twilio credentials in the `.env` file.

## Troubleshooting

### Node.js server won't start
- Check MongoDB is running: `mongod`
- Verify `.env` file exists and has correct values
- Check port 5000 is not in use

### Python detection won't start
- Verify model files exist (`yolov8n-pose.pt` and PPE model)
- Check camera is accessible (if using webcam)
- Verify API_URL is correct in `.env` or environment

### Violations not appearing in dashboard
- Check Node.js server logs for errors
- Verify Python detection is sending POST requests successfully
- Check MongoDB connection

### SMS not sending
- Verify Twilio credentials in `.env`
- Check manager phone numbers are in correct format (+1234567890)
- Check Twilio account has sufficient credits

## File Structure

```
Project/
├── LM ARENA/              # Node.js backend
│   ├── server.js         # Main server file
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── views/           # HTML dashboards
│   └── public/          # Static files
│
├── main/                 # Python detection
│   ├── integrated_detection.py  # Main detection script
│   ├── violation_detect.py      # Original PPE detection
│   ├── posture_detect.py         # Original posture detection
│   └── requirements.txt          # Python dependencies
│
└── run_integrated_system.py  # Unified runner script
```

## Development Notes

- The Python detection system sends violations to the Node.js API
- Violations are stored in MongoDB
- Images are saved to `LM ARENA/public/uploads/violations/`
- The system uses edge-triggered detection to avoid duplicate violations
- Each violation type has its own state tracking to prevent spam

## Future Enhancements

- Employee identification using face recognition
- Multiple camera support
- Real-time video streaming in dashboard
- Advanced analytics and reporting
- Mobile app integration

