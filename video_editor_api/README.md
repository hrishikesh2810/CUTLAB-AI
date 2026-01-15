# Video Editor API

A lightweight FastAPI backend for video editing with OpenCV-based scene detection.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8001
```

Server runs at: **http://localhost:8001**

## 📡 API Endpoints

### 1. Upload Video
```bash
POST /upload-video
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST -F "file=@video.mp4" http://localhost:8001/upload-video
```

**Response:**
```json
{
  "video_id": "abc12345",
  "filename": "video.mp4",
  "duration": 120.5,
  "fps": 30.0,
  "width": 1920,
  "height": 1080
}
```

### 2. Detect Scenes
```bash
GET /scene-detect/{video_id}?threshold=30&min_scene_length=0.5
```

**Parameters:**
- `threshold` (float): Sensitivity 0-255. Lower = more scenes. Default: 30
- `min_scene_length` (float): Min scene duration in seconds. Default: 0.5

**Response:**
```json
{
  "video_id": "abc12345",
  "scene_count": 5,
  "scenes": [
    {"start": 0.0, "end": 3.42},
    {"start": 3.42, "end": 7.91},
    {"start": 7.91, "end": 15.0}
  ]
}
```

### 3. Get Timeline
```bash
GET /timeline/{video_id}
```

**Response:**
```json
{
  "video_id": "abc12345",
  "clips": [
    {
      "clip_id": "a1b2c3d4",
      "start": 0.0,
      "end": 3.42,
      "duration": 3.42,
      "track": 1
    }
  ],
  "total_duration": 120.5
}
```

## 🏗️ Project Structure

```
video_editor_api/
├── main.py              # FastAPI application
├── video_processor.py   # Video metadata extraction
├── scene_detector.py    # Scene detection algorithm
├── timeline_builder.py  # Timeline clip builder
├── requirements.txt     # Dependencies
└── uploads/             # Video storage (auto-created)
```

## 🔬 Scene Detection Algorithm

The scene detector uses **frame differencing with threshold**:

1. **Read frames** sequentially from video
2. **Resize** to 320x180 for faster processing
3. **Convert** to grayscale
4. **Compute** absolute difference: `|frame[n] - frame[n-1]|`
5. **Calculate** mean difference value (0-255)
6. **Compare** to threshold - if exceeded, mark as scene boundary
7. **Filter** short scenes (< min_scene_length)

### Threshold Guidelines

| Threshold | Sensitivity | Use Case |
|-----------|-------------|----------|
| 15-20 | High | Detect subtle changes |
| 25-35 | Medium | General purpose (default) |
| 40-60 | Low | Only hard cuts |

## 🛠️ Technology

- **FastAPI** - Modern async web framework
- **OpenCV** - Video processing
- **NumPy** - Numerical operations
- **Uvicorn** - ASGI server

## 📝 License

MIT License
