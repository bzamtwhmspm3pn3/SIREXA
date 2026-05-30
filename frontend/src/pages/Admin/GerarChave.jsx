// src/pages/Admin/GerarChave.jsx
import React, { useState } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { useAuth } from '../../contexts/AuthContext';
import { Key, Copy, CheckCircle, AlertCircle, Loader2, Mail, Calendar, Shield } from 'lucide-react';

const GerarChave = () => {
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [plano, setPlano] = useState('basico');
  const [diasValidade, setDiasValidade] = useState(365);
  const [loading, setLoading] = useState(false);
  const [chaveGerada, setChaveGerada] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  const planos = [
    { value: 'trial', label: '📦 Trial', preco: 'Grátis', dias: 30, descricao: '30 dias de teste' },
    { value: 'basico', label: '📦 Básico', preco: '29.900 Kz/ano', dias: 365, descricao: 'Gestão de stock e fornecedores' },
    { value: 'profissional', label: '🚀 Profissional', preco: '79.900 Kz/ano', dias: 365, descricao: 'Gestão completa + RH' },
    { value: 'empresarial', label: '🏢 Empresarial', preco: '149.900 Kz/ano', dias: 365, descricao: 'Completo + Contabilidade' },
    { value: 'enterprise', label: '⭐ Enterprise', preco: 'Sob consulta', dias: 365, descricao: 'Soluções personalizadas' }
  ];

  const handleGerar = async (e) => {
    e.preventDefault();
    if (!email) {
      setMensagem({ texto: 'Email do cliente é obrigatório', tipo: 'erro' });
      return;
    }
    
    setLoading(true);
    setMensagem({ texto: '', tipo: '' });

    try {
      // Simular geração de chave (backend será implementado depois)
      const chaveSimulada = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      setTimeout(() => {
        setChaveGerada(chaveSimulada);
        setMensagem({ texto: '✅ Chave gerada com sucesso!', tipo: 'sucesso' });
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setMensagem({ texto: 'Erro ao gerar chave', tipo: 'erro' });
      setLoading(false);
    }
  };

  const copiarChave = () => {
    navigator.clipboard.writeText(chaveGerada);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <LayoutAdmin title="Gerar Chave de Ativação">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600/30 p-2 rounded-xl">
                <Key className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Nova Chave de Ativação</h2>
                <p className="text-gray-400 text-sm">Crie chaves para novos clientes</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleGerar} className="p-6 space-y-5">
            {mensagem.texto && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                mensagem.tipo === 'sucesso' ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-red-600/20 text-red-400 border border-red-500/30'
              }`}>
                {mensagem.tipo === 'sucesso' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                {mensagem.texto}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2 text-blue-400" />
                Email do Cliente *
              </label>
              <input
                type="email"
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition"
                placeholder="cliente@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">A chave será enviada para este email</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Shield className="w-4 h-4 inline mr-2 text-purple-400" />
                Plano *
              </label>
              <select
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition"
                value={plano}
                onChange={(e) => setPlano(e.target.value)}
              >
                {planos.map(p => (
                  <option key={p.value} value={p.value}>{p.label} - {p.preco}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {planos.find(p => p.value === plano)?.descricao}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2 text-green-400" />
                Validade
              </label>
              <select
                className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition"
                value={diasValidade}
                onChange={(e) => setDiasValidade(parseInt(e.target.value))}
              >
                <option value="30">30 dias (1 mês)</option>
                <option value="90">90 dias (3 meses)</option>
                <option value="180">180 dias (6 meses)</option>
                <option value="365">365 dias (1 ano)</option>
                <option value="730">730 dias (2 anos)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Key size={20} />}
              {loading ? 'Gerando...' : 'Gerar Chave'}
            </button>
          </form>

          {chaveGerada && (
            <div className="border-t border-gray-700 p-6 bg-green-600/10">
              <label className="block text-sm font-medium text-green-400 mb-2">Chave Gerada:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  className="flex-1 p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white font-mono text-center text-lg tracking-wider"
                  value={chaveGerada}
                />
                <button
                  type="button"
                  onClick={copiarChave}
                  className="px-4 bg-green-600 hover:bg-green-700 rounded-xl transition flex items-center gap-2"
                >
                  {copiado ? <CheckCircle size={18} /> : <Copy size={18} />}
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="mt-4 p-3 bg-blue-600/10 rounded-lg">
                <p className="text-blue-400 text-sm font-medium mb-1">📧 Enviar para o cliente:</p>
                <p className="text-gray-300 text-sm">Sua chave de ativação SIREXA: <strong className="text-yellow-400">{chaveGerada}</strong></p>
                <p className="text-gray-400 text-xs mt-2">O cliente deve inserir esta chave no momento do cadastro.</p>
              </div>
            </div>
          )}
        </div>

        {/* Informação */}
        <div className="mt-4 p-4 bg-blue-600/10 rounded-xl border border-blue-500/20">
          <p className="text-blue-400 text-sm font-medium mb-1">ℹ️ Como funciona?</p>
          <p className="text-gray-400 text-xs">
            1. Gere uma chave para o cliente<br />
            2. Envie a chave por email para o cliente<br />
            3. O cliente insere a chave no cadastro<br />
            4. O sistema valida e cria a conta automaticamente
          </p>
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default GerarChave;