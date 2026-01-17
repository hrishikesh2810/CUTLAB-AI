import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { VideoEditor } from './editor'
import { SmartHumanEffectsProvider } from './context/SmartHumanEffectsContext'
import { ProjectProvider } from './store/ProjectContext'
import './index.css'

function Root() {
    // Determine mode from URL params (dashboard is default)
    const mode = useMemo(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlMode = urlParams.get('mode');
        if (urlMode === 'editor') return 'editor';
        return 'dashboard';
    }, []);

    return (
        <>
            {mode === 'editor' ? <VideoEditor projectId={null} /> : <App />}
        </>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ProjectProvider>
            <SmartHumanEffectsProvider>
                <Root />
            </SmartHumanEffectsProvider>
        </ProjectProvider>
    </StrictMode>,
)
