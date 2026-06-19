// src/pages/Admin/Licencas.jsx
import React, { useState, useEffect } from 'react';
import LayoutAdmin from './LayoutAdmin';
import { Key, Copy, Loader2, Power, RefreshCw, X, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import API_URL from '../../config/api';

const Licencas = () => {
  const [licencas, setLicencas] = useState([]);
  const [gestores, setGestores] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [licencaSelecionada, setLicencaSelecionada] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewForm, setRenewForm] = useState({ plano: '', diasValidade: 365 });
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const token = localStorage.getItem("token");
      const [licRes, gestRes, planRes] = await Promise.all([
        fetch(`${API_URL}/gestor/admin/licencas`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/gestor/admin/gestores`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/gestor/admin/planos`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (licRes.ok) {
        const licData = await licRes.json();
        setLicencas(licData.licencas || []);
      }
      if (gestRes.ok) {
        const gestData = await gestRes.json();
        setGestores(gestData.gestores || []);
      }
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlanos(planData.planos?.filter(p => p.ativo !== false) || []);
      }
    } catch (error) {
      console.error('Erro:', error);
      setPlanos([
        { nome: 'FREE', preco: 0 }, { nome: 'BÁSICO', preco: 29900 },
        { nome: 'PROFISSIONAL', preco: 79900 }, { nome: 'EMPRESARIAL', preco: 149900 },
        { nome: 'PLATINUM', preco: 299900 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const encontrarGestorPorLicenca = (licenca) => {
    return gestores.find(g =>
      g.licencaId === licenca._id ||
      g.email?.toLowerCase() === licenca.email?.toLowerCase()
    );
  };

  const revogarLicenca = async (chave) => {
    if (!confirm(`Tem certeza que deseja revogar a licença ${chave}?`)) return;
    
    setActionLoading(chave);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/licencas/${chave}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        await carregarDados();
      }
    } catch (error) {
      alert('Erro ao revogar licença');
    } finally {
      setActionLoading(null);
    }
  };

  const copiarChave = (chave) => {
    navigator.clipboard.writeText(chave);
  };

  const abrirModal = (licenca) => {
    setLicencaSelecionada(licenca);
    setRenewForm({ plano: licenca.plano || '', diasValidade: 365 });
    setMensagem({ texto: '', tipo: '' });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setLicencaSelecionada(null);
    setMensagem({ texto: '', tipo: '' });
  };

  const renovarLicenca = async (e) => {
    e.preventDefault();

    if (!renewForm.plano) {
      setMensagem({ texto: '❌ Selecione um plano', tipo: 'erro' });
      return;
    }

    const gestor = encontrarGestorPorLicenca(licencaSelecionada);
    if (!gestor) {
      setMensagem({
        texto: '❌ Nenhum gestor encontrado para esta licença. Use a página Gestores.',
        tipo: 'erro'
      });
      return;
    }

    setRenewLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/gestor/admin/gestores/${gestor._id}/licenca`, {
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
        setMensagem({ texto: `✅ ${data.mensagem}`, tipo: 'sucesso' });
        setTimeout(() => {
          fecharModal();
          carregarDados();
        }, 2000);
      } else {
        setMensagem({ texto: data.mensagem || '❌ Erro ao renovar licença', tipo: 'erro' });
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
      <LayoutAdmin title="Licenças">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-purple-400" size={40} />
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin title="Gerenciar Licenças">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Key className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Todas as Licenças</h2>
            <span className="text-sm text-gray-400">Total: {licencas.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr className="text-gray-300 text-sm">
                <th className="p-4 text-left">Chave</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Plano</th>
                <th className="p-4 text-left">Expiração</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {licencas.map((licenca) => (
                <tr key={licenca._id} className="border-t border-gray-700 hover:bg-gray-700/50 transition">
                  <td className="p-4 font-mono text-yellow-400 text-sm">{licenca.chave}</td>
                  <td className="p-4 text-gray-300">{licenca.email}</td>
                  <td className="p-4"><span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">{licenca.plano}</span></td>
                  <td className="p-4 text-gray-300">{licenca.dataExpiracao ? new Date(licenca.dataExpiracao).toLocaleDateString('pt-PT') : '—'}</td>
                  <td className="p-4 text-center">
                    {licenca.status === 'ativa' ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Ativa</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">{licenca.status}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => copiarChave(licenca.chave)} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30" title="Copiar chave">
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => abrirModal(licenca)}
                        className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition"
                        title="Renovar/Actualizar Licença"
                      >
                        <RefreshCw size={14} />
                      </button>
                      {licenca.status === 'ativa' && (
                        <button onClick={() => revogarLicenca(licenca.chave)} disabled={actionLoading === licenca.chave} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30" title="Revogar">
                          {actionLoading === licenca.chave ? <Loader2 className="animate-spin" size={14} /> : <Power size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Renovação de Licença */}
      {modalAberto && licencaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Renovar/Actualizar Licença</h3>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Cliente:</span>{' '}
                  <span className="text-white">{licencaSelecionada.email}</span>
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Chave:</span>{' '}
                  <span className="text-yellow-400 font-mono text-xs">{licencaSelecionada.chave}</span>
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Plano actual:</span>{' '}
                  <span className="text-white">{licencaSelecionada.plano}</span>
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
                    Novo Plano *
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
                    {renewLoading ? 'A actualizar...' : 'Actualizar Licença'}
                  </button>
                </div>
              </form>

              <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg">
                <p className="text-xs text-yellow-400">
                  ⚠️ Esta acção renova a licença sem necessidade de novo cadastro.
                  Os módulos do plano seleccionado serão activados automaticamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutAdmin>
  );
};

export default Licencas;