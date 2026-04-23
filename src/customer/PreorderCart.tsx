import { useState, useEffect } from 'react';
import { getUserByPhone } from '../services/db';
import type { Product, OrderItem, UserTarget } from '../shared/types';
import './Cart.css';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: (OrderItem & { product: Product })[];
  updateQuantity: (productId: string, diff: number) => void;
  onCheckout: (pickupTime: string, customerPhone: string) => void;
}

export default function PreorderCart({ isOpen, onClose, cartItems, updateQuantity, onCheckout }: CartProps) {
  const [pickupTime, setPickupTime] = useState('14:00');
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState<UserTarget | null>(null);
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState<number | ''>('');

  useEffect(() => {
    if (phone.length >= 10) {
      getUserByPhone(phone).then(setUser);
    } else {
      setUser(null);
    }
  }, [phone]);

  const total = cartItems.reduce((acc, item) => acc + item.priceAtPurchase * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay animate-fade-in" onClick={onClose}></div>
      <div className="cart-panel anim-slide-in-right">
        <div className="cart-header">
          <h2>ตะกร้าของคุณ</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <p className="empty-cart">ตะกร้าว่างเปล่า... มาเลือกชูครีมอร่อยๆ กันเถอะ!</p>
          ) : (
            cartItems.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="item-info">
                  <h4>{item.product.name}</h4>
                  <p>฿{item.priceAtPurchase}</p>
                </div>
                <div className="item-controls">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="qty-btn" type="button">-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)} className="qty-btn" type="button">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <span>ยอดรวม:</span>
              <span className="price">฿{total}</span>
            </div>
            
            {/* Req C04 & C07 - Preorder time & Phone */}
            <div className="form-group">
              <label>เวลานัดรับสินค้า (วันนี้):</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} required />
            </div>
            <div className="form-group">
              <label style={{fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: '8px'}}>สะสมแต้ม / ติดตามคิว</label>
              <input type="tel" placeholder="กรอกเบอร์โทรศัพท์..." value={phone} onChange={e => setPhone(e.target.value)} required style={{padding: '16px', borderRadius: '12px'}} />
            </div>

            {phone.length >= 10 && !user && (
              <div className="anim-slide-up" style={{background: 'rgba(107, 91, 149, 0.05)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--color-primary)', marginTop: '16px'}}>
                <p style={{fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '12px'}}>✨ สมัครสมาชิกใหม่ (ครั้งแรก)</p>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                  <div className="form-group">
                    <input type="text" placeholder="ชื่อเล่น" value={nickname} onChange={e => setNickname(e.target.value)} style={{padding: '12px'}} />
                  </div>
                  <div className="form-group">
                    <input type="number" placeholder="อายุ" value={age} onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))} style={{padding: '12px'}} />
                  </div>
                </div>
              </div>
            )}

            {user && (
              <div className="anim-slide-up" style={{background: 'rgba(103, 146, 91, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-success)', marginTop: '16px'}}>
                <p style={{fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600}}>ยินดีต้อนรับกลับครับคุณ {user.nickname || user.name || 'ลูกค้า'}! 👋</p>
                <p style={{fontSize: '0.8rem', opacity: 0.8}}>แต้มสะสมปัจจุบัน: {user.points} แต้ม</p>
              </div>
            )}

            <button 
              className="btn btn-primary full-width" 
              onClick={() => onCheckout(pickupTime, phone)}
              disabled={!pickupTime || !phone || (!user && (phone.length >= 10 && (!nickname || !age)))}
              style={{marginTop: '20px', padding: '16px', borderRadius: '12px'}}
            >
              {!user && phone.length >= 10 ? 'สมัครสมาชิกและไปชำระเงิน' : 'ไปหน้าชำระเงิน'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
