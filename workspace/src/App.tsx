import { TimelineProvider } from './store';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import './styles/global.css';

function App() {
    return (
        <TimelineProvider>
            <WorkspaceLayout />
        </TimelineProvider>
    );
}

export default App;
