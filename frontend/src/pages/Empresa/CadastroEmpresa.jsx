// frontend/src/pages/Empresa/CadastroEmpresa.jsx - VERSAO COM REGIME INSS
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Building2, CheckCircle, AlertCircle, Loader2, DollarSign, Percent } from "lucide-react";

const CadastroEmpresa = () => {
  const { login, user } = useAuth();
  const [formData, setFormData] = useState({
    nome: "",
    nif: "",
    email: "",
    telefone: "",
    endereco: "",
    // Campos fiscais
    isBaixosRendimentos: false,
    regimeINSS: "normal",
    inssColaboradorTaxa: 0.03,
    inssEmpregadorTaxa: 0.08
  });
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const navigate = useNavigate();

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 2000);
  };

  const handleRegimeChange = (isBaixos) => {
    if (isBaixos) {
      setFormData({
        ...formData,
        isBaixosRendimentos: true,
        regimeINSS: "baixos_rendimentos",
        inssColaboradorTaxa: 0.015,
        inssEmpregadorTaxa: 0.04
      });
    } else {
      setFormData({
        ...formData,
        isBaixosRendimentos: false,
        regimeINSS: "normal",
        inssColaboradorTaxa: 0.03,
        inssEmpregadorTaxa: 0.08
      });
    }
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
      nome: formData.nome,
      nif: formData.nif,
      contactos: {
        email: formData.email || "",
        telefone: formData.telefone || ""
      },
      endereco: {
        rua: formData.endereco || "",
        pais: "Angola"
      },
      // Campos fiscais
      isBaixosRendimentos: formData.isBaixosRendimentos,
      regimeINSS: formData.regimeINSS,
      inssColaboradorTaxa: formData.inssColaboradorTaxa,
      inssEmpregadorTaxa: formData.inssEmpregadorTaxa,
      ativo: true
    }));

    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/empresa`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: submitData
      });

      const result = await response.json();

      if (response.ok && result.sucesso) {
        if (result.novoToken) {
          console.log("🔑 Atualizando token com novas empresas...");
          localStorage.setItem("token", result.novoToken);
        }
        
        setMensagem({ texto: "✅ Empresa cadastrada com sucesso!", tipo: "sucesso" });
        setRedirecting(true);
        
        setTimeout(() => {
          window.location.href = "/empresa";
        }, 1000);
      } else {
        mostrarMensagem(result.mensagem || "Erro ao cadastrar empresa", "erro");
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro:", error);
      mostrarMensagem("Erro ao conectar ao servidor", "erro");
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <Layout title="Nova Empresa" showBackButton={true} backToRoute="/empresa">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl border border-green-500/30 animate-scale-in">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Sucesso!</h3>
            <p className="text-gray-300 text-sm">Empresa cadastrada com sucesso.</p>
            <p className="text-green-400 text-xs mt-2">Redirecionando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Nova Empresa" showBackButton={true} backToRoute="/empresa">
      {mensagem.texto && !redirecting && (
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

      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Cadastrar Nova Empresa</h2>
                <p className="text-sm text-gray-400">Preencha os dados da empresa</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome da Empresa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Digite o nome completo da empresa"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  NIF <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="Número de Identificação Fiscal"
                  value={formData.nif}
                  onChange={(e) => setFormData({...formData, nif: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="geral@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  placeholder="+244 923 456 789"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Endereço
                </label>
                <textarea
                  rows="2"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                  placeholder="Endereço completo da empresa"
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                />
              </div>
            </div>

            {/* Configurações Fiscais - Regime INSS */}
            <div className="border-t border-gray-700 pt-4 mt-2">
              <h3 className="text-md font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <Percent size={18} />
                Configurações Fiscais - INSS
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isBaixosRendimentos}
                      onChange={(e) => handleRegimeChange(e.target.checked)}
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
                      {formData.isBaixosRendimentos 
                        ? "Baixos Rendimentos: 1.5%" 
                        : "Regime Normal: 3%"}
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
                      {formData.isBaixosRendimentos 
                        ? "Baixos Rendimentos: 4%" 
                        : "Regime Normal: 8%"}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300 flex items-center gap-1">
                    <DollarSign size={12} />
                    <strong>Nota:</strong> O IRT é definido individualmente por funcionário (Grupo A - Tabela Progressiva ou Grupo B - Taxa Fixa 6.5%)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || redirecting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Cadastrar Empresa
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
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-fade-in-out { animation: fade-in-out 2s ease forwards; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </Layout>
  );
};

export default CadastroEmpresa;