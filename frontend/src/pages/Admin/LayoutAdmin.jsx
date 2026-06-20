import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Key, FileText, Users, Building2, LogOut, 
  Menu, X, Shield, Award, Settings, TrendingUp
} from 'lucide-react';
import logo from '../../assets/sirexa-logo.ico';
import ThemeLangControls from '../../components/ThemeLangControls';

const LayoutAdmin = ({ children, title }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: Award, label: 'Planos', path: '/admin/planos' },
    { icon: Key, label: 'Gerar Chave', path: '/admin/gerar-chave' },
    { icon: FileText, label: 'Licenças', path: '/admin/licencas' },
    { icon: Users, label: 'Gestores', path: '/admin/gestores' },
    { icon: Building2, label: 'Empresas', path: '/admin/empresas' },
    { divider: true },
    { icon: TrendingUp, label: 'Estatísticas', path: '/admin/estatisticas' },
];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-body)' }}>
      <div className={`fixed top-0 left-0 h-full transition-all duration-300 z-30 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}
        style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <img src={logo} alt="SIREXA" className="w-8 h-8" />
            {sidebarOpen && (
              <div>
                <span className="font-bold block" style={{ color: 'var(--text-primary)' }}>SIREXA</span>
                <span className="text-xs" style={{ color: 'var(--accent)' }}>Administrador</span>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: 'var(--text-secondary)' }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => (
            item.divider ? (
              <div key={index} style={{ borderTop: '1px solid var(--border)', margin: '0.5rem 0' }}></div>
            ) : (
              <Link
                key={index}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group`}
                style={{ color: 'var(--sidebar-text)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-bg-hover)'; e.currentTarget.style.color = 'var(--sidebar-text-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
              >
                <item.icon size={20} style={{ color: 'var(--accent)' }} />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    {item.label}
                  </div>
                )}
              </Link>
            )
          ))}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <span className="text-white text-sm font-bold">
                {user?.nome?.charAt(0) || 'A'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.nome || 'Admin'}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Administrador</p>
              </div>
            )}
            <button onClick={handleLogout} style={{ color: 'var(--text-secondary)' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <div className="px-6 py-4 sticky top-0 z-20"
          style={{ background: 'var(--bg-topbar)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              {title || 'Painel Administrativo'}
            </h1>
            <div className="flex items-center gap-3">
              <ThemeLangControls />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default LayoutAdmin;
