import { useState, Suspense, lazy } from 'react';
import './Admin.css';

const POSTab = lazy(() => import('./POSTab'));
const KitchenTab = lazy(() => import('./KitchenTab'));
const SettingsTab = lazy(() => import('./SettingsTab'));

export default function AdminPOS() {
  const [activeTab, setActiveTab] = useState<'pos' | 'kitchen' | 'settings'>('pos');

  return (
    <div className="admin-portal">
      <nav className="admin-nav">
        <h2 className="admin-brand">Choux POS</h2>
        <div className="nav-links">
          <button className={`nav-btn ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>เครื่องขายหน้าร้าน</button>
          <button className={`nav-btn ${activeTab === 'kitchen' ? 'active' : ''}`} onClick={() => setActiveTab('kitchen')}>ครัว</button>
          <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>ตั้งค่าระบบ</button>
        </div>
      </nav>
      
      <main className="admin-content">
        <Suspense fallback={<div className="loading-state">กำลังโหลดข้อมูล...</div>}>
          {activeTab === 'pos' && <POSTab />}
          {activeTab === 'kitchen' && <KitchenTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </Suspense>
      </main>
    </div>
  );
}
