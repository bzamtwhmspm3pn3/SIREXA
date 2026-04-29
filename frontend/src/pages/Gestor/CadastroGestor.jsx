// src/pages/Gestor/CadastroGestor.jsx
import React, { useState } from "react";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  UserPlus, Mail, Lock, Phone, Eye, EyeOff, CheckCircle, 
  AlertCircle, Shield, FileText, ChevronRight, ArrowLeft,
  Loader2, Building, Users, Briefcase, X
} from "lucide-react";
import logo from "../../assets/sirexa-logo.ico";

const CadastroGestor = () => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [mostrarTermos, setMostrarTermos] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  const mostrarMensagem = (texto, tipo) => {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem({ texto: "", tipo: "" }), 5000);
  };

  const validarSenha = (senha) => {
    const temMinimo = senha.length >= 6;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    return { temMinimo, temMaiuscula, temNumero };
  };

  const requisitosSenha = validarSenha(formData.senha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!aceitouTermos) {
      mostrarMensagem("Você precisa aceitar os Termos de Uso e Política de Privacidade", "erro");
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
      const response = await fetch("https://sirexa-api.onrender.com/api/gestor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          telefone: formData.telefone
        })
      });
      const data = await response.json();
      if (response.ok) {
        mostrarMensagem("✅ Cadastro realizado com sucesso! Redirecionando...", "sucesso");
        await login(formData.email, formData.senha);
        setTimeout(() => navigate("/menu"), 2000);
      } else {
        mostrarMensagem(data.mensagem || "Erro ao cadastrar", "erro");
      }
    } catch (error) {
      mostrarMensagem("Erro: " + error.message, "erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Cadastro de Gestor" showBackButton={true} backToRoute="/login">
      
      {/* ========================================== */}
      {/* MODAL DE TERMOS DE USO - PROFISSIONAL */}
      {/* ========================================== */}
      {mostrarTermos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl border border-gray-700 animate-scale-in flex flex-col">
            
            {/* Cabeçalho do Modal */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#003366] to-[#0055A5] px-6 py-5 rounded-t-2xl border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/15 p-2.5 rounded-xl backdrop-blur-sm">
                    <img src={logo} alt="SIREXA" className="w-8 h-8 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Termos de Uso e Política de Privacidade</h3>
                    <p className="text-blue-200 text-sm mt-0.5">SIREXA — Plataforma Integrada</p>
                  </div>
                </div>
                <button
                  onClick={() => setMostrarTermos(false)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/70 hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Introdução */}
              <div className="bg-[#003366]/30 rounded-xl p-4 border border-blue-500/20">
                <p className="text-gray-300 text-sm leading-relaxed">
                  <span className="text-white font-semibold">Última atualização:</span> {new Date().toLocaleDateString('pt-AO', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                  Bem-vindo ao <span className="text-white font-medium">SIREXA</span>. Ao utilizar nossos serviços, 
                  você concorda com os termos abaixo. Por favor, leia atentamente.
                </p>
              </div>

              {/* Seção 1 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Aceitação dos Termos
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Ao se cadastrar no <span className="text-white font-medium">SIREXA</span>, você concorda com todos os termos 
                  e condições aqui estabelecidos. Este é um contrato legal entre você e o SIREXA.
                </p>
              </div>

              {/* Seção 2 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Descrição do Serviço
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  O SIREXA é uma plataforma de gestão corporativa que oferece ferramentas para gestão de empresas, 
                  recursos humanos, financeiro, patrimonial, operacional e relatórios inteligentes.
                </p>
              </div>

              {/* Seção 3 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  Conta de Usuário
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem 
                  em sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.
                </p>
              </div>

              {/* Seção 4 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  Privacidade e Proteção de Dados
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Seus dados pessoais são protegidos de acordo com a Lei de Proteção de Dados (Lei n.º 22/11 de 17 de Junho). 
                  Utilizamos suas informações apenas para fornecer e melhorar nossos serviços. Não compartilhamos seus dados 
                  com terceiros sem consentimento explícito.
                </p>
              </div>

              {/* Seção 5 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  Conduta do Usuário
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Você concorda em usar o serviço apenas para fins legais e de acordo com as leis aplicáveis. 
                  É proibido compartilhar acesso não autorizado, realizar atividades fraudulentas ou violar direitos de terceiros.
                </p>
              </div>

              {/* Seção 6 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  Propriedade Intelectual
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Todo o conteúdo, funcionalidades e tecnologia do SIREXA são propriedade exclusiva da empresa e 
                  estão protegidos por leis de propriedade intelectual. Nenhum conteúdo pode ser reproduzido sem autorização.
                </p>
              </div>

              {/* Seção 7 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">7</span>
                  Modificações do Serviço
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Reservamo-nos o direito de modificar, suspender ou descontinuar o serviço a qualquer momento, 
                  com aviso prévio sempre que possível.
                </p>
              </div>

              {/* Seção 8 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">8</span>
                  Limitação de Responsabilidade
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  O SIREXA não se responsabiliza por danos indiretos, perda de dados ou lucros cessantes decorrentes 
                  do uso ou impossibilidade de uso do serviço, dentro dos limites permitidos por lei.
                </p>
              </div>

              {/* Seção 9 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">9</span>
                  Lei Aplicável
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Estes termos são regidos pelas leis da República de Angola. Qualquer disputa será resolvida nos tribunais 
                  da comarca de Luanda, com renúncia expressa a qualquer outro foro.
                </p>
              </div>

              {/* Seção 10 */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <h4 className="text-base font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">10</span>
                  Contato
                </h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Para questões sobre estes termos, entre em contato:
                </p>
                <div className="mt-2 space-y-1 text-sm text-gray-400">
                  <p>📧 Email: <span className="text-blue-300">suporte@sirexa.ao</span></p>
                  <p>📞 Telefone: <span className="text-blue-300">+244 928 565 837</span></p>
                  <p>📍 Endereço: Huambo, Angola</p>
                </div>
              </div>

              {/* Confirmação final */}
              <div className="bg-[#00A86B]/10 rounded-xl p-4 border border-[#00A86B]/30 text-center">
                <CheckCircle className="mx-auto mb-2 text-[#00A86B]" size={28} />
                <p className="text-green-200 text-sm font-medium">
                  Ao aceitar estes termos, você concorda com todas as condições estabelecidas acima.
                </p>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700 bg-gray-800/50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">
                  SIREXA © {new Date().getFullYear()} — Todos os direitos reservados
                </p>
                <button
                  onClick={() => {
                    setAceitouTermos(true);
                    setMostrarTermos(false);
                    mostrarMensagem("✅ Termos aceitos com sucesso!", "sucesso");
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white font-medium transition-all shadow-lg flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Aceitar e Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TOAST NOTIFICATION */}
      {/* ========================================== */}
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

      {/* ========================================== */}
      {/* FORMULÁRIO DE CADASTRO */}
      {/* ========================================== */}
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-xl overflow-hidden">
          
          {/* Header do Card */}
          <div className="bg-gradient-to-r from-[#003366] to-[#0055A5] px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="bg-white/15 p-2.5 rounded-xl backdrop-blur-sm">
                <img src={logo} alt="SIREXA" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Criar Conta de Gestor</h2>
                <p className="text-blue-200 text-sm">Cadastre-se para gerenciar empresas</p>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-2 text-blue-400" />
                Nome Completo <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2 text-blue-400" />
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Phone className="w-4 h-4 inline mr-2 text-green-400" />
                Telefone
              </label>
              <input
                type="tel"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500"
                placeholder="+244 923 456 789"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2 text-yellow-400" />
                Senha <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500 pr-12"
                  placeholder="Digite sua senha"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* Requisitos da senha */}
              {formData.senha && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 space-y-1.5">
                  <p className="text-xs text-gray-400 mb-1 font-medium">Requisitos de segurança:</p>
                  <div className="flex items-center gap-2">
                    {requisitosSenha.temMinimo ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />
                    )}
                    <span className={`text-xs ${requisitosSenha.temMinimo ? 'text-green-400' : 'text-gray-500'}`}>
                      Mínimo 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requisitosSenha.temMaiuscula ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />
                    )}
                    <span className={`text-xs ${requisitosSenha.temMaiuscula ? 'text-green-400' : 'text-gray-500'}`}>
                      Pelo menos 1 letra maiúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {requisitosSenha.temNumero ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />
                    )}
                    <span className={`text-xs ${requisitosSenha.temNumero ? 'text-green-400' : 'text-gray-500'}`}>
                      Pelo menos 1 número
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2 text-yellow-400" />
                Confirmar Senha <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 placeholder-gray-500 pr-12"
                  placeholder="Confirme sua senha"
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({...formData, confirmarSenha: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
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
              {formData.confirmarSenha && formData.senha === formData.confirmarSenha && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  <p className="text-xs text-green-400">Senhas coincidem</p>
                </div>
              )}
            </div>

            {/* Termos de Uso */}
            <div className="border-t border-gray-700 pt-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-gray-700"
                />
                <div className="flex-1">
                  <span className="text-gray-300 text-sm leading-relaxed">
                    Li e aceito os{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setMostrarTermos(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline font-medium transition"
                    >
                      Termos de Uso
                    </button>
                    {" "}e a{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setMostrarTermos(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline font-medium transition"
                    >
                      Política de Privacidade
                    </button>
                  </span>
                </div>
              </label>
              {!aceitouTermos && (
                <p className="text-xs text-gray-500 mt-2 ml-7">
                  Você precisa aceitar os termos para continuar
                </p>
              )}
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2 font-medium text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Criar Conta
                </>
              )}
            </button>

            {/* Link para Login */}
            <div className="text-center pt-2">
              <p className="text-gray-400 text-sm">
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-blue-400 hover:text-blue-300 font-medium transition inline-flex items-center gap-1"
                >
                  Fazer login <ChevronRight size={14} />
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Info adicional de segurança */}
        <div className="mt-4 p-4 bg-[#003366]/30 rounded-xl border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-200 font-medium mb-1">Segurança Garantida</p>
              <p className="text-xs text-blue-300/80 leading-relaxed">
                Seus dados são criptografados e protegidos. Ao se cadastrar, você concorda em fornecer 
                informações precisas e manter a confidencialidade de sua conta.
              </p>
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

export default CadastroGestor;