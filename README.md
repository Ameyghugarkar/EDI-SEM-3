# Integrated Safety Monitoring System

This project is an Integrated Safety Monitoring System that combines computer vision for safety detection (Python) with a comprehensive web dashboard (Node.js).

## System Overview

The integrated system provides:
- **PPE Detection**: Detects missing safety equipment (helmet, vest, goggles, gloves, boots) using YOLOv8.
- **Posture Detection**: Detects improper posture (bending, unsafe positions).
- **Risky Area Detection**: Detects when personnel enter restricted/risky areas.
- **SMS Notifications**: Sends SMS alerts to managers when violations are detected via Twilio.
- **Multi-role Dashboard**: Admin, Manager, and Employee/Labour dashboards.

## Architecture

- **Python Detection (`main/`)**: Handles real-time video processing and sends violations to the backend.
- **Node.js Backend (`LM ARENA/`)**: Manages MongoDB storage, SMS notifications, and provides API endpoints.

## Quick Start

### 1. Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB (running locally or remote)

### 2. Setup

**Node.js Backend:**
```bash
cd "LM ARENA"
npm install
```
Create a `.env` file (copy from `.env.example`) and configure your `MONGO_URI` and `TWILIO` credentials (optional).

**Python Detection:**
```bash
cd main
pip install -r requirements.txt
```
Make sure your YOLO models (`yolov8n-pose.pt`, `best.pt`) are present.

### 3. Running the System

You can run both systems at once using the unified runner:
```bash
python run_integrated_system.py
```

Then access the dashboard at `http://localhost:5000`.

## Documentation

For more detailed information, please check the existing documentation files:
- [INTEGRATION_README.md](INTEGRATION_README.md) - Full system architecture, API details, and configuration.
- [QUICK_START.md](QUICK_START.md) - Detailed setup, step-by-step instructions, and troubleshooting guide.
