"""
Unified System Runner
Starts both Node.js backend and Python detection system
"""

import subprocess
import time
import sys
import os
import signal
from pathlib import Path

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.absolute()
LM_ARENA_DIR = PROJECT_ROOT / "LM ARENA"
MAIN_DIR = PROJECT_ROOT / "main"

def check_dependencies():
    """Check if required dependencies are installed"""
    print("Checking dependencies...")
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        print(f"✅ Node.js: {result.stdout.strip()}")
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js first.")
        return False
    
    # Check Python
    try:
        result = subprocess.run([sys.executable, '--version'], capture_output=True, text=True)
        print(f"✅ Python: {result.stdout.strip()}")
    except Exception as e:
        print(f"❌ Python error: {e}")
        return False
    
    # Check if node_modules exists
    if not (LM_ARENA_DIR / "node_modules").exists():
        print("⚠️  Node modules not found. Run 'npm install' in LM ARENA directory first.")
        return False
    
    return True

def start_nodejs_server():
    """Start the Node.js backend server"""
    print("\n🚀 Starting Node.js backend server...")
    os.chdir(LM_ARENA_DIR)
    
    # Check for .env file
    env_file = LM_ARENA_DIR / ".env"
    if not env_file.exists():
        print("⚠️  Warning: .env file not found. Creating default .env file...")
        create_default_env_file(env_file)
    
    try:
        process = subprocess.Popen(
            ['node', 'server.js'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        return process
    except Exception as e:
        print(f"❌ Failed to start Node.js server: {e}")
        return None

def start_python_detection():
    """Start the Python detection system"""
    print("\n📷 Starting Python detection system...")
    os.chdir(MAIN_DIR)
    
    try:
        process = subprocess.Popen(
            [sys.executable, 'integrated_detection.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        return process
    except Exception as e:
        print(f"❌ Failed to start Python detection: {e}")
        return None

def create_default_env_file(env_path):
    """Create a default .env file if it doesn't exist"""
    default_env = """# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/safety-monitoring

# Server Configuration
PORT=5000
NODE_ENV=development

# Session Secret (change in production)
SESSION_SECRET=safety-secret-key-2024-change-in-production

# Twilio SMS Configuration (optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5000,http://127.0.0.1:5000
"""
    with open(env_path, 'w') as f:
        f.write(default_env)
    print(f"✅ Created default .env file at {env_path}")

def print_output(process, name):
    """Print output from a process"""
    try:
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"[{name}] {line.strip()}")
    except Exception:
        pass

def main():
    """Main function to run both systems"""
    print("=" * 60)
    print("Integrated Safety Monitoring System")
    print("=" * 60)
    
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install required dependencies.")
        sys.exit(1)
    
    # Start Node.js server
    nodejs_process = start_nodejs_server()
    if not nodejs_process:
        print("❌ Failed to start Node.js server")
        sys.exit(1)
    
    # Wait for Node.js server to start
    print("⏳ Waiting for Node.js server to start...")
    time.sleep(3)
    
    # Check if Node.js server is running
    if nodejs_process.poll() is not None:
        stdout, stderr = nodejs_process.communicate()
        print(f"❌ Node.js server exited unexpectedly:")
        print(f"STDOUT: {stdout}")
        print(f"STDERR: {stderr}")
        sys.exit(1)
    
    # Start Python detection
    python_process = start_python_detection()
    if not python_process:
        print("❌ Failed to start Python detection")
        nodejs_process.terminate()
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ Both systems are running!")
    print("=" * 60)
    print("\n📊 Dashboard: http://localhost:5000")
    print("📷 Detection: Running in background")
    print("\nPress Ctrl+C to stop both systems...\n")
    
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        print("\n\n🛑 Shutting down systems...")
        if nodejs_process:
            nodejs_process.terminate()
        if python_process:
            python_process.terminate()
        
        # Wait for processes to terminate
        if nodejs_process:
            nodejs_process.wait(timeout=5)
        if python_process:
            python_process.wait(timeout=5)
        
        print("👋 Systems stopped.")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Monitor processes
    try:
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            if nodejs_process.poll() is not None:
                stdout, stderr = nodejs_process.communicate()
                print(f"\n⚠️  Node.js server stopped unexpectedly:")
                if stdout:
                    print(f"STDOUT: {stdout}")
                if stderr:
                    print(f"STDERR: {stderr}")
                break
            
            if python_process.poll() is not None:
                stdout, stderr = python_process.communicate()
                print(f"\n⚠️  Python detection stopped unexpectedly:")
                if stdout:
                    print(f"STDOUT: {stdout}")
                if stderr:
                    print(f"STDERR: {stderr}")
                break
                
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()

