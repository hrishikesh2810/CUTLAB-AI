/**
 * Upload Page
 * 
 * Entry point for new videos. Users upload video files here
 * before proceeding to analysis.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMedia } from '../store';
import './PageStyles.css';

export function UploadPage() {
    const navigate = useNavigate();
    const { state: mediaState, dispatch: mediaDispatch } = useMedia();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const processFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        // Simulate upload progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return prev;
                }
                return prev + 10;
            });
        }, 200);

        try {
            // Create object URL for the video
            const url = URL.createObjectURL(file);

            // Get video metadata
            const video = document.createElement('video');
            video.preload = 'metadata';

            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => resolve();
                video.onerror = () => reject(new Error('Failed to load video'));
                video.src = url;
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            // Add to media store
            mediaDispatch({
                type: 'ADD_MEDIA',
                payload: {
                    id: `media_${Date.now()}`,
                    filename: file.name,
                    path: url,
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    fps: 30, // Default, can be updated later
                    hasAudio: true,
                },
            });

            // Navigate to analysis after short delay
            setTimeout(() => {
                navigate('/analysis');
            }, 500);

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to process video file');
        } finally {
            setIsUploading(false);
        }
    }, [mediaDispatch, navigate]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, [processFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    }, [processFile]);

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="page upload-page">
            <div className="page-header">
                <div className="logo-section">
                    <span className="logo-icon">✂️</span>
                    <h1>CUTLAB AI</h1>
                </div>
                <p className="tagline">AI-Powered Video Editing Assistant</p>
            </div>

            <div className="upload-container">
                <div
                    className={`drop-zone ${dragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={openFileDialog}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    {isUploading ? (
                        <div className="upload-progress">
                            <div className="progress-ring">
                                <svg viewBox="0 0 100 100">
                                    <circle
                                        className="progress-bg"
                                        cx="50" cy="50" r="45"
                                    />
                                    <circle
                                        className="progress-fill"
                                        cx="50" cy="50" r="45"
                                        style={{
                                            strokeDashoffset: 283 - (283 * uploadProgress / 100)
                                        }}
                                    />
                                </svg>
                                <span className="progress-text">{uploadProgress}%</span>
                            </div>
                            <p>Processing video...</p>
                        </div>
                    ) : (
                        <>
                            <div className="drop-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17,8 12,3 7,8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <h2>Drop your video here</h2>
                            <p>or click to browse</p>
                            <span className="supported-formats">
                                Supports MP4, MOV, WebM, AVI
                            </span>
                        </>
                    )}
                </div>
            </div>

            {mediaState.items.length > 0 && (
                <div className="recent-uploads">
                    <h3>Recent Uploads</h3>
                    <div className="recent-list">
                        {mediaState.items.slice(-3).map(item => (
                            <div
                                key={item.id}
                                className="recent-item"
                                onClick={() => navigate('/analysis')}
                            >
                                <span className="file-icon">🎬</span>
                                <div className="file-info">
                                    <span className="filename">{item.filename}</span>
                                    <span className="duration">
                                        {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
                                    </span>
                                </div>
                                <span className="action-arrow">→</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="features-grid">
                <div className="feature-card">
                    <span className="feature-icon">🎯</span>
                    <h4>Smart Cut Detection</h4>
                    <p>AI analyzes motion, audio, and content to suggest optimal cuts</p>
                </div>
                <div className="feature-card">
                    <span className="feature-icon">🎵</span>
                    <h4>Audio Analysis</h4>
                    <p>Detect speech, music, silence, and audio peaks automatically</p>
                </div>
                <div className="feature-card">
                    <span className="feature-icon">✨</span>
                    <h4>Pro Workspace</h4>
                    <p>Professional NLE with timeline, preview, and Remotion rendering</p>
                </div>
            </div>
        </div>
    );
}
