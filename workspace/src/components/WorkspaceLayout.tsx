import { useTimeline } from '../store';
import { MediaBin } from './MediaBin';
import { PreviewPlayer } from './PreviewPlayer';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { MediaItem } from '../types';
import '../styles/App.css';

// Demo media items
const DEMO_MEDIA: MediaItem[] = [
    {
        id: 'media_1',
        filename: 'interview_clip.mp4',
        path: '/videos/interview.mp4',
        duration: 45.5,
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
    },
    {
        id: 'media_2',
        filename: 'broll_footage.mp4',
        path: '/videos/broll.mp4',
        duration: 23.2,
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: false,
    },
    {
        id: 'media_3',
        filename: 'intro_sequence.mp4',
        path: '/videos/intro.mp4',
        duration: 8.0,
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
    },
];

export function WorkspaceLayout() {
    const { state, dispatch } = useTimeline();
    const { timeline, selectedClipId } = state;

    // Get selected clip
    const selectedClip = selectedClipId
        ? timeline.clips.find(c => c.id === selectedClipId)
        : null;

    // Handle media item drop on timeline
    const handleMediaDrop = (item: MediaItem) => {
        dispatch({
            type: 'ADD_CLIP',
            payload: {
                sourceVideoId: item.id,
                sourceFilename: item.filename,
                inPoint: 0,
                outPoint: item.duration,
                speed: 1.0,
                label: item.filename.replace(/\.[^/.]+$/, ''),
            },
        });
    };

    return (
        <div className="workspace">
            {/* Top Bar */}
            <header className="workspace-header">
                <div className="header-left">
                    <span className="logo">🎬 CUTLAB</span>
                    <span className="project-name">Workspace</span>
                </div>
                <div className="header-center">
                    <span className="project-id">Project: {timeline.projectId}</span>
                </div>
                <div className="header-right">
                    <button className="btn btn-secondary">
                        💾 Save
                    </button>
                </div>
            </header>

            {/* Main Editor Area */}
            <div className="workspace-main">
                {/* Left Panel - Media Bin */}
                <aside className="panel panel-left">
                    <MediaBin
                        items={DEMO_MEDIA}
                        onItemSelect={(item) => console.log('Selected:', item)}
                        onItemDrop={handleMediaDrop}
                    />
                </aside>

                {/* Center - Preview Player */}
                <main className="panel panel-center">
                    <PreviewPlayer />
                </main>

                {/* Right Panel - Inspector */}
                <aside className="panel panel-right">
                    <Inspector
                        selectedClip={selectedClip || null}
                        onUpdate={(updates) => {
                            if (selectedClipId) {
                                dispatch({
                                    type: 'UPDATE_CLIP',
                                    payload: { id: selectedClipId, updates },
                                });
                            }
                        }}
                    />
                </aside>
            </div>

            {/* Bottom - Timeline */}
            <footer className="panel panel-bottom">
                <Timeline />
            </footer>
        </div>
    );
}
