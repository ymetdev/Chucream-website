import { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import './Admin.css';

const POSTab = lazy(() => import('./POSTab'));
const KitchenTab = lazy(() => import('./KitchenTab'));
const AnalyticsTab = lazy(() => import('./AnalyticsTab'));
const CustomersTab = lazy(() => import('./CustomersTab'));
const HistoryTab = lazy(() => import('./HistoryTab'));
const SettingsTab = lazy(() => import('./SettingsTab'));
import AdminAuth from './AdminAuth';

export default function AdminPOS() {
  const [activeTab, setActiveTab] = useState<'pos' | 'kitchen' | 'analytics' | 'customers' | 'history' | 'settings'>('pos');
  const [authLevel, setAuthLevel] = useState<'staff' | 'owner' | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Simple role assignment based on email for demonstration. 
        // In a real app, use Firestore or Custom Claims.
        if (user.email?.toLowerCase().includes('owner')) {
          setAuthLevel('owner');
        } else {
          setAuthLevel('staff');
        }
      } else {
        setAuthLevel(null);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  if (loadingAuth) {
    return <div className="loading-state" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>กำลังตรวจสอบสิทธิ์...</div>;
  }

  if (!authLevel) {
    return <AdminAuth />;
  }

  const canAccess = (tab: string) => {
    if (authLevel === 'owner') return true;
    return ['pos', 'kitchen'].includes(tab);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="admin-portal">
      <nav className="admin-nav">
        <h2 className="admin-brand">Choux POS</h2>
        <div className="nav-links">
          <button className={`nav-btn ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>เครื่องขาย</button>
          <button className={`nav-btn ${activeTab === 'kitchen' ? 'active' : ''}`} onClick={() => setActiveTab('kitchen')}>ครัว</button>
          
          {canAccess('history') && (
            <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>ประวัติ</button>
          )}
          {canAccess('analytics') && (
            <button className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>วิเคราะห์</button>
          )}
          {canAccess('customers') && (
            <button className={`nav-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>ลูกค้า</button>
          )}
          {canAccess('settings') && (
            <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>ตั้งค่า</button>
          )}

          <button className="nav-btn" onClick={handleLogout} style={{color: 'var(--color-danger)', border: 'none', marginLeft: 'auto'}}>ออกจากระบบ</button>
        </div>
      </nav>
      
      <main className="admin-content">
        <Suspense fallback={<div className="loading-state">กำลังโหลดข้อมูล...</div>}>
          {activeTab === 'pos' && <POSTab />}
          {activeTab === 'kitchen' && <KitchenTab />}
          {activeTab === 'history' && <HistoryTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </Suspense>
      </main>
    </div>
  );
}
