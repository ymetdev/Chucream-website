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
        <div className="hero-content anim-slide-up">
          <div className="tape"></div>
          <h1>ชูวิทส์</h1>
          <p>อร่อยแบบตะโกน ไม่กั๊กไส้</p>

          <div className="hero-buttons" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            >
              ดูเมนูโคตรตึง
            </button>
            <button
              className="btn btn-outline"
              onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
            >
              ทำไมต้องร้านเรา?
            </button>
          </div>
        </div>

        <div className="hero-image-sticker anim-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="tape" style={{ transform: 'translateX(-50%) rotate(10deg)' }}></div>
          <img src="/choux_cream_hero.png" alt="Choux Cream" />
        </div>
      </header>

      <div className="container main-content">

        {/* Benefits Section */}
        <section id="benefits" className="benefits-grid anim-slide-up">
          <div className="benefit-card">
            <div className="tape" style={{ left: '20px', transform: 'rotate(-15deg)' }}></div>
            <span className="benefit-icon">🔥</span>
            <h4>อบใหม่ทุกวัน</h4>
            <p>สดๆ ร้อนๆ ออกจากเตา กรอบนอกนุ่มในสไตล์วัยรุ่นทำเอง</p>
          </div>
          <div className="benefit-card">
            <div className="tape" style={{ left: 'auto', right: '20px', transform: 'rotate(10deg)' }}></div>
            <span className="benefit-icon">🧈</span>
            <h4>เนยแท้ 100%</h4>
            <p>ไม่หวงของ หอมทะลุแมสก์ คัดมาแต่ของดีๆ ให้พวกแกกิน</p>
          </div>
          <div className="benefit-card">
            <div className="tape" style={{ transform: 'rotate(-5deg)' }}></div>
            <span className="benefit-icon">📱</span>
            <h4>เช็กสต็อก Real-time</h4>
            <p>หมดก็บอกว่าหมด จะได้ไม่ต้องมาเก้อ เข้าใจป่าว!</p>
          </div>
        </section>

        {/* Location Banner */}
        <div style={{ textAlign: 'center', margin: '40px 0' }}>
          <div className="location-banner anim-slide-up">
            <span>📍 วันนี้ซุ่มอยู่: <strong>{config?.locationName || 'ตลาดรถไฟ'}</strong> บูธ <strong>{config?.boothNumber || '5'}</strong></span>
            <a href={config?.mapUrl || '#'} target="_blank" rel="noreferrer" className="map-link-btn">
              วาร์ปไปดูแผนที่ 🗺️
            </a>
          </div>
        </div>

        {/* Catalog Section */}
        <section id="catalog" className="catalog-section">
          <div style={{ textAlign: 'center' }}>
            <h2 className="section-title-doodle anim-slide-up">เมนูวันนี้มีอะไรบ้างวะ?</h2>
          </div>

          <div className="product-grid">
            {products.length === 0 ? (
              <div className="polaroid-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', transform: 'rotate(0)' }}>
                <h3 style={{ fontSize: '2rem' }}>กำลังวอร์มเตา... รอแป๊บ! ⏳</h3>
              </div>
            ) : (
              [...products].sort((a, b) => {
                if (a.stockStatus === 'unavailable' && b.stockStatus !== 'unavailable') return 1;
                if (a.stockStatus !== 'unavailable' && b.stockStatus === 'unavailable') return -1;
                return 0;
              }).map((p, idx) => (
                <div key={p.id} className="polaroid-card anim-slide-up" style={{
                  animationDelay: `${idx * 0.1}s`,
                  opacity: p.stockStatus === 'unavailable' ? 0.6 : 1
                }}>
                  <div className="tape"></div>
                  <div className="product-img-wrapper" style={{ borderColor: p.stockStatus === 'unavailable' ? '#999' : 'black' }}>
                    <img src={p.imageUrl} alt={p.name} className="product-img" style={{
                      filter: p.stockStatus === 'unavailable' ? 'grayscale(100%) blur(2px)' : undefined
                    }} />
                    {p.stockStatus === 'sold_out' && <span className="badge-floating" style={{ background: 'var(--color-danger)' }}>SOLD OUT! 😭</span>}
                    {p.stockStatus === 'low_stock' && <span className="badge-floating" style={{ background: 'var(--color-warning)' }}>จะหมดแล้ว! 🔥</span>}
                    {p.stockStatus === 'unavailable' && <span className="badge-floating" style={{ background: '#666' }}>พักก่อน 💤</span>}
                  </div>
                  <div className="product-details">
                    <h3>{p.name}</h3>
                    <p className="desc">{p.description}</p>
                    <div className="price-tag">฿{p.price}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Social Wall */}
        <section className="social-section anim-slide-up" style={{ marginTop: '120px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="section-title-doodle" style={{ background: 'var(--color-accent)', transform: 'rotate(2deg)' }}>ตามกันต่อ!</h2>
          </div>

          <div className="bento-grid">
            <a href={`https://instagram.com/${config?.instagramUser?.replace('@', '') || ''}`} target="_blank" rel="noreferrer" className="bento-card">
              <h3 className="bento-title">IG</h3>
              <p className="bento-desc">{config?.instagramUser || '@chouxcream.bkk'}</p>
            </a>
            <a href={config?.facebookLink || '#'} target="_blank" rel="noreferrer" className="bento-card">
              <h3 className="bento-title">FB Page</h3>
              <p className="bento-desc">ไปด่า เอ้ย ไปชมกันได้</p>
            </a>
            <a href={`https://line.me/R/ti/p/~${config?.lineId?.replace('@', '') || ''}`} target="_blank" rel="noreferrer" className="bento-card">
              <h3 className="bento-title">LINE</h3>
              <p className="bento-desc">{config?.lineId || '@chouxcream'}<br />ทักมาจองล่วงหน้า</p>
            </a>
            <a href={`https://tiktok.com/@${config?.tiktokUser?.replace('@', '') || ''}`} target="_blank" rel="noreferrer" className="bento-card">
              <h3 className="bento-title">TikTok</h3>
              <p className="bento-desc">{config?.tiktokUser || '@chouxcream'}<br />คลิปปั่นๆ</p>
            </a>
          </div>
        </section>
      </div>

      <footer className="footer-doodle">
        <div className="container">
          <h2>CHOUX CREAM</h2>
          <p>ทำด้วยใจ กินด้วยปาก ชูครีมที่วัยรุ่น 99% บอกว่าอร่อย (อีก 1% ยังไม่ได้ชิม)</p>
          <div style={{ borderTop: '3px dashed #333', paddingTop: '20px', marginTop: '40px', fontWeight: 800 }}>
            &copy; 2024 Choux Cream Artisan. NO COPY ALLOWED.
          </div>
        </div>
      </footer>

    </div>
  );
}
