// src/App.jsx
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas Gerais
import Menu from "./pages/Menu";
import Login from "./pages/Login";
import Sobre from "./pages/Sobre";
import CadastroGestor from "./pages/Gestor/CadastroGestor";
import ConfirmarEmail from './pages/Gestor/ConfirmarEmail';
import RedefinirSenha from './pages/Gestor/RedefinirSenha';

// 👑 ADMIN (NOVO)
import CadastroAdmin from "./pages/Admin/CadastroAdmin";
import DashboardAdmin from "./pages/Admin/DashboardAdmin";
import GerarChave from "./pages/Admin/GerarChave";
import Licencas from "./pages/Admin/Licencas";
import Gestores from "./pages/Admin/Gestores";
import Empresas from "./pages/Admin/Empresas";
import Planos from "./pages/Admin/Planos";           
import Estatisticas from "./pages/Admin/Estatisticas";


// Empresa
import Empresa from "./pages/Empresa/ListaEmpresas";
import CadastroEmpresa from "./pages/Empresa/CadastroEmpresa";
import EditarEmpresa from "./pages/Empresa/EditarEmpresa";
import RelatorioEmpresa from "./pages/Empresa/RelatorioEmpresa";
import VisualizacaoEmpresa from "./pages/Empresa/VisualizacaoEmpresa";

// Técnico
import ListaTecnicos from "./pages/Tecnico/ListaTecnicos";
import CadastroTecnico from "./pages/Tecnico/CadastroTecnico";
import EditarTecnico from "./pages/Tecnico/EditarTecnico";
import MonitoramentoTecnicos from "./pages/Tecnico/MonitoramentoTecnicos";


// Funcionários
import ListaFuncionarios from "./pages/Funcionarios/ListaFuncionarios";
import CadastroFuncionario from "./pages/Funcionarios/CadastroFuncionario";
import EditarFuncionario from "./pages/Funcionarios/EditarFuncionario";
import VisualizarFuncionario from "./pages/Funcionarios/VisualizarFuncionario";
import ImportarFuncionarios from "./pages/Funcionarios/ImportarFuncionarios";

// Finanças
import FolhaBanco from "./pages/FolhaBanco";
import FluxoCaixa from "./pages/FluxoCaixa";
import ContaCorrente from "./pages/ContaCorrente";
import DRE from "./pages/DRE";
import Indicadores from "./pages/Indicadores";
import ControloPagamento from "./pages/ControloPagamento";
import CustosReceitas from "./pages/CustosReceitas";
import Orcamento from "./pages/Orcamento";
import AnaliseGeral from "./pages/AnaliseGeral";

// Fornecedores
import ListaFornecedores from "./pages/Fornecedores/ListaFornecedores";
import CadastroFornecedor from "./pages/Fornecedores/CadastroFornecedor";
import EditarFornecedor from "./pages/Fornecedores/EditarFornecedor";
import VisualizarFornecedor from "./pages/Fornecedores/VisualizarFornecedor";
import RelatorioFornecedor from "./pages/Fornecedores/RelatorioFornecedor";

// Outros Módulos
import Transferencias from "./pages/Transferencias";
import Relatorios from "./pages/Relatorios";
import Graficos from "./pages/Graficos";

// Operacional
import Vendas from "./pages/Vendas";
import Stock from "./pages/Stock/Stock";
import Facturacao from "./pages/Facturacao";

// Recursos Humanos
import FolhaSalarial from "./pages/FolhaSalarial";
import GestaoFaltas from "./pages/GestaoFaltas";
import GestaoAbonos from "./pages/GestaoAbonos";
import AvaliacaoDesempenho from "./pages/AvaliacaoDesempenho";
import DashboardRH from "./pages/RH/DashboardRH";
import Vagas from "./pages/RH/Vagas";
import Cursos from "./pages/RH/Cursos";
import FeriasLicencas from "./pages/RH/FeriasLicencas";
import Promocoes from "./pages/RH/Promocoes";
import Disciplinar from "./pages/RH/Disciplinar";
import Competencias from "./pages/RH/Competencias";
import ExamesMedicos from "./pages/RH/ExamesMedicos";
import WorkflowAprovacao from "./pages/RH/WorkflowAprovacao";

// Gestão Patrimonial
import CadastroViaturas from "./pages/CadastroViaturas";
import Abastecimentos from "./pages/Abastecimentos";
import Manutencoes from "./pages/Manutencoes";
import Inventario from "./pages/Inventario";

// ============================================
// MÓDULO DE CONTABILIDADE (PGC Angola)
// ============================================
import DashboardContabilidade from "./pages/Contabilidade/DashboardContabilidade";
import PlanoContas from "./pages/Contabilidade/PlanoContas";
import LancamentosContabeis from "./pages/Contabilidade/LancamentosContabeis";
import NovoLancamento from "./pages/Contabilidade/NovoLancamento";
import Balancete from "./pages/Contabilidade/Balancete";
import RazaoGeral from "./pages/Contabilidade/RazaoGeral";
import DiarioGeral from "./pages/Contabilidade/DiarioGeral";
import BalancoPatrimonial from "./pages/Contabilidade/BalancoPatrimonial";
import DemonstracaoResultados from "./pages/Contabilidade/DemonstracaoResultados";
import FluxoCaixaContabil from "./pages/Contabilidade/FluxoCaixaContabil";
import EncerramentoExercicio from "./pages/Contabilidade/EncerramentoExercicio";
import ReconciliacaoBancaria from "./pages/Contabilidade/ReconciliacaoBancaria";
import LivroRazao from "./pages/Contabilidade/LivroRazao";
import SaldosContas from "./pages/Contabilidade/SaldosContas";
import PeriodosFiscais from "./pages/Contabilidade/PeriodosFiscais";

export default function App() {
  const [stock, setStock] = useState([]);
  const [facturas, setFacturas] = useState([]);

  const emitir = (factura) => setFacturas((prev) => [...prev, factura]);

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/gestor/cadastro" element={<CadastroGestor />} />
      <Route path="/confirmar-email" element={<ConfirmarEmail />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/sobre" element={<Sobre />} />
      
      {/* 👑 ROTAS PÚBLICAS DO ADMIN (cadastro inicial) */}
      <Route path="/admin/cadastro" element={<CadastroAdmin />} />

      {/* Rotas protegidas (requer autenticação) */}
      <Route path="/" element={
        <ProtectedRoute>
          <Menu />
        </ProtectedRoute>
      } />
      <Route path="/menu" element={
        <ProtectedRoute>
          <Menu />
        </ProtectedRoute>
      } />

      {/* 👑 ROTAS DO ADMINISTRADOR - USAR requiredRole em vez de allowedRoles */}
<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <DashboardAdmin />
  </ProtectedRoute>
} />
<Route path="/admin/planos" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <Planos />
  </ProtectedRoute>
} />
<Route path="/admin/gerar-chave" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <GerarChave />
  </ProtectedRoute>
} />
<Route path="/admin/licencas" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <Licencas />
  </ProtectedRoute>
} />
<Route path="/admin/gestores" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <Gestores />
  </ProtectedRoute>
} />
      <Route path="/admin/empresas" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <Empresas />
  </ProtectedRoute>
} />
<Route path="/admin/estatisticas" element={
  <ProtectedRoute requiredRole="admin_sistema">
    <Estatisticas />
  </ProtectedRoute>
} />
     

      {/* Empresa */}
      <Route path="/empresa" element={<ProtectedRoute><Empresa /></ProtectedRoute>} />
      <Route path="/empresa/cadastrar" element={<ProtectedRoute><CadastroEmpresa /></ProtectedRoute>} />
      <Route path="/empresa/editar/:id" element={<ProtectedRoute><EditarEmpresa /></ProtectedRoute>} />
      <Route path="/empresa/visualizar/:id" element={<ProtectedRoute><VisualizacaoEmpresa /></ProtectedRoute>} />
      <Route path="/empresa/relatorio/:id" element={<ProtectedRoute><RelatorioEmpresa /></ProtectedRoute>} />

      {/* Técnico */}
      <Route path="/tecnico" element={<ProtectedRoute><ListaTecnicos /></ProtectedRoute>} />
      <Route path="/tecnico/cadastro" element={<ProtectedRoute><CadastroTecnico /></ProtectedRoute>} />
      <Route path="/tecnico/editar/:id" element={<ProtectedRoute><EditarTecnico /></ProtectedRoute>} />
      <Route path="/monitoramento" element={<ProtectedRoute><MonitoramentoTecnicos /></ProtectedRoute>}/>

      {/* Funcionários */}
      <Route path="/funcionarios" element={<ProtectedRoute><ListaFuncionarios /></ProtectedRoute>} />
      <Route path="/funcionarios/cadastrar" element={<ProtectedRoute><CadastroFuncionario /></ProtectedRoute>} />
      <Route path="/funcionarios/editar/:id" element={<ProtectedRoute><EditarFuncionario /></ProtectedRoute>} />
      <Route path="/funcionarios/visualizar/:id" element={<ProtectedRoute><VisualizarFuncionario /></ProtectedRoute>} />
      <Route path="/funcionarios/importar" element={<ImportarFuncionarios />} />

      {/* Finanças */}
      <Route path="/folha-banco" element={<ProtectedRoute><FolhaBanco /></ProtectedRoute>} />
      <Route path="/fluxo-caixa" element={<ProtectedRoute><FluxoCaixa /></ProtectedRoute>} />
      <Route path="/conta-corrente" element={<ProtectedRoute><ContaCorrente /></ProtectedRoute>} />
      <Route path="/dre" element={<ProtectedRoute><DRE /></ProtectedRoute>} />
      <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
      <Route path="/controlo-pagamento" element={<ProtectedRoute><ControloPagamento /></ProtectedRoute>} />
      <Route path="/custos-receitas" element={<ProtectedRoute><CustosReceitas /></ProtectedRoute>} />
      <Route path="/orcamento" element={<ProtectedRoute><Orcamento /></ProtectedRoute>} />
      <Route path="/analise" element={<ProtectedRoute><AnaliseGeral /></ProtectedRoute>} />

      {/* Operacional */}
      <Route path="/vendas" element={<ProtectedRoute><Vendas stock={stock} setStock={setStock} onEmitirFactura={emitir} /></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><Stock stock={stock} setStock={setStock} /></ProtectedRoute>} />
      <Route path="/facturacao" element={<ProtectedRoute><Facturacao facturas={facturas} /></ProtectedRoute>} />

      {/* Recursos Humanos */}
      <Route path="/folha-salarial" element={<ProtectedRoute><FolhaSalarial /></ProtectedRoute>} />
      <Route path="/gestao-faltas" element={<ProtectedRoute><GestaoFaltas /></ProtectedRoute>} />
      <Route path="/gestao-abonos" element={<ProtectedRoute><GestaoAbonos /></ProtectedRoute>} />
      <Route path="/avaliacao-desempenho" element={<ProtectedRoute><AvaliacaoDesempenho /></ProtectedRoute>} />
      <Route path="/rh" element={<ProtectedRoute><DashboardRH /></ProtectedRoute>} />
      <Route path="/rh/recrutamento" element={<ProtectedRoute><Vagas /></ProtectedRoute>} />
      <Route path="/rh/formacao" element={<ProtectedRoute><Cursos /></ProtectedRoute>} />
      <Route path="/rh/ferias-licencas" element={<ProtectedRoute><FeriasLicencas /></ProtectedRoute>} />
      <Route path="/rh/carreira" element={<ProtectedRoute><Promocoes /></ProtectedRoute>} />
      <Route path="/rh/disciplinar" element={<ProtectedRoute><Disciplinar /></ProtectedRoute>} />
      <Route path="/rh/competencias" element={<ProtectedRoute><Competencias /></ProtectedRoute>} />
      <Route path="/rh/saude-seguranca" element={<ProtectedRoute><ExamesMedicos /></ProtectedRoute>} />
      <Route path="/rh/workflow" element={<ProtectedRoute><WorkflowAprovacao /></ProtectedRoute>} />

      {/* Gestão Patrimonial */}
      <Route path="/cadastro-viaturas" element={<ProtectedRoute><CadastroViaturas /></ProtectedRoute>} />
      <Route path="/abastecimentos" element={<ProtectedRoute><Abastecimentos /></ProtectedRoute>} />
      <Route path="/manutencoes" element={<ProtectedRoute><Manutencoes /></ProtectedRoute>} />
      <Route path="/inventario" element={<ProtectedRoute><Inventario /></ProtectedRoute>} />

      {/* Fornecedores */}
      <Route path="/fornecedores" element={<ProtectedRoute><ListaFornecedores /></ProtectedRoute>} />
      <Route path="/fornecedores/novo" element={<ProtectedRoute><CadastroFornecedor /></ProtectedRoute>} />
      <Route path="/fornecedores/editar/:id" element={<ProtectedRoute><EditarFornecedor /></ProtectedRoute>} />
      <Route path="/fornecedores/visualizar/:id" element={<ProtectedRoute><VisualizarFornecedor /></ProtectedRoute>} />
      <Route path="/fornecedores/relatorio/:id" element={<ProtectedRoute><RelatorioFornecedor /></ProtectedRoute>} />

      {/* Outros módulos */}
      <Route path="/transferencia-diaria" element={<ProtectedRoute><Transferencias /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/graficos" element={<ProtectedRoute><Graficos /></ProtectedRoute>} />

      {/* ============================================ */}
      {/* MÓDULO DE CONTABILIDADE */}
      {/* ============================================ */}
      
      {/* Dashboard Principal */}
      <Route path="/contabilidade" element={
        <ProtectedRoute>
          <DashboardContabilidade />
        </ProtectedRoute>
      } />
      
      {/* Plano de Contas */}
      <Route path="/contabilidade/plano-contas" element={
        <ProtectedRoute>
          <PlanoContas />
        </ProtectedRoute>
      } />
      
      {/* Lançamentos Contabilísticos */}
      <Route path="/contabilidade/lancamentos" element={
        <ProtectedRoute>
          <LancamentosContabeis />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/lancamentos/novo" element={
        <ProtectedRoute>
          <NovoLancamento />
        </ProtectedRoute>
      } />
      
      {/* Relatórios Contabilísticos */}
      <Route path="/contabilidade/balancete" element={
        <ProtectedRoute>
          <Balancete />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/razao-geral" element={
        <ProtectedRoute>
          <RazaoGeral />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/diario-geral" element={
        <ProtectedRoute>
          <DiarioGeral />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/livro-razao" element={
        <ProtectedRoute>
          <LivroRazao />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/saldos" element={
        <ProtectedRoute>
          <SaldosContas />
        </ProtectedRoute>
      } />
      
      {/* Demonstrações Financeiras */}
      <Route path="/contabilidade/balanco-patrimonial" element={
        <ProtectedRoute>
          <BalancoPatrimonial />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/demonstracao-resultados" element={
        <ProtectedRoute>
          <DemonstracaoResultados />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/fluxo-caixa-contabil" element={
        <ProtectedRoute>
          <FluxoCaixaContabil />
        </ProtectedRoute>
      } />
      
      {/* Processos Especiais */}
      <Route path="/contabilidade/reconciliacao-bancaria" element={
        <ProtectedRoute>
          <ReconciliacaoBancaria />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/periodos-fiscais" element={
        <ProtectedRoute>
          <PeriodosFiscais />
        </ProtectedRoute>
      } />
      <Route path="/contabilidade/encerramento" element={
        <ProtectedRoute>
          <EncerramentoExercicio />
        </ProtectedRoute>
      } />
    </Routes>
  );
}