import React, { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';

export const App: React.FC = () => {
  const { initialize, user, loading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-primary animate-pulse-glow text-xl tracking-[0.3em] uppercase">
          Initializing System...
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthScreen /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
    </Routes>
  );
};

export default App;
