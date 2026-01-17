import {
    Upload, Search, Scissors, Edit, Package, Volume2, Film, Clock, Layers
} from 'lucide-react';
import { useProject } from './store/ProjectContext';
import { UploadPage } from './pages/Upload';
import { AnalysisPage } from './pages/Analysis';
import { SuggestionsPage } from './pages/Suggestions';
import { ExportPage } from './pages/Export';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { BatchProcessingView } from './pages/BatchProcessingView';
import { VideoEditor } from './editor/VideoEditor';
import type { TabType } from './types';
import './index.css';


const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layers size={18} /> },
    { id: 'upload', label: 'Upload', icon: <Upload size={18} /> },
    { id: 'analysis', label: 'Analysis', icon: <Search size={18} /> },
    { id: 'suggestions', label: 'Suggestions', icon: <Scissors size={18} /> },
    { id: 'editor', label: 'Editor', icon: <Edit size={18} /> },
    { id: 'export', label: 'Export', icon: <Package size={18} /> },
    { id: 'batch', label: 'Batch', icon: <Layers size={18} /> },
];

function AppContent() {
    const { state, dispatch, loadProject } = useProject();
    const { activeTab, projects, projectId, metadata, scenes, suggestions, isLoading } = state;

    const setActiveTab = (tab: TabType) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
    };

    const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        if (selectedId) {
            loadProject(selectedId);
        }
    };

    const renderPage = () => {
        // If no project is selected, show a placeholder for non‑upload/dashboard/batch tabs
        if (!projectId && !['upload', 'dashboard', 'batch'].includes(activeTab)) {
            return (
                <div className="no-project-placeholder" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Please upload a video to access {activeTab} features.</p>
                    <button onClick={() => setActiveTab('upload')} className="tab-btn" style={{ marginTop: '1rem' }}>
                        Go to Upload
                    </button>
                </div>
            );
        }
        switch (activeTab) {
            case 'dashboard':
                return <AnalyticsDashboard />;
            case 'upload':
                return <UploadPage />;
            case 'analysis':
                return <AnalysisPage />;
            case 'suggestions':
                return <SuggestionsPage />;
            case 'editor':
                return <VideoEditor projectId={projectId} />;
            case 'export':
                return <ExportPage />;
            case 'batch':
                return <BatchProcessingView />;
            default:
                return <AnalyticsDashboard />;
        }
    };
    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-logo">
                    <img src="/assets/logo-symbol.png" alt="CUTLAB AI" style={{ height: '32px', width: 'auto' }} />
                    <h1>CUTLAB AI</h1>
                    <span className="header-subtitle">
                        Next-Gen Python-Only AI Video Editor • Audio-Aware Smart Cut Suggestions
                    </span>
                </div>
            </header>

            <div className="main-content">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-section">
                        <h3 className="sidebar-title">📁 Project</h3>

                        {projects.length > 0 && (
                            <div className="project-selector">
                                <select
                                    value={projectId || ''}
                                    onChange={handleProjectChange}
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.map((project) => (
                                        <option key={project.id || project.project_id} value={project.id || project.project_id}>
                                            {(project.name || project.filename)?.slice(0, 20) ?? ''}... ({(project.id || project.project_id)?.slice(0, 8)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {projectId && (
                            <div style={{
                                padding: 'var(--space-sm) var(--space-md)',
                                background: 'rgba(0, 200, 83, 0.1)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: 'var(--space-md)',
                                fontSize: '0.8rem',
                                color: 'var(--accent-success)'
                            }}>
                                ✓ Active: {projectId.slice(0, 8)}...
                            </div>
                        )}
                    </div>

                    {metadata && (
                        <div className="sidebar-section">
                            <h3 className="sidebar-title">📹 Video Info</h3>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-label"><Clock size={12} /> Duration</span>
                                    <span className="stat-value">{metadata.duration?.toFixed(1) || '0.0'}s</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label"><Film size={12} /> Resolution</span>
                                    <span className="stat-value">{metadata.width || 0}x{metadata.height || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label"><Layers size={12} /> FPS</span>
                                    <span className="stat-value">{metadata.fps?.toFixed(0) || '0'}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label"><Volume2 size={12} /> Audio</span>
                                    <span className="stat-value">{metadata.has_audio ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="sidebar-section">
                        <h3 className="sidebar-title">📊 Analysis Stats</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Scenes</span>
                                <span className="stat-value" style={{ color: 'var(--accent-info)' }}>
                                    {scenes?.length || 0}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Suggestions</span>
                                <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
                                    {suggestions?.length || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <div className="content-area">
                    {/* Tab Navigation */}
                    <nav className="tab-nav">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* Tab Content */}
                    <main className={`tab-content ${activeTab === 'editor' ? 'no-padding' : ''}`}>
                        {renderPage()}
                    </main>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner" />
                        <p>Processing...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function App() {
    return (
        <AppContent />
    );
}

export default App;
