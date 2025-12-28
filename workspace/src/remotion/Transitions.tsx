/**
 * Remotion Transition Components
 * 
 * Provides transiton effects between clips using Remotion's animation APIs.
 */

import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { TransitionType } from '../types';

interface TransitionWrapperProps {
    children: React.ReactNode;
    transitionIn?: TransitionType;
    transitionOut?: TransitionType;
    transitionInDuration?: number;  // frames
    transitionOutDuration?: number; // frames
    clipDuration: number; // total clip duration in frames
}

/**
 * Wraps a clip with transition effects
 */
export function TransitionWrapper({
    children,
    transitionIn,
    transitionOut,
    transitionInDuration = 0,
    transitionOutDuration = 0,
    clipDuration,
}: TransitionWrapperProps) {
    const frame = useCurrentFrame();

    let opacity = 1;

    // Apply transition in effect
    if (transitionIn && transitionInDuration > 0) {
        if (transitionIn === 'cross-dissolve' || transitionIn === 'fade-in') {
            opacity *= interpolate(
                frame,
                [0, transitionInDuration],
                [0, 1],
                { extrapolateRight: 'clamp' }
            );
        }
    }

    // Apply transition out effect
    if (transitionOut && transitionOutDuration > 0) {
        const outStart = clipDuration - transitionOutDuration;
        if (transitionOut === 'cross-dissolve' || transitionOut === 'fade-out') {
            opacity *= interpolate(
                frame,
                [outStart, clipDuration],
                [1, 0],
                { extrapolateLeft: 'clamp' }
            );
        }
    }

    return (
        <AbsoluteFill style={{ opacity }}>
            {children}
        </AbsoluteFill>
    );
}

/**
 * Cross-dissolve overlay component
 * Placeholder for future advanced dissolve effects
 */
interface CrossDissolveProps {
    durationInFrames: number;
}

export function CrossDissolve(_props: CrossDissolveProps) {
    // Transition opacity is handled in ClipRenderer via interpolate
    // This component is a placeholder for future advanced effects
    return null;
}

/**
 * Fade to/from black effect
 */
interface FadeProps {
    type: 'in' | 'out';
    durationInFrames: number;
    color?: string;
}

export function Fade({ type, durationInFrames, color = '#000' }: FadeProps) {
    const frame = useCurrentFrame();

    const opacity = type === 'in'
        ? interpolate(frame, [0, durationInFrames], [1, 0], { extrapolateRight: 'clamp' })
        : interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateLeft: 'clamp' });

    return (
        <AbsoluteFill style={{ backgroundColor: color, opacity }} />
    );
}

/**
 * Calculate transition opacity for a clip based on its position and adjacent transitions
 */
export function calculateTransitionOpacity(
    frame: number,
    clipDuration: number,
    transitionInFrames: number,
    transitionOutFrames: number
): number {
    let opacity = 1;

    // Fade in at start
    if (transitionInFrames > 0 && frame < transitionInFrames) {
        opacity = interpolate(frame, [0, transitionInFrames], [0, 1]);
    }

    // Fade out at end
    const outStart = clipDuration - transitionOutFrames;
    if (transitionOutFrames > 0 && frame >= outStart) {
        opacity = interpolate(frame, [outStart, clipDuration], [1, 0]);
    }

    return Math.max(0, Math.min(1, opacity));
}

export default TransitionWrapper;
