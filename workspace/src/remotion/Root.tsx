/**
 * Remotion Root Configuration
 * 
 * Defines the video compositions available for rendering.
 * Note: This file is used by Remotion CLI, not the Player component.
 */

import { Composition } from 'remotion';
import { TimelineComposition } from './TimelineComposition';
import { createEmptyTimeline } from '../types';

// Default props for Remotion Studio
const defaultProps = {
    timeline: createEmptyTimeline('default'),
    mediaMap: new Map<string, string>(),
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="Timeline"
                // @ts-expect-error - Remotion types are stricter than needed
                component={TimelineComposition}
                durationInFrames={30 * 60} // 60 seconds at 30fps
                fps={30}
                width={1920}
                height={1080}
                defaultProps={defaultProps}
            />
        </>
    );
};
