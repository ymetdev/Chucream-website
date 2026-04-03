import { useState } from 'react';
import type { Product, OrderItem } from '../shared/types';
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
              <label>เบอร์โทรศัพท์ (สำหรับสะสมแต้ม/ติดตามคิว):</label>
              <input type="tel" placeholder="08XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>

            <button 
              className="btn btn-primary full-width" 
              onClick={() => onCheckout(pickupTime, phone)}
              disabled={!pickupTime || !phone}
              style={{marginTop: '20px', padding: '16px', borderRadius: '12px'}}
            >
              ไปหน้าชำระเงิน
            </button>
          </div>
        )}
      </div>
    </>
  );
}
