import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotification } from '../shared/components/Notification';
import { createOrder, getUserByPhone, subscribeToStoreConfig, addLoyaltyPoints } from '../services/db';
import type { Order, UserTarget, StoreConfig } from '../shared/types';
import './Checkout.css';

export default function CheckoutFlow() {
  const { notify } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems, pickupTime, customerPhone } = location.state || {};

  const [user, setUser] = useState<UserTarget | null>(null);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localCart, setLocalCart] = useState<any[]>(cartItems || []);
  const [discount, setDiscount] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState<number | ''>('');

  useEffect(() => {
    const unsubC = subscribeToStoreConfig(setConfig);
    if (!cartItems) {
      navigate('/');
    } else if (customerPhone) {
      getUserByPhone(customerPhone).then(setUser);
    }
    return () => { unsubC(); };
  }, [cartItems, customerPhone, navigate]);

  if (!cartItems) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pbRatio = config?.pointsPerBaht || 100;
  const discountCost = config?.discountPointsCost || 10;
  const discValue = config?.discountValue || 10;
  const freeCost = config?.freeSnackPointsCost || 50;
  const freeName = config?.freeSnackName || 'Free Premium Choux';

  const subtotal = localCart.reduce((acc: number, item: any) => acc + item.priceAtPurchase * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleRedeemDiscount = () => {
    if (user && user.points - pointsUsed >= discountCost) {
      setDiscount(discount + discValue);
      setPointsUsed(pointsUsed + discountCost);
    }
  };

  const handleRedeemFreeItem = () => {
     if (user && user.points - pointsUsed >= freeCost) {
       setLocalCart([...localCart, { 
         productId: 'free_reward', 
         quantity: 1, 
         priceAtPurchase: 0, 
         product: { id: 'free_reward', name: freeName, price: 0, stockStatus: 'available', isActive: true, imageUrl: '/choux_cream_hero.png', description: 'Loyalty Reward' } 
       }]);
       setPointsUsed(pointsUsed + freeCost);
     }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const pointsEarned = Math.floor(total / pbRatio);
      const netPoints = pointsEarned - pointsUsed;
      if (netPoints !== 0 && customerPhone) {
        await addLoyaltyPoints(customerPhone, netPoints, nickname || 'Customer', nickname, Number(age) || 0);
      }

      const orderData: Omit<Order, 'id' | 'queueNumber'> = {
        customerPhone: customerPhone || '',
        customerName: user?.name || 'Walk-in',
        items: localCart.map((c: any) => ({
          productId: c.productId,
          quantity: c.quantity,
          priceAtPurchase: c.priceAtPurchase
        })),
        totalPrice: total,
        pickupTime,
        status: 'pending',
        paymentMethod: 'promptpay',
        paymentStatus: 'paid', // assumes upload slip check triggers approval in a real app
        createdAt: Date.now()
      };
      const orderId = await createOrder(orderData);
      navigate(`/queue/${orderId}`);
    } catch (e) {
      console.error(e);
      notify('ไม่สามารถดำเนินการชำระเงินได้', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="container payment-flow anim-slide-up">
      <h2 className="section-title" style={{marginBottom: '0'}}>ชำระเงิน</h2>
      
      <div className="surface-card summary-card">
        <h3>สรุปรายการสั่งซื้อ</h3>
        <ul style={{listStyle: 'none', marginBottom: '24px'}}>
        {localCart.map((item: any, idx: number) => (
          <li key={idx} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <span>{item.quantity}x {item.product.name}</span>
            <strong>฿{item.priceAtPurchase * item.quantity}</strong>
          </li>
        ))}
      </ul>
      
      <div style={{display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px dashed rgba(42,36,31,0.1)', fontSize: '1.2rem', fontWeight: 700}}>
        <span>ยอดรวม</span>
        <span>฿{subtotal}</span>
      </div>
      
      {discount > 0 && (
        <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', color: 'var(--color-danger)', fontSize: '1.1rem', fontWeight: 600}}>
          <span>ส่วนลด (ใช้ {pointsUsed} แต้ม)</span>
          <span>-฿{discount}</span>
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderTop: '2px dashed rgba(42,36,31,0.1)', fontSize: '1.4rem', fontWeight: 700}}>
        <span>ยอดสุทธิ</span>
        <span style={{color: 'var(--color-primary)'}}>฿{total}</span>
      </div>

      {user && (
        <div style={{background: 'rgba(107, 91, 149, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px'}}>
          <strong style={{color: 'var(--color-primary)', fontSize: '1.1rem'}}>สมาชิก: {user.name}</strong>
          <br/><span style={{fontSize: '0.95rem'}}>แต้มคงเหลือ: {user.points - pointsUsed} แต้ม</span>
          
          <div style={{marginTop: '16px'}}>
            <p style={{fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600}}>แลกของรางวัล:</p>
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                className="btn btn-primary" 
                style={{flex: 1, padding: '8px', fontSize: '0.85rem'}} 
                onClick={handleRedeemDiscount} 
                disabled={user.points - pointsUsed < discountCost}
              >
                ลด ฿{discValue}<br/>({discountCost} แต้ม)
              </button>
              <button 
                className="btn btn-primary" 
                style={{flex: 1, padding: '8px', fontSize: '0.85rem'}} 
                onClick={handleRedeemFreeItem} 
                disabled={user.points - pointsUsed < freeCost}
              >
                รับฟรี!<br/>({freeCost} แต้ม)
              </button>
              {pointsUsed > 0 && (
                <button 
                  className="btn btn-outline" 
                  style={{padding: '8px', fontSize: '0.85rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)'}} 
                  onClick={() => { setDiscount(0); setPointsUsed(0); setLocalCart(cartItems); }}
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {!user && (
        <div className="surface-card registration-card anim-slide-up">
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px'}}>
            <div style={{background: 'var(--color-primary)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>!</div>
            <h3 style={{margin: 0}}>สมัครสมาชิกสะสมแต้ม</h3>
          </div>
          <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '20px'}}>ดูเหมือนว่าคุณยังไม่ได้เป็นสมาชิก ของเรา กรุณากรอกข้อมูลเพื่อรับสิทธิพิเศษและสะสมแต้มครับ</p>
          
          <div className="form-grid">
            <div className="form-group">
              <label>ชื่อเล่นของคุณ</label>
              <input 
                type="text" 
                placeholder="เช่น น้องชู" 
                value={nickname} 
                onChange={e => setNickname(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>อายุ (ปี)</label>
              <input 
                type="number" 
                placeholder="เช่น 25" 
                value={age} 
                onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>
      )}

        <p className="pickup-time">เวลานัดรับสินค้า: <strong>{pickupTime}</strong></p>
      </div>

      <div className="surface-card qr-card" style={{textAlign: 'center'}}>
        <h3>สแกนเพื่อชำระเงิน</h3>
        <p>กรุณาสแกนจ่ายด้วยแอปธนาคารใดก็ได้</p>
        <div className="qr-placeholder">
           <img 
              src={`https://promptpay.io/${config?.promptpayNumber || '0000000000'}/${total}.png`} 
              alt="PromptPay QR" 
              width="250" 
              style={{borderRadius: '16px'}} 
           />
        </div>
        <button 
          className="btn btn-primary full-width" 
          onClick={handleConfirm} 
          disabled={isProcessing}
          style={{marginTop: '24px', padding: '16px', borderRadius: '12px'}}
        >
          {isProcessing ? 'กำลังดำเนินการ...' : 'แจ้งโอนเงินและเสร็จสิ้น'}
        </button>
      </div>
    </div>
  );
}
