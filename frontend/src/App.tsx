import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy-loaded pages for code splitting — new modules can be added here easily
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Settings     = lazy(() => import('./pages/Settings'));
const SpendingPage = lazy(() => import('./modules/spending/SpendingPage'));
const TrainingPage = lazy(() => import('./modules/training/TrainingPage'));
const BooksPage    = lazy(() => import('./modules/books/BooksPage'));
const EventsPage   = lazy(() => import('./modules/events/EventsPage'));
const WorkPage     = lazy(() => import('./modules/work/WorkPage'));
const EatingPage   = lazy(() => import('./modules/eating/EatingPage'));
const PeriodPage   = lazy(() => import('./modules/period/PeriodPage'));
const TodoPage     = lazy(() => import('./modules/todo/TodoPage'));
const HabitsPage   = lazy(() => import('./modules/habits/HabitsPage'));
const LoginPage    = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

function PageLoader() {
  return (
    <div className="loading-container">
      <div className="spinner" />
    </div>
  );
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<PublicRoute><Suspense fallback={<PageLoader />}><LoginPage /></Suspense></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Suspense fallback={<PageLoader />}><RegisterPage /></Suspense></PublicRoute>} />

          {/* Protected app routes */}
          <Route element={<ProtectedRoutes />}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="/spending/*" element={<Suspense fallback={<PageLoader />}><SpendingPage /></Suspense>} />
            <Route path="/training/*" element={<Suspense fallback={<PageLoader />}><TrainingPage /></Suspense>} />
            <Route path="/books/*"    element={<Suspense fallback={<PageLoader />}><BooksPage /></Suspense>} />
            <Route path="/events/*"   element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
            <Route path="/work/*"     element={<Suspense fallback={<PageLoader />}><WorkPage /></Suspense>} />
            <Route path="/eating/*"   element={<Suspense fallback={<PageLoader />}><EatingPage /></Suspense>} />
            <Route path="/period/*"   element={<Suspense fallback={<PageLoader />}><PeriodPage /></Suspense>} />
            <Route path="/todo/*"     element={<Suspense fallback={<PageLoader />}><TodoPage /></Suspense>} />
            <Route path="/habits/*"   element={<Suspense fallback={<PageLoader />}><HabitsPage /></Suspense>} />
            <Route path="/settings/*" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
