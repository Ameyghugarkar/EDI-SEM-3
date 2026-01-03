import subprocess
import time
import sys

def run_system():
    print("🚀 Starting Safety Violation Detection System...")
    
    # Start the Dashboard (Flask App)
    print("📊 Starting Dashboard (app.py)...")
    dashboard = subprocess.Popen([sys.executable, "app.py"])
    
    # Wait a moment for the server to start
    time.sleep(2)
    
    # Start the Detection System
    print("📷 Starting Detection (violation_detect.py)...")
    detection = subprocess.Popen([sys.executable, "violation_detect.py"])
    
    print("\n✅ System Running!")
    print("   - Dashboard: http://127.0.0.1:5000")
    print("   - Press Ctrl+C to stop both processes.\n")

    try:
        # Keep the main script running to monitor child processes
        while True:
            time.sleep(1)
            if dashboard.poll() is not None:
                print("⚠️ Dashboard process ended unexpectedly.")
                break
            if detection.poll() is not None:
                print("⚠️ Detection process ended unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\n🛑 Stopping system...")
    finally:
        # Terminate both processes
        detection.terminate()
        dashboard.terminate()
        print("👋 System stopped.")

if __name__ == "__main__":
    run_system()
