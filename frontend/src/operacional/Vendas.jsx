// src/App.jsx
import { Routes, Route } from "react-router-dom";

// Páginas Gerais
import Menu from "./pages/Menu";
import Login from "./pages/Login";
import Sobre from "./pages/Sobre";
import CadastroGestor from "./pages/Gestor/CadastroGestor";

// Empresa
import Empresa from "./pages/Empresa/ListaEmpresas";
import CadastroEmpresa from "./pages/Empresa/CadastroEmpresa";
import RelatorioEmpresa from "./pages/Empresa/RelatorioEmpresa";
import VisualizacaoEmpresa from "./pages/Empresa/VisualizacaoEmpresa";

// Técnico
import ListaTecnicos from "./pages/Tecnico/ListaTecnicos";
import CadastroTecnico from "./pages/Tecnico/CadastroTecnico";

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

// Outros Módulos
import Fornecedores from "./pages/Fornecedores";
import Transferencias from "./pages/Transferencias";
import Relatorios from "./pages/Relatorios";
import Graficos from "./pages/Graficos";

export default function App() {
  return (
    <Routes>
      {/* Acesso geral */}
      <Route path="/" element={<Menu />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/login" element={<Login />} />
      <Route path="/gestor/cadastro" element={<CadastroGestor />} />
      <Route path="/sobre" element={<Sobre />} />

      {/* Empresa */}
      <Route path="/empresa" element={<Empresa />} />
      <Route path="/empresa/cadastrar" element={<CadastroEmpresa />} />
      <Route path="/empresa/relatorio" element={<RelatorioEmpresa />} />
      <Route path="/empresa/visualizar/:id" element={<VisualizacaoEmpresa />} />

      {/* Técnico */}
      <Route path="/tecnico" element={<ListaTecnicos />} />
      <Route path="/tecnico/cadastro" element={<CadastroTecnico />} />

      {/* Finanças */}
      <Route path="/folha-banco" element={<FolhaBanco />} />
      <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
      <Route path="/conta-corrente" element={<ContaCorrente />} />
      <Route path="/dre" element={<DRE />} />
      <Route path="/indicadores" element={<Indicadores />} />
      <Route path="/controlo-pagamento" element={<ControloPagamento />} />
      <Route path="/custos-receitas" element={<CustosReceitas />} />
      <Route path="/orcamento" element={<Orcamento />} />
      <Route path="/analise" element={<AnaliseGeral />} />

      {/* Outros módulos */}
      <Route path="/fornecedores" element={<Fornecedores />} />
      <Route path="/transferencia-diaria" element={<Transferencias />} />
      <Route path="/relatorios" element={<Relatorios />} />
      <Route path="/graficos" element={<Graficos />} />
    </Routes>
  );
}
