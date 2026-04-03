import { Link, useLocation } from 'react-router-dom';
import './CustomerNavbar.css';

export default function CustomerNavbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const scrollToSection = (id: string) => {
    if (isHome) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="customer-navbar-wrapper">
      <nav className="customer-navbar">
        <Link to="/" className="navbar-brand">
          Choux Cream
        </Link>
        <div className="navbar-links">
          {isHome ? (
            <>
              <button onClick={() => scrollToSection('catalog')} className="navbar-link">เมนู</button>
              <button onClick={() => scrollToSection('benefits')} className="navbar-link">เกี่ยวกับเรา</button>
            </>
          ) : (
            <Link to="/" className="navbar-link">กลับหน้าหลัก</Link>
          )}
        </div>
      </nav>
    </div>
  );
}
