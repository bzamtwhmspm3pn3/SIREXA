// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  LogIn, AlertCircle, Shield, UserCog, Building2, Mail, Lock, 
  Eye, EyeOff, Briefcase, X, CheckCircle, Loader2, ArrowLeft,
  KeyRound, Send
} from "lucide-react";
import logo from "../assets/sirexa-logo.ico";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tipoLogin, setTipoLogin] = useState("gestor");
  const { login } = useAuth();
  const navigate = useNavigate();

  // Estados para recuperação de senha
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);
  const [mensagemRecuperacao, setMensagemRecuperacao] = useState({ texto: "", tipo: "" });
  const [etapaRecuperacao, setEtapaRecuperacao] = useState(1); // 1: email, 2: código, 3: nova senha
  const [codigoRecuperacao, setCodigoRecuperacao] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      setErro("Preencha todos os campos");
      return;
    }
    setLoading(true);
    setErro("");
    
    const result = await login(email, senha, tipoLogin);
    
    if (result.success) {
      navigate("/menu");
    } else {
      setErro(result.error || "Email ou senha incorretos");
    }
    setLoading(false);
  };

  // 🔑 ENVIAR EMAIL DE RECUPERAÇÃO
  const handleEnviarEmailRecuperacao = async (e) => {
    e.preventDefault();
    
    if (!emailRecuperacao) {
      setMensagemRecuperacao({ texto: "Digite seu email", tipo: "erro" });
      return;
    }

    setLoadingRecuperacao(true);
    setMensagemRecuperacao({ texto: "", tipo: "" });

    try {
      const response = await fetch("https://sirexa-api.onrender.com/api/gestor/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacao })
      });

      const data = await response.json();

      if (response.ok) {
        setMensagemRecuperacao({ 
          texto: "✅ Código de recuperação enviado para seu email!", 
          tipo: "sucesso" 
        });
        setEtapaRecuperacao(2);
      } else {
        setMensagemRecuperacao({ 
          texto: data.mensagem || "Email não encontrado", 
          tipo: "erro" 
        });
      }
    } catch (error) {
      setMensagemRecuperacao({ 
        texto: "Erro ao conectar ao servidor", 
        tipo: "erro" 
      });
    } finally {
      setLoadingRecuperacao(false);
    }
  };

  // 🔑 VERIFICAR CÓDIGO E REDEFINIR SENHA
  const handleRedefinirSenha = async (e) => {
    e.preventDefault();

    if (!codigoRecuperacao) {
      setMensagemRecuperacao({ texto: "Digite o código de verificação", tipo: "erro" });
      return;
    }

    if (!novaSenha || novaSenha.length < 6) {
      setMensagemRecuperacao({ texto: "A senha deve ter no mínimo 6 caracteres", tipo: "erro" });
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setMensagemRecuperacao({ texto: "As senhas não coincidem", tipo: "erro" });
      return;
    }

    setLoadingRecuperacao(true);
    setMensagemRecuperacao({ texto: "", tipo: "" });

    try {
      const response = await fetch("https://sirexa-api.onrender.com/api/gestor/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: emailRecuperacao,
          codigo: codigoRecuperacao,
          novaSenha: novaSenha
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMensagemRecuperacao({ 
          texto: "✅ Senha redefinida com sucesso! Redirecionando...", 
          tipo: "sucesso" 
        });
        
        // Fechar modal e redirecionar após 2 segundos
        setTimeout(() => {
          setMostrarRecuperacao(false);
          setEtapaRecuperacao(1);
          setEmailRecuperacao("");
          setCodigoRecuperacao("");
          setNovaSenha("");
          setConfirmarNovaSenha("");
          setMensagemRecuperacao({ texto: "", tipo: "" });
        }, 2000);
      } else {
        setMensagemRecuperacao({ 
          texto: data.mensagem || "Erro ao redefinir senha", 
          tipo: "erro" 
        });
      }
    } catch (error) {
      setMensagemRecuperacao({ 
        texto: "Erro ao conectar ao servidor", 
        tipo: "erro" 
      });
    } finally {
      setLoadingRecuperacao(false);
    }
  };

  // Fechar modal e resetar estados
  const fecharRecuperacao = () => {
    setMostrarRecuperacao(false);
    setEtapaRecuperacao(1);
    setEmailRecuperacao("");
    setCodigoRecuperacao("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
    setMensagemRecuperacao({ texto: "", tipo: "" });
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #003366 0%, #0055A5 50%, #00C0F9 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center">
            <img
              src={logo}
              alt="SIREXA"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-wide">SIREXA</h1>
          <p className="text-blue-200 mt-2 text-lg font-light">Plataforma Integrada</p>
        </div>

        {/* Card de Login */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
          {/* Header do Card */}
          <div className="bg-gradient-to-r from-[#003366] to-[#0055A5] px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 p-2 rounded-xl backdrop-blur-sm">
                <img src={logo} alt="SIREXA" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Acesso ao Sistema</h2>
                <p className="text-sm text-blue-200">Entre com suas credenciais</p>
              </div>
            </div>
          </div>

          {/* Corpo do Card */}
          <div className="p-6">
            {/* Seletor de Tipo de Login */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Tipo de Acesso</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoLogin("gestor")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                    tipoLogin === "gestor"
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border border-blue-500/50"
                      : "bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-600"
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span className="text-sm font-medium">Gestor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoLogin("tecnico")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                    tipoLogin === "tecnico"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg border border-purple-500/50"
                      : "bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-600"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Técnico</span>
                </button>
              </div>
            </div>

            {/* Mensagem de Erro */}
            {erro && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 mb-6 flex items-center gap-2 animate-shake">
                <AlertCircle className="text-red-400 flex-shrink-0" size={18} />
                <p className="text-red-200 text-sm flex-1">{erro}</p>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2 text-blue-400" />
                  Email
                </label>
                <input
                  type="email"
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2 text-green-400" />
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500 pr-12"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* 🔑 LINK ESQUECEU A SENHA */}
                {tipoLogin === "gestor" && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={() => setMostrarRecuperacao(true)}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium transition flex items-center gap-1 ml-auto"
                    >
                      <KeyRound size={12} />
                      Esqueceu a senha?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                  tipoLogin === "gestor"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/25"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-500/25"
                } disabled:opacity-50 text-white font-medium`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>Entrar no Sistema</span>
                  </>
                )}
              </button>
            </form>

            {/* Links Extras */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">
                  {tipoLogin === "gestor" ? "Gestor de empresas" : "Técnico especializado"}
                </p>
                <button
                  onClick={() => navigate("/gestor/cadastro")}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition flex items-center gap-1"
                >
                  <Briefcase size={14} />
                  Cadastrar Gestor
                </button>
              </div>
            </div>

            {/* Informação adicional */}
            <div className="mt-4 p-3 bg-blue-600/10 rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-gray-400">
                  {tipoLogin === "gestor" 
                    ? "Gestores têm acesso completo a todas as funcionalidades do sistema."
                    : "Técnicos acessam apenas os módulos atribuídos pelo gestor."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-blue-200 text-xs">
            © {new Date().getFullYear()} SIREXA — Plataforma Integrada
          </p>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      {/* ========================================== */}
      {mostrarRecuperacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700 animate-scale-in">
            
            {/* Cabeçalho */}
            <div className="bg-gradient-to-r from-[#003366] to-[#0055A5] px-6 py-5 rounded-t-2xl border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/15 p-2 rounded-xl">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {etapaRecuperacao === 1 ? "Recuperar Senha" : 
                       etapaRecuperacao === 2 ? "Verificar Código" : "Nova Senha"}
                    </h3>
                    <p className="text-blue-200 text-sm">
                      {etapaRecuperacao === 1 ? "Etapa 1 de 2" : "Etapa 2 de 2"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={fecharRecuperacao}
                  className="p-2 rounded-xl hover:bg-white/10 transition text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Corpo */}
            <div className="p-6">
              {/* Mensagem */}
              {mensagemRecuperacao.texto && (
                <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 ${
                  mensagemRecuperacao.tipo === "sucesso" 
                    ? "bg-green-600/20 border border-green-500/30" 
                    : "bg-red-600/20 border border-red-500/30"
                }`}>
                  {mensagemRecuperacao.tipo === "sucesso" ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <p className="text-sm text-gray-200">{mensagemRecuperacao.texto}</p>
                </div>
              )}

              {/* ETAPA 1: Email */}
              {etapaRecuperacao === 1 && (
                <form onSubmit={handleEnviarEmailRecuperacao} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="w-4 h-4 inline mr-2 text-blue-400" />
                      Email cadastrado
                    </label>
                    <input
                      type="email"
                      className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-500"
                      placeholder="Digite seu email"
                      value={emailRecuperacao}
                      onChange={(e) => setEmailRecuperacao(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-gray-500 text-xs">
                    Enviaremos um código de verificação para seu email cadastrado.
                  </p>
                  <button
                    type="submit"
                    disabled={loadingRecuperacao}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loadingRecuperacao ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar Código
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ETAPA 2: Código + Nova Senha */}
              {etapaRecuperacao === 2 && (
                <form onSubmit={handleRedefinirSenha} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <KeyRound className="w-4 h-4 inline mr-2 text-yellow-400" />
                      Código de Verificação
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-500 text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      value={codigoRecuperacao}
                      onChange={(e) => setCodigoRecuperacao(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      Digite o código de 6 dígitos enviado para <span className="text-blue-400">{emailRecuperacao}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Lock className="w-4 h-4 inline mr-2 text-green-400" />
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showNovaSenha ? "text" : "password"}
                        className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-500 pr-12"
                        placeholder="Mínimo 6 caracteres"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNovaSenha(!showNovaSenha)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
                      >
                        {showNovaSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Lock className="w-4 h-4 inline mr-2 text-green-400" />
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-500"
                      placeholder="Confirme a nova senha"
                      value={confirmarNovaSenha}
                      onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingRecuperacao}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loadingRecuperacao ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redefinindo...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Redefinir Senha
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEtapaRecuperacao(1);
                        setMensagemRecuperacao({ texto: "", tipo: "" });
                      }}
                      className="text-gray-400 hover:text-white text-sm transition flex items-center gap-1 mx-auto"
                    >
                      <ArrowLeft size={14} />
                      Voltar e reenviar código
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Rodapé */}
            <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/50 rounded-b-2xl">
              <p className="text-gray-500 text-xs text-center">
                SIREXA © {new Date().getFullYear()} — Segurança garantida
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default Login;