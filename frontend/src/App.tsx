import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';

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

function PageLoader() {
  return (
    <div className="loading-container">
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="/spending/*" element={<Suspense fallback={<PageLoader />}><SpendingPage /></Suspense>} />
          <Route path="/training/*" element={<Suspense fallback={<PageLoader />}><TrainingPage /></Suspense>} />
          <Route path="/books/*"    element={<Suspense fallback={<PageLoader />}><BooksPage /></Suspense>} />
          <Route path="/events/*"   element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
          <Route path="/work/*"     element={<Suspense fallback={<PageLoader />}><WorkPage /></Suspense>} />
          <Route path="/eating/*"   element={<Suspense fallback={<PageLoader />}><EatingPage /></Suspense>} />
          <Route path="/period/*"   element={<Suspense fallback={<PageLoader />}><PeriodPage /></Suspense>} />
          <Route path="/settings/*" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
