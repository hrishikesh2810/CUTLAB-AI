import { useTimeline, useMedia } from '../store';
import { MediaBin } from './MediaBin';
import { RemotionPreview } from './RemotionPreview';
import { Inspector } from './Inspector';
import { Timeline } from './Timeline';
import { MediaItem } from '../types';
import '../styles/App.css';

export function WorkspaceLayout() {
    const { state: timelineState, dispatch: timelineDispatch } = useTimeline();
    const { state: mediaState } = useMedia();
    const { timeline, selectedClipId } = timelineState;

    // Get selected clip
    const selectedClip = selectedClipId
        ? timeline.clips.find(c => c.id === selectedClipId)
        : null;

    // Handle media item drop on timeline
    const handleMediaDrop = (item: MediaItem) => {
        timelineDispatch({
            type: 'ADD_CLIP',
            payload: {
                sourceVideoId: item.id,
                sourceFilename: item.filename,
                inPoint: 0,
                outPoint: item.duration > 0 ? item.duration : 10, // Default 10s if duration unknown
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
                    <span className="engine-badge">Remotion</span>
                </div>
                <div className="header-center">
                    <span className="project-id">
                        {mediaState.items.length} media • {timeline.clips.length} clips
                    </span>
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
                    <MediaBin onItemDrop={handleMediaDrop} />
                </aside>

                {/* Center - Remotion Preview */}
                <main className="panel panel-center">
                    <RemotionPreview />
                </main>

                {/* Right Panel - Inspector */}
                <aside className="panel panel-right">
                    <Inspector
                        selectedClip={selectedClip || null}
                        onUpdate={(updates) => {
                            if (selectedClipId) {
                                timelineDispatch({
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
