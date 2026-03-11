import { createContext, useContext, useState, ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  message: string;
  type: NotificationType;
  id: number;
}

interface AppContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  notification: Notification | null;
  notify: (message: string, type?: NotificationType) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const notify = (message: string, type: NotificationType = 'success') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <AppContext.Provider value={{ sidebarOpen, setSidebarOpen, notification, notify }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
