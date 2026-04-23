import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToAllProducts, subscribeToStoreConfig, toggleProductAvailability, updateStoreConfig, addLoyaltyPoints, getUserByPhone, createProduct, updateProduct, deleteProduct, clearAllOrders, clearAllCounters } from '../services/db';
import { useNotification } from '../shared/components/Notification';
import type { Product } from '../shared/types';

export default function SettingsTab() {
  const { notify, confirm } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
  const [freeSnackName, setFreeSnackName] = useState('Reward: Free Premium Choux');

  // Social Media
  const [instagramUser, setInstagramUser] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [lineId, setLineId] = useState('');
  const [tiktokUser, setTiktokUser] = useState('');

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
  const [isClearing, setIsClearing] = useState(false);

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
    let productsLoaded = false;
    let configLoaded = false;
    const checkLoading = () => { if(productsLoaded && configLoaded) setIsLoading(false); };

    const unsubP = subscribeToAllProducts(list => { setProducts(list); productsLoaded = true; checkLoading(); });
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
        setFreeSnackName(c.freeSnackName || 'Reward: Free Premium Choux');
        setInstagramUser(c.instagramUser || '');
        setFacebookLink(c.facebookLink || '');
        setLineId(c.lineId || '');
        setTiktokUser(c.tiktokUser || '');
      }
      configLoaded = true; checkLoading();
    });
    return () => { unsubP(); unsubC(); };
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
      freeSnackName,
      instagramUser,
      facebookLink,
      lineId,
      tiktokUser
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

  const handleClearHistory = async () => {
    const isSure = await confirm({ 
      message: 'ต้องการล้างประวัติคำสั่งซื้อและรหัสคิวทั้งหมดใช่หรือไม่? (ข้อมูลจะถูกลบถาวร กู้คืนไม่ได้)', 
      type: 'danger' 
    });
    if (!isSure) return;

    setIsClearing(true);
    try {
      await clearAllOrders();
      await clearAllCounters();
      notify('ล้างข้อมูลทดสอบทั้งหมดเรียบร้อยแล้ว!');
    } catch (err) {
      console.error(err);
      notify('เกิดข้อผิดพลาดในการล้างข้อมูล', 'error');
    }
    setIsClearing(false);
  };


  const renderModal = (title: string, content: React.ReactNode) => {
    return createPortal(
      <div className="modal-overlay admin-theme-provider" onClick={() => { setActiveModal(null); setEditId(null); setNewProdName(''); setNewProdDesc(''); setNewProdPrice(''); }}>
        <div className="modal-content anim-slide-up" onClick={e => e.stopPropagation()}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px'}}>
            <h2 style={{margin: 0, fontFamily: 'var(--font-heading)'}}>{title}</h2>
            <button onClick={() => { setActiveModal(null); setEditId(null); setNewProdName(''); setNewProdDesc(''); setNewProdPrice(''); }} style={{fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', opacity: 0.5}}>✖</button>
          </div>
          {content}
        </div>
      </div>,
      document.body
    );
  };

  if (isLoading) {
    return <div className="loading-state" style={{marginTop: '40px', fontSize: '1.2rem', fontWeight: 600}}>กำลังโหลดการตั้งค่า...</div>;
  }

  return (
    <div className="settings-grid anim-slide-up">
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
        {/* Inventory & Stock [REQ-A04] */}
        <div className="dashboard-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
            <h3 style={{margin: 0, fontFamily: 'var(--font-heading)'}}>จัดการสต็อกสินค้า</h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <button className="btn btn-outline" style={{padding: '8px 16px', fontSize: '0.85rem'}} onClick={handleLoadMocks}>
                โหลดตัวอย่างเมนู
              </button>
              <button className="btn btn-primary" style={{padding: '8px 16px', fontSize: '0.85rem'}} onClick={() => { setEditId(null); setNewProdName(''); setNewProdDesc(''); setNewProdPrice(''); setActiveModal('productForm'); }}>
                + เพิ่มสินค้าใหม่
              </button>
            </div>
          </div>

          <div style={{display: 'flex', flexDirection: 'column'}}>
            {products.map(p => (
              <div key={p.id} className="inventory-card" style={{opacity: p.stockStatus === 'unavailable' ? 0.6 : 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                  <div style={{position: 'relative'}}>
                    <img src={p.imageUrl || '/choux_cream_hero.png'} alt={p.name} style={{
                      width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover'
                    }} />
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontWeight: 700, fontSize: '1.05rem'}}>{p.name}</span>
                    <span style={{fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600}}>฿{p.price}</span>
                  </div>
                </div>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <button className="qty-btn minus" onClick={() => handleEditClick(p)} style={{width: '36px', height: '36px', background: 'var(--pos-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem'}}>แก้ไข</button>
                  <button className="qty-btn minus" onClick={() => handleDeleteProduct(p.id)} style={{width: '36px', height: '36px', background: 'rgba(231, 76, 60, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '0.8rem'}}>ลบ</button>
                  
                  <select 
                    className={`badge ${p.stockStatus === 'available' ? 'badge-success' : p.stockStatus === 'low_stock' ? 'badge-warning' : p.stockStatus === 'unavailable' ? 'badge-secondary' : 'badge-danger'}`}
                    style={{
                      cursor: 'pointer', 
                      border: '1px solid rgba(0,0,0,0.05)', 
                      padding: '8px 12px', 
                      borderRadius: '12px',
                      outline: 'none', 
                      fontSize: '0.85rem', 
                      fontWeight: 700
                    }}
                    value={p.stockStatus}
                    onChange={(e) => handleToggleStock(p.id, e.target.value)}
                  >
                    <option value="available">มีสินค้า</option>
                    <option value="low_stock">ใกล้หมด</option>
                    <option value="sold_out">หมด</option>
                    <option value="unavailable">งดขาย</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>

        {/* Configurations Dashboard Hub */}
        <div className="dashboard-card">
          <h3 style={{marginBottom: '24px', fontFamily: 'var(--font-heading)'}}>ตั้งค่าระบบ</h3>
          <div className="setting-hub-grid">
            <div className="setting-hub-card" onClick={() => setActiveModal('location')}>
              <span>ข้อมูลร้าน</span>
            </div>
            <div className="setting-hub-card" onClick={() => setActiveModal('loyaltyRules')}>
              <span>กฎสะสมแต้ม</span>
            </div>
            <div className="setting-hub-card" onClick={() => setActiveModal('manualPoints')}>
              <span>จัดการแต้ม</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card" style={{borderColor: 'rgba(231, 76, 60, 0.2)', background: 'rgba(231, 76, 60, 0.02)'}}>
          <h3 style={{marginBottom: '16px', color: 'var(--color-danger)', fontFamily: 'var(--font-heading)'}}>เขตอันตราย (Danger Zone)</h3>
          <p style={{fontSize: '0.9rem', color: 'var(--color-text-light)', marginBottom: '20px'}}>ลบข้อมูลออเดอร์และรหัสคิวทิ้งทั้งหมด เหมาะสำหรับใช้รีเซ็ตระบบหลังจบช่วงทดสอบครับ</p>
          <button 
            className="btn" 
            style={{background: 'var(--color-danger)', color: 'white', width: '100%', padding: '16px'}} 
            onClick={handleClearHistory}
            disabled={isClearing}
          >
            {isClearing ? 'กำลังลบข้อมูล...' : 'ล้างประวัติออเดอร์ทั้งหมด'}
          </button>
        </div>
      </div>

      {/* MODALS */}
      {activeModal === 'location' && renderModal('จัดการสถานที่ตั้งหลัก', 
        <>
          <div className="form-group">
            <label>ชื่อสถานที่</label>
            <input value={locName} onChange={e => setLocName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>เลขที่บูธ</label>
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
          <hr style={{margin: '20px 0', border: 'none', borderBottom: '1px solid rgba(42,36,31,0.1)'}} />
          <h4 style={{marginBottom: '16px'}}>โซเชียลมีเดีย</h4>
          <div className="form-group">
            <label>Instagram User</label>
            <input value={instagramUser} onChange={e => setInstagramUser(e.target.value)} placeholder="@username" />
          </div>
          <div className="form-group">
            <label>Facebook Page Link</label>
            <input value={facebookLink} onChange={e => setFacebookLink(e.target.value)} placeholder="URL" />
          </div>
          <div className="form-group">
            <label>LINE Official ID</label>
            <input value={lineId} onChange={e => setLineId(e.target.value)} placeholder="@lineid" />
          </div>
          <div className="form-group">
            <label>TikTok User</label>
            <input value={tiktokUser} onChange={e => setTiktokUser(e.target.value)} placeholder="@username" />
          </div>
          <button className="btn btn-primary full-width" onClick={handleUpdateConfigWithClose} style={{marginTop: '16px'}}>อัปเดตข้อมูลทั้งหมด</button>
        </>
      )}

      {activeModal === 'loyaltyRules' && renderModal('ตั้งค่าระบบสะสมแต้ม', 
        <>
          <div className="form-group">
            <label>จำนวนบาทต่อ 1 แต้ม</label>
            <input type="number" value={pointsPerBaht} onChange={e => setPointsPerBaht(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>มูลค่าส่วนลด (บาท)</label>
            <input type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>แต้มที่ใช้แลกส่วนลด</label>
            <input type="number" value={discountPointsCost} onChange={e => setDiscountPointsCost(Number(e.target.value))} />
          </div>
          <hr style={{margin: '16px 0', border: 'none', borderBottom: '1px solid rgba(42,36,31,0.1)'}} />
          <div className="form-group">
            <label>แต้มที่ใช้แลกขนมฟรี</label>
            <input type="number" value={freeSnackPointsCost} onChange={e => setFreeSnackPointsCost(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>ชื่อขนมฟรี</label>
            <input type="text" value={freeSnackName} onChange={e => setFreeSnackName(e.target.value)} />
          </div>
          <button className="btn btn-primary full-width" onClick={handleUpdateConfigWithClose} style={{marginTop: '16px'}}>บันทึกกฎใหม่</button>
        </>
      )}

      {activeModal === 'manualPoints' && renderModal('จัดการแต้มลูกค้า', 
        <>
          <div className="form-group">
            <label>เบอร์โทรศัพท์ลูกค้า</label>
            <input type="text" value={loyaltyPhone} onChange={e => setLoyaltyPhone(e.target.value)} placeholder="08xxxxxxxx" />
          </div>
          <div className="form-group">
            <label>จำนวนแต้ม</label>
            <input type="number" min="1" value={loyaltyAdd} onChange={e => setLoyaltyAdd(e.target.value ? Number(e.target.value) : '')} placeholder="ระบุแต้ม" />
          </div>
          <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
            <button className="btn btn-primary full-width" onClick={() => handleManualLoyalty(true)} disabled={!loyaltyPhone || !loyaltyAdd}>+ เพิ่มแต้ม</button>
            <button className="btn full-width" style={{background: 'var(--color-secondary)', color: 'white'}} onClick={() => handleManualLoyalty(false)} disabled={!loyaltyPhone || !loyaltyAdd}>- ลดแต้ม</button>
          </div>
        </>
      )}

      {activeModal === 'productForm' && renderModal(editId ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่', 
        <>
          <div className="form-group">
            <label>ชื่อสินค้า</label>
            <input value={newProdName} onChange={e => setNewProdName(e.target.value)} placeholder="ชื่อสินค้า" />
          </div>
          <div className="form-group">
            <label>คำอธิบาย</label>
            <input value={newProdDesc} onChange={e => setNewProdDesc(e.target.value)} placeholder="คำอธิบาย" />
          </div>
          <div className="form-group">
            <label>ราคา (บาท)</label>
            <input type="number" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>รูปภาพ</label>
            <input type="file" accept="image/*" onChange={e => {
              if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
            }} />
          </div>
          <button 
            className="btn btn-primary full-width" 
            onClick={handleCreateOrUpdateProduct} 
            disabled={!newProdName || !newProdPrice || isUploading}
            style={{marginTop: '16px'}}
          >
            {isUploading ? 'กำลังบันทึก...' : (editId ? 'บันทึกการแก้ไข' : '+ เพิ่มเมนู')}
          </button>
        </>
      )}

    </div>
  );
}
