import { useState, useEffect } from 'react';
import { subscribeToProducts, subscribeToStoreConfig } from '../services/db';
import type { Product, StoreConfig } from '../shared/types';
import './Storefront.css';

export default function StorefrontHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<StoreConfig | null>(null);

  useEffect(() => {
    const unsubProducts = subscribeToProducts(setProducts);
    const unsubConfig = subscribeToStoreConfig(setConfig);
    return () => {
      unsubProducts();
      unsubConfig();
    };
  }, []);

  return (
    <div className="storefront">

      {/* Hero Section */}
      <header className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <div className="badge badge-warning anim-slide-up" style={{marginBottom: '20px', borderRadius: '20px', padding: '8px 20px'}}>✨ ชูครีมทำมือระดับพรีเมียม</div>
          <h1 className="anim-slide-up">ที่สุดของประสบการณ์ชูครีม</h1>
          <p className="anim-slide-up" style={{animationDelay: '0.1s'}}>พิถีพิถันทุกขั้นตอน อร่อยเต็มคำกับไส้ครีมสุดพรีเมียม</p>
          <div className="anim-slide-up" style={{animationDelay: '0.2s', display: 'flex', gap: '16px', justifyContent: 'center'}}>
            <button 
              className="btn btn-primary" 
              style={{padding: '16px 36px', fontSize: '1.1rem', borderRadius: '30px'}}
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            >
              ดูเมนูแนะนำ
            </button>
            <button 
              className="btn btn-outline" 
              style={{padding: '16px 36px', fontSize: '1.1rem', borderRadius: '30px', color: 'white', borderColor: 'white'}}
              onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
            >
              เรื่องราวของเรา
            </button>
          </div>
        </div>
      </header>

      <div className="container main-content">
        {/* Benefits Section */}
        <section id="benefits" className="benefits-grid anim-slide-up">
          <div className="benefit-card surface-card">
            <span className="benefit-icon">🥖</span>
            <h4>อบสดใหม่ทุกวัน</h4>
            <p>ชูครีมของเราอบสดใหม่ทุกวันเพื่อให้ได้ความกรอบที่สมบูรณ์แบบในทุกคำที่กัด</p>
          </div>
          <div className="benefit-card surface-card">
            <span className="benefit-icon">🥛</span>
            <h4>วัตถุดิบพรีเมียม</h4>
            <p>ทำจากเนยแท้ 100% ไข่ออร์แกนิก และวานิลลาแท้คุณภาพเยี่ยม</p>
          </div>
          <div className="benefit-card surface-card">
            <span className="benefit-icon">⚡</span>
            <h4>เช็กสต็อก Real-time</h4>
            <p>รับข้อมูลสต็อกขนมล่าสุดได้ทันที ไม่ต้องกลัวมาเก้อ รู้ก่อนใครว่าไส้ไหนยังเหลืออยู่</p>
          </div>
        </section>

        {/* Live Location Widget [REQ-C02] */}
        <section className="location-widget anim-slide-up">
          <div className="location-info">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '12px', margin: 0}}>
              <span style={{fontSize: '2rem'}}>📍</span> 
              พบกับเราได้ที่ {config?.locationName || 'ตลาดนัดจตุจักร'}
            </h3>
            <p style={{color: 'var(--color-text-light)', marginLeft: '42px', marginTop: '4px', fontSize: '1.1rem'}}>บูธ: <strong>{config?.boothNumber || 'G15'}</strong></p>
          </div>
          <a href={config?.mapUrl || '#'} target="_blank" rel="noreferrer" className="btn btn-primary" style={{borderRadius: 'var(--radius-round)', padding: '12px 24px'}}>ขอเส้นทาง</a>
        </section>

        {/* Catalog [REQ-C01] */}
        <section id="catalog" className="catalog">
          <h2 className="section-title">เมนูแนะนำ</h2>
          <p className="section-subtitle">เลือกอร่อยกับไส้ครีมในฝันของคุณ</p>
          
          <div className="product-grid">
            {products.length === 0 ? (
               <div className="surface-card" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px'}}>
                 <p style={{marginBottom: '24px', fontSize: '1.2rem'}}>กำลังวอร์มเตาอบ...</p>
                 <div className="badge badge-warning anim-pulse" style={{padding: '12px 24px'}}>เช็กความสุก</div>
               </div>
            ) : (
              [...products].sort((a, b) => {
                if (a.stockStatus === 'unavailable' && b.stockStatus !== 'unavailable') return 1;
                if (a.stockStatus !== 'unavailable' && b.stockStatus === 'unavailable') return -1;
                return 0;
              }).map((p, idx) => (
                <div key={p.id} className="surface-card product-card anim-slide-up" style={{
                  animationDelay: `${idx * 0.05}s`,
                  opacity: p.stockStatus === 'unavailable' ? 0.75 : 1
                }}>
                  <div className="product-img-wrapper">
                    <img src={p.imageUrl} alt={p.name} className="product-img" style={{
                      opacity: p.stockStatus === 'unavailable' ? 0.25 : 1,
                      filter: p.stockStatus === 'unavailable' ? 'grayscale(100%)' : 'none'
                    }} />
                    {/* Stock Visibility [REQ-C03] */}
                    {p.stockStatus === 'sold_out' && <span className="badge badge-danger badge-floating">สินค้าหมด</span>}
                    {p.stockStatus === 'low_stock' && <span className="badge badge-warning badge-floating">ของใกล้หมด</span>}
                    {p.stockStatus === 'unavailable' && <span className="badge badge-floating" style={{background: '#9ca3af', color: 'white'}}>งดจำหน่ายชั่วคราว</span>}
                  </div>
                  <div className="product-details">
                    <h3>{p.name}</h3>
                    <p className="price">฿{p.price}</p>
                    <p className="desc">{p.description}</p>
                    {/* Pre-order removed, just viewing [REQ-C04 updated] */}
                    <div 
                      className={`badge ${p.stockStatus === 'available' ? 'badge-success' : p.stockStatus === 'unavailable' ? 'badge-secondary' : 'badge-danger'}`}
                      style={{marginTop: 'auto', padding: '12px', textAlign: 'center', borderRadius: '8px', fontWeight: 600, background: p.stockStatus === 'unavailable' ? '#9ca3af' : undefined, color: p.stockStatus === 'unavailable' ? 'white' : undefined}}
                    >
                      {p.stockStatus === 'sold_out' ? 'สินค้าหมดแล้ว' : p.stockStatus === 'unavailable' ? 'งดจำหน่ายชั่วคราว' : 'มีจำหน่ายที่หน้าร้าน'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h2>Choux Cream PWA</h2>
              <p>สรรค์สร้างประสบการณ์ชูครีมที่สมบูรณ์แบบตั้งแต่ปี 2024 คุณภาพที่คุณสัมผัสได้</p>
            </div>
            <div className="footer-links">
              <h4>ลิงก์ด่วน</h4>
              <ul>
                <li><a href="#catalog">เมนู</a></li>
                <li><a href="#benefits">เรื่องราวของเรา</a></li>
                <li><a href="/tracker">ติดตามคำสั่งซื้อ</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>ติดต่อเรา</h4>
              <ul>
                <li><a href="#">LINE: @chouxpwa</a></li>
                <li><a href="#">Instagram: @chouxpwa</a></li>
                <li><a href="#">Facebook: Choux PWA</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            &copy; 2024 Choux Cream Artisan. สงวนลิขสิทธิ์. ทำด้วย ❤️ ที่กรุงเทพฯ
          </div>
        </div>
      </footer>

    </div>
  );
}
