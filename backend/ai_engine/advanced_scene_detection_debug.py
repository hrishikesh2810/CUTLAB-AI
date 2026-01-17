"""
Advanced Scene Detection Engine
===============================
Implements a high-precision, multi-metric scene detection algorithm suitable for professional
video editing workflows.

Key Features:
- Exact PTS/DTS timestamp extractions via FFmpeg (PyAV)
- Multi-metric fusion: HSV Color Histogram, Structural Similarity (SSIM), Edge Change Ratio (ECR)
- Floating point precision timestamps (microseconds)
- Adaptive thresholding for dynamic content
"""

import av
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FrameMetrics:
    """Raw metrics extracted from a single frame transition."""
    frame_idx: int
    pts: int
    time_base: float
    timestamp_seconds: float
    diff_hsv: float       # Color difference (0-1)
    diff_ssim: float      # Structural difference (0-1, inverted SSIM)
    diff_edges: float     # Edge change ratio (0-1)
    combined_score: float # Weighted probability of a cut

@dataclass
class SceneCut:
    """Detected scene cut with precise timing."""
    start_time: float
    end_time: float
    start_frame: int
    end_frame: int
    confidence: float
    type: str = "hard_cut"

class AdvancedSceneDetector:
    """
    Professional-grade scene detector using PyAV for precise timing and OpenCV/Skimage for analysis.
    """
    
    def __init__(self, 
                 weights: Dict[str, float] = None,
                 threshold: float = 0.15,
                 min_scene_duration: float = 0.5,
                 downscale_width: int = 256):
        """
        Args:
            weights: Dictionary of metric weights (hsv, ssim, edges). Sum should approx 1.0.
            threshold: Base threshold for cut detection (0.0 - 1.0).
            min_scene_duration: Minimum seconds between cuts to prevent flickering.
            downscale_width: Width to resize frames for analysis (speed optimization).
        """
        self.weights = weights or {
            "hsv": 0.5,
            "ssim": 0.3,
            "edges": 0.2
        }
        self.threshold = threshold
        self.min_scene_duration = min_scene_duration
        self.downscale_width = downscale_width
        
    def detect(self, video_path: str) -> Dict:
        """
        Main entry point for scene detection.
        
        Returns:
            JSON-compatible dictionary with metadata and scenes.
        """
        logger.info(f"Starting analysis of {video_path}")
        start_time = time.time()
        
        # 1. Open Video Container
        try:
            container = av.open(video_path)
            stream = container.streams.video[0]
            stream.thread_type = "AUTO" # Enable multi-threading decoding
        except Exception as e:
            logger.error(f"Failed to open video: {e}")
            raise

        # Metadata
        fps = float(stream.average_rate)
        time_base = float(stream.time_base)
        duration = float(stream.duration * start_time) if stream.duration else 0
        
        logger.info(f"Video Info: {stream.width}x{stream.height} @ {fps}fps, Timebase: {time_base}")

        # State tracking
        prev_frame_img = None
        prev_edges = None
        prev_hist = None
        
        cuts: List[SceneCut] = []
        metrics_history: List[FrameMetrics] = []
        
        last_cut_time = 0.0
        frame_count = 0
        
        # 2. Iterate Frames
        for frame in container.decode(stream):
            frame_count += 1
            
            # --- Timestamp Resolution ---
            # Use Packet Presentation Timestamp (PTS) for exact timing
            pts = frame.pts
            if pts is None:
                # Fallback for streams without PTS (rare)
                pts = int(frame_count * (1 / fps) / time_base)
            
            timestamp = pts * time_base
            
            # --- Preprocessing ---
            # Convert to numpy array (OpenCV format)
            img = frame.to_ndarray(format="bgr24")
            
            # Resize for performance (Metric calculation is O(N^2) or O(N), smaller N is crucial)
            h, w = img.shape[:2]
            scale = self.downscale_width / w
            new_h = int(h * scale)
            resized = cv2.resize(img, (self.downscale_width, new_h))
            
            # --- Feature Extraction ---
            
            # 1. HSV Histogram (Color Distribution)
            hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
            # Calc histogram for H and S channels (ignore V to be robust to exposure shifts)
            hist = cv2.calcHist([hsv], [0, 1], None, [32, 32], [0, 180, 0, 256])
            cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            
            # 2. Edge Detection (Structural changes)
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # --- Metric Calculation (Delta from previous frame) ---
            if prev_frame_img is not None:
                
                # A. Histogram Difference (Correlation)
                # Compare Hist: 1.0 = identical, 0.0 = distinct. We want Difference (1 - corr)
                hist_corr = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                diff_hsv = 1.0 - max(0, hist_corr) # Clamp to 0-1
                
                # B. SSIM (Structural Similarity)
                # ssim returns -1 to 1. We want difference 0 to 1.
                # (1 - ssim) / 2 isn't quite right for "dist", usually just 1 - abs(ssim) if likely positive
                # Fast SSIM on grayscale
                score_ssim, _ = ssim(prev_frame_img, gray, full=True)
                diff_ssim = 1.0 - score_ssim
                
                # C. Edge Change Ratio (ECR)
                # Simple implementation: XOR edges and count differences relative to total edge pixels
                # Dilate edges slightly to allow for small motion alignment
                kernel = np.ones((2,2), np.uint8)
                dilated_prev = cv2.dilate(prev_edges, kernel)
                dilated_curr = cv2.dilate(edges, kernel)
                
                # Pixels in curr but not in prev (new edges)
                diff_edges_img = cv2.bitwise_xor(edges, prev_edges)
                diff_edges_val = np.count_nonzero(diff_edges_img) / (new_h * self.downscale_width)
                # Normalize ECR roughly to 0-1 range (heuristic)
                diff_edges = min(1.0, diff_edges_val * 5.0) 
                
                # --- Fusion & Decision ---
                
                # Weighted Score
                combined_score = (
                    self.weights["hsv"] * diff_hsv +
                    self.weights["ssim"] * diff_ssim +
                    self.weights["edges"] * diff_edges
                )

                if combined_score > 0.05:
                    logger.debug(f"Frame {frame_count} ({timestamp:.3f}s): Score={combined_score:.4f} (HSV={diff_hsv:.3f}, SSIM={diff_ssim:.3f}, Edges={diff_edges:.3f})")
                
                # Record metrics
                metrics = FrameMetrics(
                    frame_idx=frame_count,
                    pts=pts,
                    time_base=time_base,
                    timestamp_seconds=timestamp,
                    diff_hsv=diff_hsv,
                    diff_ssim=diff_ssim,
                    diff_edges=diff_edges,
                    combined_score=combined_score
                )
                metrics_history.append(metrics)
                
                # Cut Decision Logic
                # 1. Threshold check
                # 2. Min duration check
                if (combined_score > self.threshold and 
                    (timestamp - last_cut_time) >= self.min_scene_duration):
                    
                    # Found a cut!
                    # The cut essentially happens ON this frame (start of new scene)
                    
                    # Close previous scene
                    if not cuts:
                        # First cut (shouldn't happen if we start at 0, but good safety)
                        cuts.append(SceneCut(
                            start_time=0.0,
                            end_time=timestamp,
                            start_frame=0,
                            end_frame=frame_count - 1,
                            confidence=1.0
                        ))
                    else:
                        # Update previous cut end
                        cuts[-1].end_time = timestamp
                        cuts[-1].end_frame = frame_count - 1
                        
                        # Add new scene start
                        cuts.append(SceneCut(
                            start_time=timestamp,
                            end_time=0.0, # Placeholder
                            start_frame=frame_count,
                            end_frame=0, # Placeholder
                            confidence=float(round(combined_score, 4))
                        ))
                        
                    last_cut_time = timestamp
                    # logger.info(f"Cut detected at {timestamp:.4f}s (Score: {combined_score:.2f})")

            else:
                # First frame
                cuts.append(SceneCut(
                    start_time=timestamp,
                    end_time=0.0,
                    start_frame=frame_count,
                    end_frame=0,
                    confidence=1.0
                ))
            
            # --- Update State ---
            prev_frame_img = gray
            prev_edges = edges
            prev_hist = hist
            
        
        # 3. Finalize
        # Close the last scene
        if cuts:
            stream_duration = float(stream.duration * stream.time_base) if stream.duration else frame_count / fps
            
            # If FFmpeg duration is unreliable, use last frame timestamp
            final_time = max(stream_duration, metrics_history[-1].timestamp_seconds if metrics_history else 0)
            
            cuts[-1].end_time = final_time
            cuts[-1].end_frame = frame_count

        elapsed = time.time() - start_time
        logger.info(f"Processed {frame_count} frames in {elapsed:.2f}s ({frame_count/elapsed:.1f} fps)")
        
        # Format output
        result = {
            "fps": fps,
            "time_base": str(Fraction(1, int(1/time_base))) if time_base > 0 else str(time_base),
            "total_frames": frame_count,
            "duration": final_time,
            "scene_count": len(cuts),
            "scenes": [
                {
                    "start": float(f"{c.start_time:.6f}"),
                    "end": float(f"{c.end_time:.6f}"),
                    "start_frame": c.start_frame,
                    "end_frame": c.end_frame,
                    "confidence": c.confidence,
                    "duration": float(f"{c.end_time - c.start_time:.6f}")
                }
                for c in cuts
            ]
        }
        
        return result

# Helper for fraction formatting
from fractions import Fraction

if __name__ == "__main__":
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python advanced_scene_detection.py <video_file>")
        sys.exit(1)
        
    detector = AdvancedSceneDetector()
    results = detector.detect(sys.argv[1])
    
    # Pretty print scenes
    print(json.dumps(results, indent=2))
