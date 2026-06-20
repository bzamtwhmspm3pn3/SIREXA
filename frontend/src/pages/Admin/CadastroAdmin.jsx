// src/pages/Admin/CadastroAdmin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  UserPlus, Mail, Lock, Phone, Eye, EyeOff, CheckCircle, 
  AlertCircle, Shield, Loader2, Key, Crown, ArrowLeft
} from "lucide-react";
import logo from "../../assets/sirexa-logo.ico";
import API_URL from '../../config/api';
import ThemeLangControls from "../../components/ThemeLangControls";

const CadastroAdmin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
    chaveAdmin: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validandoChave, setValidandoChave] = useState(false);
  const [chaveValida, setChaveValida] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  // 🔥 VALIDAR CHAVE DE ADMINISTRADOR
  const validarChaveAdmin = async () => {
    if (!formData.chaveAdmin) {
      mostrarMensagem("Digite a chave de administrador", "erro");
      return;
    }

    setValidandoChave(true);
    setMensagem({ texto: "", tipo: "" });

    try {
      const response = await fetch(`${API_URL}/admin/validar-chave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: formData.chaveAdmin })
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        setChaveValida(true);
        mostrarMensagem("✅ Chave de administrador válida!", "sucesso");
      } else {
        setChaveValida(false);
        mostrarMensagem(data.mensagem || "Chave inválida", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro ao validar chave", "erro");
    } finally {
      setValidandoChave(false);
    }
  };

  const validarSenha = (senha) => {
    const temMinimo = senha.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[!@#$%^&*(),.?":{}|<>]/.test(senha);
    return { temMinimo, temMaiuscula, temMinuscula, temNumero, temEspecial };
  };

  const requisitosSenha = validarSenha(formData.senha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!chaveValida) {
      mostrarMensagem("Valide a chave de administrador primeiro", "erro");
      return;
    }
    
    if (formData.senha !== formData.confirmarSenha) {
      mostrarMensagem("As senhas não coincidem", "erro");
      return;
    }
    
    if (!requisitosSenha.temMinimo || !requisitosSenha.temMaiuscula || !requisitosSenha.temNumero) {
      mostrarMensagem("A senha não atende aos requisitos mínimos de segurança", "erro");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone,
          chaveAdmin: formData.chaveAdmin
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        mostrarMensagem("✅ Administrador cadastrado com sucesso! Redirecionando...", "sucesso");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        mostrarMensagem(data.mensagem || "Erro ao cadastrar administrador", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro: " + error.message, "erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute top-4 right-4 z-50">
        <ThemeLangControls />
      </div>
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center">
            <img src={logo} alt="SIREXA" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-wide">SIREXA</h1>
          <p className="text-purple-200 mt-2 text-lg font-light">Painel Administrativo</p>
        </div>

        {/* Card de Cadastro */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-xl">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Cadastro de Administrador</h2>
                <p className="text-sm text-purple-200">Acesso exclusivo ao painel administrativo</p>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {mensagem.texto && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                mensagem.tipo === "sucesso" ? "bg-green-600/20 text-green-400 border border-green-500/30" : "bg-red-600/20 text-red-400 border border-red-500/30"
              }`}>
                {mensagem.tipo === "sucesso" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="text-sm">{mensagem.texto}</span>
              </div>
            )}

            {/* 🔥 CHAVE DE ADMINISTRADOR */}
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4">
              <label className="block text-sm font-medium text-purple-400 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Chave de Administrador <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="flex-1 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="••••••••••••••••"
                  value={formData.chaveAdmin}
                  onChange={(e) => {
                    setFormData({...formData, chaveAdmin: e.target.value});
                    setChaveValida(false);
                  }}
                  disabled={chaveValida}
                  required
                />
                <button
                  type="button"
                  onClick={validarChaveAdmin}
                  disabled={validandoChave || chaveValida}
                  className="px-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium transition disabled:opacity-50"
                >
                  {validandoChave ? <Loader2 className="animate-spin w-5 h-5" /> : "Validar"}
                </button>
              </div>
              {chaveValida && (
                <div className="mt-2 p-2 bg-green-600/20 rounded-lg">
                  <p className="text-green-400 text-xs flex items-center gap-1">
                    <CheckCircle size={12} /> Chave válida! Você pode prosseguir.
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Esta chave é fornecida pelo suporte do SIREXA para criação de administradores
              </p>
            </div>

            {/* Dados Pessoais */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo *</label>
              <input
                type="text"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
              <input
                type="email"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="admin@dominio.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
              <input
                type="tel"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="+244 923 456 789"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-12"
                  placeholder="Digite sua senha"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {formData.senha && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded-lg space-y-1.5">
                  <p className="text-xs text-gray-400 font-medium">Requisitos de segurança:</p>
                  <div className="flex items-center gap-2">
                    {requisitosSenha.temMinimo ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />}
                    <span className={`text-xs ${requisitosSenha.temMinimo ? 'text-green-400' : 'text-gray-500'}`}>Mínimo 8 caracteres</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requisitosSenha.temMaiuscula ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />}
                    <span className={`text-xs ${requisitosSenha.temMaiuscula ? 'text-green-400' : 'text-gray-500'}`}>Letra maiúscula</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requisitosSenha.temNumero ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />}
                    <span className={`text-xs ${requisitosSenha.temNumero ? 'text-green-400' : 'text-gray-500'}`}>Número</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Senha *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 pr-12"
                  placeholder="Confirme sua senha"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({...formData, confirmarSenha: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.confirmarSenha && formData.senha !== formData.confirmarSenha && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <p className="text-xs text-red-400">As senhas não coincidem</p>
                </div>
              )}
            </div>

            {/* Aviso */}
            <div className="bg-yellow-600/10 rounded-xl p-3 border border-yellow-500/30">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">
                  O administrador tem acesso total ao sistema. Mantenha suas credenciais em segurança.
                </p>
              </div>
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={loading || !chaveValida}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
              {loading ? "Cadastrando..." : "Cadastrar Administrador"}
            </button>

            {/* Link para Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-gray-400 hover:text-white text-sm transition inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Voltar para o Login
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} SIREXA — Plataforma Integrada
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default CadastroAdmin;