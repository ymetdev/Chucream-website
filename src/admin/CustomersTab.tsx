import { useState, useEffect } from 'react';
import { subscribeToUsers, subscribeToOrders } from '../services/db';
import type { UserTarget, Order } from '../shared/types';

export default function CustomersTab() {
  const [users, setUsers] = useState<UserTarget[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let usersLoaded = false;
    let ordersLoaded = false;
    const checkLoading = () => { if(usersLoaded && ordersLoaded) setIsLoading(false); };

    const unsubU = subscribeToUsers(list => { setUsers(list); usersLoaded = true; checkLoading(); });
    const unsubO = subscribeToOrders(list => { setOrders(list); ordersLoaded = true; checkLoading(); });
    return () => { unsubU(); unsubO(); };
  }, []);

  const getCustomerMetrics = (phone: string) => {
    const userOrders = orders.filter(o => o.customerPhone === phone && o.status === 'completed');
    const totalSpent = userOrders.reduce((acc, o) => acc + o.totalPrice, 0);
    const lastOrder = userOrders.length > 0 ? new Date(Math.max(...userOrders.map(o => o.createdAt))) : null;
    return { totalSpent, lastOrder, orderCount: userOrders.length };
  };

  const filteredUsers = users.filter(u => 
    u.phoneNumber.includes(search) || 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.nickname || '').toLowerCase().includes(search.toLowerCase())
  ).map(u => ({ ...u, metrics: getCustomerMetrics(u.phoneNumber) }))
   .sort((a, b) => b.metrics.totalSpent - a.metrics.totalSpent); // Sort by Top Spenders

  if (isLoading) {
    return <div className="loading-state" style={{marginTop: '40px', fontSize: '1.2rem', fontWeight: 600}}>กำลังโหลดข้อมูลลูกค้า...</div>;
  }

  return (
    <div className="customers-layout anim-slide-up">
      <div className="customers-header">
        <h2 style={{fontFamily: 'var(--font-heading)'}}>จัดการลูกค้า (CRM)</h2>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ / เบอร์โทร..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="customers-grid">
        <div className="customer-list-card">
          <table className="customers-table">
            <thead>
              <tr>
                <th>ลูกค้า</th>
                <th>ชื่อเล่น/อายุ</th>
                <th>แต้มสะสม</th>
                <th>ยอดซื้อรวม</th>
                <th>ครั้งล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.phoneNumber}>
                  <td>
                    <div style={{fontWeight: 700}}>{user.name || 'Customer'}</div>
                    <div style={{fontSize: '0.85rem', opacity: 0.6}}>{user.phoneNumber}</div>
                  </td>
                  <td>
                    {user.nickname || '-'} {user.age ? ` / ${user.age}` : ''}
                  </td>
                  <td className="points-cell">{user.points} แต้ม</td>
                  <td style={{fontWeight: 700}}>฿{user.metrics.totalSpent.toLocaleString()}</td>
                  <td style={{fontSize: '0.85rem'}}>
                    {user.metrics.lastOrder ? user.metrics.lastOrder.toLocaleDateString('th-TH') : 'ไม่มีข้อมูล'}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', padding: '60px', opacity: 0.5}}>ไม่พบข้อมูลลูกค้า</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Stats sidebar (Top 3) */}
        <div className="crm-stats">
          <h3>👑 ลูกค้าคนสำคัญ (Top 3)</h3>
          {filteredUsers.slice(0, 3).map((u, i) => (
            <div key={u.phoneNumber} className={`top-customer-card rank-${i+1}`}>
              <div className="rank">#{i+1}</div>
              <div className="info">
                <div className="name">{u.name || u.nickname || 'Loyalty Member'}</div>
                <div className="spent">ยอดรวม ฿{u.metrics.totalSpent.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
