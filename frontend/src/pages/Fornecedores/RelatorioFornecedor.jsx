// src/pages/Fornecedores/RelatorioFornecedor.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Building, 
  FileText, 
  Download, 
  Printer, 
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  CreditCard,
  DollarSign,
  Loader2,
  Truck,
  User,
  Building2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const RelatorioFornecedor = () => {
  const [fornecedor, setFornecedor] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  const NOME_SISTEMA = "AnDioGest";
  const NOME_SISTEMA_COMPLETO = "AnDioGest - Gestão Corporativa";

  useEffect(() => {
    carregarDados();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Carregar fornecedor
      const responseFornecedor = await fetch(`http://localhost:5000/api/fornecedores/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const dataFornecedor = await responseFornecedor.json();
      setFornecedor(dataFornecedor);
      
      // Carregar empresa do técnico
      const empresaId = localStorage.getItem("empresaId");
      if (empresaId) {
        const responseEmpresa = await fetch(`http://localhost:5000/api/empresa/${empresaId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (responseEmpresa.ok) {
          const dataEmpresa = await responseEmpresa.json();
          setEmpresa(dataEmpresa.dados || dataEmpresa);
        }
      }
      
      // Carregar dados do usuário
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUsuario(user);
      }
      
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar dados", "erro");
    } finally {
      setLoading(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  const voltarParaLista = () => {
    window.location.href = "/fornecedores";
  };

  const formatarMoeda = (valor) => {
    if (!valor) return "—";
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  const formatarData = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarDataHora = (data) => {
    if (!data) return "—";
    return new Date(data).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportarPDFProfissional = async () => {
    if (!fornecedor) return;
    
    setExportando(true);
    mostrarMensagem("Gerando PDF profissional...", "info");
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().slice(0, 10).replace(/-/g, "");
      const numeroRelatorio = `${dataFormatada}-FOR-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
      
      const nomeEmpresa = empresa?.nome || localStorage.getItem("empresaNome") || "Empresa";
      const nifEmpresa = empresa?.nif || "---";
      const emailEmpresa = empresa?.email || "---";
      const telefoneEmpresa = empresa?.telefone || "---";
      const enderecoEmpresa = empresa?.endereco || "---";
      
      let yPos = 20;

      // ==================== CABEÇALHO COM LOGOTIPO ====================
      doc.setFillColor(37, 99, 235);
      doc.rect(14, 10, 40, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("A", 30, 35);
      doc.setFontSize(10);
      doc.text("D", 38, 35);
      doc.setFontSize(8);
      doc.text("Gest", 28, 42);
      
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(NOME_SISTEMA_COMPLETO, 60, 20);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(nomeEmpresa, 60, 28);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`NIF: ${nifEmpresa} | Email: ${emailEmpresa} | Tel: ${telefoneEmpresa}`, 60, 34);
      doc.text(`${enderecoEmpresa}`, 60, 40);
      
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text(`Nº: ${numeroRelatorio}`, 195, 20, { align: "right" });
      doc.text(`Data: ${dataAtual.toLocaleString("pt-AO")}`, 195, 26, { align: "right" });

      yPos = 55;

      // ==================== TÍTULO PRINCIPAL ====================
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("RELATÓRIO DE FORNECEDOR", 14, yPos);
      
      yPos += 10;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(fornecedor.nome, 14, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Documento: Ficha Cadastral de Fornecedor`, 14, yPos);

      yPos += 12;

      // ==================== RESPONSÁVEL PELA EXPORTAÇÃO ====================
      doc.setFillColor(240, 248, 255);
      doc.rect(14, yPos - 3, 180, 18, 'F');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RESPONSÁVEL PELA EXPORTAÇÃO", 14, yPos);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`${usuario?.nome || "Usuário"}`, 14, yPos + 6);
      doc.text(`Cargo: ${usuario?.cargo || "Técnico"}`, 100, yPos + 6);
      yPos += 15;

      // ==================== INFORMAÇÕES BÁSICAS ====================
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INFORMAÇÕES BÁSICAS", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["Nome / Razão Social", fornecedor.nome || "—"],
          ["NIF", fornecedor.nif || "—"],
          ["Tipo de Serviço", fornecedor.tipoServico || "—"],
          ["Status", fornecedor.status || "—"],
        ],
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 50 },
          1: { cellWidth: "auto" }
        },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;

      // ==================== CONTACTOS ====================
      if (fornecedor.email || fornecedor.telefone || fornecedor.endereco) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("CONTACTOS", 14, yPos);
        
        const contactosData = [];
        if (fornecedor.email) contactosData.push(["Email", fornecedor.email]);
        if (fornecedor.telefone) contactosData.push(["Telefone", fornecedor.telefone]);
        if (fornecedor.contato) contactosData.push(["Pessoa de Contacto", fornecedor.contato]);
        if (fornecedor.endereco) contactosData.push(["Endereço", fornecedor.endereco]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: contactosData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 50 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== DADOS BANCÁRIOS ====================
      if (fornecedor.pagamento?.banco || fornecedor.pagamento?.iban) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("DADOS BANCÁRIOS", 14, yPos);
        
        const bancariosData = [];
        if (fornecedor.pagamento?.banco) bancariosData.push(["Banco", fornecedor.pagamento.banco]);
        if (fornecedor.pagamento?.iban) bancariosData.push(["IBAN", fornecedor.pagamento.iban]);
        if (fornecedor.pagamento?.swift) bancariosData.push(["SWIFT/BIC", fornecedor.pagamento.swift]);
        if (fornecedor.pagamento?.formaPagamento) bancariosData.push(["Forma de Pagamento", fornecedor.pagamento.formaPagamento]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: bancariosData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 50 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== DADOS FISCAIS ====================
      if (fornecedor.regimeTributacao || fornecedor.fiscal?.taxaIVA > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("DADOS FISCAIS", 14, yPos);
        
        const fiscaisData = [];
        if (fornecedor.regimeTributacao) fiscaisData.push(["Regime de Tributação", fornecedor.regimeTributacao]);
        if (fornecedor.fiscal?.suportaIVA !== undefined) fiscaisData.push(["Suporta IVA", fornecedor.fiscal.suportaIVA ? "Sim" : "Não"]);
        if (fornecedor.fiscal?.taxaIVA > 0) fiscaisData.push(["Taxa de IVA", `${fornecedor.fiscal.taxaIVA}%`]);
        if (fornecedor.fiscal?.retencaoFonte) {
          fiscaisData.push(["Retenção na Fonte", "Sim"]);
          if (fornecedor.fiscal?.tipoRetencao) fiscaisData.push(["Tipo de Retenção", fornecedor.fiscal.tipoRetencao]);
          if (fornecedor.fiscal?.taxaRetencao > 0) fiscaisData.push(["Taxa de Retenção", `${fornecedor.fiscal.taxaRetencao}%`]);
        }
        
        autoTable(doc, {
          startY: yPos + 5,
          body: fiscaisData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 50 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== CONTRATOS ====================
      if (fornecedor.contratos && fornecedor.contratos.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("CONTRATOS", 14, yPos);
        
        const contratosData = fornecedor.contratos.map((contrato, index) => [
          `${index + 1}`,
          formatarMoeda(contrato.valor),
          contrato.modalidadePagamento || "—",
          formatarData(contrato.dataInicio),
          formatarData(contrato.dataFim),
          contrato.descricao?.substring(0, 30) || "—"
        ]);
        
        autoTable(doc, {
          startY: yPos + 5,
          head: [["#", "Valor", "Modalidade", "Início", "Fim", "Descrição"]],
          body: contratosData,
          theme: "striped",
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 248, 255] },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 35, halign: "right" },
            2: { cellWidth: 30 },
            3: { cellWidth: 25, halign: "center" },
            4: { cellWidth: 25, halign: "center" },
            5: { cellWidth: "auto" }
          }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== INFORMAÇÕES DO SISTEMA ====================
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INFORMAÇÕES DO SISTEMA", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["Sistema", NOME_SISTEMA_COMPLETO],
          ["Empresa", nomeEmpresa],
          ["ID do Fornecedor", fornecedor._id || "—"],
          ["Data de Cadastro", formatarDataHora(fornecedor.createdAt)],
          ["Última Atualização", formatarDataHora(fornecedor.updatedAt)],
          ["Gerado por (Técnico)", usuario?.nome || "Usuário do Sistema"],
          ["Cargo do Técnico", usuario?.cargo || "Técnico de Gestão"],
          ["Data de Geração", formatarDataHora(new Date())],
          ["Versão do Relatório", "2.0"]
        ],
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 55 },
          1: { cellWidth: "auto" }
        },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 14, right: 14 }
      });

      // ==================== ASSINATURAS ====================
      const finalY = doc.lastAutoTable.finalY + 20;
      const pageHeight = doc.internal.pageSize.height;
      
      if (finalY + 40 < pageHeight) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        
        doc.line(14, finalY + 10, 80, finalY + 10);
        doc.text("Assinatura do Técnico Responsável", 14, finalY + 16);
        
        doc.line(120, finalY + 10, 186, finalY + 10);
        doc.text(`Carimbo da ${nomeEmpresa}`, 120, finalY + 16);
      }

      // ==================== RODAPÉ ====================
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(
        `${NOME_SISTEMA} - Relatório gerado eletronicamente. Válido sem assinatura.`,
        14,
        pageHeight - 10
      );
      doc.text(
        `© ${new Date().getFullYear()} ${NOME_SISTEMA_COMPLETO} - Todos os direitos reservados.`,
        14,
        pageHeight - 5
      );

      doc.save(`relatorio_fornecedor_${fornecedor.nome.replace(/\s/g, '_')}_${numeroRelatorio}.pdf`);
      
      mostrarMensagem("✅ PDF gerado com sucesso!", "sucesso");
      
      setTimeout(() => {
        window.location.href = "/fornecedores";
      }, 2000);
      
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      mostrarMensagem("Erro ao gerar PDF. Tente novamente.", "erro");
    } finally {
      setExportando(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Relatório do Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-400">Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  if (!fornecedor) {
    return (
      <Layout title="Relatório do Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
          <div className="bg-red-500/10 rounded-full p-6 mb-4 inline-flex">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          <p className="text-gray-400 text-lg">Fornecedor não encontrado</p>
          <button
            onClick={voltarParaLista}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Voltar para lista
          </button>
        </div>
      </Layout>
    );
  }

  const nomeEmpresa = empresa?.nome || localStorage.getItem("empresaNome") || "Carregando...";

  return (
    <Layout title={`Relatório - ${fornecedor.nome}`} showBackButton={true} backToRoute="/fornecedores">
      {/* Toast Notification */}
      {mensagem.texto && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out`}>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600" 
              : mensagem.tipo === "info"
              ? "bg-blue-600"
              : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : 
             mensagem.tipo === "info" ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             <AlertTriangle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Botões de Ação */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button
            onClick={voltarParaLista}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-200"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
          <div className="flex gap-3">
            <button
              onClick={imprimir}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200"
            >
              <Printer size={18} /> Imprimir
            </button>
            <button
              onClick={exportarPDFProfissional}
              disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {exportando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Exportar PDF Profissional
                </>
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo para visualização na tela */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                <Truck className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{fornecedor.nome}</h1>
                <p className="text-blue-200">NIF: {fornecedor.nif}</p>
                {fornecedor.tipoServico && (
                  <p className="text-blue-300 text-sm mt-1">{fornecedor.tipoServico}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-8">
            {/* Informações da Empresa */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={18} className="text-blue-600" />
                <h3 className="font-semibold text-blue-800">Informações da Empresa</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600"><strong>Nome:</strong> {empresa?.nome || "---"}</p>
                <p className="text-gray-600"><strong>NIF:</strong> {empresa?.nif || "---"}</p>
                <p className="text-gray-600"><strong>Email:</strong> {empresa?.email || "---"}</p>
                <p className="text-gray-600"><strong>Telefone:</strong> {empresa?.telefone || "---"}</p>
              </div>
            </div>

            {/* Responsável pela Exportação */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-purple-600" />
                <h3 className="font-semibold text-purple-800">Responsável pela Exportação</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-gray-600"><strong>Nome:</strong> {usuario?.nome || "---"}</p>
                <p className="text-gray-600"><strong>Cargo:</strong> {usuario?.cargo || "Técnico"}</p>
                <p className="text-gray-600"><strong>Email:</strong> {usuario?.email || "---"}</p>
                <p className="text-gray-600"><strong>Data:</strong> {new Date().toLocaleDateString('pt-PT')}</p>
              </div>
            </div>

            {/* Resumo do Fornecedor */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">NIF</p>
                <p className="text-lg font-bold text-gray-800">{fornecedor.nif || "—"}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Status</p>
                <p className={`text-lg font-bold ${fornecedor.status === "Ativo" ? "text-green-600" : "text-red-600"}`}>
                  {fornecedor.status || "—"}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Contratos</p>
                <p className="text-lg font-bold text-gray-800">{fornecedor.contratos?.length || 0}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-sm">Registo</p>
                <p className="text-lg font-bold text-gray-800">{formatarData(fornecedor.createdAt)}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">📊 O PDF incluirá:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Logotipo e dados da empresa do técnico</li>
                <li>• Responsável pela exportação</li>
                <li>• Informações básicas do fornecedor</li>
                <li>• Contactos, dados bancários e fiscais</li>
                <li>• Lista completa de contratos</li>
                <li>• Informações do sistema e assinaturas</li>
              </ul>
            </div>

            <p className="text-center text-gray-500 py-8">
              Clique em "Exportar PDF Profissional" para gerar o relatório completo em formato PDF com layout corporativo.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          15% {
            opacity: 1;
            transform: translateY(0);
          }
          85% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
        
        .animate-fade-in-out {
          animation: fade-in-out 2s ease forwards;
        }
      `}</style>
    </Layout>
  );
};

export default RelatorioFornecedor;