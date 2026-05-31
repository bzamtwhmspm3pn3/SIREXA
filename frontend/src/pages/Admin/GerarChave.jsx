// src/pages/Admin/GerarChave.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Key, Mail, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const GerarChave = () => {
  const [formData, setFormData] = useState({
    email: '',
    plano: '',
    diasValidade: 365
  });
  
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carregandoPlanos, setCarregandoPlanos] = useState(true);
  const [chaveGerada, setChaveGerada] = useState(null);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  // 🔥 CARREGAR PLANOS DO BACKEND
  useEffect(() => {
    carregarPlanos();
  }, []);

  const carregarPlanos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/planos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Planos carregados:', data.planos);
        setPlanos(data.planos || []);
        
        // Selecionar primeiro plano ativo como padrão
        const primeiroPlano = data.planos?.find(p => p.ativo);
        if (primeiroPlano && !formData.plano) {
          setFormData(prev => ({ ...prev, plano: primeiroPlano.nome }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      // Fallback para planos padrão
      setPlanos([
        { nome: 'FREE', preco: 0, descricao: 'Teste gratuito' },
        { nome: 'BÁSICO', preco: 29900, descricao: 'Para pequenas empresas' },
        { nome: 'PROFISSIONAL', preco: 79900, descricao: 'Para empresas em crescimento' },
        { nome: 'EMPRESARIAL', preco: 149900, descricao: 'Solução completa' },
        { nome: 'PLATINUM', preco: 299900, descricao: 'Ilimitado + Suporte prioritário' }
      ]);
    } finally {
      setCarregandoPlanos(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-AO').format(valor);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setMensagem({ texto: '❌ Email é obrigatório', tipo: 'erro' });
      setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
      return;
    }
    
    if (!formData.plano) {
      setMensagem({ texto: '❌ Selecione um plano', tipo: 'erro' });
      setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
      return;
    }
    
    setLoading(true);
    setChaveGerada(null);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('https://sirexa-api.onrender.com/api/gestor/admin/gerar-chave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email,
          plano: formData.plano,
          diasValidade: formData.diasValidade
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.sucesso) {
        setChaveGerada(data.chave);
        setMensagem({ texto: '✅ Chave gerada com sucesso!', tipo: 'sucesso' });
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 5000);
      } else {
        setMensagem({ texto: data.mensagem || '❌ Erro ao gerar chave', tipo: 'erro' });
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
      }
    } catch (error) {
      setMensagem({ texto: '❌ Erro ao conectar ao servidor', tipo: 'erro' });
      setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (carregandoPlanos) {
    return (
      <LayoutAdmin title="Gerar Chave de Ativação">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Gerar Chave de Ativação">
      <div className="max-w-2xl mx-auto">
        {mensagem.texto && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in-out" style={{
            backgroundColor: mensagem.tipo === 'sucesso' ? '#10b98120' : '#ef444420',
            color: mensagem.tipo === 'sucesso' ? '#10b981' : '#ef4444',
            border: `1px solid ${mensagem.tipo === 'sucesso' ? '#10b98140' : '#ef444440'}`
          }}>
            {mensagem.tipo === 'sucesso' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {mensagem.texto}
          </div>
        )}

        {chaveGerada && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30">
            <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
              <CheckCircle size={18} /> Chave Gerada com Sucesso!
            </h3>
            <div className="bg-gray-900/50 p-3 rounded-lg">
              <code className="text-green-400 font-mono text-sm break-all">{chaveGerada}</code>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              Esta chave é válida por {formData.diasValidade} dias. Envie para o cliente.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Mail size={14} className="inline mr-1" /> Email do Cliente *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none"
              placeholder="cliente@empresa.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Key size={14} className="inline mr-1" /> Plano *
            </label>
            <select
              value={formData.plano}
              onChange={(e) => setFormData({ ...formData, plano: e.target.value })}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none"
              required
            >
              <option value="">Selecione um plano</option>
              {planos.filter(p => p.ativo !== false).map((plano) => (
                <option key={plano.nome} value={plano.nome}>
                  {plano.nome} - {formatarMoeda(plano.preco)} Kz {plano.descricao && `- ${plano.descricao}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Planos disponíveis: {planos.filter(p => p.ativo !== false).map(p => p.nome).join(', ')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" /> Validade
            </label>
            <select
              value={formData.diasValidade}
              onChange={(e) => setFormData({ ...formData, diasValidade: parseInt(e.target.value) })}
              className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none"
            >
              <option value={7}>7 dias (Trial)</option>
              <option value={30}>30 dias (1 mês)</option>
              <option value={90}>90 dias (3 meses)</option>
              <option value={180}>180 dias (6 meses)</option>
              <option value={365}>365 dias (1 ano)</option>
              <option value={730}>730 dias (2 anos)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />}
            {loading ? 'Gerando...' : 'Gerar Chave'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-gray-700/30 rounded-lg text-center">
          <p className="text-gray-400 text-xs">
            🔑 As chaves geradas são válidas por {formData.diasValidade} dias.<br />
            O cliente deve usar esta chave no momento do registo.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-out { animation: fade-in-out 3s ease forwards; }
      `}</style>
    </LayoutAdmin>
  );
};

export default GerarChave;