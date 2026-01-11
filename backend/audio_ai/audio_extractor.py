import subprocess
import os
import shutil

def get_ffmpeg_binary() -> str:
    """Attempts to locate the FFmpeg binary."""
    # 1. Check system PATH
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    
    # 2. Check imageio_ffmpeg (often installed with moviepy)
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
        
    return "ffmpeg"  # Fallback to hoping it's in path anyway

def extract_audio(video_path: str, output_path: str) -> None:
    """
    Extracts audio from a video file to a mono WAV file at 22,050 Hz using FFmpeg.

    Args:
        video_path (str): Absolute path to the source video file.
        output_path (str): Absolute path where the WAV file will be saved.

    Raises:
        FileNotFoundError: If the video file does not exist.
        RuntimeError: If FFmpeg fails to process the file.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    ffmpeg_bin = get_ffmpeg_binary()

    # FFmpeg command: -i input -ac 1 (mono) -ar 22050 (sample rate) -vn (no video) -y (overwrite)
    command = [
        ffmpeg_bin,
        "-i", video_path,
        "-ac", "1",
        "-ar", "22050",
        "-vn",
        "-y",
        output_path
    ]

    try:
        # Run ffmpeg silenty (stdout/stderr to DEVNULL)
        subprocess.run(
            command,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"FFmpeg extraction failed for {video_path}") from e
    except FileNotFoundError:
        raise RuntimeError(f"FFmpeg binary not found ({ffmpeg_bin})")
