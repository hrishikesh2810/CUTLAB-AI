/**
 * Remotion Timeline Composition
 * 
 * Renders the timeline as a video composition using Remotion.
 * All timing is driven by the timeline.json data.
 * Supports transitions between clips and speed adjustments.
 */

import { AbsoluteFill, Sequence, Video, useVideoConfig, useCurrentFrame, interpolate } from 'remotion';
import { TimelineData, TimelineClip, TimelineTransition } from '../types';

interface TimelineCompositionProps {
    timeline: TimelineData;
    mediaMap: Map<string, string>; // sourceVideoId -> video URL
}

export const TimelineComposition: React.FC<TimelineCompositionProps> = ({
    timeline,
    mediaMap,
}) => {
    const { fps } = useVideoConfig();

    // Build a map of transitions by clip ID for quick lookup
    const transitionsByClip = buildTransitionMap(timeline.transitions);

    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {timeline.clips.map((clip) => {
                const videoUrl = mediaMap.get(clip.sourceVideoId);
                if (!videoUrl) return null;

                // Calculate frames for this clip
                const clipDuration = clip.outPoint - clip.inPoint;
                const startFrame = Math.round(clip.inPoint * fps);
                const durationInFrames = Math.round(clipDuration * fps);

                // Get transitions for this clip
                const transitionIn = transitionsByClip.get(`to_${clip.id}`);
                const transitionOut = transitionsByClip.get(`from_${clip.id}`);

                // Calculate transition durations in frames
                const transitionInFrames = transitionIn
                    ? Math.round(transitionIn.duration * fps)
                    : 0;
                const transitionOutFrames = transitionOut
                    ? Math.round(transitionOut.duration * fps)
                    : 0;

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
                            transitionIn={transitionIn}
                            transitionOut={transitionOut}
                            transitionInFrames={transitionInFrames}
                            transitionOutFrames={transitionOutFrames}
                            clipDurationFrames={durationInFrames}
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
    transitionIn?: TimelineTransition;
    transitionOut?: TimelineTransition;
    transitionInFrames: number;
    transitionOutFrames: number;
    clipDurationFrames: number;
}

const ClipRenderer: React.FC<ClipRendererProps> = ({
    clip,
    videoUrl,
    fps,
    transitionIn,
    transitionOut,
    transitionInFrames,
    transitionOutFrames,
    clipDurationFrames,
}) => {
    const frame = useCurrentFrame();

    // Calculate the start offset within the source video
    const startFrom = Math.round(clip.inPoint * fps);

    // Apply playback speed
    const playbackRate = clip.speed || 1;

    // Calculate opacity for transitions
    let opacity = 1;

    // Transition in (fade/dissolve in at start)
    if (transitionIn && transitionInFrames > 0) {
        const transitionType = transitionIn.type;
        if (transitionType === 'cross-dissolve' || transitionType === 'fade-in') {
            opacity *= interpolate(
                frame,
                [0, transitionInFrames],
                [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
        }
    }

    // Transition out (fade/dissolve out at end)
    if (transitionOut && transitionOutFrames > 0) {
        const transitionType = transitionOut.type;
        const outStart = clipDurationFrames - transitionOutFrames;
        if (transitionType === 'cross-dissolve' || transitionType === 'fade-out') {
            opacity *= interpolate(
                frame,
                [outStart, clipDurationFrames],
                [1, 0],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
        }
    }

    return (
        <AbsoluteFill style={{ opacity }}>
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

            {/* Speed indicator overlay */}
            {playbackRate !== 1 && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    padding: '4px 12px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 4,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                }}>
                    {playbackRate}x
                </div>
            )}
        </AbsoluteFill>
    );
};

/**
 * Build a lookup map for transitions
 * Keys: "from_{clipId}" and "to_{clipId}"
 */
function buildTransitionMap(transitions: TimelineTransition[]): Map<string, TimelineTransition> {
    const map = new Map<string, TimelineTransition>();

    for (const t of transitions) {
        map.set(`from_${t.fromClipId}`, t);
        map.set(`to_${t.toClipId}`, t);
    }

    return map;
}

export default TimelineComposition;
