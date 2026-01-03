from ultralytics import YOLO
import cv2
import math

# Load pretrained pose model
model = YOLO("yolov8n-pose.pt")

# Open webcam (use "video.mp4" for testing on a video)
cap = cv2.VideoCapture(0)

def calculate_angle(a, b, c):
    # Calculate angle between 3 points (for bending detection)
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])

    dot_product = ba[0]*bc[0] + ba[1]*bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)

    if mag_ba * mag_bc == 0:
        return 180

    angle = math.degrees(math.acos(dot_product / (mag_ba * mag_bc)))
    return angle

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)
    annotated = results[0].plot()

    if results[0].keypoints is not None:
        for person in results[0].keypoints.xy:

            # Key joints (YOLOv8 pose format)
            head = person[0]
            hip = person[11]
            knee = person[13]

            angle = calculate_angle(head, hip, knee)

            # ❌ Wrong posture condition
            if angle < 120:   # bending too much
                cv2.putText(
                    annotated, "WRONG POSTURE!",
                    (50, 80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.2,
                    (0, 0, 255),
                    3
                )

    cv2.imshow("Posture Detection System", annotated)

    if cv2.waitKey(1) & 0xFF == 27:  # ESC to exit
        break

cap.release()
cv2.destroyAllWindows()
