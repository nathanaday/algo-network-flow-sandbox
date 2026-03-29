import { SandboxProvider } from './context/SandboxContext';
import { PersistenceProvider } from './context/PersistenceContext';
import { PlaybackProvider } from './context/PlaybackContext';
import Layout from './components/Layout';

export default function App() {
  return (
    <SandboxProvider>
      <PersistenceProvider>
        <PlaybackProvider>
          <Layout />
        </PlaybackProvider>
      </PersistenceProvider>
    </SandboxProvider>
  );
}
