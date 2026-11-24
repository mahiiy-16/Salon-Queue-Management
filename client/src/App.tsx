import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { SocketProvider } from './contexts/SocketContext';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { JoinQueuePage } from './pages/JoinQueuePage';
import { StatusPage } from './pages/StatusPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { BarberPage } from './pages/BarberPage';
import { DisplayPage } from './pages/DisplayPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              {/* Screen 1: Home */}
              <Route path="/" element={<HomePage />} />
              {/* Screen 2: Join Queue */}
              <Route path="/join" element={<JoinQueuePage />} />
              {/* Screen 3: My Status */}
              <Route path="/status/:id" element={<StatusPage />} />
              {/* Screen 4: Reception Dashboard */}
              <Route path="/reception" element={<ReceptionPage />} />
              {/* Screen 5: Barber View */}
              <Route path="/barber/:name" element={<BarberPage />} />
              {/* Screen 6: Waiting Area TV */}
              <Route path="/display" element={<DisplayPage />} />
              {/* Screen 7: Owner Settings */}
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </SocketProvider>
    </LanguageProvider>
  );
};
