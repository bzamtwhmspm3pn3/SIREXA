// frontend/src/pages/Gestor/RedefinirSenha.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const RedefinirSenha = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email'); // 🔥 PEGAR EMAIL DA URL
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setMensagem({ texto: 'Token inválido ou expirado', tipo: 'erro' });
    }
    
    // 🔥 Tentar recuperar o email do localStorage ou da URL
    const storedEmail = localStorage.getItem('resetEmail');
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('resetEmail', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [token, emailParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setMensagem({ texto: 'Email não encontrado. Solicite nova recuperação.', tipo: 'erro' });
      return;
    }
    
    if (novaSenha !== confirmarSenha) {
      setMensagem({ texto: 'As senhas não coincidem', tipo: 'erro' });
      return;
    }
    
    if (novaSenha.length < 6) {
      setMensagem({ texto: 'A senha deve ter no mínimo 6 caracteres', tipo: 'erro' });
      return;
    }
    
    if (!codigo || codigo.length !== 6) {
      setMensagem({ texto: 'Código de verificação inválido', tipo: 'erro' });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('📡 Enviando redefinição:', { email, codigo });
      
      const response = await fetch('https://sirexa-api.onrender.com/api/gestor/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          codigo: codigo,
          novaSenha: novaSenha
        })
      });
      
      const data = await response.json();
      console.log('📝 Resposta:', data);
      
      if (data.sucesso) {
        setMensagem({ texto: '✅ Senha redefinida com sucesso! Redirecionando...', tipo: 'sucesso' });
        localStorage.removeItem('resetEmail');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMensagem({ texto: data.mensagem || 'Erro ao redefinir senha', tipo: 'erro' });
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      setMensagem({ texto: 'Erro ao conectar ao servidor', tipo: 'erro' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Redefinir Senha</h2>
          <p className="text-gray-400 text-sm mt-2">Digite o código e sua nova senha</p>
          {email && <p className="text-gray-500 text-xs mt-2">📧 {email}</p>}
        </div>

        {mensagem.texto && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            mensagem.tipo === 'sucesso' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-red-600/20 text-red-400 border border-red-500/30'
          }`}>
            {mensagem.tipo === 'sucesso' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Código de Verificação
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:outline-none font-mono text-center text-xl"
              placeholder="000000"
              maxLength={6}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Digite o código de 6 dígitos enviado para seu email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nova Senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              placeholder="Digite sua nova senha"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
              placeholder="Confirme sua nova senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RedefinirSenha;