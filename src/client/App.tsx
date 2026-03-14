import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CreateVideo } from './components/videos/CreateVideo';
import { JobList } from './components/videos/JobList';
import { JobDetail } from './components/videos/JobDetail';
import { EditVideo } from './components/videos/EditVideo';
import { AdminJobList } from './components/videos/AdminJobList';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ToastProvider } from './components/ui/Toast';
import './i18n';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CreateVideo />} />
            <Route path="/jobs" element={<JobList />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/edit/:id" element={<EditVideo />} />
            <Route path="/admin/jobs" element={<AdminJobList />} />
            <Route path="/settings" element={<SettingsPanel />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
