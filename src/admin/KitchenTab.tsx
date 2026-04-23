import { useState, useEffect, useRef } from 'react';
import { subscribeToOrders, subscribeToAllProducts, updateOrderStatus, subscribeToStoreConfig } from '../services/db';
import { useNotification } from '../shared/components/Notification';
import type { Order, Product, StoreConfig } from '../shared/types';

export default function KitchenTab() {
  const { confirm } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const prevPendingCountRef = useRef(0);

  useEffect(() => {
    const unsubOrders = subscribeToOrders((list) => {
      setOrders(list);
      setIsLoading(false);

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

  if (isLoading) {
    return <div className="loading-state" style={{marginTop: '40px', fontSize: '1.2rem', fontWeight: 600}}>กำลังโหลดออเดอร์ห้องครัว...</div>;
  }

  return (
    <div className="kitchen-layout anim-slide-up">
      {columns.map(col => {
        const colOrders = orders.filter(o => o.status === col.status);
        return (
          <div key={col.status} className="kitchen-column">
            <div className="column-header" style={{ borderBottomColor: col.color }}>
              <h3>{col.title}</h3>
              <span className="order-count-badge">{colOrders.length}</span>
            </div>

            <div className="kitchen-scroll">
              {colOrders.map(order => (
                <div key={order.id} className="order-ticket">
                  <div className="ticket-meta">
                    <span className="ticket-id" style={{ fontSize: '1.4rem', fontWeight: 800, opacity: 1, color: 'var(--color-primary)' }}>
                      {order.queueNumber}
                    </span>
                    <span style={{ fontWeight: 600 }}>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="ticket-customer-row">
                    <span className="ticket-customer-name">
                      {order.customerName === 'Walk-in' ? 'ลูกค้าหน้าร้าน' : `ลูกค้า: ${order.customerName}`}
                    </span>
                    {order.pickupTime && (
                      <span className="badge-purple" style={{ padding: '6px 12px', borderRadius: '10px' }}>
                        {order.pickupTime === 'Now' ? 'รับทันที' : `นัดรับ ${order.pickupTime} น.`}
                      </span>
                    )}
                  </div>

                  <ul className="ticket-item-list">
                    {order.items.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.quantity}x</strong> {item.productId === 'free_reward' ? (config?.freeSnackName || 'Reward: Free Premium Choux') : (products[item.productId]?.name || 'Loading...')}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-kitchen-action" onClick={() => moveOrder(order.id, order.status)} style={{ background: col.color, color: 'white' }}>
                      ถัดไป
                    </button>
                    <button className="btn btn-outline" onClick={async () => { if (await confirm({ message: 'ต้องการยกเลิกออเดอร์นี้ใช่หรือไม่?', type: 'danger' })) updateOrderStatus(order.id, 'voided') }} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', padding: '16px', borderRadius: '14px' }}>
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ))}

              {colOrders.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '60px 0', opacity: 0.4 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px', color: 'var(--color-primary)', opacity: 0.2 }}>Kitchen</div>
                  <p>ไม่มีรายการ</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
