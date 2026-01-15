import { useState, useCallback } from 'react';
import { Upload, Film, AlertCircle } from 'lucide-react';
import { useProject } from '../store/ProjectContext';

export function UploadPage() {
    const { state, uploadVideo } = useProject();
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            handleFileSelect(file);
        } else {
            setError('Please upload a valid video file (MP4, MOV, AVI)');
        }
    }, []);

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setError(null);
        setUploadProgress(10);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            await uploadVideo(selectedFile);

            clearInterval(progressInterval);
            setUploadProgress(100);

            // Reset after success
            setTimeout(() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setUploadProgress(0);
            }, 1000);
        } catch (err) {
            setError('Failed to upload video. Please make sure the backend is running.');
            setUploadProgress(0);
        }
    };

    return (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <div>
                        <h2 className="card-title">Upload Video</h2>
                        <p className="card-subtitle">Drag and drop your video or click to browse</p>
                    </div>
                </div>

                <div
                    className={`upload-zone ${dragOver ? 'dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input
                        id="file-input"
                        type="file"
                        accept="video/mp4,video/mov,video/avi,video/quicktime"
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                    />

                    {selectedFile ? (
                        <Film style={{ color: 'var(--accent-primary)' }} />
                    ) : (
                        <Upload />
                    )}

                    <p className="upload-zone-text">
                        {selectedFile ? selectedFile.name : 'Drag & drop your video here'}
                    </p>
                    <p className="upload-zone-hint">
                        {selectedFile
                            ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : 'Supports MP4, MOV, AVI'}
                    </p>
                </div>

                {error && (
                    <div className="toast error" style={{ position: 'relative', marginTop: 'var(--space-md)' }}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {uploadProgress > 0 && (
                    <div style={{ marginTop: 'var(--space-lg)' }}>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p style={{ textAlign: 'center', marginTop: 'var(--space-sm)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {uploadProgress < 100 ? 'Uploading and processing...' : 'Upload complete!'}
                        </p>
                    </div>
                )}

                {selectedFile && uploadProgress === 0 && (
                    <button
                        className="btn btn-primary btn-lg btn-full"
                        onClick={handleUpload}
                        disabled={state.isLoading}
                        style={{ marginTop: 'var(--space-lg)' }}
                    >
                        {state.isLoading ? (
                            <>
                                <span className="loading-spinner" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Upload size={20} />
                                Process & Ingest Video
                            </>
                        )}
                    </button>
                )}
            </div>

            {previewUrl && (
                <div className="card slide-up">
                    <div className="card-header">
                        <h2 className="card-title">Preview</h2>
                    </div>
                    <div className="video-preview">
                        <video src={previewUrl} controls />
                    </div>
                </div>
            )}

            {state.metadata && !selectedFile && (
                <div className="card slide-up">
                    <div className="card-header">
                        <div>
                            <h2 className="card-title">Current Project Video</h2>
                            <p className="card-subtitle">{state.metadata.filename}</p>
                        </div>
                    </div>

                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
                        <div className="stat-item">
                            <span className="stat-label">Duration</span>
                            <span className="stat-value">{state.metadata.duration.toFixed(1)}s</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Resolution</span>
                            <span className="stat-value">{state.metadata.width}x{state.metadata.height}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">FPS</span>
                            <span className="stat-value">{state.metadata.fps.toFixed(1)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Audio</span>
                            <span className="stat-value">{state.metadata.has_audio ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
