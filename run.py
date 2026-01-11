import subprocess
import time
import sys
import os

def run_services():
    print("Starting CUTLAB AI Services...")

    # Start Backend
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    print("Backend started on port 8000")

    # Start Frontend
    frontend_process = subprocess.Popen(
        ["streamlit", "run", "frontend/app.py"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=sys.stdout,
        stderr=sys.stderr
    )
    print("Streamlit Frontend started")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Services stopped.")

if __name__ == "__main__":
    run_services()
