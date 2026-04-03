import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { NotificationProvider } from './shared/components/Notification';

const StorefrontHome = React.lazy(() => import('./customer/StorefrontHome'));
const QueueTracker = React.lazy(() => import('./customer/QueueTracker'));
const AdminPOS = React.lazy(() => import('./admin/AdminPOS'));

function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="container" style={{paddingTop: '20vh', textAlign: 'center'}}>กำลังเตรียมความอร่อย...</div>}>
          <Routes>
            {/* Customer Routes */}
            <Route path="/" element={<StorefrontHome />} />
            <Route path="/queue/:orderId" element={<QueueTracker />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminPOS />} />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
