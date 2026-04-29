// src/App.jsx
import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

// Páginas Gerais
import Menu from "./pages/Menu";
import Login from "./pages/Login";
import Sobre from "./pages/Sobre";
import CadastroGestor from "./pages/Gestor/CadastroGestor";

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

// Gestão Patrimonial
import CadastroViaturas from "./pages/CadastroViaturas";
import Abastecimentos from "./pages/Abastecimentos";
import Manutencoes from "./pages/Manutencoes";
import Inventario from "./pages/Inventario";

export default function App() {
  const [stock, setStock] = useState([]);
  const [facturas, setFacturas] = useState([]);

  const emitir = (factura) => setFacturas((prev) => [...prev, factura]);

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/gestor/cadastro" element={<CadastroGestor />} />
      <Route path="/sobre" element={<Sobre />} />

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
    </Routes>
  );
}