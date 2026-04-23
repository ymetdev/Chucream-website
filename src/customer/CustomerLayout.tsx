import { Outlet } from 'react-router-dom';

export default function CustomerLayout() {
  return (
    <div className="customer-layout">
      <div className="customer-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
