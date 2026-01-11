from typing import Optional
from backend.timeline.schema import Track, Clip, AssetMetadata

MIN_CLIP_DURATION = 0.5  # Seconds

def validate_no_overlap(track: Track, target_clip_id: str, new_start: float, new_end: float) -> None:
    """
    Ensure the proposed time range [new_start, new_end] does not overlap
    with any other clip in the track.
    """
    # Precision tolerance to avoid float errors
    EPSILON = 0.001
    
    for clip in track.clips:
        if clip.clip_id == target_clip_id:
            continue
            
        # Check intersection: max(start1, start2) < min(end1, end2)
        intersection_start = max(clip.start_time, new_start)
        intersection_end = min(clip.end_time, new_end)
        
        if intersection_start < intersection_end - EPSILON:
            raise ValueError(
                f"Invalid Operation: Overlaps with existing clip '{clip.label}' "
                f"({clip.start_time:.2f}s - {clip.end_time:.2f}s)"
            )

def validate_min_duration(start: float, end: float) -> None:
    """Ensure the duration meets the minimum requirement."""
    duration = end - start
    if duration < MIN_CLIP_DURATION:
        raise ValueError(
            f"Clip duration {duration:.2f}s is too short. "
            f"Minimum allowed is {MIN_CLIP_DURATION}s."
        )

def validate_source_bounds(asset: Optional[AssetMetadata], in_point: float, out_point: float) -> None:
    """
    Ensure the Source In/Out points are within the actual media file duration.
    """
    if in_point < 0:
        raise ValueError(f"Source In-Point ({in_point:.2f}s) cannot be negative.")
        
    if out_point <= in_point:
        raise ValueError("Source Out-Point must be greater than In-Point.")

    if asset:
        if out_point > asset.duration:
            raise ValueError(
                f"Source Out-Point ({out_point:.2f}s) exceeds media duration "
                f"({asset.duration:.2f}s)."
            )

def validate_move_neighbors(track: Track, clip_id: str, new_start: float, duration: float) -> None:
    """
    Ensure moving the clip doesn't inherently violate simple neighbor logic 
    (redundant if overlap check is robust, but useful for 'magnetic' behaviors if implemented later).
    For now, this is a wrapper around overlap check but naming clarifies intent.
    """
    new_end = new_start + duration
    validate_no_overlap(track, clip_id, new_start, new_end)

def validate_split_point(clip: Clip, split_time: float) -> None:
    """
    Ensure the split point creates two valid clips (both >= min duration).
    """
    left_duration = split_time - clip.start_time
    right_duration = clip.end_time - split_time
    
    if left_duration < MIN_CLIP_DURATION:
        raise ValueError(
            f"Split point too close to start. Left clip would be {left_duration:.2f}s "
            f"(Min: {MIN_CLIP_DURATION}s)"
        )
        
    if right_duration < MIN_CLIP_DURATION:
        raise ValueError(
            f"Split point too close to end. Right clip would be {right_duration:.2f}s "
            f"(Min: {MIN_CLIP_DURATION}s)"
        )
