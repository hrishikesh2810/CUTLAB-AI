import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { VideoEditor } from './editor'
import { SmartHumanEffectsProvider } from './context/SmartHumanEffectsContext'
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

    return (
        <>
            {mode === 'editor' ? <VideoEditor /> : <App />}
        </>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <SmartHumanEffectsProvider>
            <Root />
        </SmartHumanEffectsProvider>
    </StrictMode>,
)
