import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToProducts, subscribeToStoreConfig, createOrder, getUserByPhone, addLoyaltyPoints } from '../services/db';
import { useNotification } from '../shared/components/Notification';
import type { Product, OrderItem, UserTarget, StoreConfig } from '../shared/types';

export default function POSTab() {
  const { notify } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<(OrderItem & { product: Product })[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [user, setUser] = useState<UserTarget | null>(null);
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  
  const [showQR, setShowQR] = useState(false);
  const [showCashConfirm, setShowCashConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [manualDiscountType, setManualDiscountType] = useState<'baht' | 'percent'>('baht');
  const [manualDiscountValue, setManualDiscountValue] = useState<number | ''>('');
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState<number | ''>('');

  useEffect(() => {
    let productsLoaded = false;
    let configLoaded = false;
    const checkLoading = () => { if(productsLoaded && configLoaded) setIsLoading(false); };

    const unsub = subscribeToProducts(list => { setProducts(list); productsLoaded = true; checkLoading(); });
    const unsubC = subscribeToStoreConfig(c => { setConfig(c); configLoaded = true; checkLoading(); });
    return () => { unsub(); unsubC(); };
  }, []);

  useEffect(() => {
    const checkPhone = async () => {
      if (customerPhone.length >= 10) {
        const u = await getUserByPhone(customerPhone);
        setUser(u);
      } else {
        setUser(null);
      }
    };
    checkPhone();
  }, [customerPhone]);

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
  const freeName = config?.freeSnackName || 'Reward: Free Premium Choux';

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
        await addLoyaltyPoints(customerPhone, netPoints, nickname || 'Customer', nickname, Number(age) || 0);
      }

      const orderData = {
        customerPhone,
        customerName: user?.name || 'Walk-in',
        items: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          priceAtPurchase: c.priceAtPurchase
        })),
        totalPrice: total,
        pickupTime: 'Now',
        status: 'pending' as const, 
        paymentMethod: method,
        paymentStatus: 'paid' as const,
        createdAt: Date.now()
      };
      
      const { queueNumber } = await createOrder(orderData);
      
      notify('ส่งออเดอร์ไปที่ห้องครัวแล้ว!', 'success');
      
      setCart([]);
      setCustomerPhone('');
      setUser(null);
      setNickname('');
      setAge('');
      setDiscount(0);
      setPointsUsed(0);
      setManualDiscountValue('');
      setShowQR(false);
      setSuccessMsg(`ออเดอร์ ${queueNumber} บันทึกสำเร็จ! (ได้รับ ${pointsEarned} แต้ม, ใช้ไป ${pointsUsed} แต้ม)`);
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการชำระเงิน', 'error');
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return <div className="loading-state" style={{marginTop: '40px', fontSize: '1.2rem', fontWeight: 600}}>กำลังโหลดเครื่อง POS...</div>;
  }

  return (
    <div className="pos-layout anim-slide-up">
      {/* Menu / Catalog */}
      <div className="pos-menu">
        <h2 style={{marginBottom: '24px', fontFamily: 'var(--font-heading)'}}>รายการสินค้า</h2>
        <div className="pos-grid">
          {products.map(p => (
            <div 
              key={p.id} 
              className={`pos-item-card ${(p.stockStatus === 'sold_out' || p.stockStatus === 'unavailable') ? 'disabled' : ''}`}
              onClick={() => (p.stockStatus !== 'sold_out' && p.stockStatus !== 'unavailable') && addToCart(p)}
            >
              <img src={p.imageUrl || '/choux_cream_hero.png'} alt={p.name} />
              <div className="pos-item-name">{p.name}</div>
              <div className="pos-item-price">฿{p.price}</div>
              
              {p.stockStatus === 'low_stock' && <div className="badge badge-warning" style={{marginTop: '8px', fontSize: '0.7rem'}}>ของใกล้หมด</div>}
              {p.stockStatus === 'sold_out' && <div className="badge badge-danger" style={{marginTop: '8px', fontSize: '0.7rem'}}>สินค้าหมด</div>}
              {p.stockStatus === 'unavailable' && <div className="badge" style={{marginTop: '8px', fontSize: '0.7rem', background: '#9ca3af', color: 'white'}}>งดจำหน่าย</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket / Cart */}
      <div className="pos-ticket">
        {!showQR ? (
          <>
            <div className="ticket-header">
              <h3 style={{margin: 0}}>รายการสั่งซื้อ</h3>
              {cart.length > 0 && (
                <button 
                  className="btn-text" 
                  style={{color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: 600}}
                  onClick={() => { setCart([]); setCustomerPhone(''); setUser(null); setDiscount(0); setPointsUsed(0); setManualDiscountValue(''); }}
                >
                  ล้างรายการ
                </button>
              )}
            </div>
            
            <div className="ticket-items">
              {cart.map((item, idx) => (
                <div key={idx} className="ticket-item">
                  <div className="ticket-item-info">
                    <span style={{fontWeight: 600, fontSize: '1rem'}}>{item.product.name}</span>
                    <span style={{color: 'var(--color-text-light)', fontSize: '0.85rem'}}>฿{item.priceAtPurchase} × {item.quantity}</span>
                  </div>
                  <div className="qty-control">
                    <button className="qty-btn minus" onClick={() => handleUpdateQty(item.productId, -1)}>-</button>
                    <span style={{fontWeight: 700, minWidth: '20px', textAlign: 'center'}}>{item.quantity}</span>
                    <button className="qty-btn plus" onClick={() => handleUpdateQty(item.productId, 1)}>+</button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div style={{textAlign: 'center', padding: '60px 0', opacity: 0.4}}>
                  <div style={{fontSize: '3rem', marginBottom: '12px', color: 'var(--color-primary)', opacity: 0.2}}>Cart</div>
                  <p>ยังไม่มีรายการสินค้า</p>
                </div>
              )}
            </div>

            <div className="ticket-summary">
              <div className="summary-row">
                <span>ยอดรวม</span>
                <span>฿{subtotal}</span>
              </div>
              
              <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                <button 
                  className="btn btn-outline" 
                  style={{padding: '8px 12px', fontSize: '0.85rem', flex: 1}} 
                  onClick={() => setShowDiscountModal(true)}
                  disabled={cart.length === 0}
                >
                  🏷️ เพิ่มส่วนลด
                </button>
              </div>

              {(discount > 0 || manualDiscountAmt > 0) && (
                <div style={{background: 'rgba(37, 99, 235, 0.05)', padding: '12px', borderRadius: '12px', marginBottom: '16px'}}>
                  {discount > 0 && <div className="summary-row" style={{color: 'var(--color-primary)', marginBottom: '4px'}}>
                    <span>แต้มส่วนลด</span>
                    <span>-฿{discount}</span>
                  </div>}
                  {manualDiscountAmt > 0 && <div className="summary-row" style={{color: 'var(--color-primary)', margin: 0}}>
                    <span>ส่วนลด ({manualDiscountType === 'percent' ? manualDiscountValue+'%' : 'พิเศษ'})</span>
                    <span>-฿{manualDiscountAmt.toFixed(2)}</span>
                  </div>}
                </div>
              )}

              <div className="total-row">
                <span>สุทธิ</span>
                <div>฿{total}</div>
              </div>

              <div className="form-group" style={{marginTop: '24px', marginBottom: '16px'}}>
                <label style={{fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px', display: 'block'}}>
                  ข้อมูลลูกค้า (สะสมแต้ม)
                </label>
                <input 
                  type="text" 
                  placeholder="กรอกเบอร์โทรศัพท์ 10 หลัก..." 
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  style={{
                    background: '#f8f9fa',
                    border: '1px solid var(--pos-border)',
                    padding: '16px',
                    borderRadius: '16px',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    letterSpacing: '1px'
                  }}
                />
              </div>

              {user ? (
                <div style={{padding: '16px', background: 'var(--color-bg)', borderRadius: '20px', border: '1px solid var(--pos-accent)', marginBottom: '16px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                    <div>
                      <div style={{fontWeight: 700, color: 'var(--color-primary)'}}>
                        {user.nickname || user.name} {user.age ? `(${user.age} ปี)` : ''}
                      </div>
                      <div style={{fontSize: '0.85rem', opacity: 0.6}}>สะสมอยู่: {user.points - pointsUsed} แต้ม</div>
                    </div>
                  </div>
                  
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button className="btn btn-primary" style={{padding: '8px', fontSize: '0.8rem', flex: 1, borderRadius: '10px'}} onClick={handleRedeemDiscount} disabled={user.points - pointsUsed < 10}>
                      ลด ฿10 (10แต้ม)
                    </button>
                    <button className="btn btn-primary" style={{padding: '8px', fontSize: '0.8rem', flex: 1, borderRadius: '10px'}} onClick={handleRedeemFreeItem} disabled={user.points - pointsUsed < 50}>
                      แถมฟรี! (50แต้ม)
                    </button>
                  </div>
                </div>
              ) : customerPhone.length >= 10 && (
                <div style={{padding: '16px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '20px', border: '1px dashed var(--pos-accent)', marginBottom: '16px'}}>
                  <div style={{fontWeight: 700, color: 'var(--color-primary)', marginBottom: '12px', fontSize: '0.9rem'}}>ลงทะเบียนสมาชิกใหม่</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                    <input 
                      type="text" 
                      placeholder="ชื่อเล่น" 
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      style={{padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--pos-border)', fontSize: '0.85rem'}}
                    />
                    <input 
                      type="number" 
                      placeholder="อายุ" 
                      value={age}
                      onChange={e => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{padding: '8px 12px', borderRadius: '12px', border: '1px solid var(--pos-border)', fontSize: '0.85rem'}}
                    />
                  </div>
                </div>
              )}

              <div className="checkout-actions">
                <button 
                  className="btn btn-checkout btn-cash" 
                  onClick={() => setShowCashConfirm(true)}
                  disabled={isProcessing || cart.length === 0}
                >
                  Cash
                </button>
                <button 
                  className="btn btn-checkout btn-qr" 
                  onClick={() => setShowQR(true)}
                  disabled={isProcessing || cart.length === 0}
                >
                  QR Pay
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%'}}>
            <button className="btn-text" onClick={() => setShowQR(false)} style={{alignSelf: 'flex-start', marginBottom: '20px'}}>← กลับไปแก้ไข</button>
            <h2 style={{fontFamily: 'var(--font-heading)'}}>PromptPay Payment</h2>
            <div style={{fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: '16px 0'}}>฿{total}</div>
            
            <div style={{flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid var(--pos-border)'}}>
               <img src={`https://promptpay.io/${config?.promptpayNumber || '0800000000'}/${total}.png`} alt="PromptPay QR" width="240" style={{mixBlendMode: 'multiply'}} />
            </div>

            <button className="btn btn-primary full-width" style={{marginTop: '32px', padding: '20px', borderRadius: '20px', fontSize: '1.2rem'}} onClick={() => handleCheckoutSubmit('promptpay')} disabled={isProcessing}>
              {isProcessing ? 'กำลังบันทึก...' : 'ยืนยันการรับเงิน'}
            </button>
          </div>
        )}
      </div>

      {showCashConfirm && createPortal(
        <div className="admin-theme-provider" style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setShowCashConfirm(false)}>
          <div className="surface-card anim-slide-up" style={{maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', boxShadow: 'var(--shadow-lg)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom: '16px', color: 'var(--color-text)', fontSize: '1.6rem'}}>ยืนยันการรับเงินสด</h3>
            <div style={{fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '16px', lineHeight: 1}}>
              ฿{total}
            </div>
            <p style={{color: 'var(--color-text-light)', marginBottom: '32px', fontSize: '1.05rem'}}>คุณได้รับเงินสดจากลูกค้าครบถ้วนแล้วใช่ไหม?</p>
            <div style={{display: 'flex', gap: '12px'}}>
              <button className="btn btn-outline" onClick={() => setShowCashConfirm(false)} style={{flex: 1, padding: '16px', fontSize: '1.1rem'}} disabled={isProcessing}>
                ยกเลิก
              </button>
              <button 
                className="btn btn-primary" 
                onClick={async () => { 
                  await handleCheckoutSubmit('cash'); 
                  setShowCashConfirm(false); 
                }} 
                style={{flex: 1, padding: '16px', fontSize: '1.1rem', background: 'var(--color-success)'}}
                disabled={isProcessing}
              >
                {isProcessing ? 'กำลังบันทึก...' : 'ยืนยันการจ่ายเงิน'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {successMsg && createPortal(
        <div className="admin-theme-provider" style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setSuccessMsg('')}>
          <div className="surface-card anim-slide-up" style={{maxWidth: '400px', width: '90%', textAlign: 'center', padding: '40px', boxShadow: 'var(--shadow-lg)'}} onClick={e => e.stopPropagation()}>
            <div style={{fontSize: '4rem', marginBottom: '16px', color: 'var(--color-success)'}}>Success</div>
            <h3 style={{marginBottom: '16px', color: 'var(--color-success)', fontSize: '1.8rem'}}>ส่งไปยังห้องครัวแล้ว!</h3>
            <p style={{color: 'var(--color-text-light)', marginBottom: '32px', fontSize: '1.1rem'}}>{successMsg.replace('Payment complete!', 'ชำระเงินเรียบร้อย!').replace('Earned', 'ได้รับ').replace('Used', 'ใช้ไป').replace('pts', 'แต้ม')}</p>
            <button className="btn btn-primary full-width" onClick={() => setSuccessMsg('')} style={{padding: '16px', fontSize: '1.1rem'}}>
              ปิดและรับออเดอร์ถัดไป
            </button>
          </div>
        </div>,
        document.body
      )}

      {showDiscountModal && createPortal(
        <div className="admin-theme-provider" style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setShowDiscountModal(false)}>
          <div className="surface-card anim-slide-up" style={{maxWidth: '400px', width: '90%', padding: '32px', boxShadow: 'var(--shadow-lg)'}} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom: '20px', color: 'var(--color-text)', fontSize: '1.4rem'}}>จัดการส่วนลดพิเศษ</h3>
            
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
