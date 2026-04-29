// frontend/src/components/ConfiguracaoBanco.jsx - VERSAO CORRIGIDA
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Eye, Download, CreditCard, Building, CheckCircle, AlertCircle } from 'lucide-react';

const ConfiguracaoBanco = ({ isOpen, onClose, empresaId, onSalvar }) => {
  const [configuracoes, setConfiguracoes] = useState([]);
  const [configSelecionada, setConfigSelecionada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  
  const [formData, setFormData] = useState({
    nomeBanco: '',
    codigoBanco: '',
    colunas: [
      { nome: 'Nº', campoOrigem: 'numero', posicao: 1, obrigatorio: true },
      { nome: 'Beneficiário', campoOrigem: 'nome', posicao: 2, obrigatorio: true },
      { nome: 'IBAN', campoOrigem: 'iban', posicao: 3, obrigatorio: true },
      { nome: 'Valor (Kz)', campoOrigem: 'salarioLiquido', posicao: 4, obrigatorio: true }
    ],
    separador: ';',
    extensao: 'xlsx',
    ativo: true
  });

  const camposDisponiveis = [
    { id: 'numero', nome: 'Número Sequencial', tipo: 'auto' },
    { id: 'nome', nome: 'Nome do Funcionário', tipo: 'funcionario' },
    { id: 'iban', nome: 'IBAN', tipo: 'funcionario' },
    { id: 'nif', nome: 'NIF', tipo: 'funcionario' },
    { id: 'salarioBase', nome: 'Salário Base', tipo: 'funcionario' },
    { id: 'salarioLiquido', nome: 'Salário Líquido', tipo: 'funcionario' },
    { id: 'inss', nome: 'INSS', tipo: 'funcionario' },
    { id: 'irt', nome: 'IRT', tipo: 'funcionario' },
    { id: 'descricao', nome: 'Descrição', tipo: 'fixo', valorPadrao: 'Salário' },
    { id: 'mesReferencia', nome: 'Mês Referência', tipo: 'periodo' },
    { id: 'dataPagamento', nome: 'Data Pagamento', tipo: 'data' }
  ];

  const bancosPreDefinidos = [
    { nome: 'Banco Angolano de Investimentos', codigo: 'BAI', colunasPadrao: ['Nº', 'Beneficiário', 'IBAN', 'Valor (Kz)', 'NIF'] },
    { nome: 'Banco de Fomento Angola', codigo: 'BFA', colunasPadrao: ['Nº', 'Beneficiário', 'IBAN', 'Valor (Kz)', 'Descrição'] },
    { nome: 'Banco BIC', codigo: 'BIC', colunasPadrao: ['Nº', 'Beneficiário', 'IBAN', 'Valor (Kz)', 'Tipo Documento', 'Nº Documento'] },
    { nome: 'Banco Keve', codigo: 'KEVE', colunasPadrao: ['Nº', 'Nome', 'IBAN', 'Valor'] },
    { nome: 'Banco Sol', codigo: 'SOL', colunasPadrao: ['Nº', 'Beneficiário', 'IBAN', 'Valor', 'Referência'] },
    { nome: 'Banco Económico', codigo: 'ECONOMICO', colunasPadrao: ['Nº', 'Nome Completo', 'IBAN', 'Valor', 'NIF'] },
    { nome: 'Multiple Banco', codigo: 'MULTIPLE', colunasPadrao: ['Nº', 'Beneficiário', 'IBAN', 'Valor'] }
  ];

  useEffect(() => {
    if (isOpen && empresaId) {
      carregarConfiguracoes();
    }
  }, [isOpen, empresaId]);

  const carregarConfiguracoes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/configuracao-banco/listar?empresaId=${empresaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConfiguracoes(data);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarBancoPreDefinido = (banco) => {
    setFormData({
      ...formData,
      nomeBanco: banco.nome,
      codigoBanco: banco.codigo,
      colunas: banco.colunasPadrao.map((col, idx) => ({
        nome: col,
        campoOrigem: mapearCampoOrigem(col),
        posicao: idx + 1,
        obrigatorio: true
      }))
    });
  };

  const mapearCampoOrigem = (nomeColuna) => {
    const mapa = {
      'Nº': 'numero',
      'Beneficiário': 'nome',
      'Beneficiary': 'nome',
      'Nome': 'nome',
      'Nome Completo': 'nome',
      'IBAN': 'iban',
      'Valor': 'salarioLiquido',
      'Valor (Kz)': 'salarioLiquido',
      'Montante': 'salarioLiquido',
      'NIF': 'nif',
      'Documento': 'nif',
      'Tipo Documento': 'tipoDocumento',
      'Nº Documento': 'numeroDocumento',
      'Descrição': 'descricao',
      'Referência': 'referencia'
    };
    return mapa[nomeColuna] || 'nome';
  };

  const adicionarColuna = () => {
    setFormData({
      ...formData,
      colunas: [...formData.colunas, { nome: '', campoOrigem: '', posicao: formData.colunas.length + 1, obrigatorio: false }]
    });
  };

  const atualizarColuna = (index, campo, valor) => {
    const novasColunas = [...formData.colunas];
    novasColunas[index][campo] = valor;
    setFormData({ ...formData, colunas: novasColunas });
  };

  const removerColuna = (index) => {
    const novasColunas = formData.colunas.filter((_, i) => i !== index);
    novasColunas.forEach((col, i) => { col.posicao = i + 1; });
    setFormData({ ...formData, colunas: novasColunas });
  };

  const salvarConfiguracao = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/configuracao-banco/salvar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          empresaId,
          ...formData,
          ordemCampos: formData.colunas.map(c => c.nome)
        })
      });
      
      if (response.ok) {
        setMensagem({ texto: 'Configuração salva com sucesso!', tipo: 'sucesso' });
        setTimeout(() => setMensagem({ texto: '', tipo: '' }), 3000);
        await carregarConfiguracoes();
        if (onSalvar) onSalvar();
      } else {
        setMensagem({ texto: 'Erro ao salvar configuração', tipo: 'erro' });
      }
    } catch (error) {
      console.error('Erro:', error);
      setMensagem({ texto: 'Erro ao conectar ao servidor', tipo: 'erro' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CreditCard className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Configurar Ficheiro de Pagamento</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {mensagem.texto && (
            <div className={`p-3 rounded-lg flex items-center gap-2 ${mensagem.tipo === 'sucesso' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
              {mensagem.tipo === 'sucesso' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="text-sm">{mensagem.texto}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Banco</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white"
                onChange={(e) => {
                  const banco = bancosPreDefinidos.find(b => b.codigo === e.target.value);
                  if (banco) carregarBancoPreDefinido(banco);
                }}
                value={formData.codigoBanco}
              >
                <option value="">Selecione um banco pré-definido</option>
                {bancosPreDefinidos.map(banco => (
                  <option key={banco.codigo} value={banco.codigo}>{banco.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Banco</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={formData.nomeBanco}
                onChange={(e) => setFormData({...formData, nomeBanco: e.target.value})}
                placeholder="Ex: Banco Angolano de Investimentos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Código do Banco</label>
              <input
                type="text"
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={formData.codigoBanco}
                onChange={(e) => setFormData({...formData, codigoBanco: e.target.value.toUpperCase()})}
                placeholder="Ex: BAI, BFA, BIC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Formato do Ficheiro</label>
              <select
                className="w-full p-2 rounded bg-gray-700 text-white"
                value={formData.extensao}
                onChange={(e) => setFormData({...formData, extensao: e.target.value})}
              >
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-300">Estrutura do Ficheiro (Colunas)</label>
              <button
                onClick={adicionarColuna}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Coluna
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="p-2 text-left">Posição</th>
                    <th className="p-2 text-left">Nome da Coluna</th>
                    <th className="p-2 text-left">Campo de Origem</th>
                    <th className="p-2 text-center">Obrigatório</th>
                    <th className="p-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.colunas.map((col, idx) => (
                    <tr key={idx} className="border-t border-gray-700">
                      <td className="p-2 text-gray-400">{col.posicao}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          className="w-full p-1 rounded bg-gray-700 text-white text-sm"
                          value={col.nome}
                          onChange={(e) => atualizarColuna(idx, 'nome', e.target.value)}
                          placeholder="Ex: Beneficiário"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          className="w-full p-1 rounded bg-gray-700 text-white text-sm"
                          value={col.campoOrigem}
                          onChange={(e) => atualizarColuna(idx, 'campoOrigem', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {camposDisponiveis.map(campo => (
                            <option key={campo.id} value={campo.id}>{campo.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={col.obrigatorio}
                          onChange={(e) => atualizarColuna(idx, 'obrigatorio', e.target.checked)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removerColuna(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Eye size={14} />
              <span>Pré-visualização do ficheiro:</span>
            </p>
            <div className="mt-2 text-xs text-gray-500">
              {formData.colunas.filter(c => c.nome).length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {formData.colunas.filter(c => c.nome).map((col, i) => (
                    <span key={i} className="bg-gray-600 px-2 py-1 rounded">[{col.nome}]</span>
                  ))}
                </div>
              ) : (
                <span>Adicione colunas para ver a pré-visualização</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={salvarConfiguracao}
              disabled={loading || !formData.nomeBanco || !formData.codigoBanco}
              className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg font-semibold text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracaoBanco;