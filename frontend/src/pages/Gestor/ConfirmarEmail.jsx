// frontend/src/pages/Gestor/ConfirmarEmail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ConfirmarEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setMensagem({ texto: 'Token inválido ou expirado', tipo: 'erro' });
      setLoading(false);
      return;
    }

    confirmarEmail();
  }, [token]);

  const confirmarEmail = async () => {
    try {
      const response = await fetch(`https://sirexa-api.onrender.com/api/gestor/confirmar-email?token=${token}`);
      const data = await response.json();
      
      if (response.ok && data.sucesso !== false) {
        setMensagem({ texto: '✅ Email confirmado com sucesso! Redirecionando para o login...', tipo: 'sucesso' });
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMensagem({ texto: data.mensagem || 'Erro ao confirmar email', tipo: 'erro' });
      }
    } catch (error) {
      setMensagem({ texto: 'Erro ao conectar ao servidor', tipo: 'erro' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          mensagem.tipo === 'sucesso' ? 'bg-green-600' : mensagem.tipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {loading ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : mensagem.tipo === 'sucesso' ? (
            <CheckCircle className="w-10 h-10 text-white" />
          ) : (
            <AlertCircle className="w-10 h-10 text-white" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">
          {loading ? 'Confirmando...' : mensagem.tipo === 'sucesso' ? 'Email Confirmado!' : 'Erro na Confirmação'}
        </h2>
        
        <p className={`text-sm ${mensagem.tipo === 'sucesso' ? 'text-green-400' : 'text-gray-400'}`}>
          {mensagem.texto || 'Aguarde...'}
        </p>

        {mensagem.tipo === 'erro' && !loading && (
          <button
            onClick={() => navigate('/login')}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
          >
            Voltar para o Login
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfirmarEmail;