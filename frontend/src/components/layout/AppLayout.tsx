import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import Notification from '../ui/Notification';

export default function AppLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main className="page-content" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
          <Outlet />
        </main>
      </div>
      <div className="bottom-nav-wrapper">
        <BottomNav />
      </div>
      <Notification />
      <style>{`
        @media (min-width: 768px) { .bottom-nav-wrapper { display: none; } }
        @media (max-width: 767px) { .main-content { padding-bottom: 0; } }
      `}</style>
    </div>
  );
}
