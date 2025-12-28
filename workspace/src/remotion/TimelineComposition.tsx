/**
 * Remotion Timeline Composition
 * 
 * Renders the timeline as a video composition using Remotion.
 * All timing is driven by the timeline.json data.
 */

import { AbsoluteFill, Sequence, Video, useVideoConfig } from 'remotion';
import { TimelineData, TimelineClip } from '../types';

interface TimelineCompositionProps {
    timeline: TimelineData;
    mediaMap: Map<string, string>; // sourceVideoId -> video URL
}

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({
    timeline,
    mediaMap,
}) => {
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {timeline.clips.map((clip) => {
                const videoUrl = mediaMap.get(clip.sourceVideoId);
                if (!videoUrl) return null;

                // Calculate frames for this clip
                const clipDuration = clip.outPoint - clip.inPoint;
                const startFrame = Math.round(clip.inPoint * fps);
                const durationInFrames = Math.round(clipDuration * fps);

                return (
                    <Sequence
                        key={clip.id}
                        from={startFrame}
                        durationInFrames={durationInFrames}
                        name={clip.label}
                    >
                        <ClipRenderer
                            clip={clip}
                            videoUrl={videoUrl}
                            fps={fps}
                        />
                    </Sequence>
                );
            })}

            {/* Fallback when no clips */}
            {timeline.clips.length === 0 && (
                <AbsoluteFill style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: 24,
                }}>
                    No clips on timeline
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};

interface ClipRendererProps {
    clip: TimelineClip;
    videoUrl: string;
    fps: number;
}

const ClipRenderer: React.FC<ClipRendererProps> = ({
    clip,
    videoUrl,
    fps,
}) => {
    // Calculate the start offset within the source video
    const startFrom = Math.round(clip.inPoint * fps);

    // Apply playback speed
    const playbackRate = clip.speed || 1;

    return (
        <AbsoluteFill>
            <Video
                src={videoUrl}
                startFrom={startFrom}
                playbackRate={playbackRate}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
        </AbsoluteFill>
    );
};

export default TimelineComposition;
