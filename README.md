# CUTLAB AI

Next-Gen Python-Only AI Video Editor.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

You need to run the Backend and Frontend in separate terminals.

### 1. Start Backend
```bash
python backend/main.py
```
*Server will start at http://localhost:8000*

### 2. Start Frontend
```bash
streamlit run frontend/app.py
```
*Dashboard will open in your browser*

## Project Structure
- `backend/`: FastAPI server
- `frontend/`: Streamlit UI
- `video_utils/`: Video processing logic
- `storage/`: Local database and video files
