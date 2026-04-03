import { useState, useEffect, useRef } from 'react';
import { subscribeToOrders, subscribeToAllProducts, updateOrderStatus, subscribeToStoreConfig } from '../services/db';
import { useNotification } from '../shared/components/Notification';
import type { Order, Product, StoreConfig } from '../shared/types';

export default function KitchenTab() {
  const { confirm } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [config, setConfig] = useState<StoreConfig | null>(null);
  
  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    const unsubOrders = subscribeToOrders((list) => {
      setOrders(list);
      
      const pendingCount = list.filter(o => o.status === 'pending').length;
      if (pendingCount > prevPendingCountRef.current) {
        // [REQ] Play "ding" sound on new pending order
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => console.warn('Audio auto-play blocked by browser'));
      }
      prevPendingCountRef.current = pendingCount;
    });
    const unsubProducts = subscribeToAllProducts((list) => {
      const map: Record<string, Product> = {};
      list.forEach(p => map[p.id] = p);
      setProducts(map);
    });
    const unsubConfig = subscribeToStoreConfig(setConfig);
    return () => {
      unsubOrders();
      unsubProducts();
      unsubConfig();
    };
  }, []);

  const moveOrder = async (orderId: string, currentStatus: string) => {
    let next = '';
    if (currentStatus === 'pending') next = 'preparing';
    else if (currentStatus === 'preparing') next = 'ready';
    else if (currentStatus === 'ready') next = 'completed';
    
    if (next) {
      await updateOrderStatus(orderId, next);
    }
  };

  const columns = [
    { title: 'ออเดอร์ใหม่', status: 'pending', color: 'var(--color-danger)' },
    { title: 'กำลังเตรียม', status: 'preparing', color: 'var(--color-warning)' },
    { title: 'พร้อมรับสินค้า', status: 'ready', color: 'var(--color-success)' }
  ];

  return (
    <div className="anim-slide-up" style={{display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '24px', height: 'calc(100vh - 120px)'}}>
      {columns.map(col => (
        <div key={col.status} className="surface-card" style={{minWidth: '350px', flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.02)'}}>
          <h3 style={{borderBottom: `3px solid ${col.color}`, paddingBottom: '12px', marginBottom: '16px'}}>
            {col.title} ({orders.filter(o => o.status === col.status).length})
          </h3>
          <div style={{flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {orders.filter(o => o.status === col.status).map(order => (
              <div key={order.id} className="surface-card" style={{padding: '16px', border: `1px solid ${col.color}`, position: 'relative'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <span style={{fontWeight: 700}}>#{order.id.slice(-4).toUpperCase()}</span>
                  <span style={{color: 'var(--color-text-light)'}}>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div style={{marginBottom: '16px'}}>
                  <strong>{order.customerName}</strong> 
                  {order.pickupTime && <span className="badge badge-warning" style={{marginLeft: '8px'}}>นัดรับ {order.pickupTime} น.</span>}
                </div>
                <ul style={{listStyle: 'none', marginBottom: '16px', background: 'var(--color-surface)', padding: '12px', borderRadius: 'var(--radius-sm)'}}>
                  {order.items.map((item, idx) => (
                    <li key={idx} style={{marginBottom: '6px', fontSize: '1.1rem'}}>
                      <strong>{item.quantity}x</strong> {item.productId === 'free_reward' ? (config?.freeSnackName || '🎁 Free Premium Choux') : (products[item.productId]?.name || 'Loading...')}
                    </li>
                  ))}
                </ul>
                <div style={{display: 'flex', gap: '8px', marginTop: 'auto'}}>
                  <button className="btn btn-primary" onClick={() => moveOrder(order.id, order.status)} style={{flex: 1, background: col.color, display: 'flex', justifyContent: 'center', padding: '12px'}}>
                    <span style={{marginRight: '8px'}}>ถัดไป</span> ➡️
                  </button>
                  <button className="btn btn-outline" onClick={async () => { if(await confirm({ message: 'ต้องการยกเลิกออเดอร์นี้ใช่หรือไม่?', type: 'danger' })) updateOrderStatus(order.id, 'voided') }} style={{color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '12px'}}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {orders.filter(o => o.status === col.status).length === 0 && (
              <div style={{textAlign: 'center', color: 'var(--color-text-light)', padding: '40px'}}>
                ไม่มีรายการในขั้นตอนนี้
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
