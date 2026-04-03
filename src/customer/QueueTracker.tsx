import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Order } from '../shared/types';
import './QueueTracker.css';

export default function QueueTracker() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      }
    });
    return () => unsub();
  }, [orderId]);

  if (!order) return <div className="container" style={{marginTop: '40px', textAlign: 'center'}}>กำลังโหลดสถานะคำสั่งซื้อ...</div>;

  const currentStep = ['pending', 'preparing', 'ready', 'completed'].indexOf(order.status);

  return (
    <div className="container queue-tracker anim-slide-up">
      <h2 className="section-title" style={{marginBottom: '8px'}}>สถานะคำสั่งซื้อของคุณ</h2>
      <p className="text-center" style={{marginBottom: '40px', color: 'var(--color-text-light)'}}>
        รหัสออเดอร์: <strong>{order.id.slice(-6).toUpperCase()}</strong>
      </p>
      
      <div className="status-timeline">
        <div className={`timeline-step ${currentStep >= 0 ? 'active' : ''}`}>
          <div className="step-icon">📋</div>
          <p>ได้รับคำสั่งซื้อแล้ว</p>
        </div>
        <div className="timeline-connector"></div>
        <div className={`timeline-step ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="step-icon">🧑‍🍳</div>
          <p>กำลังเตรียมขนม</p>
        </div>
        <div className="timeline-connector"></div>
        <div className={`timeline-step ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="step-icon">✨</div>
          <p>พร้อมรับสินค้า!</p>
        </div>
      </div>

      {order.status === 'ready' && (
        <div className="surface-card success-card text-center anim-pulse" style={{marginTop: '40px', background: 'rgba(83, 128, 72, 0.1)'}}>
          <h3 style={{color: 'var(--color-success)', marginBottom: '8px'}}>ชูครีมของคุณพร้อมแล้ว!</h3>
          <p>กรุณาแสดงหน้าจอนี้ให้พนักงานที่บูธทราบเพื่อรับสินค้า</p>
        </div>
      )}

      {order.status === 'completed' && (
        <div className="surface-card success-card text-center" style={{marginTop: '40px'}}>
          <h3 style={{color: 'var(--color-success)', marginBottom: '8px'}}>รับสินค้าเรียบร้อย</h3>
          <p>ขอบคุณที่อุดหนุนครับ! ขอให้สนุกกับชูครีมแสนอร่อยของเรานะครับ</p>
        </div>
      )}

      {order.status === 'voided' && (
        <div className="surface-card text-center" style={{marginTop: '40px', background: 'rgba(211, 47, 47, 0.1)'}}>
          <h3 style={{color: 'var(--color-danger)', marginBottom: '8px'}}>คำสั่งซื้อถูกยกเลิก</h3>
          <p>ขออภัยครับ คำสั่งซื้อนี้ถูกยกเลิกโดยแอดมิน กรุณาติดต่อพนักงาน</p>
        </div>
      )}

      <div className="text-center" style={{marginTop: '32px'}}>
        <Link to="/" className="btn btn-outline" style={{borderRadius: 'var(--radius-round)'}}>กลับสู่หน้าหลัก</Link>
      </div>
    </div>
  );
}
