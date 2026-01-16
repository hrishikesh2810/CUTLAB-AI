import whisper
import os
import subprocess
from typing import List, Dict

class CaptionGenerator:
    def __init__(self, model_name="base"):
        self.model = whisper.load_model(model_name)

    def extract_audio(self, video_path: str, audio_path: str):
        """Extract audio from video using ffmpeg."""
        command = [
            "ffmpeg",
            "-i", video_path,
            "-vn",  # No video
            "-acodec", "libmp3lame",
            "-y",   # Overwrite
            audio_path
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def generate_captions(self, video_path: str) -> List[Dict]:
        """Generate captions for a video file."""
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        # Temporary audio file path
        audio_path = video_path.rsplit('.', 1)[0] + ".mp3"

        try:
            # 1. Extract audio
            self.extract_audio(video_path, audio_path)

            # 2. Transcribe
            result = self.model.transcribe(audio_path)

            # 3. Format output
            captions = []
            for segment in result["segments"]:
                captions.append({
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip()
                })

            return captions

        finally:
            # Cleanup audio file
            if os.path.exists(audio_path):
                os.remove(audio_path)

# Singleton instance
caption_generator = CaptionGenerator()
