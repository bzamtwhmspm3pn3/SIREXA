// frontend/src/pages/DRE.jsx - VERSÃO COMPLETA E FUNCIONAL
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import EmpresaSelector from "../components/EmpresaSelector";
import { 
  TrendingUp, TrendingDown, RefreshCw, Download, Printer, 
  Loader2, FileText, Award, DollarSign, Building2, Eye,
  CheckCircle, AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const DRE = () => {
  const { user, isGestor, isTecnico, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [periodo, setPeriodo] = useState("mensal");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [mostrarAnalise, setMostrarAnalise] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [recarregar, setRecarregar] = useState(false);

  const BASE_URL = "http://localhost:5000";

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const periodosDisponiveis = [
    { valor: "mensal", label: "Mensal" },
    { valor: "bimestral", label: "Bimestral" },
    { valor: "trimestral", label: "Trimestral" },
    { valor: "semestral", label: "Semestral" },
    { valor: "anual", label: "Anual" }
  ];

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  // Para técnico
  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarDRE();
    }
  }, [empresaSelecionada, periodo, ano, mes, recarregar]);

  const carregarEmpresas = async () => {
    if (isTecnico()) {
      setLoadingEmpresas(false);
      return;
    }
    
    setLoadingEmpresas(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/empresa`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (response.status === 403) {
        setEmpresas([]);
        mostrarMensagem("Acesso negado", "erro");
        return;
      }
      
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      
      if (empresasList.length > 0 && !empresaSelecionada) {
        setEmpresaSelecionada(empresasList[0]._id);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar empresas", "erro");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarDRE = async () => {
    if (!empresaSelecionada) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${BASE_URL}/api/demonstrativoderesultados/calcular?empresaId=${empresaSelecionada}&periodo=${periodo}&ano=${ano}&mes=${mes}`;
      const response = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
      
      if (response.status === 403) {
        mostrarMensagem("Acesso negado", "erro");
        setEmpresaSelecionada("");
        setDre(null);
        setLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.sucesso && data.dados) {
        setDre(data.dados);
      } else {
        setDre(null);
        mostrarMensagem(data.mensagem || "Erro ao carregar DRE", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      setDre(null);
      mostrarMensagem("Erro ao carregar dados", "erro");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (valor) => {
    if (valor === undefined || valor === null) return "0,00";
    return Number(valor).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPeriodoNome = () => {
    if (periodo === "mensal") return meses[mes - 1];
    if (periodo === "bimestral") return `${Math.ceil(mes / 2)}º Bimestre`;
    if (periodo === "trimestral") return `${Math.ceil(mes / 3)}º Trimestre`;
    if (periodo === "semestral") return `${Math.ceil(mes / 6)}º Semestre`;
    return `Ano ${ano}`;
  };

  const exportarPDF = async () => {
    if (!dre) return;
    setExportando(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;
      
      const empresaAtual = isTecnico() ? { nome: userEmpresaNome } : empresas.find(e => e._id === empresaSelecionada);
      
      // Cabeçalho
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("DEMONSTRAÇÃO DE RESULTADOS", pageWidth / 2, 25, { align: "center" });
      doc.setFontSize(12);
      doc.text(empresaAtual?.nome || dre.empresaNome, pageWidth / 2, 38, { align: "center" });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      yPos = 60;
      doc.text(`Período: ${getPeriodoNome()} de ${ano}`, 20, yPos);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-AO")}`, 20, yPos + 8);
      yPos += 20;
      
      // Tabela
      const tabelaDados = [
        ["PROVEITOS OPERACIONAIS", ""],
        ["  Vendas de Mercadorias", fmt(dre.proveitosOperacionais?.vendas)],
        ["  Prestações de Serviços", fmt(dre.proveitosOperacionais?.prestacoesServicos)],
        ["  Outros Proveitos", fmt(dre.proveitosOperacionais?.outrosProveitosOperacionais)],
        ["  TOTAL DE PROVEITOS", fmt(dre.proveitosOperacionais?.total)],
        ["", ""],
        ["CUSTOS OPERACIONAIS", ""],
        ["  Custo das Mercadorias Vendidas", fmt(dre.custosOperacionais?.custoMercadoriasVendidas)],
        ["  Custos com o Pessoal (Salários)", fmt(dre.custosOperacionais?.custosPessoal)],
        ["  Impostos sobre Salários (IRT/INSS)", fmt(dre.custosOperacionais?.impostosPessoal)],
        ["  Abastecimento", fmt(dre.custosOperacionais?.abastecimento)],
        ["  Comunicação", fmt(dre.custosOperacionais?.comunicacao)],
        ["  Rendas e Alugueres", fmt(dre.custosOperacionais?.rendas)],
        ["  Manutenção", fmt(dre.custosOperacionais?.manutencao)],
        ["  Fornecedores", fmt(dre.custosOperacionais?.fornecedores)],
        ["  Impostos", fmt(dre.custosOperacionais?.impostos)],
        ["  Outros Custos", fmt(dre.custosOperacionais?.outros)],
        ["  TOTAL DE CUSTOS", fmt(dre.custosOperacionais?.total)],
        ["", ""],
        ["RESULTADOS", ""],
        ["  RESULTADO OPERACIONAL", fmt(dre.resultados?.operacionais)],
        ["  RESULTADO FINANCEIRO", fmt(dre.resultados?.financeiros)],
        ["  RESULTADO ANTES DE IMPOSTOS", fmt(dre.resultados?.antesImpostos)],
        ["  IMPOSTO (25%)", fmt(dre.resultados?.impostoRendimento)],
        ["  RESULTADO LÍQUIDO", fmt(dre.resultados?.liquidosExercicio)]
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [["Descrição", "Valor (Kz)"]],
        body: tabelaDados,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 50, halign: 'right' } }
      });
      
      doc.save(`DRE_${empresaAtual?.nome?.replace(/\s/g, "_")}_${getPeriodoNome()}_${ano}.pdf`);
      mostrarMensagem("PDF exportado com sucesso!", "sucesso");
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao exportar PDF", "erro");
    } finally {
      setExportando(false);
    }
  };

  const exportarExcel = () => {
    if (!dre) return;
    
    const dados = [
      ["DEMONSTRAÇÃO DE RESULTADOS"],
      [`Empresa: ${dre.empresaNome}`],
      [`Período: ${getPeriodoNome()} de ${ano}`],
      [],
      ["Descrição", "Valor (Kz)"],
      ["PROVEITOS OPERACIONAIS", ""],
      ["  Vendas de Mercadorias", dre.proveitosOperacionais?.vendas || 0],
      ["  Prestações de Serviços", dre.proveitosOperacionais?.prestacoesServicos || 0],
      ["  TOTAL DE PROVEITOS", dre.proveitosOperacionais?.total || 0],
      [],
      ["CUSTOS OPERACIONAIS", ""],
      ["  Custo das Mercadorias Vendidas", dre.custosOperacionais?.custoMercadoriasVendidas || 0],
      ["  Custos com Pessoal", dre.custosOperacionais?.custosPessoal || 0],
      ["  Impostos sobre Salários", dre.custosOperacionais?.impostosPessoal || 0],
      ["  Abastecimento", dre.custosOperacionais?.abastecimento || 0],
      ["  Comunicação", dre.custosOperacionais?.comunicacao || 0],
      ["  Rendas", dre.custosOperacionais?.rendas || 0],
      ["  Manutenção", dre.custosOperacionais?.manutencao || 0],
      ["  Outros Custos", dre.custosOperacionais?.outros || 0],
      ["  TOTAL DE CUSTOS", dre.custosOperacionais?.total || 0],
      [],
      ["RESULTADOS", ""],
      ["  RESULTADO OPERACIONAL", dre.resultados?.operacionais || 0],
      ["  RESULTADO FINANCEIRO", dre.resultados?.financeiros || 0],
      ["  RESULTADO ANTES DE IMPOSTOS", dre.resultados?.antesImpostos || 0],
      ["  IMPOSTO (25%)", dre.resultados?.impostoRendimento || 0],
      ["  RESULTADO LÍQUIDO", dre.resultados?.liquidosExercicio || 0],
      [],
      ["INDICADORES", ""],
      ["Margem Bruta", `${dre.indicadores?.margemBruta || 0}%`],
      ["Margem Líquida", `${dre.indicadores?.margemLiquida || 0}%`],
      ["Custos Pessoal/Receitas", `${dre.indicadores?.custoPessoalPercentual || 0}%`],
      ["CMV/Receitas", `${dre.indicadores?.cmvPercentual || 0}%`]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(dados);
    ws['!cols'] = [{ wch: 55 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demonstracao de Resultados");
    XLSX.writeFile(wb, `DRE_${dre.empresaNome?.replace(/\s/g, "_")}_${getPeriodoNome()}_${ano}.xlsx`);
    mostrarMensagem("Excel exportado com sucesso!", "sucesso");
  };

  if (loadingEmpresas) {
    return (
      <Layout title="Demonstração de Resultados" showBackButton={true} backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Demonstração de Resultados" showBackButton={true} backToRoute="/menu">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="space-y-6 p-4">
        {isTecnico() && (
          <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Eye size={18} />
              <span className="text-sm">Operando como Técnico | Empresa: <strong>{userEmpresaNome}</strong></span>
            </div>
          </div>
        )}

        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={() => setRecarregar(!recarregar)}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa para começar"}
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto text-blue-400" size={40} />
            <p className="text-gray-400 mt-2">Carregando dados...</p>
          </div>
        ) : !dre ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <DollarSign className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">Nenhum dado encontrado</p>
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Período</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                    {periodosDisponiveis.map(p => <option key={p.valor} value={p.valor}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ano</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white" value={ano} onChange={(e) => setAno(parseInt(e.target.value))}>
                    {[2023, 2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {periodo !== "anual" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mês</label>
                    <select className="w-full p-3 rounded-xl bg-gray-700 border border-gray-600 text-white" value={mes} onChange={(e) => setMes(parseInt(e.target.value))}>
                      {meses.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button onClick={() => setRecarregar(!recarregar)} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl transition flex items-center justify-center gap-2">
                    <RefreshCw size={18} /> Atualizar
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 px-4 py-3 rounded-xl transition">
                    <Download size={18} /> Excel
                  </button>
                  <button onClick={exportarPDF} disabled={exportando} className="bg-red-600 hover:bg-red-700 px-4 py-3 rounded-xl transition disabled:opacity-50">
                    {exportando ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />} PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                <p className="text-green-300 text-sm">Receitas Totais</p>
                <p className="text-2xl font-bold text-green-400">{fmt(dre.proveitosOperacionais?.total)} Kz</p>
              </div>
              <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-xl p-4 border border-red-500/30">
                <p className="text-red-300 text-sm">Custos Totais</p>
                <p className="text-2xl font-bold text-red-400">{fmt(dre.custosOperacionais?.total)} Kz</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-xl p-4 border border-yellow-500/30">
                <p className="text-yellow-300 text-sm">Resultado Operacional</p>
                <p className={`text-2xl font-bold ${dre.resultados?.operacionais >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(Math.abs(dre.resultados?.operacionais))} Kz
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                <p className="text-purple-300 text-sm">Resultado Líquido</p>
                <p className={`text-2xl font-bold ${dre.resultados?.liquidosExercicio >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(Math.abs(dre.resultados?.liquidosExercicio))} Kz
                </p>
              </div>
            </div>

            {/* Título */}
            <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
              <h2 className="text-2xl font-bold text-white">Demonstração de Resultados do {getPeriodoNome()} de {ano}</h2>
              <p className="text-gray-400 text-sm mt-1">{dre.empresaNome}</p>
            </div>

            {/* Tabela Principal com Custos Detalhados */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr className="text-gray-700 text-sm">
                      <th className="p-4 text-left font-semibold">Designação</th>
                      <th className="p-4 text-right font-semibold">Valor (Kz)</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan="2" className="p-3 font-bold text-blue-600">PROVEITOS OPERACIONAIS</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">Vendas de Mercadorias</td>
                      <td className="p-3 text-right text-green-600 font-medium">{fmt(dre.proveitosOperacionais?.vendas)} Kz</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">Prestações de Serviços</td>
                      <td className="p-3 text-right text-green-600 font-medium">{fmt(dre.proveitosOperacionais?.prestacoesServicos)} Kz</td>
                    </tr>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="p-3 pl-8 font-bold">TOTAL DE PROVEITOS OPERACIONAIS</td>
                      <td className="p-3 text-right font-bold text-green-600">{fmt(dre.proveitosOperacionais?.total)} Kz</td>
                    </tr>

                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan="2" className="p-3 font-bold text-red-600">CUSTOS OPERACIONAIS</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">Custo das Mercadorias Vendidas (CMV)</td>
                      <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.custoMercadoriasVendidas)} Kz</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">Custos com o Pessoal (Salários)</td>
                      <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.custosPessoal)} Kz</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">Impostos sobre Salários (IRT/INSS)</td>
                      <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.impostosPessoal)} Kz</td>
                    </tr>
                    {dre.custosOperacionais?.abastecimento > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Abastecimento</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.abastecimento)} Kz</td>
                      </tr>
                    )}
                    {dre.custosOperacionais?.comunicacao > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Comunicação</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.comunicacao)} Kz</td>
                      </tr>
                    )}
                    {dre.custosOperacionais?.rendas > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Rendas e Alugueres</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.rendas)} Kz</td>
                      </tr>
                    )}
                    {dre.custosOperacionais?.manutencao > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Manutenção</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.manutencao)} Kz</td>
                      </tr>
                    )}
                    {dre.custosOperacionais?.fornecedores > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Fornecedores</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.fornecedores)} Kz</td>
                      </tr>
                    )}
                    {dre.custosOperacionais?.impostos > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Impostos e Taxas</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.impostos)} Kz</td>
                      </tr>
                    )}
                    {dre.custosOperacionais?.outros > 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="p-3 pl-8">Outros Custos Operacionais</td>
                        <td className="p-3 text-right text-red-600">{fmt(dre.custosOperacionais?.outros)} Kz</td>
                      </tr>
                    )}
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="p-3 pl-8 font-bold">TOTAL DE CUSTOS OPERACIONAIS</td>
                      <td className="p-3 text-right font-bold text-red-600">{fmt(dre.custosOperacionais?.total)} Kz</td>
                    </tr>

                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan="2" className="p-3 font-bold text-yellow-600">RESULTADOS</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">RESULTADO OPERACIONAL</td>
                      <td className={`p-3 text-right font-bold ${dre.resultados?.operacionais >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(Math.abs(dre.resultados?.operacionais))} Kz
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">RESULTADO FINANCEIRO</td>
                      <td className={`p-3 text-right font-bold ${dre.resultados?.financeiros >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(Math.abs(dre.resultados?.financeiros))} Kz
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="p-3 pl-8 font-bold">RESULTADO ANTES DE IMPOSTOS</td>
                      <td className={`p-3 text-right font-bold ${dre.resultados?.antesImpostos >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {fmt(Math.abs(dre.resultados?.antesImpostos))} Kz
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-3 pl-8">IMPOSTO SOBRE O RENDIMENTO (25%)</td>
                      <td className="p-3 text-right text-red-600">{fmt(dre.resultados?.impostoRendimento)} Kz</td>
                    </tr>
                    <tr className="border-t-2 border-gray-300 bg-gray-100">
                      <td className="p-3 pl-8 font-bold text-gray-900 text-lg">RESULTADO LÍQUIDO DO EXERCÍCIO</td>
                      <td className={`p-3 text-right font-bold text-xl ${dre.resultados?.liquidosExercicio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(Math.abs(dre.resultados?.liquidosExercicio))} Kz
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Indicadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-xs text-gray-400">Margem Bruta</p>
                <p className={`text-xl font-bold ${dre.indicadores?.margemBruta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dre.indicadores?.margemBruta}%
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-xs text-gray-400">Margem Líquida</p>
                <p className={`text-xl font-bold ${dre.indicadores?.margemLiquida >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dre.indicadores?.margemLiquida}%
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-xs text-gray-400">Custos Pessoal / Receitas</p>
                <p className={`text-xl font-bold ${dre.indicadores?.custoPessoalPercentual <= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {dre.indicadores?.custoPessoalPercentual}%
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-xs text-gray-400">CMV / Receitas</p>
                <p className={`text-xl font-bold ${dre.indicadores?.cmvPercentual <= 40 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {dre.indicadores?.cmvPercentual}%
                </p>
              </div>
            </div>

            {/* Análise */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <button onClick={() => setMostrarAnalise(!mostrarAnalise)} className="w-full flex items-center justify-between">
                <h3 className="text-md font-semibold text-blue-400 flex items-center gap-2"><Award size={18} /> Análise de Desempenho</h3>
                <span className="text-gray-400">{mostrarAnalise ? "▲" : "▼"}</span>
              </button>
              {mostrarAnalise && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-300 text-sm">
                    <strong>Classificação:</strong>{" "}
                    {parseFloat(dre.indicadores?.margemLiquida || 0) > 20 ? "Excelente" :
                     parseFloat(dre.indicadores?.margemLiquida || 0) > 10 ? "Bom" :
                     parseFloat(dre.indicadores?.margemLiquida || 0) > 0 ? "Regular" : "Crítico"}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {parseFloat(dre.indicadores?.margemLiquida || 0) > 20 ?
                      "Parabéns! A empresa apresenta excelente rentabilidade." :
                     parseFloat(dre.indicadores?.margemLiquida || 0) > 10 ?
                      "Bom desempenho financeiro. Continue otimizando os custos." :
                     parseFloat(dre.indicadores?.margemLiquida || 0) > 0 ?
                      "Resultado positivo, mas com margem reduzida." :
                      "Resultado negativo. Necessário reestruturação."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2.5s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default DRE;