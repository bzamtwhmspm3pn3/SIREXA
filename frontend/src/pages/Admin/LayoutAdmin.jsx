// src/pages/Admin/LayoutAdmin.jsx
import React, { useState } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Key, FileText, Users, Building2, LogOut, 
  Menu, X, Shield
} from 'lucide-react';
import logo from '../../assets/sirexa-logo.ico';

const LayoutAdmin = ({ children, title }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 🔥 MENU SIMPLIFICADO DO ADMINISTRADOR (APENAS 5 ITENS)
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', color: 'blue' },
    { icon: Key, label: 'Gerar Chave', path: '/admin/gerar-chave', color: 'yellow' },
    { icon: FileText, label: 'Licenças', path: '/admin/licencas', color: 'purple' },
    { icon: Users, label: 'Gestores', path: '/admin/gestores', color: 'green' },
    { icon: Building2, label: 'Empresas', path: '/admin/empresas', color: 'cyan' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-gray-800 border-r border-gray-700 transition-all duration-300 z-30 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SIREXA" className="w-8 h-8" />
            {sidebarOpen && (
              <div>
                <span className="text-white font-bold block">SIREXA</span>
                <span className="text-xs text-purple-400">Administrador</span>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu - APENAS 5 ITENS */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all group`}
            >
              <item.icon size={20} className={`text-${item.color}-400`} />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.nome?.charAt(0) || 'A'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-white text-sm font-medium truncate">{user?.nome || 'Admin'}</p>
                <p className="text-gray-400 text-xs">Administrador</p>
              </div>
            )}
            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-800/80 border-b border-gray-700 px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              {title || 'Painel Administrativo'}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutAdmin;