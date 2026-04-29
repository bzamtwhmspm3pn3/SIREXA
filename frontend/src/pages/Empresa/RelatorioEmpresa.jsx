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
  Users,
  Briefcase,
  Landmark,
  CreditCard,
  Hash,
  Globe,
  Smartphone,
  DollarSign,
  Loader2,
  Percent,
  Shield
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const RelatorioEmpresa = () => {
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    carregarEmpresa();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresa = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      setEmpresa(data);
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar empresa", "erro");
    } finally {
      setLoading(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  const voltarParaLista = () => {
    window.location.href = "/empresa";
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

  const formatarPercentual = (valor) => {
    if (!valor && valor !== 0) return "—";
    return `${(valor * 100).toFixed(1)}%`;
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

  const carregarLogoBase64 = async (url) => {
    if (!url) return null;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Erro ao carregar logo:", error);
      return null;
    }
  };

  const exportarPDFProfissional = async () => {
    if (!empresa) return;
    
    setExportando(true);
    mostrarMensagem("Gerando PDF profissional...", "info");
    
    try {
      const doc = new jsPDF();
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toISOString().slice(0, 10).replace(/-/g, "");
      const numeroRelatorio = `${dataFormatada}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
      
      let yPos = 15;

      // ==================== CABEÇALHO ====================
      if (empresa.logotipo) {
        try {
          const logoBase64 = await carregarLogoBase64(`https://sirexa-api.onrender.com/uploads/${empresa.logotipo}`);
          if (logoBase64) {
            doc.addImage(logoBase64, "PNG", 14, 8, 25, 25);
          }
        } catch (err) {
          console.log("Logo não carregado:", err);
        }
      }

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("RELATORIO CORPORATIVO", 50, 18);
      
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(empresa.nome, 50, 30);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Nº Relatorio: ${numeroRelatorio}`, 50, 40);
      doc.text(`Gerado em: ${dataAtual.toLocaleString("pt-AO")}`, 50, 48);
      doc.text(`Documento: Ficha de Cadastro Empresarial`, 50, 56);

      yPos = 70;

      // ==================== INFORMACOES BASICAS ====================
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INFORMACOES BASICAS", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["Nome da Empresa", empresa.nome || "—"],
          ["Nome Comercial", empresa.nomeComercial || "—"],
          ["NIF", empresa.nif || "—"],
          ["Regime de IVA", empresa.regimeIva || "—"],
          ["Regime INSS", empresa.isBaixosRendimentos ? "Baixos Rendimentos (1.5% / 4%)" : "Normal (3% / 8%)"],
          ["Tipo IRT", empresa.irtTipoCalculo === "progressivo" ? "Tabela Progressiva" : "Taxa Fixa"],
          ["Status", empresa.ativo ? "Ativa" : "Inativa"],
        ],
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
          1: { cellWidth: "auto" }
        },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 248, 255] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;

      // ==================== CONFIGURACOES FISCAIS (INSS E IRT) ====================
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("CONFIGURACOES FISCAIS", 14, yPos);
      
      const fiscaisData = [];
      
      // INSS
      fiscaisData.push(["Regime INSS", empresa.isBaixosRendimentos ? "Baixos Rendimentos" : "Normal"]);
      fiscaisData.push(["INSS Colaborador", formatarPercentual(empresa.inssColaboradorTaxa || (empresa.isBaixosRendimentos ? 0.015 : 0.03))]);
      fiscaisData.push(["INSS Empregador", formatarPercentual(empresa.inssEmpregadorTaxa || (empresa.isBaixosRendimentos ? 0.04 : 0.08))]);
      fiscaisData.push(["Limite Baixos Rendimentos", formatarMoeda(empresa.limiteBaixosRendimentos || 350000)]);
      
      // IRT
      fiscaisData.push(["Tipo IRT", empresa.irtTipoCalculo === "progressivo" ? "Tabela Progressiva" : "Taxa Fixa"]);
      if (empresa.irtTipoCalculo === "fixo") {
        fiscaisData.push(["Taxa IRT Fixa", formatarPercentual(empresa.irtTaxaFixa || 0.065)]);
      }
      
      // IVA
      fiscaisData.push(["Taxa de IVA", `${empresa.taxaIVA || 14}%`]);
      fiscaisData.push(["Retencao na Fonte", empresa.incluiRetencao ? "Sim" : "Nao"]);
      if (empresa.incluiRetencao) {
        fiscaisData.push(["Taxa de Retencao", `${empresa.taxaRetencao || 7}%`]);
      }
      
      autoTable(doc, {
        startY: yPos + 5,
        body: fiscaisData,
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
          1: { cellWidth: "auto" }
        },
        alternateRowStyles: { fillColor: [240, 248, 255] }
      });
      
      yPos = doc.lastAutoTable.finalY + 10;

      // ==================== CONTACTOS ====================
      if (empresa.contactos?.email || empresa.contactos?.telefone) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("CONTACTOS", 14, yPos);
        
        const contactosData = [];
        if (empresa.contactos?.email) contactosData.push(["Email", empresa.contactos.email]);
        if (empresa.contactos?.telefone) contactosData.push(["Telefone", empresa.contactos.telefone]);
        if (empresa.contactos?.telefoneAlternativo) contactosData.push(["Telefone Alternativo", empresa.contactos.telefoneAlternativo]);
        if (empresa.contactos?.whatsapp) contactosData.push(["WhatsApp", empresa.contactos.whatsapp]);
        if (empresa.contactos?.website) contactosData.push(["Website", empresa.contactos.website]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: contactosData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== ENDERECO ====================
      if (empresa.endereco?.rua || empresa.endereco?.cidade) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("ENDERECO", 14, yPos);
        
        let enderecoCompleto = "";
        if (empresa.endereco.rua) enderecoCompleto += empresa.endereco.rua;
        if (empresa.endereco.numero) enderecoCompleto += `, ${empresa.endereco.numero}`;
        if (empresa.endereco.bairro) enderecoCompleto += `\nBairro: ${empresa.endereco.bairro}`;
        if (empresa.endereco.cidade || empresa.endereco.provincia) {
          enderecoCompleto += `\n${empresa.endereco.cidade || ""}${empresa.endereco.cidade && empresa.endereco.provincia ? ", " : ""}${empresa.endereco.provincia || ""}`;
        }
        if (empresa.endereco.pais) enderecoCompleto += `\n${empresa.endereco.pais}`;
        if (empresa.endereco.codigoPostal) enderecoCompleto += `\nCodigo Postal: ${empresa.endereco.codigoPostal}`;
        
        autoTable(doc, {
          startY: yPos + 5,
          body: [["Endereco Completo", enderecoCompleto]],
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
            1: { cellWidth: "auto" }
          }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== DADOS CORPORATIVOS ====================
      if (empresa.objetoSocial || empresa.capitalSocial > 0 || empresa.servicos?.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("DADOS CORPORATIVOS", 14, yPos);
        
        const corporativosData = [];
        if (empresa.objetoSocial) corporativosData.push(["Objeto Social", empresa.objetoSocial]);
        if (empresa.dataConstituicao) corporativosData.push(["Data de Constituicao", formatarData(empresa.dataConstituicao)]);
        if (empresa.capitalSocial > 0) corporativosData.push(["Capital Social", formatarMoeda(empresa.capitalSocial)]);
        if (empresa.numeroFuncionarios > 0) corporativosData.push(["No de Funcionarios", empresa.numeroFuncionarios]);
        if (empresa.servicos?.length > 0) {
          corporativosData.push(["Servicos Prestados", empresa.servicos.join(", ")]);
        }
        
        autoTable(doc, {
          startY: yPos + 5,
          body: corporativosData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== DADOS BANCARIOS ====================
      if (empresa.banco || empresa.iban || empresa.swift) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("DADOS BANCARIOS", 14, yPos);
        
        const bancariosData = [];
        if (empresa.banco) bancariosData.push(["Banco", empresa.banco]);
        if (empresa.iban) bancariosData.push(["IBAN", empresa.iban]);
        if (empresa.swift) bancariosData.push(["SWIFT/BIC", empresa.swift]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: bancariosData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
            1: { cellWidth: "auto", fontStyle: "normal" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== DADOS FISCAIS COMPLEMENTARES ====================
      if (empresa.caed || empresa.regimeTributario) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text("DADOS FISCAIS COMPLEMENTARES", 14, yPos);
        
        const fiscaisCompData = [];
        if (empresa.caed) fiscaisCompData.push(["CAED", empresa.caed]);
        if (empresa.regimeTributario) fiscaisCompData.push(["Regime Tributario", empresa.regimeTributario]);
        
        autoTable(doc, {
          startY: yPos + 5,
          body: fiscaisCompData,
          theme: "striped",
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
            1: { cellWidth: "auto" }
          },
          alternateRowStyles: { fillColor: [240, 248, 255] }
        });
        
        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ==================== INFORMACOES DO SISTEMA ====================
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("INFORMACOES DO SISTEMA", 14, yPos);
      
      autoTable(doc, {
        startY: yPos + 5,
        body: [
          ["ID da Empresa", empresa._id || "—"],
          ["Data de Cadastro", formatarDataHora(empresa.createdAt)],
          ["Ultima Atualizacao", formatarDataHora(empresa.updatedAt)],
          ["Versao do Relatorio", "2.0"]
        ],
        theme: "striped",
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [37, 99, 235], cellWidth: 60 },
          1: { cellWidth: "auto" }
        },
        alternateRowStyles: { fillColor: [240, 248, 255] }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;

      // ==================== RODAPE ====================
      const paginaAltura = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Sistema de Gestao - Relatorio gerado eletronicamente. Valido sem assinatura.`,
        14,
        paginaAltura - 10
      );
      doc.text(
        `© ${new Date().getFullYear()} Sistema de Gestao Empresarial. Todos os direitos reservados.`,
        14,
        paginaAltura - 5
      );

      doc.save(`relatorio_${empresa.nome.replace(/\s/g, '_')}_${numeroRelatorio}.pdf`);
      
      mostrarMensagem("PDF gerado com sucesso!", "sucesso");
      
      setTimeout(() => {
        window.location.href = "/empresa";
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
      <Layout title="Relatorio da Empresa" showBackButton={true} backToRoute="/empresa">
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

  if (!empresa) {
    return (
      <Layout title="Relatorio da Empresa" showBackButton={true} backToRoute="/empresa">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
          <div className="bg-red-500/10 rounded-full p-6 mb-4 inline-flex">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          <p className="text-gray-400 text-lg">Empresa nao encontrada</p>
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

  return (
    <Layout title={`Relatorio - ${empresa.nome}`} showBackButton={true} backToRoute="/empresa">
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

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white">
            <div className="flex items-center gap-4">
              {empresa.logotipo ? (
                <img 
                  src={`https://sirexa-api.onrender.com/uploads/${empresa.logotipo}`}
                  alt={empresa.nome}
                  className="w-20 h-20 rounded-xl object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center">
                  <Building className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{empresa.nome}</h1>
                <p className="text-blue-200">NIF: {empresa.nif}</p>
                {empresa.isBaixosRendimentos && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-500/30 text-yellow-200 rounded-full text-xs">
                    Baixos Rendimentos
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Regime INSS</p>
                <p className="text-lg font-semibold text-gray-800">
                  {empresa.isBaixosRendimentos ? "Baixos Rendimentos" : "Normal"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Colaborador: {formatarPercentual(empresa.inssColaboradorTaxa)} | 
                  Empregador: {formatarPercentual(empresa.inssEmpregadorTaxa)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Regime IRT</p>
                <p className="text-lg font-semibold text-gray-800">
                  {empresa.irtTipoCalculo === "progressivo" ? "Tabela Progressiva" : "Taxa Fixa"}
                </p>
                {empresa.irtTipoCalculo === "fixo" && (
                  <p className="text-xs text-gray-400 mt-1">Taxa: {formatarPercentual(empresa.irtTaxaFixa)}</p>
                )}
              </div>
            </div>
            <p className="text-center text-gray-500 py-4">
              Clique em "Exportar PDF Profissional" para gerar o relatorio completo em formato PDF com layout corporativo.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
      `}</style>
    </Layout>
  );
};

export default RelatorioEmpresa;