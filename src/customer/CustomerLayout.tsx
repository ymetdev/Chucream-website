import { Outlet } from 'react-router-dom';
import CustomerNavbar from './components/CustomerNavbar';

export default function CustomerLayout() {
  return (
    <div className="customer-layout">
      <CustomerNavbar />
      <div className="customer-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
