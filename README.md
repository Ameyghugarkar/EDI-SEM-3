# 🦺 Industrial Safety Violation Detection System
### AI-Powered Computer Vision for Real-Time Workplace Safety

> **📄 Published Patent** — *Industrial Safety Violation Detection Through AI Powered Computer Vision*
> Indian Patent Journal | Application No. **202621026397** | Filed: March 2026 | Published: May 2026
> Developed at **Vishwakarma Institute of Technology (VIT), Pune**

---

## 🔍 Overview

An intelligent, real-time workplace safety monitoring platform that uses **Deep Learning** and **Computer Vision** to automatically detect safety violations on industrial sites. The system processes live CCTV/webcam feeds, identifies violations, logs them to a multi-role dashboard, and instantly alerts managers via SMS.

Developed as part of the Engineering Design & Innovation (EDI) course at VIT Pune.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🪖 **PPE Compliance** | Detects missing helmet, safety vest, goggles, gloves, and boots |
| 🧍 **Posture Detection** | Identifies unsafe postures using YOLOv8 pose estimation |
| ⚠️ **Risky Area Monitoring** | Alerts when personnel enter restricted/danger zones |
| 📱 **SMS Alerts** | Instant Twilio SMS notifications sent to managers on violation |
| 📊 **Multi-Role Dashboard** | Separate views for Admin, Manager, and Employee |
| 🗄️ **Violation Logging** | All violations stored in MongoDB with timestamps and snapshots |
| 🔁 **Edge-Triggered Detection** | Smart state tracking prevents duplicate violation spam |

---

## 🏗️ Architecture

```
┌──────────────────────────┐
│   Python Detection Engine │
│  (YOLOv8 + OpenCV)       │
│                          │
│  ┌──────────────────┐    │
│  │  PPE Detection   │    │
│  │  Posture Check   │    │
│  │  Risky Area Zone │    │
│  └────────┬─────────┘    │
└───────────┼──────────────┘
            │ HTTP POST /api/violations/detect
            ▼
┌──────────────────────────┐
│   Node.js Backend         │
│   (Express + MongoDB)    │
│                          │
│  ┌──────────────────┐    │
│  │  MongoDB Storage  │    │
│  │  Twilio SMS      │    │
│  │  REST API        │    │
│  └────────┬─────────┘    │
└───────────┼──────────────┘
            ▼
┌──────────────────────────┐
│   Web Dashboard           │
│  👑 Admin                │
│  👷 Manager              │
│  🧑 Employee             │
└──────────────────────────┘
```

---

## 🛠️ Tech Stack

**AI / Computer Vision**
- Python 3.8+
- YOLOv8 (Ultralytics) — PPE detection & pose estimation
- OpenCV — video frame capture and processing

**Backend**
- Node.js + Express.js
- MongoDB (violation storage)
- Twilio API (SMS notifications)

**Frontend**
- HTML/CSS/JavaScript multi-role dashboards

**Tools**
- Git, VS Code, dotenv

---

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- Python 3.8+
- MongoDB (local or remote)
- Twilio account *(optional, for SMS)*

### 1. Clone the repo
```bash
git clone https://github.com/Ameyghugarkar/EDI-SEM-3.git
cd EDI-SEM-3
```

### 2. Setup Node.js Backend
```bash
cd "LM ARENA"
npm install
```
Copy `.env.example` to `.env` and fill in your values:
```env
MONGO_URI=mongodb://localhost:27017/safety-monitoring
PORT=5000
SESSION_SECRET=your-secret-key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

### 3. Setup Python Detection
```bash
cd main
pip install -r requirements.txt
```
Ensure the following model files are present:
- `yolov8n-pose.pt` — pose estimation model
- `runs/detect/balanced_ppe_gpu/weights/best.pt` — trained PPE model

### 4. Run the System
```bash
# From project root — starts both backend and detection together
python run_integrated_system.py
```
Then open **http://localhost:5000** in your browser.

---

## 👥 User Roles

### 👑 Admin
- Full system oversight — manages managers and employees
- Views all violations, system stats, and user accounts

### 👷 Manager
- Receives **real-time SMS alerts** on every violation
- Acknowledges and resolves violations via dashboard
- Views team safety scores and violation history

### 🧑 Employee / Labour
- Views personal violations and safety score
- Acknowledges assigned violations

---

## 🚨 Violation Types Detected

```
PPE Violations:
  ├── helmet         → Missing hard hat
  ├── safety_jacket  → Missing safety vest
  ├── goggles        → Missing eye protection
  ├── gloves         → Missing hand protection
  └── boots          → Missing safety footwear

Posture Violations:
  └── posture        → Unsafe bending or body position

Area Violations:
  └── risky_area     → Person detected in restricted zone
```

---

## 📁 File Structure

```
EDI-SEM-3/
├── LM ARENA/                    # Node.js backend
│   ├── server.js                # Express server entry point
│   ├── models/                  # MongoDB schemas
│   ├── routes/                  # API route handlers
│   ├── views/                   # Dashboard HTML pages
│   └── public/uploads/          # Saved violation images
│
├── main/                        # Python AI detection engine
│   ├── integrated_detection.py  # Main detection loop
│   ├── violation_detect.py      # PPE detection module
│   ├── posture_detect.py        # Posture detection module
│   └── requirements.txt         # Python dependencies
│
├── run_integrated_system.py     # Unified system launcher
├── .env.example                 # Environment variable template
└── README.md
```

---

## 📄 Patent

This project has been officially published in the **Indian Patent Journal**.

- **Title:** Industrial Safety Violation Detection Through AI Powered Computer Vision
- **Application No.:** 202621026397
- **Date of Filing:** 06/03/2026
- **Publication Date:** 01/05/2026
- **Institution:** Vishwakarma Institute of Technology, Pune, Maharashtra, India

---

## 👨‍💻 Team

- **Amey Ghugarkar**
- Utkarsh Ghom
- Mayank Ghore

**Mentor:** Prof. Shraddha Prakash Mankar

---

## 🔮 Future Enhancements

- Face recognition for automatic employee identification
- Multi-camera support with unified view
- Real-time video streaming in dashboard
- Mobile app integration
- Advanced heatmap analytics and reporting

---

## 📜 License

This project is developed for academic and research purposes at VIT Pune.
