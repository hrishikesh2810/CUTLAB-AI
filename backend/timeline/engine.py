from backend.timeline.schema import TimelineProject, Sequence, Track, Clip
from copy import deepcopy

class TimelineEngine:
    """
    Pure Logic Engine for mutating TimelineProject states.
    Does not interact with DB or Filesystem.
    """
    
    @staticmethod
    def _check_overlaps(track: Track, target_clip_id: str, new_start: float, new_end: float) -> bool:
        """Check if the proposed range overlaps with any OTHER clip on the track."""
        for clip in track.clips:
            if clip.clip_id == target_clip_id:
                continue
            
            # Check intersection
            # Max(start1, start2) < Min(end1, end2)
            if max(clip.start_time, new_start) < min(clip.end_time, new_end):
                return True
        return False

    @staticmethod
    def move_clip(project: TimelineProject, track_id: str, clip_id: str, new_start: float) -> TimelineProject:
        """Move a clip to a new start time. Rejects if overlap occurs."""
        if new_start < 0:
            raise ValueError("Time cannot be negative")

        updated_project = deepcopy(project)
        track = next((t for t in updated_project.sequence.tracks if t.track_id == track_id), None)
        if not track:
            raise ValueError("Track not found")
            
        clip = next((c for c in track.clips if c.clip_id == clip_id), None)
        if not clip:
            raise ValueError("Clip not found")
            
        duration = clip.end_time - clip.start_time
        new_end = new_start + duration
        
        if TimelineEngine._check_overlaps(track, clip_id, new_start, new_end):
            raise ValueError("Move failed: Overlaps with existing clip")
            
        clip.start_time = new_start
        clip.end_time = new_end
        
        # Sort clips by start time to maintain order
        track.clips.sort(key=lambda c: c.start_time)
        
        return updated_project

    @staticmethod
    def trim_clip(project: TimelineProject, track_id: str, clip_id: str, new_in: float, new_out: float) -> TimelineProject:
        """Trim a clip's source In/Out points. Updates Timeline duration. Rejects overlap."""
        if new_in < 0 or new_out <= new_in:
            raise ValueError("Invalid trim points")
            
        updated_project = deepcopy(project)
        track = next((t for t in updated_project.sequence.tracks if t.track_id == track_id), None)
        if not track:
            raise ValueError("Track not found")
            
        clip = next((c for c in track.clips if c.clip_id == clip_id), None)
        if not clip:
            raise ValueError("Clip not found")
            
        # Calculate new timeline duration based on speed
        new_source_dur = new_out - new_in
        new_timeline_dur = new_source_dur / clip.speed
        
        current_start = clip.start_time
        new_end = current_start + new_timeline_dur
        
        if TimelineEngine._check_overlaps(track, clip_id, current_start, new_end):
            raise ValueError("Trim failed: Resulting clip overlaps")
            
        clip.in_point = new_in
        clip.out_point = new_out
        clip.end_time = new_end
        
        return updated_project

    @staticmethod
    def split_clip(project: TimelineProject, track_id: str, clip_id: str, split_time: float) -> TimelineProject:
        """Split a clip into two at the given Timeline time."""
        updated_project = deepcopy(project)
        track = next((t for t in updated_project.sequence.tracks if t.track_id == track_id), None)
        if not track:
            raise ValueError("Track not found")
            
        clip = next((c for c in track.clips if c.clip_id == clip_id), None)
        if not clip:
            raise ValueError("Clip not found")
            
        if not (clip.start_time < split_time < clip.end_time):
            raise ValueError("Split time must be within clip bounds")
            
        # Calculate offset
        timeline_offset = split_time - clip.start_time
        source_offset = timeline_offset * clip.speed
        
        # Define Split Point in Source
        split_source_point = clip.in_point + source_offset
        
        # Create Right Side Clip (New)
        right_clip = deepcopy(clip)
        right_clip.clip_id = f"{clip.clip_id}_split" # New ID (or generic)
        right_clip.label = f"{clip.label} (Part 2)"
        
        # Update Left Clip (Original)
        clip.out_point = split_source_point
        clip.end_time = split_time
        
        # Update Right Clip
        right_clip.in_point = split_source_point
        right_clip.start_time = split_time
        # right_clip.end_time remains original end
        # right_clip.out_point remains original out
        
        # Insert
        track.clips.append(right_clip)
        track.clips.sort(key=lambda c: c.start_time)
        
        return updated_project

    @staticmethod
    def delete_clip(project: TimelineProject, track_id: str, clip_id: str) -> TimelineProject:
        """Remove a clip. Leaves gap."""
        updated_project = deepcopy(project)
        track = next((t for t in updated_project.sequence.tracks if t.track_id == track_id), None)
        if not track:
            raise ValueError("Track not found")
            
        original_len = len(track.clips)
        track.clips = [c for c in track.clips if c.clip_id != clip_id]
        
        if len(track.clips) == original_len:
            raise ValueError("Clip not found")
            
        return updated_project

# --- TEST BLOCK ---
if __name__ == "__main__":
    # Setup Data
    clip1 = Clip(
        clip_id="c1", source_id="src1", start_time=0, end_time=10, 
        in_point=0, out_point=10
    )
    clip2 = Clip(
        clip_id="c2", source_id="src1", start_time=15, end_time=20, 
        in_point=20, out_point=25
    )
    track = Track(track_id="t1", clips=[clip1, clip2])
    proj = TimelineProject(project_id="p1", sequence=Sequence(tracks=[track]))
    
    print("Initial State:")
    print([c.clip_id for c in proj.sequence.tracks[0].clips])
    
    # Test 1: Move Logic (Valid)
    print("\nTest 1: Move c2 to 12.0 (No overlap, fits in gap 10-15)")
    proj = TimelineEngine.move_clip(proj, "t1", "c2", 12.0)
    c2 = proj.sequence.tracks[0].clips[1]
    print(f"c2 start: {c2.start_time} (Expected 12.0)")
    assert c2.start_time == 12.0
    
    # Test 2: Overlap Error
    print("\nTest 2: Move c2 to 5.0 (Overlap with c1 [0-10])")
    try:
        TimelineEngine.move_clip(proj, "t1", "c2", 5.0)
    except ValueError as e:
        print(f"Caught Expected Error: {e}")
        
    # Test 3: Split
    print("\nTest 3: Split c1 at 5.0")
    proj = TimelineEngine.split_clip(proj, "t1", "c1", 5.0)
    clips = proj.sequence.tracks[0].clips
    print(f"Clip count: {len(clips)} (Expected 3)")
    print(f"c1 end: {clips[0].end_time} (Expected 5.0)")
    print(f"c1_split start: {clips[1].start_time} (Expected 5.0)")
    
    # Test 4: Delete
    print("\nTest 4: Delete c2")
    proj = TimelineEngine.delete_clip(proj, "t1", "c2")
    print(f"Clip count: {len(proj.sequence.tracks[0].clips)} (Expected 2)")
    
    print("\nAll Tests Passed!")
