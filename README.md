# CUTLAB AI - Next-Gen Video Editor

🎬 **AI-powered video editing assistant** with audio-aware smart cut suggestions, scene detection, and a professional timeline editor.
(Project developed as part of an academic initiative associated with IIT Ropar)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+ with pip
- Node.js 20+ with npm
- FFmpeg (for video processing)

### 1. Start the Backend (FastAPI)

```bash
# From project root
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload
```

Backend runs at: **http://127.0.0.1:8000**

### 2. Start the Frontend (React)

```bash
# From project root
cd frontend-ts
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🏗️ Project Structure

```
CUTLAB AI 2/
├── ai_engine/          # AI analysis (scene detection, cut suggestions)
├── backend/            # FastAPI REST API
├── frontend-ts/        # React + TypeScript frontend (NEW!)
├── frontend/           # Legacy Streamlit app
├── video_utils/        # Video processing utilities
├── storage/            # Videos, timelines, database
└── docs/               # Documentation
```

## ✨ Features

### 📤 Upload
- Drag & drop video upload
- Automatic metadata extraction
- Video preview

### 🔎 Analysis
- AI-powered scene detection
- Scene timeline visualization
- Duration bar charts

### ✂️ Smart Suggestions
- Audio-aware cut suggestions
- Motion, silence, face detection
- Accept/reject workflow

### 📦 Export
- JSON timeline export
- XML (FCP) export
- Non-destructive editing

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI, SQLAlchemy, SQLite |
| AI Engine | OpenCV, Librosa, PySceneDetect |
| Frontend | React 19, TypeScript, Vite |
| Styling | CSS (custom dark theme) |
| Icons | Lucide React |

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects` | GET | List all projects |
| `/upload-video` | POST | Upload video file |
| `/analyze-scenes/{id}` | POST | Detect scenes |
| `/suggest-cuts/{id}` | POST | Generate suggestions |
| `/workspace/{id}/timeline` | GET/POST | Timeline operations |
| `/export-timeline/{id}` | GET | Export timeline |

---

## 🎨 Frontend Screenshots

The React frontend features:
- 🌙 Premium dark theme with gradients
- 📊 Interactive charts and visualizations
- 🎬 Visual timeline with zoom
- ⚡ Real-time API integration

---

## 📝 License

MIT License - see LICENSE file for details.
