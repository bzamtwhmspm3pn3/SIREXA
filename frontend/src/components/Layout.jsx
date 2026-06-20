// src/components/Layout.jsx
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, ChevronDown, ShoppingCart, Package, Receipt, ClipboardList, Wallet,
  Calendar, Gift, BarChart3, Car, Fuel, Wrench, Boxes, Truck, TrendingUp,
  PieChart, Eye, ArrowRightLeft, Users, DollarSign, FileText, Home, Building2,
  Shield, Settings, LogOut, BookOpen, LayoutDashboard, RefreshCw, Calculator,
  Activity, Key, Crown, Award, Briefcase, GraduationCap, CalendarCheck, Target, Gavel, GitBranch
} from "lucide-react";
import logo from "../assets/sirexa-logo.ico";
import ThemeLangControls from "./ThemeLangControls";

function Layout({ title, children, showBackButton = false, backToRoute = null }) {
  const { user, logout, empresaModulos, empresaPlano, empresaNome, empresaId } = useAuth();
  const { t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secoesExpandidas, setSecoesExpandidas] = useState({});
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const estaNaRotaDeLogin = location.pathname.includes("/login");
  const isAdmin = user?.role === "admin_sistema";
  const modulosAtivos = empresaModulos || [];

  // Verificar se o módulo está ativo
  const moduloAtivo = (modulo) => {
    if (isAdmin) return true;
    return modulosAtivos.includes(modulo);
  };

  // Estrutura completa de módulos do sistema
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
        gestaoAbonos: { label: "Subsídios e Abonos", icon: Gift, rota: "/gestao-abonos" },
        avaliacao: { label: "Avaliação", icon: BarChart3, rota: "/avaliacao-desempenho" },
        recrutamento: { label: "Recrutamento", icon: Briefcase, rota: "/rh/recrutamento" },
        formacao: { label: "Formação", icon: GraduationCap, rota: "/rh/formacao" },
        feriasLicencas: { label: "Férias e Licenças", icon: CalendarCheck, rota: "/rh/ferias-licencas" },
        carreira: { label: "Carreira", icon: TrendingUp, rota: "/rh/carreira" },
        cargos: { label: "Cargos", icon: Users, rota: "/rh/cargos" },
        disciplinar: { label: "Disciplinar", icon: Gavel, rota: "/rh/disciplinar" },
        competencias: { label: "Competências", icon: Target, rota: "/rh/competencias" },
        saudeSeguranca: { label: "Saúde e Segurança", icon: Shield, rota: "/rh/saude-seguranca" },
        workflow: { label: "Workflows", icon: GitBranch, rota: "/rh/workflow" },
        rh: { label: "RH Avançado", icon: BarChart3, rota: "/rh" }
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
    "Contabilidade": {
      icon: BookOpen,
      modulos: {
        planoContas: { label: "Plano de Contas", icon: BookOpen, rota: "/contabilidade/plano-contas" },
        lancamentos: { label: "Lançamentos", icon: FileText, rota: "/contabilidade/lancamentos" },
        diarioGeral: { label: "Diário Geral", icon: ClipboardList, rota: "/contabilidade/diario-geral" },
        razaoGeral: { label: "Razão Geral", icon: LayoutDashboard, rota: "/contabilidade/razao-geral" },
        balancete: { label: "Balancete", icon: TrendingUp, rota: "/contabilidade/balancete" },
        saldosContas: { label: "Saldos de Contas", icon: Wallet, rota: "/contabilidade/saldos" },
        balancoPatrimonial: { label: "Balanço Patrimonial", icon: PieChart, rota: "/contabilidade/balanco-patrimonial" },
        periodosFiscais: { label: "Períodos Fiscais", icon: Calendar, rota: "/contabilidade/periodos-fiscais" },
        encerramento: { label: "Encerramento", icon: RefreshCw, rota: "/contabilidade/encerramento" }
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
        reconciliacao: { label: "Reconciliação Bancária", icon: RefreshCw, rota: "/folha-banco" }
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [user]);

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
    const secaoAtiva = encontrarSecaoAtiva();
    const novasSecoes = {};
    Object.keys(ESTRUTURA_MODULOS).forEach(secao => {
      novasSecoes[secao] = (secao === secaoAtiva);
    });
    setSecoesExpandidas(novasSecoes);
  }, [location.pathname, encontrarSecaoAtiva]);

  const handleVoltar = () => {
    if (backToRoute) {
      navigate(backToRoute);
    } else {
      window.history.back();
    }
  };

  const handleLogout = () => {
    if (window.confirm("Tens certeza que desejas sair da sessão?")) {
      logout();
      setTimeout(() => {
        navigate("/login");
      }, 500);
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

  // Layout para ADMIN
  if (isAdmin) {
    return (
      <div className="flex min-h-screen text-white" style={{ background: "var(--bg-body)", backgroundAttachment: "fixed" }}>
        <aside className="fixed md:sticky top-0 left-0 z-50 w-72 h-screen flex flex-col transition-transform duration-300 shadow-2xl" style={{ background: "var(--bg-sidebar)" }}>
          <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="SIREXA" className="w-12 h-12 object-contain" />
              <div>
                <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>SIREXA</span>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Painel Administrativo</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>👑 {user?.nome || "Administrador"}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Administrador do Sistema</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <button onClick={() => navigate("/admin")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/admin" ? "bg-white/20 text-white font-medium" : "hover:text-white hover:bg-white/10"}`} style={{ color: location.pathname === "/admin" ? "var(--text-primary)" : "var(--text-secondary)" }}>
              <LayoutDashboard size={18} /><span>Dashboard</span>
            </button>
            <button onClick={() => navigate("/admin/planos")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/admin/planos" ? "bg-white/20 text-white font-medium" : "hover:text-white hover:bg-white/10"}`} style={{ color: location.pathname === "/admin/planos" ? "var(--text-primary)" : "var(--text-secondary)" }}>
              <Award size={18} /><span>Planos</span>
            </button>
            <button onClick={() => navigate("/admin/gerar-chave")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/admin/gerar-chave" ? "bg-white/20 text-white font-medium" : "hover:text-white hover:bg-white/10"}`} style={{ color: location.pathname === "/admin/gerar-chave" ? "var(--text-primary)" : "var(--text-secondary)" }}>
              <Key size={18} /><span>Gerar Chave</span>
            </button>
            <button onClick={() => navigate("/admin/licencas")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/admin/licencas" ? "bg-white/20 text-white font-medium" : "hover:text-white hover:bg-white/10"}`} style={{ color: location.pathname === "/admin/licencas" ? "var(--text-primary)" : "var(--text-secondary)" }}>
              <FileText size={18} /><span>Licenças</span>
            </button>
            <button onClick={() => navigate("/admin/gestores")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/admin/gestores" ? "bg-white/20 text-white font-medium" : "hover:text-white hover:bg-white/10"}`} style={{ color: location.pathname === "/admin/gestores" ? "var(--text-primary)" : "var(--text-secondary)" }}>
              <Users size={18} /><span>Gestores</span>
            </button>
            <button onClick={() => navigate("/admin/empresas")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/admin/empresas" ? "bg-white/20 text-white font-medium" : "hover:text-white hover:bg-white/10"}`} style={{ color: location.pathname === "/admin/empresas" ? "var(--text-primary)" : "var(--text-secondary)" }}>
              <Building2 size={18} /><span>Empresas</span>
            </button>
          </nav>

          <div className="px-4 pb-4">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 font-medium text-sm">
              <LogOut size={18} /><span>{t('nav.sair')}</span>
            </button>
          </div>
        </aside>

        <main id="main-content-admin" className="flex-1 flex flex-col min-h-screen">
          {title && (
            <div className="sticky top-0 z-30 backdrop-blur-md" style={{ background: "var(--bg-topbar)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="SIREXA" className="w-8 h-8 object-contain" />
                  <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{title}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeLangControls />
                  <span className="text-xs text-purple-300">👑 Admin</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 p-6">{children}</div>
        </main>
      </div>
    );
  }

  // Layout para GESTOR - SEM a linha da empresa
  return (
    <div className="flex min-h-screen text-white" style={{ background: "var(--bg-body)", backgroundAttachment: "fixed" }}>
      {sidebarAberta && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarAberta(false)} />}

      {isAuthenticated && !estaNaRotaDeLogin && (
        <aside className={`fixed md:sticky top-0 left-0 z-50 w-72 h-screen flex flex-col transition-transform duration-300 shadow-2xl ${sidebarAberta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ background: "var(--bg-sidebar)" }}>
          <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="SIREXA" className="w-12 h-12 object-contain" />
              <div>
                <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>SIREXA</span>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Plataforma Integrada</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>👤 {user?.nome || "Usuário"}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>👑 Gestor</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>📋 Plano: {empresaPlano || 'FREE'}</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <button onClick={() => navigate("/menu")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname === "/menu" || location.pathname === "/" ? "bg-white/20 text-white font-medium" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
              <Home size={18} /><span>{t('nav.inicio')}</span>
            </button>

            <button onClick={() => navigate("/empresa")} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full text-left ${location.pathname.startsWith("/empresa") ? "bg-white/20 text-white font-medium" : "text-gray-300 hover:text-white hover:bg-white/10"}`}>
              <Building2 size={18} /><span>{t('sidebar.minha_empresa')}</span>
            </button>

            <div className="my-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-wider px-3 mb-2" style={{ color: "var(--text-muted)" }}>{t('sidebar.modulos_ativos')}</p>
            </div>

            {Object.entries(ESTRUTURA_MODULOS).map(([secao, dados]) => {
              const temModuloAtivo = Object.keys(dados.modulos).some(id => moduloAtivo(id));
              if (!temModuloAtivo) return null;

              const IconeSecao = dados.icon;
              const expandido = secoesExpandidas[secao] ?? false;
              const ativa = secao === secaoAtiva;

              return (
                <div key={secao} className="mb-1">
                  <button onClick={() => toggleSecao(secao)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${ativa ? "bg-white/20 text-white font-medium" : expandido ? "text-gray-200 bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/10"}`}>
                    <div className="flex items-center gap-3"><IconeSecao size={18} className={ativa ? "text-indigo-400" : "text-gray-400"} /><span className="text-sm font-medium">{secao}</span></div>
                    <div className="flex items-center gap-2">{ativa && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>}<ChevronDown size={16} className={`transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`} /></div>
                  </button>
                  {expandido && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-indigo-500/30 pl-3 animate-fadeIn">
                      {Object.entries(dados.modulos).map(([id, modulo]) => {
                        if (!moduloAtivo(id)) return null;
                        const ativo = location.pathname === modulo.rota || location.pathname.startsWith(modulo.rota + "/");
                        return (
                          <button
                            key={id}
                            onClick={() => navigate(modulo.rota)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 w-full text-left ${ativo ? "bg-indigo-500/20 text-white font-medium border-l-2 border-indigo-400 -ml-[15px] pl-[19px]" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                          >
                            <modulo.icon size={16} className={ativo ? "text-indigo-400" : "text-gray-500"} />
                            <span>{modulo.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="px-4 pb-4">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 font-medium text-sm group">
              <LogOut size={18} className="transition-transform duration-300 group-hover:translate-x-1" /><span>{t('nav.sair')}</span>
            </button>
          </div>
        </aside>
      )}

      <main id="main-content-gestor" className="flex-1 flex flex-col min-h-screen">
        {title && (
          <div className="sticky top-0 z-30 backdrop-blur-md px-6 py-4" style={{ background: "var(--bg-topbar)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              {isAuthenticated && !estaNaRotaDeLogin && (<button onClick={() => setSidebarAberta(true)} className="md:hidden text-white hover:text-blue-300 mr-4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>)}
              {showBackButton ? (<button onClick={handleVoltar} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg font-semibold text-white transition duration-200 flex items-center gap-2 shadow-md"><ArrowLeft className="w-4 h-4" /> {t('nav.voltar')}</button>) : (<div className="w-24"></div>)}
              <div className="flex items-center gap-3"><img src={logo} alt="SIREXA" className="w-8 h-8 object-contain" /><h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{title}</h1></div>
              <ThemeLangControls />
            </div>
          </div>
        )}
        <div className="flex-1 p-6">{children}</div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default Layout;