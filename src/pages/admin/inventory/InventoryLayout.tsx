import { Outlet } from 'react-router-dom';

export const InventoryLayout = () => {
  return (
    <div className="space-y-6">
      <Outlet />
    </div>
  );
};
