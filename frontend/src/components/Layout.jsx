// src/components/Layout.jsx
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, ChevronDown, ShoppingCart, Package, Receipt, ClipboardList, Wallet,
  Calendar, Gift, BarChart3, Car, Fuel, Wrench, Boxes, Truck, TrendingUp,
  PieChart, Eye, ArrowRightLeft, Users, DollarSign, FileText, Home, Building2,
  Shield, Settings, LogOut
} from "lucide-react";
import logo from "../assets/sirexa-logo.ico";

const ESTRUTURA_MODULOS = {
  "Operacional": {
    icon: ShoppingCart,
    modulos: {
      vendas: { label: "Vendas", icon: ShoppingCart, rota: "/vendas" },
      stock: { label: "Stock", icon: Package, rota: "/stock" },
      facturacao: { label: "Facturação", icon: Receipt, rota: "/facturacao" }
    }
  },
  "Recursos Humanos": {
    icon: Users,
    modulos: {
      funcionarios: { label: "Funcionários", icon: ClipboardList, rota: "/funcionarios" },
      folhaSalarial: { label: "Folha Salarial", icon: Wallet, rota: "/folha-salarial" },
      gestaoFaltas: { label: "Gestão de Faltas", icon: Calendar, rota: "/gestao-faltas" },
      gestaoAbonos: { label: "Gestão de Abonos", icon: Gift, rota: "/gestao-abonos" },
      avaliacao: { label: "Avaliação", icon: BarChart3, rota: "/avaliacao-desempenho" }
    }
  },
  "Gestão Patrimonial": {
    icon: Car,
    modulos: {
      viaturas: { label: "Viaturas", icon: Car, rota: "/cadastro-viaturas" },
      abastecimentos: { label: "Abastecimentos", icon: Fuel, rota: "/abastecimentos" },
      manutencoes: { label: "Manutenções", icon: Wrench, rota: "/manutencoes" },
      inventario: { label: "Inventário", icon: Boxes, rota: "/inventario" }
    }
  },
  "Financeiro": {
    icon: DollarSign,
    modulos: {
      fornecedores: { label: "Fornecedores", icon: Truck, rota: "/fornecedores" },
      fluxoCaixa: { label: "Fluxo de Caixa", icon: TrendingUp, rota: "/fluxo-caixa" },
      contaCorrente: { label: "Conta Corrente", icon: Wallet, rota: "/conta-corrente" },
      controloPagamento: { label: "Controlo Pagamento", icon: FileText, rota: "/controlo-pagamento" },
      custosReceitas: { label: "Custos e Receitas", icon: PieChart, rota: "/custos-receitas" },
      orcamentos: { label: "Orçamentos", icon: ClipboardList, rota: "/orcamento" },
      dre: { label: "DRE", icon: BarChart3, rota: "/dre" },
      indicadores: { label: "Indicadores", icon: Eye, rota: "/indicadores" },
      transferencias: { label: "Transferências", icon: ArrowRightLeft, rota: "/transferencia-diaria" },
      reconciliacao: { label: "Reconciliação Bancária", icon: Wallet, rota: "/folha-banco" }
    }
  },
  "Relatórios": {
    icon: BarChart3,
    modulos: {
      relatorios: { label: "Relatórios", icon: FileText, rota: "/relatorios" },
      graficos: { label: "Gráficos", icon: BarChart3, rota: "/graficos" },
      analise: { label: "Análise Geral", icon: PieChart, rota: "/analise" }
    }
  }
};

function Layout({ title, children, showBackButton = false, backToRoute = null }) {
  const { user, logout } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secoesExpandidas, setSecoesExpandidas] = useState({});
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const estaNaRotaDeLogin = location.pathname.includes("/login");

  const encontrarSecaoAtiva = useCallback(() => {
    for (const [secao, dados] of Object.entries(ESTRUTURA_MODULOS)) {
      const encontrado = Object.values(dados.modulos).some(
        modulo => location.pathname === modulo.rota || location.pathname.startsWith(modulo.rota + "/")
      );
      if (encontrado) return secao;
    }
    return null;
  }, [location.pathname]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    
    const secaoAtiva = encontrarSecaoAtiva();
    const novasSecoes = {};
    Object.keys(ESTRUTURA_MODULOS).forEach(secao => {
      novasSecoes[secao] = (secao === secaoAtiva);
    });
    setSecoesExpandidas(novasSecoes);
  }, [user, location.pathname, encontrarSecaoAtiva]);

  const podeAcessarModulo = (moduloId) => {
    if (!user) return false;
    if (user.role === "gestor") return true;
    if (user.role === "tecnico") return user.modulos && user.modulos[moduloId] === true;
    return false;
  };

  const secaoTemModulos = (secao) => {
    if (user?.role === "gestor") return true;
    return Object.keys(ESTRUTURA_MODULOS[secao].modulos).some(mod => podeAcessarModulo(mod));
  };

  const handleVoltar = () => {
    if (backToRoute) navigate(backToRoute);
    else if (location.pathname === "/empresa") navigate("/menu");
    else if (location.pathname === "/empresa/cadastrar") navigate("/empresa");
    else if (location.pathname.startsWith("/empresa/visualizar")) navigate("/empresa");
    else if (location.pathname.startsWith("/empresa/editar")) navigate("/empresa");
    else navigate(-1);
  };

  const handleLogout = () => {
    if (window.confirm("Tens certeza que desejas sair da sessão?")) {
      logout();
      setTimeout(() => navigate("/login"), 500);
    }
  };

  const toggleSecao = (secao) => {
    setSecoesExpandidas(prev => {
      if (prev[secao]) return { ...prev, [secao]: false };
      const novasSecoes = {};
      Object.keys(ESTRUTURA_MODULOS).forEach(s => {
        novasSecoes[s] = (s === secao);
      });
      return novasSecoes;
    });
  };

  const secaoAtiva = encontrarSecaoAtiva();

  return (
    <div
      className="flex min-h-screen text-white"
      style={{
        background: "linear-gradient(135deg, #003366 0%, #0055A5 50%, #00C0F9 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay mobile */}
      {sidebarAberta && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* 🔷 SIDEBAR (apenas autenticado e não na rota de login) */}
      {isAuthenticated && !estaNaRotaDeLogin && (
        <aside
          className={`
            fixed md:sticky top-0 left-0 z-50 w-72 h-screen flex flex-col
            transition-transform duration-300 shadow-2xl
            ${sidebarAberta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          style={{ background: "linear-gradient(180deg, #002244 0%, #003366 100%)" }}
        >
          {/* Logo + Info */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="SIREXA" className="w-12 h-12 object-contain" />
              <div>
                <span className="text-2xl font-bold text-white">SIREXA</span>
                <p className="text-xs text-blue-300">Plataforma Integrada</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-sm font-medium text-white truncate">👤 {user?.nome || "Usuário"}</p>
              <p className="text-xs text-blue-300 mt-1 capitalize">
                {user?.role === "gestor" ? "👑 Gestor" : "🔧 Técnico"}
                {user?.empresaNome && ` • ${user.empresaNome}`}
              </p>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <Link to="/menu" onClick={() => setSidebarAberta(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                location.pathname === "/menu" || location.pathname === "/" ? "bg-white/20 text-white font-medium" : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}>
              <Home size={18} /><span>Menu Inicial</span>
            </Link>

            {user?.role === "gestor" && (
              <>
                <Link to="/empresa" onClick={() => setSidebarAberta(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    location.pathname.startsWith("/empresa") ? "bg-white/20 text-white font-medium" : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                  <Building2 size={18} /><span>Empresas</span>
                </Link>
                <Link to="/tecnico" onClick={() => setSidebarAberta(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    location.pathname.startsWith("/tecnico") ? "bg-white/20 text-white font-medium" : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}>
                  <Shield size={18} /><span>Técnicos</span>
                </Link>
                <div className="my-3 border-t border-white/10 pt-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Módulos</p>
                </div>
              </>
            )}

            {Object.entries(ESTRUTURA_MODULOS).map(([secao, dados]) => {
              if (!secaoTemModulos(secao)) return null;
              const IconeSecao = dados.icon;
              const expandido = secoesExpandidas[secao] ?? false;
              const ativa = secao === secaoAtiva;

              return (
                <div key={secao} className="mb-1">
                  <button onClick={() => toggleSecao(secao)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      ativa ? "bg-white/20 text-white font-medium" : expandido ? "text-gray-200 bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/10"
                    }`}>
                    <div className="flex items-center gap-3">
                      <IconeSecao size={18} className={ativa ? "text-blue-400" : "text-gray-400"} />
                      <span className="text-sm font-medium">{secao}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ativa && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>}
                      <ChevronDown size={16} className={`transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expandido && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-blue-500/30 pl-3 animate-fadeIn">
                      {Object.entries(dados.modulos).map(([id, modulo]) => {
                        if (!podeAcessarModulo(id)) return null;
                        const IconeModulo = modulo.icon;
                        const ativo = location.pathname === modulo.rota || location.pathname.startsWith(modulo.rota + "/");
                        return (
                          <Link key={id} to={modulo.rota} onClick={() => setSidebarAberta(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              ativo ? "bg-blue-500/20 text-white font-medium border-l-2 border-blue-400 -ml-[15px] pl-[19px]" : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}>
                            <IconeModulo size={16} className={ativo ? "text-blue-400" : "text-gray-500"} />
                            <span>{modulo.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="my-2 border-t border-white/10"></div>
            <Link to="/sobre" onClick={() => setSidebarAberta(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                location.pathname === "/sobre" ? "bg-white/20 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}>
              <Settings size={18} /><span>Sobre</span>
            </Link>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl 
                bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20
                text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40
                transition-all duration-300 font-medium text-sm hover:shadow-lg hover:shadow-red-500/10 group">
              <LogOut size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              <span>Sair da Sessão</span>
            </button>
          </div>
        </aside>
      )}

      {/* 🔷 MAIN - Área LIMPA (sem container extra) */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header - apenas para título e botão voltar */}
        {title && (
          <div className="sticky top-0 z-30 backdrop-blur-md bg-[#003366]/80 border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              {isAuthenticated && !estaNaRotaDeLogin && (
                <button onClick={() => setSidebarAberta(true)}
                  className="md:hidden text-white hover:text-blue-300 mr-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M3 6h18M3 18h18"/>
                  </svg>
                </button>
              )}

              {showBackButton ? (
                <button onClick={handleVoltar}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg font-semibold text-white transition duration-200 flex items-center gap-2 shadow-md">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              ) : (
                <div className="w-24"></div>
              )}

              <div className="flex items-center gap-3">
                <img src={logo} alt="SIREXA" className="w-8 h-8 object-contain" />
                <h1 className="text-2xl font-bold text-white">{title}</h1>
              </div>

              <div className="w-24"></div>
            </div>
          </div>
        )}

        {/* Conteúdo DIRETO - sem container extra! */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default Layout;