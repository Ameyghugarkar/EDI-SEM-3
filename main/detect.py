from ultralytics import YOLO

model = YOLO(r"C:\Users\Utkarsh Ghom\Documents\VIT\EDI N\main\runs\detect\balanced_ppe_gpu\weights\best.pt")

# For VIDEO FILE
model.predict(
    source=0,
    show=True,
    save=True,
    conf=0.4
)

# For WEBCAM (use this instead if you want live)
# model.predict(source=0, show=True, conf=0.4)
