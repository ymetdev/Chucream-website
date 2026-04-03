import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToProducts, subscribeToStoreConfig, createOrder, getUserByPhone, addLoyaltyPoints } from '../services/db';
import { useNotification } from '../shared/components/Notification';
import type { Product, OrderItem, UserTarget, Order, StoreConfig } from '../shared/types';

export default function POSTab() {
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<(OrderItem & { product: Product })[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [user, setUser] = useState<UserTarget | null>(null);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [discount, setDiscount] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  
  const [showQR, setShowQR] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [manualDiscountType, setManualDiscountType] = useState<'baht' | 'percent'>('baht');
  const [manualDiscountValue, setManualDiscountValue] = useState<number | ''>('');

  useEffect(() => {
    const unsub = subscribeToProducts(setProducts);
    const unsubC = subscribeToStoreConfig(setConfig);
    return () => { unsub(); unsubC(); };
  }, []);

  const handlePhoneCheck = async () => {
    if (customerPhone.length >= 9) {
      const u = await getUserByPhone(customerPhone);
      setUser(u);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, quantity: 1, priceAtPurchase: product.price, product }];
    });
  };

  const pbRatio = config?.pointsPerBaht || 100;
  const discountCost = config?.discountPointsCost || 10;
  const discValue = config?.discountValue || 10;
  const freeCost = config?.freeSnackPointsCost || 50;
  const freeName = config?.freeSnackName || '🎁 Free Premium Choux';

  const handleRedeemDiscount = () => {
    if (user && user.points - pointsUsed >= discountCost) {
      setDiscount(discount + discValue);
      setPointsUsed(pointsUsed + discountCost);
    }
  };

  const handleRedeemFreeItem = () => {
     if (user && user.points - pointsUsed >= freeCost) {
       setCart([...cart, { 
         productId: 'free_reward', 
         quantity: 1, 
         priceAtPurchase: 0, 
         product: { id: 'free_reward', name: freeName, price: 0, stockStatus: 'available', isActive: true, imageUrl: '/choux_cream_hero.png', description: 'Loyalty Reward' } 
       }]);
       setPointsUsed(pointsUsed + freeCost);
     }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.productId === productId) {
        return { ...c, quantity: c.quantity + delta };
      }
      return c;
    }).filter(c => c.quantity > 0)); 
  };

  const subtotal = cart.reduce((acc, item) => acc + item.priceAtPurchase * item.quantity, 0);
  
  const manualDiscountAmt = manualDiscountValue === '' ? 0 : (manualDiscountType === 'percent' ? (subtotal * manualDiscountValue) / 100 : manualDiscountValue);
  const totalDiscount = discount + manualDiscountAmt;
  const total = Math.max(0, subtotal - totalDiscount);

  const handleCheckoutSubmit = async (method: 'cash' | 'promptpay') => {
    setIsProcessing(true);
    try {
      const pointsEarned = Math.floor(total / pbRatio);
      const netPoints = pointsEarned - pointsUsed;
      if (netPoints !== 0 && customerPhone) {
        await addLoyaltyPoints(customerPhone, netPoints);
      }

      const orderData: Omit<Order, 'id'> = {
        customerPhone,
        customerName: user?.name || 'Walk-in',
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          priceAtPurchase: c.priceAtPurchase
        })),
        totalPrice: total,
        pickupTime: 'Now',
        status: 'pending', 
        paymentMethod: method,
        paymentStatus: 'paid',
        createdAt: Date.now()
      };
      
      await createOrder(orderData);
      
      setCart([]);
      setCustomerPhone('');
      setUser(null);
      setDiscount(0);
      setPointsUsed(0);
      setManualDiscountValue('');
      setShowQR(false);
      setSuccessMsg(`Payment complete! Earned ${pointsEarned} pts. (Used ${pointsUsed} pts)`);
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการชำระเงิน', 'error');
    }
    setIsProcessing(false);
  };

  return (
    <div className="pos-layout anim-slide-up">
      {/* Menu / Catalog */}
      <div className="pos-menu">
        <h3 style={{marginBottom: '16px'}}>รายการสินค้า</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
          {products.map(p => (
            <button 
              key={p.id} 
              className="surface-card pos-item-btn"
              onClick={() => addToCart(p)}
              disabled={p.stockStatus === 'sold_out' || p.stockStatus === 'unavailable'}
              style={{
                textAlign: 'left', 
                opacity: (p.stockStatus === 'sold_out' || p.stockStatus === 'unavailable') ? 0.5 : 1,
                border: '1px solid var(--color-accent)',
                padding: '16px',
                transition: 'transform 0.1s'
              }}
            >
              <img src={p.imageUrl || '/choux_cream_hero.png'} alt={p.name} style={{width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '16px'}} />
              <div style={{fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px', lineHeight: 1.2}}>{p.name}</div>
              <div style={{color: 'var(--color-primary)', fontWeight: '600'}}>฿{p.price}</div>
              {p.stockStatus === 'low_stock' && <div className="badge badge-warning" style={{marginTop: '12px', fontSize: '0.7rem'}}>ของใกล้หมด</div>}
              {p.stockStatus === 'unavailable' && <div className="badge" style={{marginTop: '12px', fontSize: '0.7rem', background: '#9ca3af', color: 'white'}}>งดจำหน่ายชั่วคราว</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket / Cart */}
      <div className="surface-card pos-ticket" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        {!showQR ? (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '16px', marginBottom: '16px'}}>
              <h3 style={{margin: 0}}>รายการสั่งซื้อ</h3>
              {cart.length > 0 && (
                <button 
                  className="btn btn-outline" 
                  style={{padding: '6px 12px', fontSize: '0.9rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', borderRadius: 'var(--radius-sm)'}}
                  onClick={() => { setCart([]); setCustomerPhone(''); setUser(null); setDiscount(0); setPointsUsed(0); setManualDiscountValue(''); }}
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>
            
            <div style={{flexGrow: 1, overflowY: 'auto'}}>
              {cart.map((item, idx) => (
                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(42,36,31,0.05)', alignItems: 'center'}}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontWeight: 500}}>{item.product.name}</span>
                    <strong style={{color: 'var(--color-primary)'}}>฿{item.priceAtPurchase * item.quantity}</strong>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '4px', borderRadius: 'var(--radius-round)'}}>
                    <button className="badge" onClick={() => handleUpdateQty(item.productId, -1)} style={{cursor: 'pointer', background: 'var(--color-surface)', border: '1px solid #ddd', padding: '4px 10px', color: 'var(--color-text)'}} type="button">-</button>
                    <span style={{fontWeight: 700, minWidth: '24px', textAlign: 'center'}}>{item.quantity}</span>
                    <button className="badge" onClick={() => handleUpdateQty(item.productId, 1)} style={{cursor: 'pointer', background: 'var(--color-primary)', color: 'white', padding: '4px 10px'}} type="button">+</button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <div style={{color: 'var(--color-text-light)', textAlign: 'center', margin: '40px 0'}}>ยังไม่มีรายการ... กดเลือกสินค้าเพื่อสั่งซื้อ</div>}
            </div>

            <div style={{borderTop: '1px solid #ddd', paddingTop: '16px', marginTop: '16px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                <div style={{fontSize: '1.1rem', fontWeight: 600}}>ยอดรวม: ฿{subtotal}</div>
                <button 
                  className="badge" 
                  style={{background: 'var(--color-bg)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', cursor: 'pointer', padding: '6px 12px'}} 
                  onClick={() => setShowDiscountModal(true)}
                  disabled={cart.length === 0}
                >
                  🏷️ เพิ่มส่วนลด
                </button>
              </div>
              <div style={{fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px'}}>
                {discount > 0 && <div style={{color: 'var(--color-danger)', fontSize: '1rem', fontWeight: 500}}>แต้มส่วนลด: -฿{discount}</div>}
                {manualDiscountAmt > 0 && <div style={{color: 'var(--color-danger)', fontSize: '1rem', fontWeight: 500}}>ส่วนลดพิเศษ: -฿{manualDiscountAmt.toFixed(2)} {manualDiscountType === 'percent' && `(${manualDiscountValue}%)`}</div>}
                <div style={{fontSize: '1.4rem', marginTop: '8px'}}>ยอดสุทธิ: ฿{total}</div>
              </div>

              <div className="form-group" style={{marginBottom: '16px'}}>
                <input 
                  type="text" 
                  placeholder="เบอร์โทรศัพท์ลูกค้า (สำหรับสะสมแต้ม)" 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  onBlur={handlePhoneCheck}
                  style={{padding: '16px', fontSize: '1rem'}}
                />
              </div>
              {user && (
                <div style={{marginTop: '12px', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)'}}>
                  <strong style={{color: 'var(--color-primary)'}}>คุณลูกค้า: {user.name}</strong>
                  <br/>แต้มสะสม: {user.points - pointsUsed}
                  
                  <div style={{display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center'}}>
                    <button className="btn btn-primary" style={{padding: '8px', fontSize: '0.85rem', flex: 1}} onClick={handleRedeemDiscount} disabled={user.points - pointsUsed < 10}>
                      ลด ฿10<br/>(10 แต้ม)
                    </button>
                    <button className="btn btn-primary" style={{padding: '8px', fontSize: '0.85rem', flex: 1}} onClick={handleRedeemFreeItem} disabled={user.points - pointsUsed < 50}>
                      รับฟรี!<br/>(50 แต้ม)
                    </button>
                    {pointsUsed > 0 && (
                      <button className="btn btn-outline" style={{padding: '8px', fontSize: '0.85rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)'}} onClick={() => { setDiscount(0); setPointsUsed(0); setCart(cart.filter(c => c.productId !== 'free_reward')); }}>
                         ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div style={{display: 'flex', gap: '12px', marginTop: 'auto'}}>
                <button 
                  className="btn btn-outline" 
                  style={{flex: 1, padding: '16px', fontSize: '1.2rem', borderColor: 'var(--color-success)', color: 'var(--color-success)'}}
                  onClick={() => setShowCashConfirm(true)}
                  disabled={isProcessing || cart.length === 0}
                >
                  💵 เงินสด
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{flex: 1, padding: '16px', fontSize: '1.2rem'}}
                  onClick={() => setShowQR(true)}
                  disabled={isProcessing || cart.length === 0}
                >
                  📱 QR Pay
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%'}}>
            <h3>สแกนจ่ายด้วย PromptPay</h3>
            <p style={{color: 'var(--color-text-light)', marginBottom: '24px'}}>ยอดที่ต้องชำระ: ฿{total}</p>
            
            <div style={{flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
               <img src={`https://promptpay.io/${config?.promptpayNumber || '0800000000'}/${total}.png`} alt="PromptPay QR" width="250" style={{borderRadius: '16px', boxShadow: 'var(--shadow-sm)'}} />
            </div>

            <div style={{display: 'flex', gap: '12px', marginTop: '24px'}}>
              <button className="btn btn-outline full-width" onClick={() => setShowQR(false)}>ย้อนกลับ</button>
              <button className="btn btn-primary full-width" onClick={() => handleCheckoutSubmit('promptpay')} disabled={isProcessing}>
                {isProcessing ? 'กำลังบันทึก...' : 'ยืนยันการโอนเงิน'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showCashConfirm && createPortal(
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(42,36,31,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setShowCashConfirm(false)}>
          <div className="surface-card anim-slide-up" style={{maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', boxShadow: 'var(--shadow-lg)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom: '16px', color: 'var(--color-text)', fontSize: '1.6rem'}}>ยืนยันการรับเงินสด</h3>
            <div style={{fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '16px', lineHeight: 1}}>
              ฿{total}
            </div>
            <p style={{color: 'var(--color-text-light)', marginBottom: '32px', fontSize: '1.05rem'}}>คุณได้รับเงินสดจากลูกค้าครบถ้วนแล้วใช่ไหม?</p>
            <div style={{display: 'flex', gap: '12px'}}>
              <button className="btn btn-outline" onClick={() => setShowCashConfirm(false)} style={{flex: 1, padding: '16px', fontSize: '1.1rem'}}>
                ยกเลิก
              </button>
              <button className="btn btn-primary" onClick={() => { setShowCashConfirm(false); handleCheckoutSubmit('cash'); }} style={{flex: 1, padding: '16px', fontSize: '1.1rem', background: 'var(--color-success)'}}>
                ยืนยันการจ่ายเงิน
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {successMsg && createPortal(
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(42,36,31,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setSuccessMsg('')}>
          <div className="surface-card anim-slide-up" style={{maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', boxShadow: 'var(--shadow-lg)'}} onClick={e => e.stopPropagation()}>
            <div style={{fontSize: '4rem', marginBottom: '16px'}}>✅</div>
            <h3 style={{marginBottom: '16px', color: 'var(--color-success)', fontSize: '1.8rem'}}>ส่งไปยังห้องเครื่องแล้ว!</h3>
            <p style={{color: 'var(--color-text-light)', marginBottom: '32px', fontSize: '1.1rem'}}>{successMsg.replace('Payment complete!', 'ชำระเงินเรียบร้อย!').replace('Earned', 'ได้รับ').replace('Used', 'ใช้ไป').replace('pts', 'แต้ม')}</p>
            <button className="btn btn-primary full-width" onClick={() => setSuccessMsg('')} style={{padding: '16px', fontSize: '1.1rem'}}>
              ปิดและรับออเดอร์ถัดไป
            </button>
          </div>
        </div>,
        document.body
      )}

      {showDiscountModal && createPortal(
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(42,36,31,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setShowDiscountModal(false)}>
          <div className="surface-card anim-slide-up" style={{maxWidth: '400px', width: '90%', padding: '32px', boxShadow: 'var(--shadow-lg)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom: '20px', color: 'var(--color-text)', fontSize: '1.4rem'}}>🏷️ จัดการส่วนลดพิเศษ</h3>
            
            <div style={{display: 'flex', gap: '8px', marginBottom: '20px'}}>
              <button 
                className={`btn ${manualDiscountType === 'baht' ? 'btn-primary' : 'btn-outline'}`} 
                style={{flex: 1, padding: '10px 8px'}} 
                onClick={() => setManualDiscountType('baht')}
              >
                ลดเป็นเงิน (฿)
              </button>
              <button 
                className={`btn ${manualDiscountType === 'percent' ? 'btn-primary' : 'btn-outline'}`} 
                style={{flex: 1, padding: '10px 8px'}} 
                onClick={() => setManualDiscountType('percent')}
              >
                แบบเปอร์เซ็นต์ (%)
              </button>
            </div>

            <div className="form-group" style={{marginBottom: '28px'}}>
              <label>ระบุจำนวน {manualDiscountType === 'baht' ? '(บาท)' : '(%)'}</label>
              <input 
                type="number" 
                min="0"
                placeholder={manualDiscountType === 'baht' ? 'เช่น 20' : 'เช่น 10'}
                value={manualDiscountValue}
                onChange={e => setManualDiscountValue(e.target.value ? Number(e.target.value) : '')}
                style={{fontSize: '1.2rem', padding: '14px', textAlign: 'center'}}
              />
            </div>

            <div style={{display: 'flex', gap: '12px'}}>
              <button className="btn btn-outline" onClick={() => { setManualDiscountValue(''); setShowDiscountModal(false); }} style={{flex: 1, padding: '12px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)'}}>
                ลบส่วนลด
              </button>
              <button className="btn btn-primary" onClick={() => setShowDiscountModal(false)} style={{flex: 1, padding: '12px'}}>
                ยืนยันส่วนลด
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
