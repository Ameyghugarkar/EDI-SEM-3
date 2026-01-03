from ultralytics import YOLO
import cv2
import os
from datetime import datetime
import sqlite3
import requests
import time

# API Configuration
# API Configuration
# API_URL = os.getenv('API_URL', 'http://localhost:5000/api/violations/detect')
API_URL = 'http://localhost:5000/api/violations/detect'
print(f"🔗 API URL set to: {API_URL}")
# Default to Machine Zone Camera from Blueprint
CAMERA_ID = os.getenv('CAMERA_ID', 'CAM-MZ-01') 
ALERT_COOLDOWN = 300.0  # 5 minutes between alerts for same violation type
last_alert_time = {}

# Initialize Database
def init_db():
    conn = sqlite3.connect('safety.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS violations
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  violation_type TEXT,
                  image_path TEXT)''')
    conn.commit()
    conn.close()

init_db()

def send_violation_to_api(violation_type, image_path):
    """Send violation to Node.js API with cooldown check"""
    current_time = time.time()
    
    # Check cooldown
    if violation_type in last_alert_time:
        time_since_last = current_time - last_alert_time[violation_type]
        if time_since_last < ALERT_COOLDOWN:
            time_remaining = int(ALERT_COOLDOWN - time_since_last)
            print(f"🔇 Alert cooldown active for {violation_type} ({time_remaining}s remaining)")
            return False
    
    try:
        # Prepare data
        data = {
            'violationType': 'helmet' if 'HELMET' in violation_type else 'safety_jacket',
            'description': violation_type,
            'location': 'Machine Zone',
            'cameraId': CAMERA_ID,
            'detectionArea': 'Main Assembly Line'
        }
        
        # Prepare file
        files = {}
        if os.path.exists(image_path):
            files['image'] = (os.path.basename(image_path), open(image_path, 'rb'), 'image/jpeg')
        
        # Send POST request
        response = requests.post(API_URL, data=data, files=files, timeout=5)
        
        # Close file
        if 'image' in files:
            files['image'][1].close()
        
        if response.status_code == 201:
            last_alert_time[violation_type] = current_time
            print(f"✅ Alert sent to API: {violation_type}")
            return True
        else:
            print(f"⚠️ API returned status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending to API: {str(e)}")
        return False

# Load trained model
model_path = r"main\runs\detect\balanced_ppe_gpu\weights\best.pt"
if not os.path.exists(model_path):
    print(f"❌ Model not found at {model_path}")
    print("Please ensure the model file exists in the correct location.")
    exit(1)

model = YOLO(model_path)
print(f"✅ Model loaded from: {model_path}")

# Folder for screenshots
os.makedirs("violations", exist_ok=True)

# Webcam or video
cap = cv2.VideoCapture(0)

# ✅ STATE FLAG (IMPORTANT)
violation_active = False   # Tracks if a violation is currently ongoing

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, conf=0.4)
    boxes = results[0].boxes

    detected_classes = []
    for box in boxes:
        cls_id = int(box.cls[0])
        detected_classes.append(cls_id)

    # Class mapping
    PERSON = 0
    BOOTS = 1
    GLOVES = 2
    GOGGLES = 3
    HELMET = 4
    VEST = 5

    violation = False
    text = "SAFE"

    if PERSON in detected_classes and HELMET not in detected_classes:
        violation = True
        text = "NO HELMET!"

    elif PERSON in detected_classes and VEST not in detected_classes:
        violation = True
        text = "NO VEST!"

    annotated = results[0].plot()

    # ✅ SINGLE-SHOT LOGIC (EDGE TRIGGER)
    if violation and not violation_active:
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"violations/violation_{timestamp}.jpg"
        cv2.imwrite(filename, annotated)
        print(f"✅ New Violation Captured: {filename}")

        # Log to Database
        conn = sqlite3.connect('safety.db')
        c = conn.cursor()
        c.execute("INSERT INTO violations (timestamp, violation_type, image_path) VALUES (?, ?, ?)",
                  (timestamp, text, filename))
        conn.commit()
        conn.close()
        
        # Send to API (triggers SMS alerts and web dashboard)
        send_violation_to_api(text, filename)

        violation_active = True   # Mark violation as active

    # ✅ Reset when SAFE again
    if not violation:
        violation_active = False

    color = (0, 255, 0) if text == "SAFE" else (0, 0, 255)

    cv2.putText(
        annotated, text, (50, 50),
        cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3
    )

    cv2.imshow("PPE Safety Violation Monitor", annotated)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
