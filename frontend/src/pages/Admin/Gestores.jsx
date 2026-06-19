// src/pages/Admin/Gestores.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Users, Loader2, Power, RefreshCw, X, Key, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import API_URL from '../../config/api';

const Gestores = () => {
  const [gestores, setGestores] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [gestorSelecionado, setGestorSelecionado] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewForm, setRenewForm] = useState({ plano: '', diasValidade: 365 });
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarGestores();
    carregarPlanos();
  }, []);

  const carregarGestores = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/gestores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setGestores(data.gestores || []);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPlanos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/planos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlanos(data.planos?.filter(p => p.ativo !== false) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      setPlanos([
        { nome: 'FREE', preco: 0, descricao: 'Teste gratuito' },
        { nome: 'BÁSICO', preco: 29900, descricao: 'Para pequenas empresas' },
        { nome: 'PROFISSIONAL', preco: 79900, descricao: 'Para empresas em crescimento' },
        { nome: 'EMPRESARIAL', preco: 149900, descricao: 'Solução completa' },
        { nome: 'PLATINUM', preco: 299900, descricao: 'Ilimitado + Suporte prioritário' }
      ]);
    }
  };

  const toggleStatus = async (gestorId, ativo) => {
    setActionLoading(gestorId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/gestores/${gestorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ativo: !ativo })
      });
      
      if (response.ok) {
        await carregarGestores();
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const abrirModal = (gestor) => {
    setGestorSelecionado(gestor);
    setRenewForm({ plano: '', diasValidade: 365 });
    setMensagem({ texto: '', tipo: '' });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setGestorSelecionado(null);
    setMensagem({ texto: '', tipo: '' });
  };

  const renovarLicenca = async (e) => {
    e.preventDefault();
    
    if (!renewForm.plano) {
      setMensagem({ texto: '❌ Selecione um plano', tipo: 'erro' });
      return;
    }

    setRenewLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/gestores/${gestorSelecionado._id}/licenca`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plano: renewForm.plano,
          diasValidade: renewForm.diasValidade
        })
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        setMensagem({
          texto: `✅ ${data.mensagem}`,
          tipo: 'sucesso'
        });
        setTimeout(() => {
          fecharModal();
          carregarGestores();
        }, 2000);
      } else {
        setMensagem({
          texto: data.mensagem || '❌ Erro ao renovar licença',
          tipo: 'erro'
        });
      }
    } catch (error) {
      setMensagem({ texto: '❌ Erro ao conectar ao servidor', tipo: 'erro' });
    } finally {
      setRenewLoading(false);
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-AO').format(valor);
  };

  if (loading) {
    return (
      <LayoutAdmin title="Gestores">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Gestores Cadastrados">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Todos os Gestores</h2>
            <span className="text-sm text-gray-400 ml-auto">Total: {gestores.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Telefone</th>
                <th className="p-4 text-left">Empresas</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {gestores.map((gestor) => (
                <tr key={gestor._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 text-white font-medium">{gestor.nome}</td>
                  <td className="p-4 text-gray-300">{gestor.email}</td>
                  <td className="p-4 text-gray-300">{gestor.telefone || '—'}</td>
                  <td className="p-4 text-gray-300">{gestor.empresas?.length || 0} empresa(s)</td>
                  <td className="p-4 text-center">
                    {gestor.ativo !== false ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativo</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">Inativo</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => toggleStatus(gestor._id, gestor.ativo)} 
                        disabled={actionLoading === gestor._id} 
                        className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
                        title={gestor.ativo !== false ? 'Desativar' : 'Ativar'}
                      >
                        {actionLoading === gestor._id ? <Loader2 className="animate-spin" size={14} /> : <Power size={14} />}
                      </button>
                      <button
                        onClick={() => abrirModal(gestor)}
                        className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition"
                        title="Renovar/Atualizar Licença"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {gestores.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    Nenhum gestor cadastrado ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Renovação de Licença */}
      {modalAberto && gestorSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Renovar/Atualizar Licença</h3>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Gestor:</span>{' '}
                  <span className="text-white font-medium">{gestorSelecionado.nome}</span>
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Email:</span>{' '}
                  <span className="text-white">{gestorSelecionado.email}</span>
                </p>
              </div>

              {mensagem.texto && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{
                  backgroundColor: mensagem.tipo === 'sucesso' ? '#10b98120' : '#ef444420',
                  color: mensagem.tipo === 'sucesso' ? '#10b981' : '#ef4444',
                  border: `1px solid ${mensagem.tipo === 'sucesso' ? '#10b98140' : '#ef444440'}`
                }}>
                  {mensagem.tipo === 'sucesso' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {mensagem.texto}
                </div>
              )}

              <form onSubmit={renovarLicenca} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Key size={14} className="inline mr-1" /> Novo Plano *
                  </label>
                  <select
                    value={renewForm.plano}
                    onChange={(e) => setRenewForm({ ...renewForm, plano: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 text-white focus:border-purple-500 focus:outline-none"
                    required
                  >
                    <option value="">Selecione um plano</option>
                    {planos.map((plano) => (
                      <option key={plano.nome} value={plano.nome}>
                        {plano.nome} - {formatarMoeda(plano.preco)} Kz
                        {plano.descricao ? ` - ${plano.descricao}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Calendar size={14} className="inline mr-1" /> Validade
                  </label>
                  <select
                    value={renewForm.diasValidade}
                    onChange={(e) => setRenewForm({ ...renewForm, diasValidade: parseInt(e.target.value) })}
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

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={renewLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {renewLoading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                    {renewLoading ? 'A atualizar...' : 'Actualizar Licença'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </LayoutAdmin>
  );
};

export default Gestores;