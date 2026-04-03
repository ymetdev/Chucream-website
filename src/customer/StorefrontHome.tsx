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
          {/* Badge removed per request */}
          <h1 className="anim-slide-up">กัดคำไหน... ก็เจอกับความสุข</h1>
          <p className="anim-slide-up" style={{animationDelay: '0.1s'}}>อบสดใหม่ทุกวัน อัดไส้ครีมให้แน่นๆ จนล้นคำ...<br/>เพราะเราอยากให้คุณได้ทานของอร่อยที่สุด</p>
          
          {/* Location Info Integrated in Hero [REQ-C02 updated] */}
          {/* Redesigned Location Banner [REQ-C02 updated] */}
          <div className="anim-slide-up" style={{animationDelay: '0.15s'}}>
            <div className="location-banner">
              <span className="location-text">
                <svg viewBox="0 0 24 24" fill="var(--color-secondary)" style={{width: '20px', height: '20px'}}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                วันนี้พบกับเราที่ <strong>{config?.locationName || 'ตลาดรถไฟ ศรีนครินทร์'}</strong> บูธ <strong>{config?.boothNumber || '5'}</strong>
              </span>
              <a href={config?.mapUrl || '#'} target="_blank" rel="noreferrer" className="map-link-btn">
                ดูแผนที่ 🗺️
              </a>
            </div>
          </div>

          <div className="anim-slide-up" style={{animationDelay: '0.2s', display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px'}}>
            <button 
              className="btn btn-primary" 
              style={{padding: '16px 36px', fontSize: '1.1rem', borderRadius: '30px'}}
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            >
              แวะดูเมนูวันนี้
            </button>
            <button 
              className="btn btn-outline" 
              style={{padding: '16px 36px', fontSize: '1.1rem', borderRadius: '30px', color: 'white', borderColor: 'white'}}
              onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
            >
              รู้จักเราให้มากขึ้น
            </button>
          </div>
        </div>
      </header>

      <div className="container main-content">
        {/* Benefits Section */}
        <section id="benefits" className="benefits-grid anim-slide-up">
          <div className="benefit-card surface-card">
            <span className="benefit-icon" style={{fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 700}}>FRESH</span>
            <h4>อบใหม่จากเตาทุกเช้า</h4>
            <p>เราอบขนมสดๆ ใหม่ๆ ทุกวัน เพราะความกรอบหอมคือหัวใจของชูครีมร้านเราครับ</p>
          </div>
          <div className="benefit-card surface-card">
            <span className="benefit-icon" style={{fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 700}}>PREMIUM</span>
            <h4>ของดี... เราถึงกล้าใช้</h4>
            <p>คัดแต่เนยแท้หอมๆ และแป้งคุณภาพดีมาทำ เพราะเราอยากให้ทุกคนได้ทานของที่มีคุณภาพจริงๆ</p>
          </div>
          <div className="benefit-card surface-card">
            <span className="benefit-icon" style={{fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 700}}>LIVE</span>
            <h4>ไม่ต้องรอเก้อ</h4>
            <p>เช็กสต็อกหน้าเว็บได้ตลอดเวลา จะได้รู้ว่าไส้ที่เล็งไว้ยังเหลืออยู่ไหม ไม่ต้องมาเสียเที่ยวแน่นอน</p>
          </div>
        </section>



        {/* Live Location Widget removed from here, moved to Hero */}
        

        {/* Catalog [REQ-C01] */}
        <section id="catalog" className="catalog">
          <h2 className="section-title">วันนี้มีอะไรน่ากินบ้าง?</h2>
          <p className="section-subtitle">เลือกความอร่อยที่ถูกใจคุณได้เลย</p>
          
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
                      className={`badge ${['available', 'low_stock'].includes(p.stockStatus) ? 'badge-success' : p.stockStatus === 'unavailable' ? 'badge-secondary' : 'badge-danger'}`}
                      style={{marginTop: 'auto', padding: '12px', display: 'flex', justifyContent: 'center', borderRadius: '8px', fontWeight: 600, background: p.stockStatus === 'unavailable' ? '#9ca3af' : undefined, color: p.stockStatus === 'unavailable' ? 'white' : undefined}}
                    >
                      {p.stockStatus === 'sold_out' ? 'สินค้าหมดแล้ว' : p.stockStatus === 'unavailable' ? 'งดจำหน่ายชั่วคราว' : 'มีจำหน่ายที่หน้าร้าน'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>





        {/* Social Bento Section [NEW/REPLACEMENT] */}
        <section className="social-section anim-slide-up">
          <h2 className="section-title">มาเป็นเพื่อนกับเรานะ</h2>
          <p className="section-subtitle">เรามีขนมใหม่ๆ และบรรยากาศน่ารักๆ มาฝากเสมอทุกช่องทางเลย</p>
          
          <div className="bento-grid">
            {/* Instagram Card - Large */}
            <a href={`https://instagram.com/${config?.instagramUser?.replace('@', '') || ''}`} target="_blank" rel="noreferrer" className="bento-card large">
              <div className="bento-content">
                <h3 className="bento-title">Instagram</h3>
                <p className="bento-desc">{config?.instagramUser || '@chouxcream.bkk'}<br/>แวะมาดูสตอรี่การทำขนมสดๆ และรูปสวยๆ ได้ที่นี่นะคะ</p>
                <div className="badge badge-primary" style={{marginTop: '20px', background: 'var(--color-primary)', color: 'white'}}>Follow Us!</div>
              </div>
            </a>

            {/* Facebook Card - Medium */}
            <a href={config?.facebookLink || '#'} target="_blank" rel="noreferrer" className="bento-card medium">
              <div className="bento-content">
                <h3 className="bento-title">Facebook Page</h3>
                <p className="bento-desc">ตามไปเล่นกิจกรรมร่วมสนุก แจกขนมฟรีๆ และอัปเดตตารางการออกบูธตลาดนัดได้เลยจ้า</p>
              </div>
            </a>

            {/* Line Card - Small */}
            <a href={`https://line.me/R/ti/p/~${config?.lineId?.replace('@', '') || ''}`} target="_blank" rel="noreferrer" className="bento-card small">
              <div className="bento-content">
                <h3 className="bento-title">LINE Official</h3>
                <p className="bento-desc">{config?.lineId || '@chouxcream'}<br/>ทักมาจองล่วงหน้าได้เลย!</p>
              </div>
            </a>

            {/* TikTok Card - Small */}
            <a href={`https://tiktok.com/@${config?.tiktokUser?.replace('@', '') || ''}`} target="_blank" rel="noreferrer" className="bento-card small">
              <div className="bento-content">
                <h3 className="bento-title">TikTok</h3>
                <p className="bento-desc">{config?.tiktokUser || '@chouxcream'}<br/>คลิปเบื้องหลังการทำขนมแบบเพลินๆ</p>
              </div>
            </a>
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h2 style={{fontFamily: 'var(--font-heading)', color: 'white'}}>Choux Cream</h2>
              <p>สรรค์สร้างประสบการณ์ชูครีมที่สมบูรณ์แบบตั้งแต่ปี 2024 คุณภาพที่คุณสัมผัสได้ในทุกคำ</p>
            </div>
            <div className="footer-links">
              <h4>สำรวจ</h4>
              <ul>
                <li><a href="#catalog">เมนูทั้งหมด</a></li>
                <li><a href="#benefits">จุดเด่นของเรา</a></li>
                <li><a href="#">ระบบสมาชิก</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>ช่วยเหลือ</h4>
              <ul>
                <li><a href="#">วิธีการเก็บรักษา</a></li>
                <li><a href="#">คำถามที่พบบ่อย</a></li>
                <li><a href="#">นโยบายความเป็นส่วนตัว</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>ติดตามความนุ่มนวล</h4>
              <div style={{display: 'flex', gap: '16px', marginTop: '12px'}}>
                <a href="#" style={{fontSize: '0.9rem', fontWeight: 600}}>LINE</a>
                <a href="#" style={{fontSize: '0.9rem', fontWeight: 600}}>INSTRAGRAM</a>
                <a href="#" style={{fontSize: '0.9rem', fontWeight: 600}}>FACEBOOK</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            &copy; 2024 Choux Cream Artisan. สงวนลิขสิทธิ์. ทำด้วยความใส่ใจที่กรุงเทพฯ
          </div>
        </div>
      </footer>

    </div>
  );
}
