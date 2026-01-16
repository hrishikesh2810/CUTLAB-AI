import React, { useEffect } from 'react';
import { Download, Minimize2, Check, AlertCircle, X } from 'lucide-react';
import './ExportProgress.css';

type ExportStatus = 'idle' | 'processing' | 'completed' | 'failed';

interface ExportProgressProps {
    status: ExportStatus;
    progress: number;
    downloadUrl: string | null;
    error: string | null;
    type: 'video' | 'report' | 'data';
    onClose: () => void;
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
    status,
    progress,
    downloadUrl,
    error,
    type,
    onClose
}) => {
    // Auto-close success toast after 10 seconds, but allow manual close
    useEffect(() => {
        if (status === 'completed') {
            const timer = setTimeout(() => {
                onClose();
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [status, onClose]);

    if (status === 'idle') return null;

    return (
        <div className="export-progress-container">
            {/* Header */}
            <div className="export-progress-header">
                <div className="progress-title-row">
                    <Download size={14} className="text-white" />
                    <h4 className="progress-title">
                        {status === 'completed' ? 'Export Complete' :
                            status === 'failed' ? 'Export Failed' :
                                `Exporting ${type === 'video' ? 'Video' : type === 'report' ? 'Report' : 'Data'}`}
                    </h4>
                </div>
                {status === 'processing' && (
                    <button className="progress-minimize-btn" title="Minimize">
                        <Minimize2 size={14} />
                    </button>
                )}
                {status !== 'processing' && (
                    <button onClick={onClose} className="progress-minimize-btn" title="Close">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Body */}
            {status === 'processing' && (
                <div className="export-progress-body">
                    <div className="status-row">
                        <p className="status-text">Rendering...</p>
                        <p className="percentage-text">{Math.round(progress)}%</p>
                    </div>

                    <div className="progress-track">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <p className="progress-info">
                        You can continue editing while this runs.
                    </p>
                </div>
            )}

            {status === 'completed' && (
                <div className="completion-body">
                    <div className="success-icon-wrapper">
                        <Check className="success-icon" />
                    </div>
                    <h3 className="completion-title">Ready for Download</h3>
                    <p className="completion-subtitle">
                        Your {type} has been successfully exported.
                    </p>

                    {downloadUrl && (
                        <a
                            href={`http://127.0.0.1:8000${downloadUrl}`}
                            className="download-btn"
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Download size={16} /> DOWNLOAD FILE
                        </a>
                    )}

                    <div>
                        <button
                            onClick={onClose}
                            className="close-btn"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {status === 'failed' && (
                <div className="completion-body">
                    <div className="success-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <AlertCircle className="success-icon" style={{ color: '#ef4444' }} />
                    </div>
                    <h3 className="completion-title">Export Failed</h3>
                    <p className="completion-subtitle" style={{ color: '#ef4444' }}>
                        {error || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={onClose}
                        className="close-btn"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
};
