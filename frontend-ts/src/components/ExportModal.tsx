import { Download, FileText, FileCode, Video, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ExportModal.css';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    editorState: any;
    onStartExport: (type: ExportMode, resolution: string) => void;
}

type ExportMode = 'video' | 'report' | 'data';

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen,
    onClose,
    editorState,
    onStartExport
}) => {
    const [activeTab, setActiveTab] = useState<ExportMode>('video');
    const [resolution, setResolution] = useState('720p (HD)');

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = ''; // Restore scrolling
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleStartExport = () => {
        onStartExport(activeTab, resolution);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const projectInfo = {
        name: editorState?.video?.filename || 'Untitled Project',
        duration: editorState?.video?.duration ? `${Math.floor(editorState.video.duration / 60)}:${Math.floor(editorState.video.duration % 60).toString().padStart(2, '0')}` : '0:00'
    };

    const modalContent = (
        <div
            className="export-modal-overlay"
            onClick={handleBackdropClick}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="export-modal-container"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="export-modal-header">
                    <h2 className="export-modal-title">
                        <Download size={16} /> Export Project
                    </h2>
                    <button
                        onClick={onClose}
                        className="export-modal-close-btn"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="export-modal-content">
                    {/* Project Info Box */}
                    <div className="project-info-box">
                        <p className="project-info-text">Project: <span style={{ color: '#9ca3af' }}>{projectInfo.name}</span></p>
                        <p className="project-info-detail">Duration: {projectInfo.duration}</p>
                    </div>

                    {/* Tabs */}
                    <div className="export-tabs">
                        {(['video', 'report', 'data'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setActiveTab(mode)}
                                className={`export-tab-btn ${activeTab === mode ? 'active' : ''}`}
                            >
                                <div className="export-tab-icon">
                                    {mode === 'video' && <Video size={18} />}
                                    {mode === 'report' && <FileText size={18} />}
                                    {mode === 'data' && <FileCode size={18} />}
                                </div>
                                <span className="export-tab-label">
                                    {mode === 'video' ? 'VIDEO EXPORT' : mode === 'report' ? 'PROJECT REPORT' : 'PROJECT DATA'}
                                </span>
                                {activeTab === mode && (
                                    <div className="active-bar" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="tab-panel">
                        {activeTab === 'video' && (
                            <div className="export-video-panel">
                                <h3 className="panel-title">Export Edited Video</h3>

                                <div className="quality-section">
                                    <label className="quality-label">Video Quality</label>
                                    <div className="quality-options">
                                        {['480p (Small)', '720p (HD)', '1080p (Full HD)', 'Original Quality'].map((opt) => (
                                            <label key={opt} className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="quality"
                                                    className="radio-input"
                                                    checked={resolution === opt}
                                                    onChange={() => setResolution(opt)}
                                                />
                                                <div className="radio-custom">
                                                    {resolution === opt && <div className="radio-dot" />}
                                                </div>
                                                <span className="radio-text">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="info-alert">
                                    <div className="info-icon">i</div>
                                    <p className="info-text">
                                        The exported video will include all your edits: trim points, cuts, and applied filters. Processing time depends on video length and quality.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'report' && (
                            <div>
                                <h3 className="panel-title">Export Project Report</h3>
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>Generate a comprehensive PDF documentation of your project metadata and edit history.</p>
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div>
                                <h3 className="panel-title">Export Raw Data</h3>
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>Export the source-of-truth JSON file representing the entire current state of the project.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="export-modal-footer">
                    <button
                        onClick={onClose}
                        className="btn-close-text"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleStartExport}
                        className="btn-export-action"
                    >
                        <Download size={14} className="mb-0.5" />
                        EXPORT {activeTab.toUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
