import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ROLE_LABELS } from '../../types';
import {
  LayoutDashboard, Users, UserCircle, Calendar, FlaskConical,
  Scan, BedDouble, FileText, ClipboardList, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Bell,
  Stethoscope, ShieldCheck, Menu, X,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/imed/dashboard', icon: <LayoutDashboard size={20} />, label: 'მთავარი' },
  { to: '/imed/patients', icon: <Users size={20} />, label: 'პაციენტები' },
  { to: '/imed/appointments', icon: <Calendar size={20} />, label: 'ჩაწერა' },
  { to: '/imed/orders', icon: <ClipboardList size={20} />, label: 'შეკვეთები / კვლევები' },
  { to: '/imed/laboratory', icon: <FlaskConical size={20} />, label: 'ლაბორატორია', roles: ['super_admin', 'lab_technician', 'doctor', 'department_head'] },
  { to: '/imed/radiology', icon: <Scan size={20} />, label: 'რადიოლოგია', roles: ['super_admin', 'radiologist', 'doctor', 'department_head'] },
  { to: '/imed/inpatient', icon: <BedDouble size={20} />, label: 'სტაციონარი' },
  { to: '/imed/documents', icon: <FileText size={20} />, label: 'დოკუმენტები' },
  { to: '/imed/statistics', icon: <BarChart3 size={20} />, label: 'სტატისტიკა', roles: ['super_admin', 'statistician', 'department_head'] },
  { to: '/imed/audit', icon: <ShieldCheck size={20} />, label: 'აუდიტ-ლოგი', roles: ['super_admin'] },
  { to: '/imed/users', icon: <UserCircle size={20} />, label: 'მომხმარებლები', roles: ['super_admin'] },
  { to: '/imed/settings', icon: <Settings size={20} />, label: 'პარამეტრები', roles: ['super_admin'] },
];

export default function MainLayout() {
  const { imedUser, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (imedUser && item.roles.includes(imedUser.role))
  );

  const handleLogout = async () => {
    await logout();
    navigate('/imed/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-blue-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow">
          <Stethoscope size={20} className="text-blue-700" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-tight">iMED</div>
            <div className="text-blue-300 text-xs">კლინიკის სისტემა</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map(item => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                active
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={`border-t border-blue-800 p-3 ${collapsed ? 'items-center' : ''}`}>
        {!collapsed && imedUser && (
          <div className="mb-2 px-1">
            <div className="text-white text-sm font-medium truncate">{imedUser.displayName}</div>
            <div className="text-blue-300 text-xs truncate">{ROLE_LABELS[imedUser.role]}</div>
            {imedUser.specialty && (
              <div className="text-blue-400 text-xs truncate">{imedUser.specialty}</div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition-all text-sm"
        >
          <LogOut size={18} />
          {!collapsed && 'გამოსვლა'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-['Noto_Sans_Georgian',_sans-serif]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-blue-900 transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full bg-blue-900 text-white p-1 rounded-r-md border border-blue-700 border-l-0 hover:bg-blue-800 transition-colors z-10"
          style={{ left: collapsed ? '4rem' : '16rem' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-blue-900 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-800 truncate">
              {visibleItems.find(i => location.pathname.startsWith(i.to))?.label || 'iMED'}
            </h1>
          </div>
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell size={20} />
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{imedUser?.displayName}</span>
            <span className="text-gray-400">|</span>
            <span className="text-blue-600">{imedUser ? ROLE_LABELS[imedUser.role] : ''}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
