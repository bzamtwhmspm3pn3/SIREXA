// src/pages/Sobre.jsx - VERSÃO CORRIGIDA COM ALTO CONTRASTE
import { useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/sirexa-logo.ico";
import { 
  Building, Shield, Users, TrendingUp, Award, Heart, 
  Mail, Phone, MapPin, Github, Linkedin, Brain, Database,
  Cpu, Globe, FileText, DollarSign, Truck, Car, Briefcase,
  Star, Medal, Activity, CheckCircle, User, 
  Store, Package, Receipt, Calculator, Calendar, Gift,
  Fuel, Wrench, Warehouse, PiggyBank, Wallet,
  Target, ArrowLeftRight, GitBranch, Network, 
  Zap, Sparkles, Infinity, Code2, Workflow, 
  RefreshCw, Webhook, Layers,
  Landmark, ChartNoAxesCombined, HandCoins, 
  ReceiptText, ChartColumn, BarChart3, PieChart,
  LineChart, Coins,
  Banknote, CreditCard, Scale, ClipboardList
} from "lucide-react";

const Sobre = () => {
  const { user, isGestor, isTecnico } = useAuth();
  const [copiado, setCopiado] = useState(false);
  const [anoAtual] = useState(new Date().getFullYear());
  const [imagemErro, setImagemErro] = useState(false);

  const autorInfo = {
    nome: "Venâncio Martins",
    nomeCompleto: "Venâncio Elavoco Cassova Martins",
    titulo: "Pesquisador em Economia & Cientista de Dados",
    localizacao: "Huambo, Angola",
    email: "venanciomartinse@gmail.com",
    telefone: "+244 928 565 837",
    linkedin: "https://www.linkedin.com/in/ven%C3%A2ncio-martins-337729263/",
    github: "https://github.com/bzamtwhmspm3pn3",
    foto: "/imagens/autor/venancio-martins.jpg",
    
    premio: {
      nome: "Prêmio Nacional de Ciência e Inovação 2025",
      categoria: "Jovem Inventor",
      concedidoPor: "FUNDECIT e MESCTI"
    },
    
    atuacao: {
      universidade: "Universidade José Eduardo dos Santos (UJES)",
      empresa: "Grupo Vinech-Formação"
    }
  };

  const modulosSistema = {
    administracao: {
      nome: "Administração",
      icon: Building,
      cor: "from-[#0A1F44] to-[#003366]",
      modulos: ["Empresas", "Técnicos", "Fornecedores"]
    },
    operacional: {
      nome: "Operacional",
      icon: Store,
      cor: "from-[#003366] to-[#0055A5]",
      modulos: ["Vendas", "Estoque", "Facturação"]
    },
    rh: {
      nome: "Recursos Humanos",
      icon: Users,
      cor: "from-[#004080] to-[#0066CC]",
      modulos: ["Funcionários", "Folha Salarial", "Gestão de Faltas", "Gestão de Abonos", "Avaliação"]
    },
    patrimonio: {
      nome: "Gestão Patrimonial",
      icon: Car,
      cor: "from-[#002244] to-[#004488]",
      modulos: ["Viaturas", "Abastecimentos", "Manutenções", "Inventário"]
    },
    financeiro: {
      nome: "Financeiro",
      icon: DollarSign,
      cor: "from-[#0A1F44] to-[#006633]",
      modulos: [
        "Fluxo de Caixa", "Conta Corrente", "Controlo de Pagamento", 
        "Custos e Receitas", "Orçamentos", "DRE", "Indicadores", 
        "Transferências", "Reconciliação Bancária"
      ]
    },
    inteligencia: {
      nome: "Inteligência",
      icon: Brain,
      cor: "from-[#003366] to-[#0088CC]",
      modulos: ["Relatórios", "Gráficos", "Análise Geral"]
    }
  };

  const integracoesReais = [
    { id: 1, origem: "Vendas", destino: "Estoque", acao: "Baixa automática de stock", descricao: "Quando uma venda é registrada, o sistema automaticamente reduz a quantidade do produto no estoque.", trigger: "Ao finalizar uma venda", tecnologia: "Event Listener / Webhook", cor: "from-[#0A1F44] to-[#003366]" },
    { id: 2, origem: "Vendas", destino: "Fluxo de Caixa", acao: "Registro de receitas automático", descricao: "Vendas a crédito geram automaticamente registros de contas a receber no fluxo de caixa.", trigger: "Venda com pagamento a prazo", tecnologia: "IntegracaoPagamentos.integrarVenda()", cor: "from-[#003366] to-[#0055A5]" },
    { id: 3, origem: "Vendas", destino: "Conta Corrente", acao: "Atualização de saldo de clientes", descricao: "Clientes que compram a prazo têm seu saldo atualizado automaticamente na conta corrente.", trigger: "Venda a crédito", tecnologia: "registrarCreditoFatura()", cor: "from-[#004080] to-[#0066CC]" },
    { id: 4, origem: "Compra de Fornecedor", destino: "Conta Corrente", acao: "Registro de crédito automático", descricao: "Contratos com fornecedores geram automaticamente faturas na conta corrente.", trigger: "Contrato ativo com fornecedor", tecnologia: "gerarCreditosAntecipados()", cor: "from-[#002244] to-[#004488]" },
    { id: 5, origem: "Pagamentos", destino: "Conta Corrente", acao: "Baixa de débitos automática", descricao: "Quando um pagamento é registrado, o sistema automaticamente baixa o débito correspondente.", trigger: "Registro de pagamento", tecnologia: "registrarDebitoPagamento()", cor: "from-[#006633] to-[#0088CC]" },
    { id: 6, origem: "Folha Salarial", destino: "Fluxo de Caixa", acao: "Registro de despesa com pessoal", descricao: "A folha de pagamento gera automaticamente despesas de salários no fluxo de caixa.", trigger: "Processamento da folha", tecnologia: "integrarFolhaSalarial()", cor: "from-[#0A1F44] to-[#004080]" },
    { id: 7, origem: "Abastecimentos", destino: "Fluxo de Caixa", acao: "Registro de despesa operacional", descricao: "Cada abastecimento registrado gera uma despesa operacional no fluxo de caixa.", trigger: "Registro de abastecimento", tecnologia: "integrarAbastecimento()", cor: "from-[#003366] to-[#006633]" },
    { id: 8, origem: "Manutenções", destino: "Fluxo de Caixa", acao: "Registro de despesa patrimonial", descricao: "Manutenções de viaturas geram automaticamente despesas patrimoniais.", trigger: "Registro de manutenção", tecnologia: "integrarManutencao()", cor: "from-[#0055A5] to-[#0088CC]" },
    { id: 9, origem: "Orçamentos", destino: "DRE", acao: "Comparativo Real vs Orçado", descricao: "Compara automaticamente resultados reais com valores orçados para análise de variação.", trigger: "Geração do DRE", tecnologia: "Análise de Variação Orçamentária", cor: "from-[#0A1F44] to-[#0088CC]" },
    { id: 10, origem: "Todos os Módulos", destino: "Relatórios", acao: "Alimentação automática de dashboards", descricao: "Todos os dados do sistema alimentam automaticamente os dashboards e relatórios.", trigger: "Qualquer alteração no sistema", tecnologia: "Aggregation Pipeline / Real-time Sync", cor: "from-[#006633] to-[#0088CC]" },
    { id: 11, origem: "Fluxo de Caixa", destino: "DRE", acao: "Alimentação da Demonstração de Resultados", descricao: "Todas as receitas e despesas do fluxo de caixa alimentam automaticamente o DRE.", trigger: "Novo lançamento no fluxo de caixa", tecnologia: "Cálculo de Resultados", cor: "from-[#003366] to-[#006633]" },
    { id: 12, origem: "Transferências", destino: "Reconciliação Bancária", acao: "Sincronização automática de movimentos", descricao: "Transferências entre contas são automaticamente reconciliadas.", trigger: "Registro de transferência", tecnologia: "Conciliação Automática", cor: "from-[#004080] to-[#0088CC]" },
    { id: 13, origem: "Custos e Receitas", destino: "Indicadores", acao: "Cálculo de KPIs financeiros", descricao: "Os dados de custos e receitas alimentam automaticamente os indicadores de performance.", trigger: "Atualização de custos/receitas", tecnologia: "Cálculo de KPIs", cor: "from-[#0A1F44] to-[#0055A5]" }
  ];

  const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Layout title="Sobre o Sistema" showBackButton={true} backToRoute="/menu">
      <div className="space-y-6">
        
        {/* CABEÇALHO COM LOGO */}
        <div className="bg-gradient-to-r from-[#0A1F44] via-[#003366] to-[#00A86B] rounded-2xl p-8 text-center shadow-xl">
          <div className="flex justify-center mb-4">
            <div className="bg-white/15 p-4 rounded-2xl backdrop-blur-sm">
              <img 
                src={logo} 
                alt="SIREXA" 
                className="w-20 h-20 object-contain drop-shadow-2xl"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">SIREXA</h1>
          <p className="text-blue-200 text-lg font-light">Plataforma Integrada</p>
          <p className="text-blue-100 text-sm mt-2 max-w-lg mx-auto">
            Sistema Corporativo de Gestão Empresarial — Integração Inteligente e Automática
          </p>
          <div className="flex justify-center gap-3 mt-5 flex-wrap">
            <span className="bg-white/25 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-white font-medium">Versão 2.0.0</span>
            <span className="bg-white/25 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-white font-medium">Integração Total</span>
            <span className="bg-white/25 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-white font-medium">Dados em Tempo Real</span>
            <span className="bg-[#00A86B]/40 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-green-100 font-medium">🔗 13+ Integrações</span>
          </div>
        </div>

        {/* MÓDULOS DO SISTEMA */}
        <div className="bg-[#0A1F44]/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2 drop-shadow-md">
            <Layers className="text-blue-400" size={24} />
            Módulos do Sistema
            <Sparkles className="text-[#00A86B]" size={20} />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(modulosSistema).map((modulo, idx) => (
              <div 
                key={idx} 
                className={`bg-gradient-to-br ${modulo.cor} rounded-xl p-5 text-white shadow-lg border border-white/10`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <modulo.icon size={24} className="text-white drop-shadow-md" />
                  <h3 className="font-bold text-lg drop-shadow-md">{modulo.nome}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {modulo.modulos.map((mod, i) => (
                    <span key={i} className="bg-white/25 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-medium text-white shadow-sm">
                      {mod}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INTEGRAÇÕES REAIS */}
        <div className="bg-[#0A1F44]/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2 drop-shadow-md">
            <GitBranch className="text-blue-400" size={24} />
            Integrações Automáticas em Tempo Real
            <Zap className="text-[#00A86B]" size={20} />
          </h2>
          
          <div className="grid grid-cols-1 gap-3">
            {integracoesReais.map((int) => (
              <div 
                key={int.id} 
                className={`bg-gradient-to-r ${int.cor} rounded-xl p-4 text-white shadow-lg border border-white/10`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <GitBranch size={18} className="drop-shadow-md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white drop-shadow-md">{int.origem}</span>
                        <ArrowLeftRight size={14} className="text-white/80" />
                        <span className="font-bold text-white drop-shadow-md">{int.destino}</span>
                      </div>
                      <p className="text-blue-100 text-sm font-medium mt-0.5">{int.acao}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-white/25 backdrop-blur-sm px-2.5 py-0.5 rounded text-xs text-white font-medium">
                      ⚡ {int.trigger}
                    </span>
                    <span className="text-blue-200 text-xs">{int.tecnologia}</span>
                  </div>
                </div>
                <p className="text-blue-50 text-sm mt-2 pt-2 border-t border-white/20">{int.descricao}</p>
              </div>
            ))}
          </div>
        </div>

        {/* EXEMPLO PRÁTICO */}
        <div className="bg-gradient-to-r from-[#0A1F44] to-[#003366] rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2 drop-shadow-md">
            <RefreshCw className="text-[#00A86B]" size={24} />
            Exemplo Prático: Ciclo Completo de uma Venda
          </h2>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm mb-4">
              <span className="bg-[#0A1F44] px-3 py-1.5 rounded-full text-white font-medium shadow-md">1. Venda Realizada</span>
              <span className="text-white font-bold">→</span>
              <span className="bg-[#003366] px-3 py-1.5 rounded-full text-white font-medium shadow-md">2. Baixa no Estoque</span>
              <span className="text-white font-bold">→</span>
              <span className="bg-[#006633] px-3 py-1.5 rounded-full text-white font-medium shadow-md">3. Fluxo de Caixa</span>
              <span className="text-white font-bold">→</span>
              <span className="bg-[#0055A5] px-3 py-1.5 rounded-full text-white font-medium shadow-md">4. Conta Corrente</span>
              <span className="text-white font-bold">→</span>
              <span className="bg-[#0088CC] px-3 py-1.5 rounded-full text-white font-medium shadow-md">5. Relatórios</span>
            </div>
            
            <div className="mt-4 p-4 bg-[#0A1F44]/50 rounded-lg border border-white/10">
              <p className="text-center text-blue-100 text-sm font-medium">
                🤖 Tudo isso acontece automaticamente, em tempo real, sem intervenção manual!
              </p>
              <p className="text-center text-blue-200 text-xs mt-2">
                Baseado no serviço{" "}
                <code className="bg-white/20 px-1.5 py-0.5 rounded text-blue-100 font-mono">integracaoPagamentos.js</code>
                {" "}com 13+ integrações automáticas
              </p>
            </div>
          </div>
        </div>

        {/* BENEFÍCIOS */}
        <div className="bg-[#0A1F44]/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2 drop-shadow-md">
            <Infinity className="text-blue-400" size={24} />
            Benefícios da Integração Inteligente
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Zap, cor: "text-[#00A86B]", titulo: "Automação Total", desc: "Dados fluem automaticamente entre módulos, sem retrabalho manual" },
              { icon: Brain, cor: "text-blue-400", titulo: "Visão 360°", desc: "Visão completa da empresa a partir de qualquer módulo" },
              { icon: Activity, cor: "text-[#00C0F9]", titulo: "Dados Consistentes", desc: "Uma única fonte de verdade para toda a organização" },
              { icon: Target, cor: "text-[#00A86B]", titulo: "Decisões Rápidas", desc: "Informação atualizada em tempo real para tomada de decisão" }
            ].map((beneficio, idx) => (
              <div key={idx} className="text-center p-5 bg-[#003366]/50 rounded-xl border border-white/10 hover:bg-[#003366]/70 transition-all shadow-md">
                <beneficio.icon className={`mx-auto mb-3 ${beneficio.cor}`} size={32} />
                <h3 className="text-white font-bold mb-2 text-lg drop-shadow-md">{beneficio.titulo}</h3>
                <p className="text-blue-100 text-sm leading-relaxed">{beneficio.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* TECNOLOGIAS */}
        <div className="bg-[#0A1F44]/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2 drop-shadow-md">
            <Code2 className="text-blue-400" size={24} />
            Camada de Integração — Tecnologias Utilizadas
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Node.js Services", "MongoDB Aggregation", "Webhooks", "Event Listeners", "Real-time Sync", "Trigger-based Actions", "IntegracaoPagamentos Service"].map((tech, i) => (
              <span key={i} className="bg-[#003366] px-4 py-2 rounded-full text-sm text-white font-medium border border-white/10 shadow-md">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* DESENVOLVEDOR */}
        <div className="bg-[#0A1F44]/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 text-center flex items-center justify-center gap-2 drop-shadow-md">
            <User className="text-blue-400" size={24} />
            Desenvolvedor
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#00A86B] shadow-lg">
                {!imagemErro ? (
                  <img 
                    src={autorInfo.foto}
                    alt={autorInfo.nomeCompleto}
                    className="w-full h-full object-cover"
                    onError={() => setImagemErro(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0A1F44] to-[#0088CC] flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white drop-shadow-md">{autorInfo.nomeCompleto}</h3>
              <p className="text-blue-200 text-sm font-medium">{autorInfo.titulo}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                <span className="bg-[#00A86B]/30 px-3 py-1 rounded-md text-xs text-green-100 font-medium border border-[#00A86B]/40">
                  🏆 {autorInfo.premio.nome}
                </span>
                <span className="bg-[#003366]/60 px-3 py-1 rounded-md text-xs text-blue-100 font-medium border border-[#0055A5]/40">
                  📊 {autorInfo.atuacao.universidade}
                </span>
                <span className="bg-[#0055A5]/40 px-3 py-1 rounded-md text-xs text-blue-100 font-medium border border-[#0088CC]/40">
                  💼 {autorInfo.atuacao.empresa}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { icon: Mail, acao: () => copiarTexto(autorInfo.email) },
                { icon: Phone, acao: () => copiarTexto(autorInfo.telefone) },
                { icon: Linkedin, href: autorInfo.linkedin },
                { icon: Github, href: autorInfo.github }
              ].map((item, i) => (
                item.href ? (
                  <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" 
                    className="p-2.5 bg-[#003366] rounded-lg hover:bg-[#0055A5] transition border border-white/10 shadow-md">
                    <item.icon className="w-4 h-4 text-white" />
                  </a>
                ) : (
                  <button key={i} onClick={item.acao}
                    className="p-2.5 bg-[#003366] rounded-lg hover:bg-[#0055A5] transition border border-white/10 shadow-md">
                    <item.icon className="w-4 h-4 text-white" />
                  </button>
                )
              ))}
            </div>
          </div>
          {copiado && (
            <div className="mt-3 text-center text-sm text-[#00A86B] font-medium animate-pulse">
              ✓ Copiado para área de transferência!
            </div>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="bg-gradient-to-r from-[#0A1F44] to-[#003366] rounded-xl p-6 text-center border border-white/10 shadow-xl">
          <Heart className="mx-auto mb-3 text-[#00A86B] drop-shadow-md" size={28} />
          <p className="text-blue-100 text-sm max-w-2xl mx-auto font-medium">
            <span className="font-bold text-white text-base">SIREXA</span> — Plataforma Integrada
          </p>
          <p className="text-blue-200 text-xs mt-1 max-w-2xl mx-auto">
            Sistema de Gestão Empresarial com Integração Inteligente e Automática
          </p>
          <div className="mt-4 pt-4 border-t border-white/15">
            <p className="text-blue-200 text-xs font-medium">
              © {anoAtual} SIREXA — Todos os direitos reservados.
            </p>
                      </div>
        </div>

      </div>
    </Layout>
  );
};

export default Sobre;