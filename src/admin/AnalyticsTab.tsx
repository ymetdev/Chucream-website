import { useState, useEffect } from 'react';
import { subscribeToOrders, subscribeToAllProducts } from '../services/db';
import type { Order, Product } from '../shared/types';

export default function AnalyticsTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubO = subscribeToOrders(list => {
      setOrders(list);
      setIsLoading(false);
    });
    const unsubP = subscribeToAllProducts(list => {
      const map: Record<string, Product> = {};
      list.forEach(p => map[p.id] = p);
      setProducts(map);
    });
    return () => { unsubO(); unsubP(); };
  }, []);

  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((acc, o) => acc + o.totalPrice, 0);

  // Revenue by Date (last 7 days)
  const get7DayChart = () => {
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const rev = completedOrders
        .filter(o => new Date(o.createdAt).toISOString().split('T')[0] === dateStr)
        .reduce((acc, o) => acc + o.totalPrice, 0);
      trend.push({ date: dateStr, revenue: rev, label: d.toLocaleDateString('th-TH', {weekday: 'short'}) });
    }
    return trend;
  };

  const trend = get7DayChart();
  const maxRevenue = Math.max(...trend.map(t => t.revenue), 1000);

  // Top Products
  const getProductStats = () => {
    const counts: Record<string, number> = {};
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
      });
    });
    return Object.entries(counts)
      .map(([id, count]) => ({ id, count, name: products[id]?.name || 'Loading...' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const topProducts = getProductStats();

  if (isLoading) {
    return <div className="loading-state" style={{marginTop: '40px', fontSize: '1.2rem', fontWeight: 600}}>กำลังโหลดข้อมูลวิเคราะห์...</div>;
  }

  return (
    <div className="analytics-layout anim-slide-up">
      <h2 style={{fontFamily: 'var(--font-heading)', marginBottom: '32px'}}>วิเคราะห์ข้อมูลการขาย</h2>

      <div className="analytics-grid">
        {/* KPI Cards */}
        <div className="kpi-card highlight">
          <div className="kpi-label">รายได้รวมทั้งหมด</div>
          <div className="kpi-value">฿{totalRevenue.toLocaleString()}</div>
          <div className="kpi-sub">จาก {completedOrders.length} ออเดอร์</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">ยอดขายเฉลี่ยต่อบิล</div>
          <div className="kpi-value">฿{completedOrders.length > 0 ? (totalRevenue / completedOrders.length).toFixed(0) : 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">จำนวนสินค้าที่ขายได้</div>
          <div className="kpi-value">{completedOrders.reduce((acc, o) => acc + o.items.reduce((sum, i) => sum + i.quantity, 0), 0)} ชิ้น</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>แนวโน้มรายได้ 7 วันล่าสุด</h3>
          <div className="bar-chart-v">
            {trend.map((t, i) => {
              const height = (t.revenue / maxRevenue) * 200;
              return (
                <div key={i} className="chart-bar-col">
                  <div className="bar-value">฿{t.revenue}</div>
                  <div className="bar" style={{height: `${height}px`}}></div>
                  <div className="bar-label">{t.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-card">
          <h3>เมนูยอดนิยม (Top 5)</h3>
          <div className="top-products-list">
            {topProducts.map((p, i) => (
              <div key={i} className="top-product-item">
                <div className="rank">#{i+1}</div>
                <div className="name">{p.name}</div>
                <div className="qty-badge">{p.count} ชิ้น</div>
              </div>
            ))}
            {topProducts.length === 0 && <p style={{opacity: 0.5, textAlign: 'center', padding: '40px'}}>ยังไม่มีข้อมูลการขาย</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
