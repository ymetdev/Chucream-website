import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToAllProducts, subscribeToStoreConfig, toggleProductAvailability, updateStoreConfig, subscribeToOrders, addLoyaltyPoints, getUserByPhone, createProduct, updateProduct, deleteProduct } from '../services/db';
import { useNotification } from '../shared/components/Notification';
import type { Product, Order } from '../shared/types';

export default function SettingsTab() {
  const { notify, confirm } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  
  // Sales Report logic
  const [orders, setOrders] = useState<Order[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<'location' | 'loyaltyRules' | 'manualPoints' | 'productForm' | null>(null);

  // Local config edits
  const [locName, setLocName] = useState('');
  const [boothNumber, setBoothNumber] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [promptpayNumber, setPromptpayNumber] = useState('');
  
  // Loyalty rules
  const [pointsPerBaht, setPointsPerBaht] = useState(100);
  const [discountPointsCost, setDiscountPointsCost] = useState(10);
  const [discountValue, setDiscountValue] = useState(10);
  const [freeSnackPointsCost, setFreeSnackPointsCost] = useState(50);
  const [freeSnackName, setFreeSnackName] = useState('🎁 Free Premium Choux');

  // Loyalty edits
  const [loyaltyPhone, setLoyaltyPhone] = useState('');
  const [loyaltyAdd, setLoyaltyAdd] = useState<number | ''>('');

  // New / Edited Product Form
  const [editId, setEditId] = useState<string | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number | ''>('');
  const [newProdImage, setNewProdImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleCreateOrUpdateProduct = async () => {
    if (!newProdName || !newProdPrice) return;
    setIsUploading(true);
    let finalImageUrl = newProdImage || '/choux_cream_hero.png';
    try {
      if (imageFile) {
        finalImageUrl = await compressImage(imageFile);
      }

      if (editId) {
        await updateProduct(editId, {
          name: newProdName,
          description: newProdDesc,
          price: Number(newProdPrice),
          imageUrl: finalImageUrl
        });
        notify('อัปเดตข้อมูลสินค้าสำเร็จ!');
      } else {
        await createProduct({
          name: newProdName,
          description: newProdDesc || 'Premium Choux Cream',
          price: Number(newProdPrice),
          imageUrl: finalImageUrl,
          stockStatus: 'available',
          isActive: true
        });
        notify('เพิ่มสินค้าใหม่เรียบร้อยแล้ว!');
      }
      setEditId(null);
      setNewProdName('');
      setNewProdDesc('');
      setNewProdPrice('');
      setNewProdImage('');
      setImageFile(null);
      setIsUploading(false);
      setActiveModal(null);
    } catch {
      notify('ไม่สามารถบันทึกสินค้าได้', 'error');
      setIsUploading(false);
    }
  };

  const handleEditClick = (p: Product) => {
    setEditId(p.id);
    setNewProdName(p.name);
    setNewProdDesc(p.description);
    setNewProdPrice(p.price);
    setNewProdImage(p.imageUrl || '');
    setImageFile(null);
    setActiveModal('productForm');
  };

  const handleLoadMocks = async () => {
    if (!await confirm({ message: 'ต้องการโหลดเมนูตัวอย่าง 4 รายการ ใช่หรือไม่?' })) return;
    try {
      await createProduct({name: 'Vanilla Bean Choux', description: 'Classic Madagascar vanilla custard', price: 65, imageUrl: '/choux_vanilla.png', stockStatus: 'available', isActive: true});
      await createProduct({name: 'Matcha Kyoto Choux', description: 'Premium Uji matcha cream', price: 75, imageUrl: '/choux_matcha.png', stockStatus: 'available', isActive: true});
      await createProduct({name: 'Dark Choco Mud', description: '70% Valrhona dark chocolate', price: 85, imageUrl: '/choux_choco.png', stockStatus: 'available', isActive: true});
      await createProduct({name: 'Strawberry Dream', description: 'Fresh Hokkaido milk & strawberries', price: 95, imageUrl: '/choux_strawberry.png', stockStatus: 'available', isActive: true});
      notify('โหลดข้อมูลตัวอย่างเรียบร้อย!');
    } catch {
      notify('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (await confirm({ message: 'คุณต้องการลบรายการนี้อย่างถาวรใช่หรือไม่?', type: 'danger' })) {
      await deleteProduct(id);
      notify('ลบสินค้าเรียบร้อยแล้ว');
    }
  };

  useEffect(() => {
    const unsubP = subscribeToAllProducts(setProducts);
    const unsubC = subscribeToStoreConfig((c) => {
      if (c && !locName) {
        setLocName(c.locationName);
        setBoothNumber(c.boothNumber);
        setMapUrl(c.mapUrl);
        setPromptpayNumber(c.promptpayNumber || '');
        setPointsPerBaht(c.pointsPerBaht || 100);
        setDiscountPointsCost(c.discountPointsCost || 10);
        setDiscountValue(c.discountValue || 10);
        setFreeSnackPointsCost(c.freeSnackPointsCost || 50);
        setFreeSnackName(c.freeSnackName || '🎁 Free Premium Choux');
      }
    });
    const unsubO = subscribeToOrders(setOrders);
    return () => { unsubP(); unsubC(); unsubO(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStock = async (id: string, nextStatus: string) => {
    await toggleProductAvailability(id, nextStatus);
  };

  const handleUpdateConfigWithClose = async () => {
    await updateStoreConfig({ 
      locationName: locName, 
      boothNumber, 
      mapUrl, 
      promptpayNumber,
      pointsPerBaht,
      discountPointsCost,
      discountValue,
      freeSnackPointsCost,
      freeSnackName
    });
    notify('อัปเดตการตั้งค่าระบบเรียบร้อย!');
    setActiveModal(null);
  };

  const handleManualLoyalty = async (isAdd: boolean) => {
    const amount = Number(loyaltyAdd);
    if (!loyaltyPhone || amount <= 0) return;
    try {
      const user = await getUserByPhone(loyaltyPhone);
      const pointsToModify = isAdd ? amount : -amount;
      await addLoyaltyPoints(loyaltyPhone, pointsToModify, user?.name);
      notify(isAdd ? 'เพิ่มแต้มให้ลูกค้าเรียบร้อย!' : 'ลดแต้มให้ลูกค้าเรียบร้อย!');
      setLoyaltyPhone('');
      setLoyaltyAdd('');
      setActiveModal(null);
    } catch {
      notify('ไม่สามารถอัปเดตแต้มได้', 'error');
    }
  };

  // Basic Sales Report calculation
  const completedOrders = orders.filter(o => o.status === 'completed');
  const todayRevenue = completedOrders.reduce((acc, o) => acc + o.totalPrice, 0);

  const renderModal = (title: string, content: React.ReactNode) => {
    return createPortal(
      <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(42,36,31,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => { setActiveModal(null); setEditId(null); setNewProdName(''); setNewProdDesc(''); setNewProdPrice(''); }}>
        <div className="surface-card anim-slide-up" style={{width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
            <h2 style={{margin: 0}}>{title}</h2>
            <button onClick={() => { setActiveModal(null); setEditId(null); setNewProdName(''); setNewProdDesc(''); setNewProdPrice(''); }} style={{fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)'}}>✖</button>
          </div>
          {content}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="anim-slide-up" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', paddingBottom: '80px'}}>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
        {/* Inventory & Stock [REQ-A04] */}
        <div className="surface-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 style={{margin: 0}}>จัดการสต็อกสินค้า</h3>
            <div style={{display: 'flex', gap: '8px'}}>
              <button className="btn btn-outline" style={{padding: '6px 12px', fontSize: '0.9rem'}} onClick={handleLoadMocks}>
                ✨ โหลดตัวอย่างเมนู
              </button>
              <button className="btn btn-primary" style={{padding: '6px 12px', fontSize: '0.9rem'}} onClick={() => { setEditId(null); setNewProdName(''); setNewProdDesc(''); setNewProdPrice(''); setActiveModal('productForm'); }}>
                + เพิ่มสินค้า
              </button>
            </div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {products.map(p => (
              <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <img src={p.imageUrl || '/choux_cream_hero.png'} alt={p.name} style={{width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover'}} />
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontWeight: 600}}>{p.name}</span>
                    <span style={{fontSize: '0.85rem', color: 'var(--color-text-light)'}}>฿{p.price}</span>
                  </div>
                </div>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <button className="badge" onClick={() => handleEditClick(p)} style={{background: 'var(--color-secondary)', color: 'var(--color-text)', border: 'none', cursor: 'pointer', padding: '8px 12px'}}>
                    ✏️
                  </button>
                  <button className="badge badge-danger" onClick={() => handleDeleteProduct(p.id)} style={{border: 'none', cursor: 'pointer', padding: '8px 12px'}}>
                    🗑️
                  </button>
                  <select 
                    className={`badge ${p.stockStatus === 'available' ? 'badge-success' : p.stockStatus === 'low_stock' ? 'badge-warning' : p.stockStatus === 'unavailable' ? 'badge-secondary' : 'badge-danger'}`}
                    style={{cursor: 'pointer', border: 'none', padding: '6px 12px', outline: 'none', background: p.stockStatus === 'unavailable' ? '#9ca3af' : undefined, color: p.stockStatus === 'unavailable' ? 'white' : undefined, fontSize: '0.85rem'}}
                    value={p.stockStatus}
                    onChange={(e) => handleToggleStock(p.id, e.target.value)}
                  >
                    <option value="available" style={{background: 'var(--color-bg)', color: 'var(--color-text)'}}>มีสินค้า</option>
                    <option value="low_stock" style={{background: 'var(--color-bg)', color: 'var(--color-text)'}}>ใกล้หมด</option>
                    <option value="sold_out" style={{background: 'var(--color-bg)', color: 'var(--color-text)'}}>หมด</option>
                    <option value="unavailable" style={{background: 'var(--color-bg)', color: 'var(--color-text)'}}>งดจำหน่ายชั่วคราว</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
        {/* Basic Sales Dashboard [REQ-A07] */}
        <div className="surface-card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3 style={{marginBottom: '16px'}}>รายงานการขาย (วันนี้)</h3>
          <div style={{background: 'var(--color-primary)', color: 'white', padding: '24px', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: '16px'}}>
            <div style={{fontSize: '1.2rem'}}>รายได้รวม</div>
            <div style={{fontSize: '3rem', fontWeight: 700}}>฿{todayRevenue}</div>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
            <span>ออเดอร์ที่สำเร็จ:</span> <strong>{completedOrders.length} รายการ</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <span>ออเดอร์รอดำเนินการ:</span> <strong>{orders.length - completedOrders.length} รายการ</strong>
          </div>
        </div>

        {/* Configurations Dashboard Hub */}
        <div className="surface-card">
          <h3 style={{marginBottom: '16px'}}>ตั้งค่าระบบ</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px'}}>
            <button className="btn btn-outline" style={{display: 'flex', flexDirection: 'column', padding: '20px 8px', gap: '12px', color: 'var(--color-text)'}} onClick={() => setActiveModal('location')}>
              <span style={{fontSize: '2rem'}}>📍</span>
              <span style={{fontSize: '0.9rem', fontWeight: 600}}>ข้อมูลร้านค้า</span>
            </button>
            <button className="btn btn-outline" style={{display: 'flex', flexDirection: 'column', padding: '20px 8px', gap: '12px', color: 'var(--color-text)'}} onClick={() => setActiveModal('loyaltyRules')}>
              <span style={{fontSize: '2rem'}}>⚙️</span>
              <span style={{fontSize: '0.9rem', fontWeight: 600}}>กฎสะสมแต้ม</span>
            </button>
            <button className="btn btn-outline" style={{display: 'flex', flexDirection: 'column', padding: '20px 8px', gap: '12px', color: 'var(--color-text)'}} onClick={() => setActiveModal('manualPoints')}>
              <span style={{fontSize: '2rem'}}>💎</span>
              <span style={{fontSize: '0.9rem', fontWeight: 600}}>จัดการแต้ม</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {activeModal === 'location' && renderModal('จัดการสถานที่ตั้งหลัก', 
        <>
          <div className="form-group">
            <label>ชื่อสถานที่ (เช่น ตลาดนัดจตุจักร)</label>
            <input value={locName} onChange={e => setLocName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>เลขที่บูธ / โซน</label>
            <input value={boothNumber} onChange={e => setBoothNumber(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Google Maps URL</label>
            <input value={mapUrl} onChange={e => setMapUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label>เบอร์ PromptPay</label>
            <input value={promptpayNumber} onChange={e => setPromptpayNumber(e.target.value)} placeholder="08xxxxxxxx" />
          </div>
          <button className="btn btn-primary full-width" onClick={handleUpdateConfigWithClose} style={{marginTop: '16px'}}>อัปเดตข้อมูลสดหน้าเว็บ</button>
        </>
      )}

      {activeModal === 'loyaltyRules' && renderModal('ตั้งค่าระบบสะสมแต้ม', 
        <>
          <div className="form-group">
            <label>จำนวนบาทที่คุ้มค่าต่อ 1 แต้ม</label>
            <input type="number" value={pointsPerBaht} onChange={e => setPointsPerBaht(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>มูลค่าส่วนลด (บาท)</label>
            <input type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>จำนวนแต้มที่ใช้แลกส่วนลด</label>
            <input type="number" value={discountPointsCost} onChange={e => setDiscountPointsCost(Number(e.target.value))} />
          </div>
          <hr style={{margin: '16px 0', border: 'none', borderBottom: '1px solid rgba(42,36,31,0.1)'}} />
          <div className="form-group">
            <label>แต้มที่ใช้แลกขนมฟรี</label>
            <input type="number" value={freeSnackPointsCost} onChange={e => setFreeSnackPointsCost(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>ชื่อรางวัลขนมฟรี</label>
            <input type="text" value={freeSnackName} onChange={e => setFreeSnackName(e.target.value)} />
          </div>
          <button className="btn btn-primary full-width" onClick={handleUpdateConfigWithClose} style={{marginTop: '16px'}}>บันทึกกฎใหม่</button>
        </>
      )}

      {activeModal === 'manualPoints' && renderModal('จัดการแต้มลูกค้าด้วยตนเอง', 
        <>
          <div className="form-group">
            <label>เบอร์โทรศัพท์ลูกค้า</label>
            <input type="text" value={loyaltyPhone} onChange={e => setLoyaltyPhone(e.target.value)} placeholder="08xxxxxxxx" />
          </div>
          <div className="form-group">
            <label>จำนวนแต้ม</label>
            <input type="number" min="1" value={loyaltyAdd} onChange={e => setLoyaltyAdd(e.target.value ? Number(e.target.value) : '')} placeholder="ระบุจำนวนแต้ม" />
          </div>
          <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
            <button className="btn full-width" style={{background: 'var(--color-primary)', color: 'white', border: 'none'}} onClick={() => handleManualLoyalty(true)} disabled={!loyaltyPhone || !loyaltyAdd}>+ เพิ่มแต้ม</button>
            <button className="btn full-width" style={{background: 'var(--color-danger, #ef4444)', color: 'white', border: 'none'}} onClick={() => handleManualLoyalty(false)} disabled={!loyaltyPhone || !loyaltyAdd}>- ลดแต้ม</button>
          </div>
        </>
      )}

      {activeModal === 'productForm' && renderModal(editId ? '✏️ แก้ไขเมนู' : '✨ เพิ่มเมนูใหม่', 
        <>
          <div className="form-group">
            <label>ชื่อสินค้า</label>
            <input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="เช่น ชูครีมมัทฉะ" />
          </div>
          <div className="form-group">
            <label>คำอธิบาย</label>
            <input value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} placeholder="เช่น ไส้ชาเขียวแท้จากญี่ปุ่น" />
          </div>
          <div className="form-group">
            <label>ราคา (บาท)</label>
            <input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>อัปโหลดรูปภาพเมนู</label>
            <input type="file" accept="image/*" onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setImageFile(e.target.files[0]);
              }
            }} style={{padding: '8px', background: 'var(--color-bg)', border: '1px solid rgba(42,36,31,0.1)', borderRadius: 'var(--radius-sm)'}} />
            {editId && !imageFile && newProdImage && newProdImage !== '/choux_cream_hero.png' && (
              <span style={{fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '6px'}}>
                ✓ มีรูปเดิมอยู่แล้ว อัปโหลดใหม่เพื่อแทนที่
              </span>
            )}
            {(!editId || newProdImage === '/choux_cream_hero.png') && !imageFile && (
              <span style={{fontSize: '0.85rem', color: 'var(--color-warning)', marginTop: '6px'}}>
                ไม่มีรูปภาพประกอบ ระบบจะใช้รูปมาตรฐานให้
              </span>
            )}
          </div>
          <button 
            className="btn btn-primary full-width" 
            onClick={handleCreateOrUpdateProduct} 
            style={{marginTop: '16px'}} 
            disabled={!newProdName || !newProdPrice || isUploading}
          >
            {isUploading ? 'กำลังบันทึกข้อมูล...' : (editId ? 'บันทึกการแก้ไข' : '+ เพิ่มเข้าเมนู')}
          </button>
        </>
      )}

    </div>
  );
}
