/**
 * CUTLAB AI Workspace App
 * 
 * Main application with React Router navigation.
 * Routes:
 *   /upload - Video upload page
 *   /analysis - AI analysis hub
 *   /analysis/cuts - Cut suggestions
 *   /analysis/audio - Audio analysis
 *   /workspace - Main editing workspace
 *   /export - Export options
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TimelineProvider, MediaProvider, AIInsightsProvider } from './store';
import {
    UploadPage,
    AnalysisPage,
    CutsPage,
    AudioPage,
    WorkspacePage,
    ExportPage
} from './pages';
import './styles/global.css';

function App() {
    return (
        <BrowserRouter>
            <MediaProvider>
                <TimelineProvider>
                    <AIInsightsProvider>
                        <Routes>
                            {/* Upload */}
                            <Route path="/upload" element={<UploadPage />} />

                            {/* Analysis with sub-routes */}
                            <Route path="/analysis" element={<AnalysisPage />}>
                                <Route path="cuts" element={<CutsPage />} />
                                <Route path="audio" element={<AudioPage />} />
                            </Route>

                            {/* Workspace */}
                            <Route path="/workspace" element={<WorkspacePage />} />

                            {/* Export */}
                            <Route path="/export" element={<ExportPage />} />

                            {/* Default redirect to upload */}
                            <Route path="/" element={<Navigate to="/upload" replace />} />
                            <Route path="*" element={<Navigate to="/upload" replace />} />
                        </Routes>
                    </AIInsightsProvider>
                </TimelineProvider>
            </MediaProvider>
        </BrowserRouter>
    );
}

export default App;
