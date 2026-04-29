// frontend/src/components/SelecionarContaDebito.jsx
import { useState, useEffect } from "react";
import { FaUniversity, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";

export default function SelecionarContaDebito({ empresaId, valorPagamento, onSelect, required = true }) {
  const [contas, setContas] = useState([]);
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [loading, setLoading] = useState(false);
  const [saldoInsuficiente, setSaldoInsuficiente] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const BASE_URL = "http://localhost:5000";
  
  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    if (empresaId) {
      buscarContas();
    }
  }, [empresaId]);

  const buscarContas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/pagamentos/contas-debito?empresaId=${empresaId}`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.sucesso) {
        setContas(data.dados);
        if (data.dados.length > 0) {
          const primeiraConta = data.dados[0];
          setContaSelecionada(primeiraConta.codNome);
          onSelect(primeiraConta.codNome, primeiraConta._id, primeiraConta.iban);
          if (valorPagamento && primeiraConta.saldoDisponivel < valorPagamento) {
            setSaldoInsuficiente(true);
            setMensagem(`Saldo insuficiente na conta ${primeiraConta.nome}`);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
      setMensagem("Erro ao carregar contas bancárias");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (e) => {
    const codNome = e.target.value;
    const conta = contas.find(c => c.codNome === codNome);
    if (conta) {
      setContaSelecionada(codNome);
      onSelect(codNome, conta._id, conta.iban);
      if (valorPagamento && conta.saldoDisponivel < valorPagamento) {
        setSaldoInsuficiente(true);
        setMensagem(`Saldo insuficiente na conta ${conta.nome}. Disponível: ${formatarNumero(conta.saldoDisponivel)} Kz`);
      } else {
        setSaldoInsuficiente(false);
        setMensagem("");
      }
    }
  };

  const formatarNumero = (numero) => {
    if (!numero && numero !== 0) return "0,00";
    return Number(numero).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-2">
      <label className="block mb-1 font-semibold text-gray-300">
        <FaUniversity className="inline mr-2" /> Conta Bancária para Débito {required && "*"}
      </label>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : contas.length === 0 ? (
        <div className="p-3 bg-yellow-900/30 rounded-lg border border-yellow-600">
          <p className="text-yellow-300 text-sm flex items-center gap-2">
            <FaExclamationTriangle size={16} /> Nenhuma conta bancária cadastrada.
          </p>
          <p className="text-yellow-300/70 text-xs mt-1">Cadastre uma conta em Configurações > Bancos</p>
        </div>
      ) : (
        <>
          <select
            value={contaSelecionada}
            onChange={handleSelect}
            className="w-full p-2 rounded bg-gray-700 text-white focus:ring-2 focus:ring-blue-500"
          >
            {contas.map((conta) => (
              <option key={conta.codNome} value={conta.codNome}>
                🏦 {conta.nome} - {conta.iban || "Sem IBAN"} | Saldo: {formatarNumero(conta.saldoDisponivel)} Kz
              </option>
            ))}
          </select>
          
          {saldoInsuficiente && (
            <div className="p-2 bg-red-900/30 rounded-lg border border-red-600">
              <p className="text-red-300 text-sm flex items-center gap-2">
                <FaExclamationTriangle size={14} /> {mensagem}
              </p>
            </div>
          )}
          
          {contaSelecionada && !saldoInsuficiente && valorPagamento && (
            <div className="p-2 bg-green-900/30 rounded-lg border border-green-600">
              <p className="text-green-300 text-sm flex items-center gap-2">
                <FaCheckCircle size={14} /> Saldo suficiente para o pagamento
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}