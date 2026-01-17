# CUTLAB AI - Next-Gen AI Video Editor

CUTLAB AI is an advanced, AI-powered video editing platform designed to automate tedious editing tasks. It features intelligent scene detection, smart human analysis (face tracking & motion scoring), and automatic cut suggestions.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/backend-python-blue.svg)
![TypeScript](https://img.shields.io/badge/frontend-typescript-blue.svg)

## 📂 Project Structure

The project is organized into three main components:

- **`backend/`**: A FastAPI-based server that handles video processing, AI analysis, and project management.
  - **`ai_engine/`**: Core logic for scene detection and cut suggestions.
  - **`video_utils/`**: Utilities for metadata extraction and timeline management.
  - **`smart_human.py`**: MediaPipe-based computer vision for face and motion analysis.
- **`frontend-ts/`**: A modern React (Vite + TypeScript) application providing the video editing interface.
- **`storage/`**: The local data store for uploaded videos, generated databases (`metadata.db`), and export artifacts. **Note**: This folder interacts with the backend but stores user data.

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+**
- **Node.js 16+** & **npm**
- **FFmpeg** (Must be installed and available in your system PATH)

### 1. Backend Setup

1.  Navigate to the project root.
2.  Create and activate a virtual environment (optional but recommended):
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows: .venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the backend server:
    ```bash
    cd backend
    uvicorn main:app --reload --port 8000
    ```
    The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd frontend-ts
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will launch at `http://localhost:5173`.

## 🧠 Key Features

-   **Scene Detection**: Automatically segments raw video into logical clips.
-   **Smart Analysis**: Uses Computer Vision to detect faces and calculate motion intensity.
-   **Auto-Suggestions**: Recommends cuts based on content analysis (e.g., removing static scenes).
-   **Timeline Editor**: A drag-and-drop interface for refining edits.
-   **Export**: Renders the final video with applied cuts and effects using FFmpeg.

## 📄 Documentation

For a deep dive into the system design, AI models, and evaluation metrics, please refer to the **[CutLab_AI_Video_Editing_System.ipynb](CutLab_AI_Video_Editing_System.ipynb)** notebook in the root directory.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.
