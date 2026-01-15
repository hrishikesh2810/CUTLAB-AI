import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { VideoEditor } from './editor'
import './index.css'

function Root() {
    const [mode, setMode] = useState<'dashboard' | 'editor'>('editor');

    // Check URL for mode
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');

    if (urlMode === 'dashboard' && mode !== 'dashboard') {
        setMode('dashboard');
    } else if (urlMode === 'editor' && mode !== 'editor') {
        setMode('editor');
    }

    // Mode switcher in development
    const toggleMode = () => {
        const newMode = mode === 'dashboard' ? 'editor' : 'dashboard';
        setMode(newMode);
        window.history.pushState({}, '', `?mode=${newMode}`);
    };

    return (
        <>
            {mode === 'editor' ? <VideoEditor /> : <App />}

            {/* Mode Toggle Button (dev only) */}
            <button
                onClick={toggleMode}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    padding: '10px 16px',
                    background: '#ff7b4a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(255, 123, 74, 0.4)',
                }}
            >
                Switch to {mode === 'dashboard' ? '🎬 Editor' : '📊 Dashboard'}
            </button>
        </>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Root />
    </StrictMode>,
)
