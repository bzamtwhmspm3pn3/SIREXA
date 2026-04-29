// frontend/src/pages/Empresa/EditarEmpresa.jsx - VERSAO COMPLETA COM TODAS AS ABAS
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Save, 
  ArrowLeft, 
  Building2,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Upload,
  X,
  Loader2,
  Briefcase,
  FileText,
  Globe,
  CreditCard,
  Calendar,
  DollarSign,
  Home,
  Smartphone,
  AlertCircle,
  Landmark,
  Hash,
  Trash2,
  Percent,
  Shield
} from "lucide-react";

const EditarEmpresa = () => {
  const [activeTab, setActiveTab] = useState("basico");
  const [formData, setFormData] = useState({
    // Dados Básicos
    nome: "",
    nomeComercial: "",
    nif: "",
    regimeIva: "Normal",
    endereco: {
      rua: "",
      numero: "",
      bairro: "",
      cidade: "",
      provincia: "",
      pais: "Angola",
      codigoPostal: ""
    },
    contactos: {
      email: "",
      telefone: "",
      telefoneAlternativo: "",
      whatsapp: "",
      website: ""
    },
    // Dados Corporativos
    objetoSocial: "",
    dataConstituicao: "",
    capitalSocial: "",
    servicos: [],
    // Dados Bancários
    banco: "",
    iban: "",
    swift: "",
    // Dados Fiscais
    caed: "",
    regimeTributario: "",
    // CONFIGURAÇÕES FISCAIS (INSS e IRT)
    isBaixosRendimentos: false,
    regimeINSS: "normal",
    inssColaboradorTaxa: 0.03,
    inssEmpregadorTaxa: 0.08,
    limiteBaixosRendimentos: 350000,
    irtTipoCalculo: "progressivo",
    irtTaxaFixa: 0.065,
    taxaIVA: 14,
    incluiIVA: true,
    incluiRetencao: false,
    taxaRetencao: 7,
    // Status
    ativo: true
  });
  
  const [novoServico, setNovoServico] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [removerLogo, setRemoverLogo] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const provinciasAngola = [
    "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", 
    "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla", 
    "Luanda", "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", 
    "Namibe", "Uíge", "Zaire"
  ];

  useEffect(() => {
    carregarEmpresa();
  }, [id]);

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 2000);
  };

  const carregarEmpresa = async () => {
    setLoadingData(true);
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await response.json();
      
      setFormData({
        nome: data.nome || "",
        nomeComercial: data.nomeComercial || "",
        nif: data.nif || "",
        regimeIva: data.regimeIva || "Normal",
        endereco: data.endereco || { pais: "Angola" },
        contactos: data.contactos || {},
        objetoSocial: data.objetoSocial || "",
        dataConstituicao: data.dataConstituicao || "",
        capitalSocial: data.capitalSocial || "",
        servicos: data.servicos || [],
        banco: data.banco || "",
        iban: data.iban || "",
        swift: data.swift || "",
        caed: data.caed || "",
        regimeTributario: data.regimeTributario || "",
        isBaixosRendimentos: data.isBaixosRendimentos || false,
        regimeINSS: data.regimeINSS || "normal",
        inssColaboradorTaxa: data.inssColaboradorTaxa || (data.isBaixosRendimentos ? 0.015 : 0.03),
        inssEmpregadorTaxa: data.inssEmpregadorTaxa || (data.isBaixosRendimentos ? 0.04 : 0.08),
        limiteBaixosRendimentos: data.limiteBaixosRendimentos || 350000,
        irtTipoCalculo: data.irtTipoCalculo || "progressivo",
        irtTaxaFixa: data.irtTaxaFixa || 0.065,
        taxaIVA: data.taxaIVA || 14,
        incluiIVA: data.incluiIVA !== undefined ? data.incluiIVA : true,
        incluiRetencao: data.incluiRetencao || false,
        taxaRetencao: data.taxaRetencao || 7,
        ativo: data.ativo !== undefined ? data.ativo : true
      });
      
      if (data.logotipo) {
        setLogoPreview(`https://sirexa-api.onrender.com/uploads/${data.logotipo}`);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao carregar dados da empresa", "erro");
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        mostrarMensagem("A imagem deve ter no máximo 5MB", "erro");
        return;
      }
      if (!file.type.match(/image\/(jpeg|jpg|png|gif|webp)/)) {
        mostrarMensagem("Formato não suportado. Use JPEG, PNG, GIF ou WEBP", "erro");
        return;
      }
      setLogoFile(file);
      setRemoverLogo(false);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoverLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setRemoverLogo(true);
  };

  const handleEnderecoChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [campo]: valor }
    }));
  };

  const handleContactoChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      contactos: { ...prev.contactos, [campo]: valor }
    }));
  };

  const handleInputChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  const handleRegimeINSSChange = (isBaixos) => {
    if (isBaixos) {
      setFormData(prev => ({
        ...prev,
        isBaixosRendimentos: true,
        regimeINSS: "baixos_rendimentos",
        inssColaboradorTaxa: 0.015,
        inssEmpregadorTaxa: 0.04
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        isBaixosRendimentos: false,
        regimeINSS: "normal",
        inssColaboradorTaxa: 0.03,
        inssEmpregadorTaxa: 0.08
      }));
    }
  };

  const adicionarServico = () => {
    if (novoServico.trim() && !formData.servicos.includes(novoServico.trim())) {
      setFormData(prev => ({
        ...prev,
        servicos: [...prev.servicos, novoServico.trim()]
      }));
      setNovoServico("");
    }
  };

  const removerServico = (servico) => {
    setFormData(prev => ({
      ...prev,
      servicos: prev.servicos.filter(s => s !== servico)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.nome.trim()) {
      mostrarMensagem("Nome da empresa é obrigatório", "erro");
      return;
    }
    
    if (!formData.nif || !formData.nif.trim()) {
      mostrarMensagem("NIF é obrigatório", "erro");
      return;
    }

    setLoading(true);
    
    const submitData = new FormData();
    submitData.append("dados", JSON.stringify({
      ...formData,
      removerLogo
    }));
    
    if (logoFile) {
      submitData.append("logotipo", logoFile);
    }

    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: submitData
      });

      const result = await response.json();

      if (response.ok) {
        setMensagem({ texto: "✅ Empresa atualizada com sucesso!", tipo: "sucesso" });
        setTimeout(() => {
          window.location.href = "/empresa";
        }, 1000);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao atualizar empresa", "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  const tabs = [
    { id: "basico", label: "Informações Básicas", icon: Building2 },
    { id: "endereco", label: "Endereço", icon: MapPin },
    { id: "contactos", label: "Contactos", icon: Phone },
    { id: "corporativo", label: "Dados Corporativos", icon: Briefcase },
    { id: "bancario", label: "Dados Bancários", icon: Landmark },
    { id: "fiscal", label: "Regime Fiscal", icon: Shield }
  ];

  if (loadingData) {
    return (
      <Layout title="Editar Empresa" showBackButton={true} backToRoute="/empresa">
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-400">Carregando dados da empresa...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Editar Empresa" showBackButton={true} backToRoute="/empresa">
      {mensagem.texto && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-out">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
            mensagem.tipo === "sucesso" 
              ? "bg-green-600" 
              : "bg-red-600"
          } text-white text-sm`}>
            {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit}>
          {/* Logo Upload */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {logoPreview ? (
                <div className="relative group">
                  <img 
                    src={logoPreview} 
                    alt="Logo da Empresa" 
                    className="w-32 h-32 rounded-2xl object-cover border-2 border-blue-500 shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemoverLogo}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1.5 hover:bg-red-700 transition shadow-lg"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer group">
                  <div className="w-32 h-32 rounded-2xl bg-gray-700/50 border-2 border-dashed border-gray-600 group-hover:border-blue-500 transition-all duration-200 flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    <span className="text-xs text-gray-400 mt-2 group-hover:text-blue-400">Upload Logo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
            <div className="border-b border-gray-700 overflow-x-auto">
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTab === tab.id
                        ? "text-blue-400 border-b-2 border-blue-400 bg-blue-600/10"
                        : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* ==================== ABA: INFORMACOES BASICAS ==================== */}
              {activeTab === "basico" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="lg:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        Nome da Empresa <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Razão Social completa"
                        value={formData.nome}
                        onChange={(e) => handleInputChange("nome", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Building2 className="w-4 h-4 text-cyan-400" />
                        Nome Comercial
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Nome fantasia (opcional)"
                        value={formData.nomeComercial}
                        onChange={(e) => handleInputChange("nomeComercial", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Hash className="w-4 h-4 text-yellow-400" />
                        NIF <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Número de Identificação Fiscal"
                        value={formData.nif}
                        onChange={(e) => handleInputChange("nif", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <FileText className="w-4 h-4 text-green-400" />
                        Regime de IVA
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        value={formData.regimeIva}
                        onChange={(e) => handleInputChange("regimeIva", e.target.value)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Isento">Isento</option>
                        <option value="Não Sujeito">Não Sujeito</option>
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Status
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.ativo === true}
                            onChange={() => handleInputChange("ativo", true)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-gray-300">Ativo</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={formData.ativo === false}
                            onChange={() => handleInputChange("ativo", false)}
                            className="w-4 h-4 text-red-600"
                          />
                          <span className="text-gray-300">Inativo</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== ABA: ENDERECO ==================== */}
              {activeTab === "endereco" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Home className="w-4 h-4 text-purple-400" />
                        Rua
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Nome da rua/avenida"
                        value={formData.endereco.rua}
                        onChange={(e) => handleEnderecoChange("rua", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        Número
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Número da porta"
                        value={formData.endereco.numero}
                        onChange={(e) => handleEnderecoChange("numero", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <MapPin className="w-4 h-4 text-orange-400" />
                        Bairro
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Bairro"
                        value={formData.endereco.bairro}
                        onChange={(e) => handleEnderecoChange("bairro", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        Cidade
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Cidade/Município"
                        value={formData.endereco.cidade}
                        onChange={(e) => handleEnderecoChange("cidade", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <MapPin className="w-4 h-4 text-green-400" />
                        Província
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        value={formData.endereco.provincia}
                        onChange={(e) => handleEnderecoChange("provincia", e.target.value)}
                      >
                        <option value="">Selecione a província</option>
                        {provinciasAngola.map(prov => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Globe className="w-4 h-4 text-indigo-400" />
                        País
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="País"
                        value={formData.endereco.pais}
                        onChange={(e) => handleEnderecoChange("pais", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Hash className="w-4 h-4 text-pink-400" />
                        Código Postal
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Código postal"
                        value={formData.endereco.codigoPostal}
                        onChange={(e) => handleEnderecoChange("codigoPostal", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== ABA: CONTACTOS ==================== */}
              {activeTab === "contactos" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Mail className="w-4 h-4 text-blue-400" />
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="geral@empresa.com"
                        value={formData.contactos.email}
                        onChange={(e) => handleContactoChange("email", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Phone className="w-4 h-4 text-green-400" />
                        Telefone
                      </label>
                      <input
                        type="tel"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="+244 923 456 789"
                        value={formData.contactos.telefone}
                        onChange={(e) => handleContactoChange("telefone", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Phone className="w-4 h-4 text-yellow-400" />
                        Telefone Alternativo
                      </label>
                      <input
                        type="tel"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Telefone secundário"
                        value={formData.contactos.telefoneAlternativo}
                        onChange={(e) => handleContactoChange("telefoneAlternativo", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Número do WhatsApp"
                        value={formData.contactos.whatsapp}
                        onChange={(e) => handleContactoChange("whatsapp", e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Globe className="w-4 h-4 text-purple-400" />
                        Website
                      </label>
                      <input
                        type="url"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="https://www.empresa.com"
                        value={formData.contactos.website}
                        onChange={(e) => handleContactoChange("website", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== ABA: DADOS CORPORATIVOS ==================== */}
              {activeTab === "corporativo" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        Objeto Social
                      </label>
                      <textarea
                        rows="3"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                        placeholder="Descreva a atividade principal da empresa..."
                        value={formData.objetoSocial}
                        onChange={(e) => handleInputChange("objetoSocial", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        Data de Constituição
                      </label>
                      <input
                        type="date"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        value={formData.dataConstituicao ? formData.dataConstituicao.split('T')[0] : ''}
                        onChange={(e) => handleInputChange("dataConstituicao", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        Capital Social (Kz)
                      </label>
                      <input
                        type="number"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="0,00"
                        value={formData.capitalSocial}
                        onChange={(e) => handleInputChange("capitalSocial", e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Briefcase className="w-4 h-4 text-pink-400" />
                        Serviços Prestados
                      </label>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          className="flex-1 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                          placeholder="Adicione um serviço"
                          value={novoServico}
                          onChange={(e) => setNovoServico(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarServico())}
                        />
                        <button
                          type="button"
                          onClick={adicionarServico}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                        >
                          Adicionar
                        </button>
                      </div>
                      
                      {formData.servicos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.servicos.map((servico, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-300 rounded-lg text-sm border border-blue-500/30"
                            >
                              {servico}
                              <button
                                type="button"
                                onClick={() => removerServico(servico)}
                                className="hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== ABA: DADOS BANCARIOS ==================== */}
              {activeTab === "bancario" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Landmark className="w-4 h-4 text-blue-400" />
                        Banco
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Nome do banco"
                        value={formData.banco}
                        onChange={(e) => handleInputChange("banco", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <CreditCard className="w-4 h-4 text-green-400" />
                        IBAN
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Número IBAN"
                        value={formData.iban}
                        onChange={(e) => handleInputChange("iban", e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                        <Hash className="w-4 h-4 text-purple-400" />
                        SWIFT/BIC
                      </label>
                      <input
                        type="text"
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                        placeholder="Código SWIFT"
                        value={formData.swift}
                        onChange={(e) => handleInputChange("swift", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== ABA: REGIME FISCAL ==================== */}
              {activeTab === "fiscal" && (
                <div className="space-y-5">
                  {/* INSS */}
                  <div className="border-b border-gray-700 pb-4">
                    <h3 className="text-md font-semibold text-blue-400 mb-3 flex items-center gap-2">
                      <Percent size={18} />
                      Configurações INSS (Segurança Social)
                    </h3>
                    
                    <div className="bg-gray-700/30 rounded-xl p-4 mb-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isBaixosRendimentos}
                          onChange={(e) => handleRegimeINSSChange(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-white font-medium">Empresa de Baixos Rendimentos</span>
                          <p className="text-xs text-gray-400 mt-1">
                            Para empresas com faturação anual até 350.000 Kz por funcionário.
                            INSS reduzido: 1.5% (colaborador) e 4% (empregador)
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/20 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Taxa INSS Colaborador
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white pl-8"
                            value={(formData.inssColaboradorTaxa * 100).toFixed(2)}
                            onChange={(e) => {
                              const valor = parseFloat(e.target.value) / 100;
                              if (!isNaN(valor)) {
                                setFormData({...formData, inssColaboradorTaxa: valor});
                              }
                            }}
                            disabled={formData.isBaixosRendimentos}
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.isBaixosRendimentos ? "Baixos Rendimentos: 1.5%" : "Regime Normal: 3%"}
                        </p>
                      </div>

                      <div className="bg-gray-700/20 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Taxa INSS Empregador
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white pl-8"
                            value={(formData.inssEmpregadorTaxa * 100).toFixed(2)}
                            onChange={(e) => {
                              const valor = parseFloat(e.target.value) / 100;
                              if (!isNaN(valor)) {
                                setFormData({...formData, inssEmpregadorTaxa: valor});
                              }
                            }}
                            disabled={formData.isBaixosRendimentos}
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.isBaixosRendimentos ? "Baixos Rendimentos: 4%" : "Regime Normal: 8%"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* IRT */}
                  <div>
                    <h3 className="text-md font-semibold text-purple-400 mb-3 flex items-center gap-2">
                      <Shield size={18} />
                      Configurações IRT (Imposto de Renda)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/20 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Tipo de Cálculo IRT
                        </label>
                        <select
                          className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                          value={formData.irtTipoCalculo}
                          onChange={(e) => setFormData({...formData, irtTipoCalculo: e.target.value})}
                        >
                          <option value="progressivo">Progressivo (Tabela por faixa)</option>
                          <option value="fixo">Taxa Fixa</option>
                        </select>
                      </div>

                      {formData.irtTipoCalculo === 'fixo' && (
                        <div className="bg-gray-700/20 rounded-lg p-3">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Taxa IRT Fixa
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white pl-8"
                              value={(formData.irtTaxaFixa * 100).toFixed(1)}
                              onChange={(e) => {
                                const valor = parseFloat(e.target.value) / 100;
                                if (!isNaN(valor)) {
                                  setFormData({...formData, irtTaxaFixa: valor});
                                }
                              }}
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Aplicada a funcionários do Grupo B (6.5% padrão)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-300 flex items-center gap-1">
                        <Shield size={12} />
                        <strong>Nota:</strong> O IRT é definido individualmente por funcionário 
                        (Grupo A - Tabela Progressiva ou Grupo B - Taxa Fixa 6.5%)
                      </p>
                    </div>
                  </div>

                  {/* IVA */}
                  <div className="border-t border-gray-700 pt-4 mt-2">
                    <h3 className="text-md font-semibold text-green-400 mb-3 flex items-center gap-2">
                      <DollarSign size={18} />
                      Configurações IVA
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700/20 rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Taxa de IVA (%)
                        </label>
                        <input
                          type="number"
                          step="1"
                          className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                          value={formData.taxaIVA}
                          onChange={(e) => setFormData({...formData, taxaIVA: parseInt(e.target.value) || 0})}
                        />
                      </div>

                      <div className="bg-gray-700/20 rounded-lg p-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.incluiRetencao}
                            onChange={(e) => setFormData({...formData, incluiRetencao: e.target.checked})}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-300">Incluir Retenção na Fonte</span>
                        </label>
                      </div>

                      {formData.incluiRetencao && (
                        <div className="bg-gray-700/20 rounded-lg p-3">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Taxa de Retenção (%)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white"
                            value={formData.taxaRetencao}
                            onChange={(e) => setFormData({...formData, taxaRetencao: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Salvar Alterações
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/empresa")}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Cancelar
            </button>
          </div>
        </form>
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

export default EditarEmpresa;