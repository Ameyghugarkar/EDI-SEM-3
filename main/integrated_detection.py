"""
Integrated Safety Violation Detection System
Combines PPE detection, Posture detection, and Risky Area detection
Sends violations to Node.js API backend
"""

from ultralytics import YOLO
import cv2
import os
import requests
import numpy as np
from datetime import datetime
import math
import time

# Configuration
API_URL = os.getenv('API_URL', 'http://localhost:5000/api/violations/detect')
CAMERA_SOURCE = int(os.getenv('CAMERA_SOURCE', '0'))  # 0 for webcam, or path to video file
DETECTION_INTERVAL = float(os.getenv('DETECTION_INTERVAL', '1.0'))  # Seconds between detections
ALERT_COOLDOWN = float(os.getenv('ALERT_COOLDOWN', '60.0'))  # Minimum seconds between alerts for same violation type

# Load models
print("Loading detection models...")
# Try to find model path (works for both Windows and Linux)
model_paths = [
    r"runs\detect\balanced_ppe_gpu\weights\best.pt",  # Windows path
    "runs/detect/balanced_ppe_gpu/weights/best.pt",   # Linux path
    r"C:\Users\Utkarsh Ghom\Documents\VIT\EDI N\main\runs\detect\balanced_ppe_gpu\weights\best.pt"  # Absolute path
]

ppe_model_path = None
for path in model_paths:
    if os.path.exists(path):
        ppe_model_path = path
        break

if ppe_model_path is None:
    print("Warning: PPE model not found. Please check the path.")
    ppe_model = None
else:
    ppe_model = YOLO(ppe_model_path)

pose_model_path = "yolov8n-pose.pt"
if not os.path.exists(pose_model_path):
    print("Warning: Pose model not found. Please ensure yolov8n-pose.pt is in the current directory.")
    pose_model = None
else:
    pose_model = YOLO(pose_model_path)

if ppe_model and pose_model:
    print("Models loaded successfully!")
else:
    print("Error: Some models failed to load. Please check model paths.")

# Violation state tracking
violation_states = {
    'ppe': False,
    'posture': False,
    'risky_area': False
}

# Last alert time tracking (for cooldown)
last_alert_time = {
    'helmet': 0,
    'safety_jacket': 0,
    'gloves': 0,
    'boots': 0,
    'goggles': 0,
    'posture': 0,
    'risky_area': 0
}

# Risky area definition (can be configured)
RISKY_AREA = {
    'enabled': False,  # Set to True to enable risky area detection
    'x1': 100,  # Top-left x
    'y1': 100,  # Top-left y
    'x2': 500,  # Bottom-right x
    'y2': 400   # Bottom-right y
}

def calculate_angle(a, b, c):
    """Calculate angle between 3 points (for posture detection)"""
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])

    dot_product = ba[0]*bc[0] + ba[1]*bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)

    if mag_ba * mag_bc == 0:
        return 180

    angle = math.degrees(math.acos(dot_product / (mag_ba * mag_bc)))
    return angle

def detect_ppe_violation(frame, results):
    """Detect PPE violations (helmet, vest, etc.)"""
    boxes = results[0].boxes
    detected_classes = []
    
    for box in boxes:
        cls_id = int(box.cls[0])
        detected_classes.append(cls_id)

    # Class mapping (adjust based on your model)
    PERSON = 0
    BOOTS = 1
    GLOVES = 2
    GOGGLES = 3
    HELMET = 4
    VEST = 5

    violations = []
    
    if PERSON in detected_classes:
        if HELMET not in detected_classes:
            violations.append('helmet')
        if VEST not in detected_classes:
            violations.append('safety_jacket')
        # Add more PPE checks as needed
        # if GOGGLES not in detected_classes:
        #     violations.append('goggles')
        # if GLOVES not in detected_classes:
        #     violations.append('gloves')
        # if BOOTS not in detected_classes:
        #     violations.append('boots')

    return violations

def detect_posture_violation(keypoints):
    """Detect posture violations (bending, etc.)"""
    violations = []
    
    if keypoints is not None and len(keypoints) > 0:
        for person in keypoints:
            if len(person) >= 14:  # Ensure we have enough keypoints
                # Key joints (YOLOv8 pose format)
                head = person[0]
                hip = person[11] if len(person) > 11 else None
                knee = person[13] if len(person) > 13 else None

                if hip is not None and knee is not None:
                    angle = calculate_angle(head, hip, knee)
                    
                    # Wrong posture condition (bending too much)
                    if angle < 120:
                        violations.append('posture')
                        break  # One violation per person is enough

    return violations

def detect_risky_area_violation(boxes, frame_shape):
    """Detect if person enters risky/restricted area"""
    violations = []
    
    if not RISKY_AREA['enabled']:
        return violations

    h, w = frame_shape[:2]
    
    # Get risky area coordinates
    x1 = RISKY_AREA['x1']
    y1 = RISKY_AREA['y1']
    x2 = RISKY_AREA['x2']
    y2 = RISKY_AREA['y2']

    for box in boxes:
        cls_id = int(box.cls[0])
        if cls_id == 0:  # PERSON class
            # Get bounding box coordinates
            x_center = float(box.xyxy[0][0] + box.xyxy[0][2]) / 2
            y_center = float(box.xyxy[0][1] + box.xyxy[0][3]) / 2
            
            # Check if person center is in risky area
            if x1 <= x_center <= x2 and y1 <= y_center <= y2:
                violations.append('risky_area')
                break  # One violation is enough

    return violations

def send_violation_to_api(violation_type, frame, description="", location="", employee_id=None, camera_id="default"):
    """Send violation to Node.js API"""
    try:
        # Save image temporarily
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        temp_image_path = f"violations/temp_violation_{timestamp}.jpg"
        os.makedirs("violations", exist_ok=True)
        cv2.imwrite(temp_image_path, frame)

        # Prepare data
        data = {
            'violationType': violation_type,
            'description': description,
            'location': location,
            'employeeId': employee_id,
            'cameraId': camera_id,
            'detectionArea': location
        }

        # Prepare file
        files = {}
        if os.path.exists(temp_image_path):
            files['image'] = (os.path.basename(temp_image_path), open(temp_image_path, 'rb'), 'image/jpeg')

        # Send POST request
        response = requests.post(API_URL, data=data, files=files, timeout=5)
        
        # Close file
        if 'image' in files:
            files['image'][1].close()

        # Remove temp file after sending
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)

        if response.status_code == 201:
            print(f"✅ Violation '{violation_type}' sent to API successfully")
            return True
        else:
            print(f"⚠️ Failed to send violation: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error sending violation to API: {str(e)}")
        return False

def main():
    """Main detection loop"""
    print(f"Starting integrated detection system...")
    print(f"API URL: {API_URL}")
    print(f"Camera Source: {CAMERA_SOURCE}")
    print(f"Detection Interval: {DETECTION_INTERVAL}s")
    print(f"Alert Cooldown: {ALERT_COOLDOWN}s")
    
    # Open video source
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    
    if not cap.isOpened():
        print(f"Error: Could not open camera/video source {CAMERA_SOURCE}")
        return

    last_detection_time = 0
    
    print("\n🚀 Detection system running. Press 'q' to quit, 'r' to toggle risky area...\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame")
            break

        current_time = time.time()
        
        # Run detection at specified interval
        if current_time - last_detection_time >= DETECTION_INTERVAL:
            ppe_violations = []
            posture_violations = []
            risky_area_violations = []
            
            # Run PPE detection
            if ppe_model:
                ppe_results = ppe_model(frame, conf=0.4, verbose=False)
                ppe_violations = detect_ppe_violation(frame, ppe_results)
            else:
                ppe_results = None
            
            # Run posture detection
            if pose_model:
                pose_results = pose_model(frame, verbose=False)
                if pose_results[0].keypoints is not None:
                    posture_violations = detect_posture_violation(pose_results[0].keypoints.xy)
            else:
                pose_results = None
            
            # Run risky area detection (requires PPE results)
            if ppe_model and ppe_results:
                risky_area_violations = detect_risky_area_violation(ppe_results[0].boxes, frame.shape)
            
            # Run risky area detection
            risky_area_violations = detect_risky_area_violation(ppe_results[0].boxes, frame.shape)
            
            # Process PPE violations
            if ppe_violations:
                if not violation_states['ppe']:
                    violation_states['ppe'] = True
                    for violation_type in ppe_violations:
                        # Check cooldown period
                        if current_time - last_alert_time.get(violation_type, 0) >= ALERT_COOLDOWN:
                            annotated_frame = ppe_results[0].plot() if ppe_results else frame
                            print(f"\n🔔 TRIGGERING ALERT: {violation_type} violation detected!")
                            success = send_violation_to_api(
                                violation_type=violation_type,
                                frame=annotated_frame,
                                description=f"Missing {violation_type.replace('_', ' ')}",
                                location="Camera Area",
                                camera_id=str(CAMERA_SOURCE)
                            )
                            if success:
                                last_alert_time[violation_type] = current_time
                                print(f"✅ SMS Alert sent successfully for {violation_type}")
                            else:
                                print(f"❌ Failed to send SMS alert for {violation_type}")
                        else:
                            time_remaining = int(ALERT_COOLDOWN - (current_time - last_alert_time[violation_type]))
                            if time_remaining % 10 == 0: # Only print every 10s to avoid spam
                                print(f"⏳ Cooldown active for {violation_type}: {time_remaining}s remaining")
            else:
                violation_states['ppe'] = False  # Reset when no violations
            
            # Process posture violations
            if 'posture' in posture_violations:
                if not violation_states['posture']:
                    violation_states['posture'] = True
                    # Check cooldown period
                    if current_time - last_alert_time.get('posture', 0) >= ALERT_COOLDOWN:
                        annotated_frame = pose_results[0].plot()
                        send_violation_to_api(
                            violation_type='posture',
                            frame=annotated_frame,
                            description="Improper posture detected (bending)",
                            location="Camera Area",
                            camera_id=str(CAMERA_SOURCE)
                        )
                        last_alert_time['posture'] = current_time
                        print(f"⚠️  Alert sent for posture violation")
                    else:
                        time_remaining = int(ALERT_COOLDOWN - (current_time - last_alert_time['posture']))
                        print(f"🔇 Alert cooldown active for posture ({time_remaining}s remaining)")
            else:
                violation_states['posture'] = False
            
            # Process risky area violations
            if 'risky_area' in risky_area_violations:
                if not violation_states['risky_area']:
                    violation_states['risky_area'] = True
                    # Check cooldown period
                    if current_time - last_alert_time.get('risky_area', 0) >= ALERT_COOLDOWN:
                        annotated_frame = ppe_results[0].plot() if ppe_results else frame
                        # Draw risky area rectangle
                        cv2.rectangle(annotated_frame, 
                                    (RISKY_AREA['x1'], RISKY_AREA['y1']),
                                    (RISKY_AREA['x2'], RISKY_AREA['y2']),
                                    (0, 0, 255), 2)
                        send_violation_to_api(
                            violation_type='risky_area',
                            frame=annotated_frame,
                            description="Person detected in restricted/risky area",
                            location="Restricted Area",
                            camera_id=str(CAMERA_SOURCE)
                        )
                        last_alert_time['risky_area'] = current_time
                        print(f"⚠️  Alert sent for risky area violation")
                    else:
                        time_remaining = int(ALERT_COOLDOWN - (current_time - last_alert_time['risky_area']))
                        print(f"🔇 Alert cooldown active for risky area ({time_remaining}s remaining)")
            else:
                violation_states['risky_area'] = False

            last_detection_time = current_time

        # Draw annotations on frame
        if 'ppe_results' in locals() and ppe_results:
            annotated_frame = ppe_results[0].plot()
        elif 'pose_results' in locals() and pose_results:
            annotated_frame = pose_results[0].plot()
        else:
            annotated_frame = frame
        
        # Draw risky area if enabled
        if RISKY_AREA['enabled']:
            cv2.rectangle(annotated_frame,
                        (RISKY_AREA['x1'], RISKY_AREA['y1']),
                        (RISKY_AREA['x2'], RISKY_AREA['y2']),
                        (0, 255, 255), 2)
            cv2.putText(annotated_frame, "RISKY AREA", 
                       (RISKY_AREA['x1'], RISKY_AREA['y1'] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        # Add status text
        status_text = "SAFE"
        color = (0, 255, 0)
        if ppe_violations or posture_violations or risky_area_violations:
            status_text = "VIOLATION DETECTED!"
            color = (0, 0, 255)

        cv2.putText(annotated_frame, status_text, (50, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)

        # Display frame
        cv2.imshow("Integrated Safety Detection System", annotated_frame)

        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            RISKY_AREA['enabled'] = not RISKY_AREA['enabled']
            print(f"Risky area detection: {'ENABLED' if RISKY_AREA['enabled'] else 'DISABLED'}")

    cap.release()
    cv2.destroyAllWindows()
    print("\n👋 Detection system stopped.")

if __name__ == "__main__":
    main()

