import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ScanLine,
  BellRing,
  Truck,
  ClipboardList,
  BarChart3,
  Barcode,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Inventory', icon: Package },
  { to: '/scan', label: 'Scan', icon: ScanLine },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/barcodes', label: 'Demo Barcodes', icon: Barcode },
];

const SidebarContent = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-bold leading-none text-slate-900">StockAlert</p>
          <p className="text-xs text-slate-400">Pharmacy Inventory</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <p className="text-sm font-medium text-slate-800">{user?.name}</p>
        <p className="mb-3 text-xs text-slate-400">{user?.role === 'PHARMACIST' ? 'Pharmacist' : 'Assistant'}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="no-print hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 bg-white shadow-xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <Menu className="h-5 w-5" />
          </button>
          <p className="font-bold text-slate-900">StockAlert</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
