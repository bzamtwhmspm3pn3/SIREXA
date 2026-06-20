// src/pages/Fornecedores/VisualizarFornecedor.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Truck, Building2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Hash, CheckCircle, XCircle,
  Calendar, DollarSign, Clock, Edit, FileText, Award,
  Landmark, AlertCircle, Printer, Download, Eye, User,
  Package, Wrench, Fuel, Computer, Globe, Home, Percent,
  Wallet, TrendingUp, Layers, Box, ShoppingBag
} from "lucide-react";

const VisualizarFornecedor = () => {
  const { role, user } = useAuth();
  const [fornecedor, setFornecedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empresaNome, setEmpresaNome] = useState("");
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();
  const { id } = useParams();

  const BASE_URL = "https://sirexa-api.onrender.com";

  useEffect(() => {
    carregarFornecedor();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarFornecedor = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }
      
      const data = await response.json();
      setFornecedor(data);
      
      // Carregar nome da empresa se tiver empresaId
      if (data.empresaId) {
        try {
          const empresaResponse = await fetch(`${BASE_URL}/api/empresa/${data.empresaId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (empresaResponse.ok) {
            const empresaData = await empresaResponse.json();
            setEmpresaNome(empresaData.nome || empresaData.dados?.nome || "");
          }
        } catch (err) {
          console.error("Erro ao carregar empresa:", err);
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar fornecedor", "erro");
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "—";
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

  const getStatusColor = (status) => {
    switch(status) {
      case "Ativo": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Inativo": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Bloqueado": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case "Ativo": return <CheckCircle className="w-4 h-4" />;
      case "Inativo": return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getIconForTipo = (tipoFornecedor) => {
    const tiposConfig = {
      mercadoria: { icon: Package, cor: "text-blue-400", bg: "bg-blue-600/20", border: "border-blue-500/30", gradient: "from-blue-600/20 to-blue-600/20", label: "📦 Mercadoria/Produto" },
      renda: { icon: Home, cor: "text-green-400", bg: "bg-green-600/20", border: "border-green-500/30", gradient: "from-green-600/20 to-green-600/20", label: "🏠 Renda (Aluguer)" },
      servicoProfissional: { icon: Briefcase, cor: "text-indigo-400", bg: "bg-indigo-600/20", border: "border-indigo-500/30", gradient: "from-indigo-600/20 to-indigo-600/20", label: "👔 Serviço Profissional" },
      internet: { icon: Globe, cor: "text-cyan-400", bg: "bg-cyan-600/20", border: "border-cyan-500/30", gradient: "from-cyan-600/20 to-cyan-600/20", label: "🌐 Internet/Telecom" },
      manutencao: { icon: Wrench, cor: "text-orange-400", bg: "bg-orange-600/20", border: "border-orange-500/30", gradient: "from-orange-600/20 to-orange-600/20", label: "🔧 Manutenção" },
      abastecimento: { icon: Fuel, cor: "text-yellow-400", bg: "bg-yellow-600/20", border: "border-yellow-500/30", gradient: "from-yellow-600/20 to-yellow-600/20", label: "⛽ Abastecimento" },
      equipamento: { icon: Computer, cor: "text-purple-400", bg: "bg-purple-600/20", border: "border-purple-500/30", gradient: "from-purple-600/20 to-purple-600/20", label: "🖥️ Equipamento" },
      servicoGeral: { icon: FileText, cor: "text-gray-400", bg: "bg-gray-600/20", border: "border-gray-500/30", gradient: "from-gray-600/20 to-gray-600/20", label: "📝 Outro Serviço" }
    };
    return tiposConfig[tipoFornecedor] || { icon: Truck, cor: "text-gray-400", bg: "bg-gray-600/20", border: "border-gray-500/30", gradient: "from-gray-600/20 to-gray-600/20", label: "Fornecedor" };
  };

  const calcularValorTotalItens = () => {
    if (!fornecedor?.itensFornecidos?.length && !fornecedor?.itens?.length) return 0;
    const itens = fornecedor.itensFornecidos || fornecedor.itens || [];
    return itens.reduce((sum, item) => sum + (item.valorTotal || item.valor || item.valorMensal || 0), 0);
  };

  const calcularValorTotalContratos = () => {
    if (!fornecedor?.contratos?.length) return 0;
    return fornecedor.contratos.reduce((sum, c) => sum + (c.valor || 0), 0);
  };

  const calcularValorTotalEstoque = () => {
    if (!fornecedor?.produtoInfo) return 0;
    const quantidade = fornecedor.produtoInfo.quantidade || 0;
    const precoCompra = fornecedor.produtoInfo.precoCompra || 0;
    return quantidade * precoCompra;
  };

  const imprimir = () => {
    window.print();
  };

  const exportarPDF = () => {
    navigate(`/fornecedores/relatorio/${fornecedor._id}`);
  };

  if (loading) {
    return (
      <Layout title="Detalhes do Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-400">Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  if (!fornecedor) {
    return (
      <Layout title="Detalhes do Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-lg">Fornecedor não encontrado</p>
          <button
            onClick={() => navigate("/fornecedores")}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
          >
            Voltar para lista
          </button>
        </div>
      </Layout>
    );
  }

  const tipoInfo = getIconForTipo(fornecedor.tipoFornecedor);
  const valorTotalItens = calcularValorTotalItens();
  const valorTotalContratos = calcularValorTotalContratos();
  const valorTotalEstoque = calcularValorTotalEstoque();
  const hasItens = (fornecedor.itensFornecidos?.length > 0) || (fornecedor.itens?.length > 0);
  const itensExibicao = fornecedor.itensFornecidos || fornecedor.itens || [];
  const isMercadoria = fornecedor.tipoFornecedor === "mercadoria";
  const temProdutoInfo = isMercadoria && fornecedor.produtoInfo && fornecedor.produtoInfo.produto;

  return (
    <Layout title={`Fornecedor - ${fornecedor.nome}`} showBackButton={true} backToRoute="/fornecedores">
      {/* Toast Notification */}
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

      <div className="max-w-5xl mx-auto pb-8">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Truck className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{fornecedor.nome}</h1>
                  <p className="text-gray-400 mt-1">NIF: {fornecedor.nif}</p>
                  {fornecedor.tipoFornecedor && (
                    <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
                      <Award className="w-4 h-4" /> {tipoInfo.label}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(fornecedor.status)}`}>
                  {getStatusIcon(fornecedor.status)}
                  {fornecedor.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda - Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            {/* Empresa */}
            {empresaNome && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-bold text-white">Empresa</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-400">Empresa</p>
                      <p className="text-white font-medium">{empresaNome}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contactos */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">Contactos</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {fornecedor.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-white">{fornecedor.email}</p>
                    </div>
                  </div>
                )}
                
                {fornecedor.telefone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <Phone className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-xs text-gray-400">Telefone</p>
                      <p className="text-white">{fornecedor.telefone}</p>
                    </div>
                  </div>
                )}
                
                {fornecedor.contato && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <User className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-xs text-gray-400">Pessoa de Contacto</p>
                      <p className="text-white">{fornecedor.contato}</p>
                    </div>
                  </div>
                )}
                
                {fornecedor.endereco && (
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                    <MapPin className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-xs text-gray-400">Endereço</p>
                      <p className="text-white">{fornecedor.endereco}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PRODUTO ATUAL - Para fornecedores do tipo mercadoria */}
            {temProdutoInfo && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-green-400" />
                    <h2 className="text-lg font-bold text-white">Produto Atual</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Produto</p>
                      <p className="text-white font-medium text-sm break-words">{fornecedor.produtoInfo.produto}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Código Barras</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.codigoBarras || "—"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Código Interno</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.codigoInterno || "—"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Categoria</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.categoria || "Geral"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Marca</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.marca || "—"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Unidade</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.unidadeMedida || "Unidade"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Quantidade</p>
                      <p className="text-blue-400 font-bold text-lg">{fornecedor.produtoInfo.quantidade || 0}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Quantidade Mínima</p>
                      <p className="text-yellow-400 text-sm">{fornecedor.produtoInfo.quantidadeMinima || 5}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Preço Compra</p>
                      <p className="text-green-400 text-sm">{formatarMoeda(fornecedor.produtoInfo.precoCompra)}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Preço Venda</p>
                      <p className="text-blue-400 text-sm">{formatarMoeda(fornecedor.produtoInfo.precoVenda)}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Data Validade</p>
                      <p className="text-white text-sm">{formatarData(fornecedor.produtoInfo.dataValidade)}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Armazém</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.armazem || "Principal"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">Nº Lote</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.numeroLote || "—"}</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400">IVA</p>
                      <p className="text-white text-sm">{fornecedor.produtoInfo.taxaIVA || 14}%</p>
                    </div>
                    <div className="bg-gray-800/70 rounded-xl p-3 text-center col-span-2 md:col-span-4">
                      <p className="text-xs text-gray-400">Valor Total do Estoque</p>
                      <p className="text-purple-400 font-bold text-xl">{formatarMoeda(valorTotalEstoque)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {fornecedor.produtoInfo.quantidade || 0} × {formatarMoeda(fornecedor.produtoInfo.precoCompra)}
                      </p>
                    </div>
                  </div>
                  {fornecedor.produtoInfo.observacoes && (
                    <div className="mt-4 p-3 bg-gray-700/30 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Observações do Produto</p>
                      <p className="text-gray-300 text-sm">{fornecedor.produtoInfo.observacoes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Itens Fornecidos (Histórico de Compras) */}
            {hasItens && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-bold text-white">Histórico de Compras ({itensExibicao.length})</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {itensExibicao.map((item, index) => (
                    <div key={index} className="bg-gray-700/30 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">
                            {item.produto || item.descricao || item.nome || "Item"}
                          </p>
                          <p className="text-emerald-400 font-bold mt-1">
                            {formatarMoeda(item.valorTotal || item.valor || item.valorMensal)}
                          </p>
                          {item.dataRegisto && (
                            <p className="text-xs text-gray-400 mt-1">
                              📅 {formatarData(item.dataRegisto)}
                            </p>
                          )}
                        </div>
                        {item.quantidade && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                            Qtd: {item.quantidade}
                          </span>
                        )}
                      </div>
                      {item.unidadeMedida && (
                        <p className="text-xs text-gray-400 mt-2">Unidade: {item.unidadeMedida}</p>
                      )}
                      {item.precoCompra && (
                        <p className="text-xs text-gray-400 mt-1">Preço Unitário: {formatarMoeda(item.precoCompra)}</p>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-600 flex justify-between items-center">
                    <span className="text-gray-400">Total Gasto em Compras:</span>
                    <span className="text-emerald-400 font-bold text-lg">{formatarMoeda(valorTotalItens)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Contratos */}
            {fornecedor.contratos && fornecedor.contratos.length > 0 && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">Contratos ({fornecedor.contratos.length})</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {fornecedor.contratos.map((contrato, index) => (
                    <div key={index} className="bg-gray-700/30 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-medium">{contrato.descricao || "Contrato"}</p>
                          <p className="text-emerald-400 font-bold mt-1">{formatarMoeda(contrato.valor)}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          {contrato.modalidadePagamento}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                        <div>
                          <p className="text-xs text-gray-400">Data Início</p>
                          <p className="text-white">{formatarData(contrato.dataInicio)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Data Fim</p>
                          <p className="text-white">{formatarData(contrato.dataFim)}</p>
                        </div>
                      </div>
                      {(contrato.diaVencimento || contrato.diaPagamento) && (
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2 pt-2 border-t border-gray-600">
                          {contrato.diaVencimento && (
                            <div>
                              <p className="text-xs text-gray-400">Dia Vencimento</p>
                              <p className="text-white">{contrato.diaVencimento}</p>
                            </div>
                          )}
                          {contrato.diaPagamento && (
                            <div>
                              <p className="text-xs text-gray-400">Dia Pagamento</p>
                              <p className="text-white">{contrato.diaPagamento}</p>
                            </div>
                          )}
                        </div>
                      )}
                      {contrato.observacoes && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <p className="text-xs text-gray-400">Observações</p>
                          <p className="text-gray-300 text-sm">{contrato.observacoes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-3 border-t border-gray-600 flex justify-between items-center">
                    <span className="text-gray-400">Total Mensal em Contratos:</span>
                    <span className="text-purple-400 font-bold text-lg">{formatarMoeda(valorTotalContratos)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Resumo Financeiro */}
            {(valorTotalItens > 0 || valorTotalContratos > 0 || valorTotalEstoque > 0) && (
              <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-blue-500/30 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-white">Resumo Financeiro</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Valor em Estoque</p>
                    <p className="text-green-400 font-bold text-xl">{formatarMoeda(valorTotalEstoque)}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Gasto em Compras</p>
                    <p className="text-blue-400 font-bold text-xl">{formatarMoeda(valorTotalItens)}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400 text-sm">Total em Contratos</p>
                    <p className="text-purple-400 font-bold text-xl">{formatarMoeda(valorTotalContratos)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Observações */}
            {fornecedor.observacoes && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-600/20 to-gray-700/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-bold text-white">Observações</h2>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-300 whitespace-pre-wrap">{fornecedor.observacoes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Coluna da Direita - Informações Adicionais */}
          <div className="space-y-6">
            {/* Tipo de Fornecedor */}
            {fornecedor.tipoFornecedor && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className={`bg-gradient-to-r ${tipoInfo.gradient} px-6 py-4 border-b border-gray-700`}>
                  <div className="flex items-center gap-2">
                    {React.createElement(tipoInfo.icon, { className: `w-5 h-5 ${tipoInfo.cor}` })}
                    <h2 className="text-lg font-bold text-white">Tipo de Fornecedor</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className={`flex items-center gap-3 p-3 ${tipoInfo.bg} rounded-xl border ${tipoInfo.border}`}>
                    {React.createElement(tipoInfo.icon, { className: `w-6 h-6 ${tipoInfo.cor}` })}
                    <div>
                      <p className={`font-medium ${tipoInfo.cor}`}>{tipoInfo.label}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {fornecedor.tipoFornecedor === "mercadoria" && "Produtos físicos para revenda ou consumo"}
                        {fornecedor.tipoFornecedor === "renda" && "Serviços de arrendamento"}
                        {fornecedor.tipoFornecedor === "servicoProfissional" && "Consultoria, advocacia, contabilidade"}
                        {fornecedor.tipoFornecedor === "internet" && "Serviços de comunicação"}
                        {fornecedor.tipoFornecedor === "manutencao" && "Serviços de manutenção"}
                        {fornecedor.tipoFornecedor === "abastecimento" && "Combustível e lubrificantes"}
                        {fornecedor.tipoFornecedor === "equipamento" && "Aquisição de equipamentos"}
                        {fornecedor.tipoFornecedor === "servicoGeral" && "Outros tipos de serviço"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dados Bancários */}
            {(fornecedor.pagamento?.banco || fornecedor.pagamento?.iban || fornecedor.pagamento?.formaPagamento) && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-lg font-bold text-white">Dados Bancários</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {fornecedor.pagamento?.banco && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Banco</p>
                      <p className="text-white">{fornecedor.pagamento.banco}</p>
                    </div>
                  )}
                  {fornecedor.pagamento?.iban && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">IBAN</p>
                      <p className="text-white font-mono text-sm break-all">{fornecedor.pagamento.iban}</p>
                    </div>
                  )}
                  {fornecedor.pagamento?.swift && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">SWIFT/BIC</p>
                      <p className="text-white font-mono">{fornecedor.pagamento.swift}</p>
                    </div>
                  )}
                  {fornecedor.pagamento?.formaPagamento && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Forma de Pagamento</p>
                      <p className="text-white">{fornecedor.pagamento.formaPagamento}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dados Fiscais */}
            {(fornecedor.regimeTributacao || 
              fornecedor.fiscal?.taxaIVA > 0 || 
              fornecedor.fiscal?.taxaRetencao > 0 ||
              fornecedor.fiscal?.suportaIVA !== undefined) && (
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-red-400" />
                    <h2 className="text-lg font-bold text-white">Configuração Fiscal</h2>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {fornecedor.regimeTributacao && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Regime de Tributação</p>
                      <p className="text-white">{fornecedor.regimeTributacao}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {fornecedor.fiscal?.suportaIVA !== undefined && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Suporta IVA</p>
                        <p className="text-white">{fornecedor.fiscal.suportaIVA ? "✅ Sim" : "❌ Não"}</p>
                      </div>
                    )}
                    {fornecedor.fiscal?.taxaIVA > 0 && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Taxa de IVA</p>
                        <p className="text-white">{fornecedor.fiscal.taxaIVA}%</p>
                      </div>
                    )}
                  </div>
                  {fornecedor.fiscal?.retencaoFonte && (
                    <div className="border-t border-gray-700 pt-3 mt-2">
                      <p className="text-xs text-yellow-400 mb-2">Retenção na Fonte</p>
                      <div className="grid grid-cols-2 gap-3">
                        {fornecedor.fiscal?.tipoRetencao && (
                          <div>
                            <p className="text-xs text-gray-400">Tipo</p>
                            <p className="text-white">{fornecedor.fiscal.tipoRetencao}</p>
                          </div>
                        )}
                        {fornecedor.fiscal?.taxaRetencao > 0 && (
                          <div>
                            <p className="text-xs text-gray-400">Taxa</p>
                            <p className="text-white">{fornecedor.fiscal.taxaRetencao}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informações do Sistema */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600/20 to-gray-700/20 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-bold text-white">Informações do Sistema</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Data de Cadastro</p>
                  <p className="text-white">{formatarDataHora(fornecedor.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Última Atualização</p>
                  <p className="text-white">{formatarDataHora(fornecedor.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">ID do Fornecedor</p>
                  <p className="text-white font-mono text-xs break-all">{fornecedor._id}</p>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(`/fornecedores/editar/${fornecedor._id}`)}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
              >
                <Edit className="w-5 h-5" />
                Editar Fornecedor
              </button>
              <button
                onClick={exportarPDF}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
              >
                <Download className="w-5 h-5" />
                Exportar PDF
              </button>
              <button
                onClick={imprimir}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
              >
                <Printer className="w-5 h-5" />
                Imprimir Página
              </button>
            </div>
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

export default VisualizarFornecedor;
