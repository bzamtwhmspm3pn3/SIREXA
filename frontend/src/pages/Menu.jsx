// src/pages/Menu.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import { 
  Building, Users, TrendingUp, Car, DollarSign, FileText, BarChart3,
  Truck, ArrowRightLeft, PieChart, Wallet, UserCog, ClipboardList,
  Calendar, Gift, Package, Fuel, Wrench, Boxes, ShoppingCart,
  Receipt, Sparkles, Rocket, Zap, Crown, Shield, Briefcase, Target, Globe
} from "lucide-react";

export default function Menu() {
  const { user, isGestor, isTecnico, empresaId, empresaNome } = useAuth();

  const getHoraSaudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  };

  const titulo = isGestor() ? "Painel de Controle - Gestor" : "Área do Técnico";
  const subtitulo = isGestor() 
    ? "Bem-vindo ao centro de comando do AnDioGest"
    : `Bem-vindo ao seu espaço de trabalho`;

  // Se for gestor, mostra o menu completo
  if (isGestor()) {
    return (
      <Layout title={titulo} showBackButton={false}>
        {/* Seção de Boas-Vindas para Gestor */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 mb-8 border border-blue-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-2xl">
                <Crown className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {getHoraSaudacao()}, {user?.nome || "Gestor"}!
                </h2>
                <p className="text-blue-300 mt-1">{subtitulo}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <Shield size={16} />
                  <span className="text-xs">Perfil</span>
                </div>
                <p className="text-white font-semibold">Gestor Master</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <Rocket size={16} />
                  <span className="text-xs">Acesso</span>
                </div>
                <p className="text-white font-semibold">Total</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-yellow-400 mb-1">
                  <Target size={16} />
                  <span className="text-xs">Módulos</span>
                </div>
                <p className="text-white font-semibold">12 Ativos</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <Globe size={16} />
                  <span className="text-xs">Ambiente</span>
                </div>
                <p className="text-white font-semibold">Corporativo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Gestão de Empresas e Técnicos */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <UserCog className="text-blue-400" size={24} />
                Administração
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MenuCard to="/empresa" icon={<Building size={28} />} title="Empresas" description="Cadastro e gestão de empresas" gradient="from-blue-500 to-cyan-500" />
              <MenuCard to="/tecnico" icon={<Users size={28} />} title="Técnicos" description="Gestão de técnicos e permissões" gradient="from-green-500 to-emerald-500" />
              <MenuCard to="/fornecedores" icon={<Truck size={28} />} title="Fornecedores" description="Cadastro de fornecedores" gradient="from-purple-500 to-pink-500" />
            </div>
          </div>

          {/* Operacional */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-green-500 to-yellow-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-green-400" size={24} />
                Operacional
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MenuCard to="/vendas" icon={<ShoppingCart size={28} />} title="Vendas" description="Registro de vendas e emissão de facturas" gradient="from-green-500 to-emerald-500" />
              <MenuCard to="/stock" icon={<Package size={28} />} title="Stock" description="Gestão de inventário e produtos" gradient="from-yellow-500 to-orange-500" />
              <MenuCard to="/facturacao" icon={<Receipt size={28} />} title="Facturação" description="Histórico e gestão de facturas" gradient="from-blue-500 to-cyan-500" />
            </div>
          </div>

          {/* Recursos Humanos */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="text-purple-400" size={24} />
                Recursos Humanos
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MenuCard to="/funcionarios" icon={<ClipboardList size={28} />} title="Funcionários" description="Cadastro de colaboradores" gradient="from-blue-500 to-cyan-500" />
              <MenuCard to="/folha-salarial" icon={<Wallet size={28} />} title="Folha Salarial" description="Cálculo de salários e encargos" gradient="from-green-500 to-emerald-500" />
              <MenuCard to="/gestao-faltas" icon={<Calendar size={28} />} title="Gestão de Faltas" description="Registro de ausências" gradient="from-red-500 to-orange-500" />
              <MenuCard to="/gestao-abonos" icon={<Gift size={28} />} title="Gestão de Súbsidios Abonos" description="Bónus e complementos" gradient="from-yellow-500 to-amber-500" />
              <MenuCard to="/avaliacao-desempenho" icon={<BarChart3 size={28} />} title="Avaliação" description="Avaliação de desempenho" gradient="from-purple-500 to-pink-500" />
            </div>
          </div>

          {/* Gestão Patrimonial */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Car className="text-cyan-400" size={24} />
                Gestão Patrimonial
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MenuCard to="/cadastro-viaturas" icon={<Car size={28} />} title="Viaturas" description="Cadastro e gestão de viaturas" gradient="from-blue-500 to-cyan-500" />
              <MenuCard to="/abastecimentos" icon={<Fuel size={28} />} title="Abastecimentos" description="Controle de combustível" gradient="from-green-500 to-emerald-500" />
              <MenuCard to="/manutencoes" icon={<Wrench size={28} />} title="Manutenções" description="Histórico de manutenções" gradient="from-red-500 to-orange-500" />
              <MenuCard to="/inventario" icon={<Boxes size={28} />} title="Inventário" description="Gestão de patrimônio e ativos" gradient="from-yellow-500 to-amber-500" />
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <DollarSign className="text-emerald-400" size={24} />
                Financeiro
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MenuCard to="/fluxo-caixa" icon={<TrendingUp size={28} />} title="Fluxo de Caixa" description="Entradas e saídas financeiras" gradient="from-green-500 to-emerald-500" />
              <MenuCard to="/conta-corrente" icon={<Wallet size={28} />} title="Conta Corrente" description="Movimentações por fornecedor" gradient="from-blue-500 to-cyan-500" />
              <MenuCard to="/controlo-pagamento" icon={<FileText size={28} />} title="Controlo de Pagamento" description="Gestão de pagamentos" gradient="from-yellow-500 to-orange-500" />
              <MenuCard to="/custos-receitas" icon={<PieChart size={28} />} title="Custos e Receitas" description="Análise de custos e receitas" gradient="from-purple-500 to-pink-500" />
              <MenuCard to="/orcamento" icon={<ClipboardList size={28} />} title="Orçamentos" description="Planejamento orçamentário" gradient="from-orange-500 to-red-500" />
              <MenuCard to="/dre" icon={<BarChart3 size={28} />} title="DRE" description="Demonstração de Resultados" gradient="from-red-500 to-rose-500" />
              <MenuCard to="/indicadores" icon={<TrendingUp size={28} />} title="Indicadores" description="KPIs e métricas financeiras" gradient="from-cyan-500 to-blue-500" />
              <MenuCard to="/transferencia-diaria" icon={<ArrowRightLeft size={28} />} title="Transferências" description="Transferências entre contas" gradient="from-teal-500 to-green-500" />
              <MenuCard to="/folha-banco" icon={<Wallet size={28} />} title="Reconciliação Bancária" description="Extrato e reconciliação bancária" gradient="from-indigo-500 to-purple-500" />
            </div>
          </div>

          {/* Relatórios e Análises */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-1 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="text-rose-400" size={24} />
                Relatórios e Análises
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MenuCard to="/relatorios" icon={<FileText size={28} />} title="Relatórios" description="Geração de relatórios personalizados" gradient="from-blue-500 to-cyan-500" />
              <MenuCard to="/graficos" icon={<BarChart3 size={28} />} title="Gráficos" description="Visualização gráfica de dados" gradient="from-green-500 to-emerald-500" />
              <MenuCard to="/analise" icon={<PieChart size={28} />} title="Análise Geral" description="Dashboard com análise de IA" gradient="from-purple-500 to-pink-500" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ==================== TÉCNICO - MÓDULOS PERMITIDOS INDIVIDUALMENTE ====================
  if (isTecnico()) {
    const modulos = user?.modulos || {};
    const temModulos = Object.values(modulos).some(v => v === true);

    // Verificar se tem algum módulo de uma categoria
    const temOperacional = modulos.vendas || modulos.stock || modulos.facturacao;
    const temRH = modulos.funcionarios || modulos.folhaSalarial || modulos.gestaoFaltas || modulos.gestaoAbonos || modulos.avaliacao;
    const temPatrimonial = modulos.viaturas || modulos.abastecimentos || modulos.manutencoes || modulos.inventario;
    const temFinanceiro = modulos.fornecedores || modulos.fluxoCaixa || modulos.contaCorrente || modulos.controloPagamento || 
                          modulos.custosReceitas || modulos.orcamentos || modulos.dre || modulos.indicadores || 
                          modulos.transferencias || modulos.reconciliacao;
    const temRelatorios = modulos.relatorios || modulos.graficos || modulos.analise;

    return (
      <Layout title={titulo} showBackButton={false}>
        {/* Seção de Boas-Vindas para Técnico */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-8 mb-8 border border-blue-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-2xl">
                <Rocket className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {getHoraSaudacao()}, {user?.nome || "Técnico"}!
                </h2>
                <p className="text-blue-300 mt-1">{subtitulo}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-blue-400 mb-1">
                  <Building size={16} />
                  <span className="text-xs">Empresa Designada</span>
                </div>
                <p className="text-white font-semibold">{empresaNome || user?.empresaNome || "—"}</p>
                <p className="text-gray-400 text-xs mt-1">ID: {empresaId || user?.empresaId || "—"}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <Briefcase size={16} />
                  <span className="text-xs">Função</span>
                </div>
                <p className="text-white font-semibold">{user?.funcao || user?.cargo || "Técnico"}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-yellow-400 mb-1">
                  <Zap size={16} />
                  <span className="text-xs">Módulos Liberados</span>
                </div>
                <p className="text-white font-semibold">
                  {Object.values(modulos).filter(v => v).length} ativos
                </p>
              </div>
            </div>
            
            <div className="mt-4 bg-blue-500/10 rounded-lg p-2 border border-blue-500/30">
              <p className="text-blue-300 text-xs text-center flex items-center justify-center gap-2">
                <Building size={14} />
                Você está operando exclusivamente na empresa: <strong>{empresaNome || user?.empresaNome || "Empresa Designada"}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Operacional - mostra se pelo menos um módulo estiver ativo */}
          {temOperacional && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 bg-gradient-to-b from-green-500 to-yellow-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-green-400" size={24} />
                  Operacional
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulos.vendas && <MenuCard to="/vendas" icon={<ShoppingCart size={28} />} title="Vendas" description="Registro de vendas" gradient="from-green-500 to-emerald-500" />}
                {modulos.stock && <MenuCard to="/stock" icon={<Package size={28} />} title="Stock" description="Gestão de inventário" gradient="from-yellow-500 to-orange-500" />}
                {modulos.facturacao && <MenuCard to="/facturacao" icon={<Receipt size={28} />} title="Facturação" description="Emissão de facturas" gradient="from-blue-500 to-cyan-500" />}
              </div>
            </div>
          )}

          {/* Recursos Humanos */}
          {temRH && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="text-purple-400" size={24} />
                  Recursos Humanos
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulos.funcionarios && <MenuCard to="/funcionarios" icon={<ClipboardList size={28} />} title="Funcionários" description="Cadastro de colaboradores" gradient="from-blue-500 to-cyan-500" />}
                {modulos.folhaSalarial && <MenuCard to="/folha-salarial" icon={<Wallet size={28} />} title="Folha Salarial" description="Cálculo de salários" gradient="from-green-500 to-emerald-500" />}
                {modulos.gestaoFaltas && <MenuCard to="/gestao-faltas" icon={<Calendar size={28} />} title="Gestão de Faltas" description="Registro de ausências" gradient="from-red-500 to-orange-500" />}
                {modulos.gestaoAbonos && <MenuCard to="/gestao-abonos" icon={<Gift size={28} />} title="Gestão de Súbsidios & Abonos" description="Subsídios, Bónus e complementos" gradient="from-yellow-500 to-amber-500" />}
                {modulos.avaliacao && <MenuCard to="/avaliacao-desempenho" icon={<BarChart3 size={28} />} title="Avaliação" description="Avaliação de desempenho" gradient="from-purple-500 to-pink-500" />}
              </div>
            </div>
          )}

          {/* Gestão Patrimonial */}
          {temPatrimonial && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Car className="text-cyan-400" size={24} />
                  Gestão Patrimonial
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulos.viaturas && <MenuCard to="/cadastro-viaturas" icon={<Car size={28} />} title="Viaturas" description="Cadastro de viaturas" gradient="from-blue-500 to-cyan-500" />}
                {modulos.abastecimentos && <MenuCard to="/abastecimentos" icon={<Fuel size={28} />} title="Abastecimentos" description="Controle de combustível" gradient="from-green-500 to-emerald-500" />}
                {modulos.manutencoes && <MenuCard to="/manutencoes" icon={<Wrench size={28} />} title="Manutenções" description="Histórico de manutenções" gradient="from-red-500 to-orange-500" />}
                {modulos.inventario && <MenuCard to="/inventario" icon={<Boxes size={28} />} title="Inventário" description="Gestão patrimonial" gradient="from-yellow-500 to-amber-500" />}
              </div>
            </div>
          )}

          {/* Financeiro - TODOS OS MÓDULOS INDIVIDUALMENTE */}
          {temFinanceiro && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <DollarSign className="text-emerald-400" size={24} />
                  Financeiro
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulos.fornecedores && <MenuCard to="/fornecedores" icon={<Truck size={28} />} title="Fornecedores" description="Cadastro de fornecedores" gradient="from-purple-500 to-pink-500" />}
                {modulos.fluxoCaixa && <MenuCard to="/fluxo-caixa" icon={<TrendingUp size={28} />} title="Fluxo de Caixa" description="Entradas e saídas" gradient="from-green-500 to-emerald-500" />}
                {modulos.contaCorrente && <MenuCard to="/conta-corrente" icon={<Wallet size={28} />} title="Conta Corrente" description="Movimentações financeiras" gradient="from-blue-500 to-cyan-500" />}
                {modulos.controloPagamento && <MenuCard to="/controlo-pagamento" icon={<FileText size={28} />} title="Controlo Pagamento" description="Gestão de pagamentos" gradient="from-yellow-500 to-orange-500" />}
                {modulos.custosReceitas && <MenuCard to="/custos-receitas" icon={<PieChart size={28} />} title="Custos e Receitas" description="Análise de custos" gradient="from-purple-500 to-pink-500" />}
                {modulos.orcamentos && <MenuCard to="/orcamento" icon={<ClipboardList size={28} />} title="Orçamentos" description="Planejamento financeiro" gradient="from-orange-500 to-red-500" />}
                {modulos.dre && <MenuCard to="/dre" icon={<BarChart3 size={28} />} title="DRE" description="Demonstração de Resultados" gradient="from-red-500 to-rose-500" />}
                {modulos.indicadores && <MenuCard to="/indicadores" icon={<TrendingUp size={28} />} title="Indicadores" description="KPIs financeiros" gradient="from-cyan-500 to-blue-500" />}
                {modulos.transferencias && <MenuCard to="/transferencia-diaria" icon={<ArrowRightLeft size={28} />} title="Transferências" description="Transferências entre contas" gradient="from-teal-500 to-green-500" />}
                {modulos.reconciliacao && <MenuCard to="/folha-banco" icon={<Wallet size={28} />} title="Reconciliação" description="Reconciliação bancária" gradient="from-indigo-500 to-purple-500" />}
              </div>
            </div>
          )}

          {/* Relatórios e Análises */}
          {temRelatorios && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-1 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-rose-400" size={24} />
                  Relatórios e Análises
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modulos.relatorios && <MenuCard to="/relatorios" icon={<FileText size={28} />} title="Relatórios" description="Geração de relatórios" gradient="from-blue-500 to-cyan-500" />}
                {modulos.graficos && <MenuCard to="/graficos" icon={<BarChart3 size={28} />} title="Gráficos" description="Visualização de dados" gradient="from-green-500 to-emerald-500" />}
                {modulos.analise && <MenuCard to="/analise" icon={<PieChart size={28} />} title="Análise Geral" description="Dashboard com IA" gradient="from-purple-500 to-pink-500" />}
              </div>
            </div>
          )}

          {!temModulos && (
            <div className="bg-gradient-to-r from-yellow-900/50 to-red-900/50 rounded-2xl p-8 text-center border border-yellow-500/30">
              <Zap className="mx-auto mb-4 text-yellow-400" size={48} />
              <p className="text-yellow-300 text-lg">⚠️ Acesso Restrito</p>
              <p className="text-gray-400 mt-2">Você não tem permissão para acessar nenhum módulo.</p>
              <p className="text-gray-500 text-sm mt-1">Entre em contato com o gestor para configurar seus acessos.</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return null;
}

// Componente MenuCard
const MenuCard = ({ to, icon, title, description, gradient }) => {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-105"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <div className="relative z-10">
        <div className={`bg-gradient-to-r ${gradient} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
          <div className="text-white">{icon}</div>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
        <div className="mt-4 flex items-center gap-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-sm">Acessar</span>
          <Sparkles size={14} />
        </div>
      </div>
    </Link>
  );
};