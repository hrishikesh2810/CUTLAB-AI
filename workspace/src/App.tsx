import { TimelineProvider, MediaProvider } from './store';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import './styles/global.css';

function App() {
    return (
        <MediaProvider>
            <TimelineProvider>
                <WorkspaceLayout />
            </TimelineProvider>
        </MediaProvider>
    );
}

export default App;
