import { useState, useEffect } from 'react';
import { subscribeToOrders } from '../services/db';
import type { Order } from '../shared/types';

export default function HistoryTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    return subscribeToOrders(list => {
      setOrders(list);
      setIsLoading(false);
    });
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerPhone?.includes(search) || o.queueNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
    const matchesDate = !dateFilter || orderDate === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => b.createdAt - a.createdAt);

  if (isLoading) {
    return <div className="loading-state" style={{marginTop: '40px', fontSize: '1.2rem', fontWeight: 600}}>กำลังโหลดประวัติ...</div>;
  }

  return (
    <div className="history-layout anim-slide-up">
      <div className="history-header">
        <h2 style={{fontFamily: 'var(--font-heading)', margin: 0}}>ประวัติคำสั่งซื้อ</h2>
        
        <div className="history-toolbar">
          <div className="search-group">
            <span className="filter-label">ค้นหา</span>
            <input 
              type="text" 
              placeholder="เบอร์โทร / รหัสคิว..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input-wide"
            />
          </div>

          <div className="filter-group-row">
            <div className="filter-item">
              <span className="filter-label">สถานะ</span>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                <option value="all">ทุกสถานะ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="voided">ยกเลิก</option>
                <option value="pending">รอดำเนินการ</option>
              </select>
            </div>

            <div className="filter-item">
              <span className="filter-label">วันที่</span>
              <div style={{display: 'flex', gap: '8px'}}>
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="filter-date"
                />
                {dateFilter !== new Date().toISOString().split('T')[0] && (
                  <button onClick={() => setDateFilter(new Date().toISOString().split('T')[0])} className="btn-text" style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)'}}>วันนี้</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>คิว</th>
              <th>เวลา</th>
              <th>ลูกค้า</th>
              <th>รายการ</th>
              <th>ยอดรวม</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td className="q-cell">{order.queueNumber}</td>
                <td>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>
                  <div style={{fontWeight: 600}}>{order.customerName}</div>
                  <div style={{fontSize: '0.8rem', opacity: 0.6}}>{order.customerPhone}</div>
                </td>
                <td>
                  {order.items.length} รายการ
                </td>
                <td style={{fontWeight: 700}}>฿{order.totalPrice}</td>
                <td>
                  <span className={`badge badge-${order.status === 'completed' ? 'success' : order.status === 'voided' ? 'danger' : 'warning'}`}>
                    {order.status === 'completed' ? 'เสร็จสิ้น' : order.status === 'voided' ? 'ยกเลิก' : 'รอดำเนินการ'}
                  </span>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', padding: '60px', opacity: 0.5}}>ไม่พบข้อมูลประวัติ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
