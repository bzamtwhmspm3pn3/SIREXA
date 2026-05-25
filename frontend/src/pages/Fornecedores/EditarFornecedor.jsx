// src/pages/Fornecedores/EditarFornecedor.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, ArrowLeft, Truck, Building2, Mail, Phone, MapPin, 
  Briefcase, CreditCard, Hash, CheckCircle, AlertCircle, 
  Loader2, Plus, X, Calendar, DollarSign, FileText,
  Package, Wrench, Home, Globe, TrendingUp, Edit, Trash2,
  Eye, Percent, Wallet, Fuel, Computer, Award, PlusCircle
} from "lucide-react";

const EditarFornecedor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { role, user, empresaId: userEmpresaId, empresaNome: userEmpresaNome } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [fornecedor, setFornecedor] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  
  // Modal para adicionar quantidade (mercadoria)
  const [modalQuantidadeOpen, setModalQuantidadeOpen] = useState(false);
  const [adicionandoQuantidade, setAdicionandoQuantidade] = useState(false);
  const [novaQuantidade, setNovaQuantidade] = useState({
    quantidade: 1,
    precoCompra: 0,
    precoVenda: 0,
    dataCompra: new Date().toISOString().split('T')[0],
    numeroLote: "",
    dataValidade: "",
    armazem: "Principal",
    observacoes: ""
  });
  
  const [formData, setFormData] = useState({
    empresaId: "",
    nome: "",
    nif: "",
    telefone: "",
    email: "",
    endereco: "",
    contato: "",
    regimeTributacao: "",
    fiscal: {
      suportaIVA: true,
      taxaIVA: 14,
      retencaoFonte: false,
      tipoRetencao: "",
      taxaRetencao: 0
    },
    pagamento: {
      banco: "",
      iban: "",
      swift: "",
      formaPagamento: "Transferência"
    },
    status: "Ativo",
    observacoes: ""
  });

  const BASE_URL = "https://sirexa-api.onrender.com";
  const usuarioEhTecnico = role === 'tecnico';
  const [empresaNomeTecnico, setEmpresaNomeTecnico] = useState("");

  // Carregar empresa do técnico
  useEffect(() => {
    if (usuarioEhTecnico && userEmpresaId && !empresaNomeTecnico) {
      const buscarEmpresa = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${BASE_URL}/api/empresa/${userEmpresaId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setEmpresaNomeTecnico(data.nome || data.dados?.nome || "Empresa");
          } else {
            setEmpresaNomeTecnico(userEmpresaNome || "Empresa");
          }
        } catch (error) {
          console.error("Erro:", error);
          setEmpresaNomeTecnico(userEmpresaNome || "Empresa");
        }
      };
      buscarEmpresa();
    }
  }, [usuarioEhTecnico, userEmpresaId]);

  useEffect(() => {
    carregarFornecedor();
    if (!usuarioEhTecnico) carregarEmpresas();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 3000);
  };

  const carregarEmpresas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/empresa`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmpresas(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  };

  const carregarFornecedor = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          mostrarMensagem("Fornecedor não encontrado", "erro");
          setTimeout(() => navigate("/fornecedores"), 2000);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      setFornecedor(data);
      
      setFormData({
        empresaId: data.empresaId || "",
        nome: data.nome || "",
        nif: data.nif || "",
        telefone: data.telefone || "",
        email: data.email || "",
        endereco: data.endereco || "",
        contato: data.contato || "",
        regimeTributacao: data.regimeTributacao || "",
        fiscal: {
          suportaIVA: data.fiscal?.suportaIVA !== false,
          taxaIVA: data.fiscal?.taxaIVA || 14,
          retencaoFonte: data.fiscal?.retencaoFonte || false,
          tipoRetencao: data.fiscal?.tipoRetencao || "",
          taxaRetencao: data.fiscal?.taxaRetencao || 0
        },
        pagamento: {
          banco: data.pagamento?.banco || "",
          iban: data.pagamento?.iban || "",
          swift: data.pagamento?.swift || "",
          formaPagamento: data.pagamento?.formaPagamento || "Transferência"
        },
        status: data.status || "Ativo",
        observacoes: data.observacoes || ""
      });
      
    } catch (error) {
      console.error("Erro ao carregar fornecedor:", error);
      mostrarMensagem("Erro ao carregar dados do fornecedor", "erro");
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO PARA ADICIONAR QUANTIDADE (NOVA ENTRADA)
  const handleAdicionarQuantidade = async (e) => {
    e.preventDefault();
    
    if (!novaQuantidade.quantidade || novaQuantidade.quantidade <= 0) {
      mostrarMensagem("Quantidade deve ser maior que zero", "erro");
      return;
    }
    if (!novaQuantidade.precoCompra || novaQuantidade.precoCompra <= 0) {
      mostrarMensagem("Preço de compra é obrigatório", "erro");
      return;
    }
    
    setAdicionandoQuantidade(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}/adicionar-quantidade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          quantidade: novaQuantidade.quantidade,
          precoCompra: novaQuantidade.precoCompra,
          precoVenda: novaQuantidade.precoVenda || undefined,
          dataCompra: novaQuantidade.dataCompra,
          numeroLote: novaQuantidade.numeroLote || undefined,
          dataValidade: novaQuantidade.dataValidade || undefined,
          armazem: novaQuantidade.armazem,
          observacoes: novaQuantidade.observacoes
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.sucesso) {
        mostrarMensagem(`✅ ${result.mensagem || "Compra registrada com sucesso!"}`, "sucesso");
        setModalQuantidadeOpen(false);
        setNovaQuantidade({
          quantidade: 1,
          precoCompra: 0,
          precoVenda: 0,
          dataCompra: new Date().toISOString().split('T')[0],
          numeroLote: "",
          dataValidade: "",
          armazem: "Principal",
          observacoes: ""
        });
        // Recarregar fornecedor para atualizar os dados exibidos
        await carregarFornecedor();
      } else {
        mostrarMensagem(result.mensagem || "Erro ao registrar compra", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setAdicionandoQuantidade(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/fornecedores/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (response.ok && result.sucesso) {
        mostrarMensagem("✅ Fornecedor atualizado com sucesso!", "sucesso");
        setTimeout(() => {
          navigate(`/fornecedores/visualizar/${id}`);
        }, 1500);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao atualizar", "erro");
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const formatarMoeda = (valor) => {
    if (!valor && valor !== 0) return "0";
    return new Intl.NumberFormat('pt-AO').format(valor);
  };

  // Calcular o valor total do estoque atual
  const calcularValorTotalEstoque = () => {
    if (!fornecedor?.produtoInfo) return 0;
    const quantidade = fornecedor.produtoInfo.quantidade || 0;
    const precoCompra = fornecedor.produtoInfo.precoCompra || 0;
    return quantidade * precoCompra;
  };

  // Verificar se o fornecedor suporta IVA
  const suportaIVA = () => {
    return fornecedor?.fiscal?.suportaIVA !== false;
  };

  // Calcular o valor total da nova compra (respeitando IVA ou não)
  const calcularValorTotalNovaCompra = () => {
    const subtotal = novaQuantidade.quantidade * novaQuantidade.precoCompra;
    if (!suportaIVA()) {
      return subtotal;
    }
    const taxaIVA = fornecedor?.fiscal?.taxaIVA || 14;
    const iva = subtotal * taxaIVA / 100;
    return subtotal + iva;
  };

  // Calcular o valor do IVA da nova compra
  const calcularValorIVANovaCompra = () => {
    if (!suportaIVA()) return 0;
    const subtotal = novaQuantidade.quantidade * novaQuantidade.precoCompra;
    const taxaIVA = fornecedor?.fiscal?.taxaIVA || 14;
    return subtotal * taxaIVA / 100;
  };

  // Tela de carregamento
  if (loading) {
    return (
      <Layout title="Editar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
          <p className="text-gray-400 mt-4">Carregando dados do fornecedor...</p>
        </div>
      </Layout>
    );
  }

  // Se não encontrou o fornecedor
  if (!fornecedor) {
    return (
      <Layout title="Editar Fornecedor" showBackButton={true} backToRoute="/fornecedores">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-lg">Fornecedor não encontrado</p>
          <button
            onClick={() => navigate("/fornecedores")}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Voltar para lista
          </button>
        </div>
      </Layout>
    );
  }

  const isMercadoria = fornecedor.tipoFornecedor === "mercadoria";
  const valorTotalEstoque = calcularValorTotalEstoque();

  return (
    <Layout title={`Editar ${fornecedor.nome}`} showBackButton={true} backToRoute="/fornecedores">
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

      {/* MODAL PARA ADICIONAR QUANTIDADE */}
      {modalQuantidadeOpen && isMercadoria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700 sticky top-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-lg"><Package className="w-5 h-5 text-white" /></div>
                  <h3 className="text-xl font-bold text-white">Registrar Nova Entrada</h3>
                </div>
                <button onClick={() => setModalQuantidadeOpen(false)} className="p-1 rounded-lg hover:bg-gray-700">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAdicionarQuantidade} className="p-6 space-y-4">
              <div className="bg-blue-600/10 rounded-xl p-3 mb-2">
                <p className="text-blue-400 text-sm flex items-center gap-2">
                  <Package size={14} /> Produto: <strong>{fornecedor?.produtoInfo?.produto || "Produto"}</strong>
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Estoque atual: {fornecedor?.produtoInfo?.quantidade || 0} {fornecedor?.produtoInfo?.unidadeMedida || "unidades"}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade *</label>
                  <input 
                    type="number" 
                    step="1"
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={novaQuantidade.quantidade}
                    onChange={(e) => setNovaQuantidade({...novaQuantidade, quantidade: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Unidade</label>
                  <input 
                    type="text"
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={fornecedor?.produtoInfo?.unidadeMedida || "Unidade"}
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Compra (Kz) *</label>
                  <input 
                    type="number" 
                    step="1"
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={novaQuantidade.precoCompra}
                    onChange={(e) => setNovaQuantidade({...novaQuantidade, precoCompra: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Preço de Venda (Kz)</label>
                  <input 
                    type="number" 
                    step="1"
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={novaQuantidade.precoVenda}
                    onChange={(e) => setNovaQuantidade({...novaQuantidade, precoVenda: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data da Compra</label>
                <input 
                  type="date" 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                  value={novaQuantidade.dataCompra}
                  onChange={(e) => setNovaQuantidade({...novaQuantidade, dataCompra: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nº Lote</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={novaQuantidade.numeroLote}
                    onChange={(e) => setNovaQuantidade({...novaQuantidade, numeroLote: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data Validade</label>
                  <input 
                    type="date" 
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                    value={novaQuantidade.dataValidade}
                    onChange={(e) => setNovaQuantidade({...novaQuantidade, dataValidade: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Armazém</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white"
                  value={novaQuantidade.armazem}
                  onChange={(e) => setNovaQuantidade({...novaQuantidade, armazem: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                <textarea 
                  rows="2" 
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none"
                  value={novaQuantidade.observacoes}
                  onChange={(e) => setNovaQuantidade({...novaQuantidade, observacoes: e.target.value})}
                />
              </div>
              
              {/* Resumo da Compra - Respeitando a condição de IVA */}
              {novaQuantidade.quantidade > 0 && novaQuantidade.precoCompra > 0 && (
                <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/30">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2">Resumo da Compra</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="text-white">{(novaQuantidade.quantidade * novaQuantidade.precoCompra).toLocaleString()} Kz</span>
                    </div>
                    {suportaIVA() && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">IVA ({fornecedor?.fiscal?.taxaIVA || 14}%):</span>
                        <span className="text-white">{calcularValorIVANovaCompra().toLocaleString()} Kz</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-600">
                      <span className="text-gray-400 font-bold">Total a Pagar:</span>
                      <span className="text-green-400 font-bold text-lg">{calcularValorTotalNovaCompra().toLocaleString()} Kz</span>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Este valor será registrado como pagamento pendente
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={adicionandoQuantidade}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  {adicionandoQuantidade ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
                  {adicionandoQuantidade ? "Registrando..." : "Registrar Compra"}
                </button>
                <button 
                  type="button"
                  onClick={() => setModalQuantidadeOpen(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto pb-8 px-4">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><Edit className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-xl font-bold text-white">Editar Fornecedor</h2>
                <p className="text-sm text-gray-400">{fornecedor?.nome}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Empresa */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</h3>
              {usuarioEhTecnico ? (
                <div>
                  <div className="w-full p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">{empresaNomeTecnico || userEmpresaNome || "Empresa"}</span>
                  </div>
                  <input type="hidden" name="empresaId" value={formData.empresaId || userEmpresaId} />
                </div>
              ) : (
                <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                  value={formData.empresaId} 
                  onChange={(e) => setFormData({...formData, empresaId: e.target.value})} 
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(emp => (<option key={emp._id} value={emp._id}>{emp.nome}</option>))}
                </select>
              )}
            </div>

            {/* Dados do Fornecedor */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Truck className="w-4 h-4" /> Dados do Fornecedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome / Razão Social *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">NIF *</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                  <input type="tel" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input type="email" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Pessoa de Contacto</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.contato} onChange={(e) => setFormData({...formData, contato: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Endereço</label>
                  <textarea rows="2" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" 
                    value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Informações do Produto (se for mercadoria) */}
            {isMercadoria && fornecedor.produtoInfo && (
              <div className="bg-gray-700/30 rounded-xl p-4">
                <h3 className="text-md font-semibold text-green-400 mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Produto Atual</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Produto</p>
                    <p className="text-white text-sm font-medium">{fornecedor.produtoInfo.produto}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Estoque</p>
                    <p className="text-white text-sm">{fornecedor.produtoInfo.quantidade || 0} {fornecedor.produtoInfo.unidadeMedida}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Preço Compra</p>
                    <p className="text-green-400 text-sm">{formatarMoeda(fornecedor.produtoInfo.precoCompra)} Kz</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Preço Venda</p>
                    <p className="text-blue-400 text-sm">{formatarMoeda(fornecedor.produtoInfo.precoVenda)} Kz</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Valor Total</p>
                    <p className="text-yellow-400 text-sm font-bold">{formatarMoeda(valorTotalEstoque)} Kz</p>
                  </div>
                </div>
                
                {/* Botão para adicionar nova entrada - AGORA DENTRO DO FORMULÁRIO */}
                <div className="mt-4 pt-3 border-t border-gray-600">
                  <button
                    type="button"
                    onClick={() => setModalQuantidadeOpen(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg text-white"
                  >
                    <PlusCircle size={18} /> Registrar Nova Entrada (+ Estoque)
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Adicione novas quantidades ao estoque. Será gerado um pagamento automático.
                  </p>
                </div>
              </div>
            )}

            {/* Configuração Fiscal */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Percent className="w-4 h-4" /> Configuração Fiscal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Regime de Tributação</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.regimeTributacao} onChange={(e) => setFormData({...formData, regimeTributacao: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Regime Geral">Regime Geral</option>
                    <option value="Regime Simplificado">Regime Simplificado</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.fiscal.suportaIVA} 
                      onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, suportaIVA: e.target.checked}})} />
                    <span className="text-gray-300">Suporta IVA</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.fiscal.retencaoFonte} 
                      onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, retencaoFonte: e.target.checked}})} />
                    <span className="text-gray-300">Retenção na Fonte</span>
                  </label>
                </div>
                {formData.fiscal.suportaIVA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de IVA (%)</label>
                    <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                      value={formData.fiscal.taxaIVA} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaIVA: parseFloat(e.target.value)}})} />
                  </div>
                )}
                {formData.fiscal.retencaoFonte && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Retenção</label>
                      <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                        value={formData.fiscal.tipoRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, tipoRetencao: e.target.value}})}>
                        <option value="">Selecione</option>
                        <option value="Renda">Renda</option>
                        <option value="Serviços">Serviços</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Taxa de Retenção (%)</label>
                      <input type="number" step="0.1" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                        value={formData.fiscal.taxaRetencao} onChange={(e) => setFormData({...formData, fiscal: {...formData.fiscal, taxaRetencao: parseFloat(e.target.value)}})} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4" /> Dados Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Banco</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.pagamento.banco} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, banco: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">IBAN</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.pagamento.iban} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, iban: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Forma de Pagamento</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.pagamento.formaPagamento} onChange={(e) => setFormData({...formData, pagamento: {...formData.pagamento, formaPagamento: e.target.value}})}>
                    <option value="Transferência">Transferência</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status e Observações */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="text-md font-semibold text-blue-400 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Informações Adicionais</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                  <textarea rows="3" className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white resize-none" 
                    value={formData.observacoes} onChange={(e) => setFormData({...formData, observacoes: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white" 
                    value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={salvando} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl flex items-center justify-center gap-2">
                {salvando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </button>
              <button type="button" onClick={() => navigate(`/fornecedores/visualizar/${id}`)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">
                Cancelar
              </button>
            </div>
          </form>
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

export default EditarFornecedor;
