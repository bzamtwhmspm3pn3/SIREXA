import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import EmpresaSelector from "../../components/EmpresaSelector";
import { Users, Briefcase, GraduationCap, CalendarCheck, TrendingUp, AlertTriangle, Gavel, Target, Shield, GitBranch, ClipboardList, BarChart3, Building2, Loader2 } from "lucide-react";
import API_URL from "../../config/api";

const modules = [
  { key: "recrutamento", nome: "Recrutamento e Selecção", icon: Briefcase, bg: "bg-blue-600/20", color: "text-blue-400", desc: "Vagas, candidaturas, entrevistas", rota: "/rh/recrutamento" },
  { key: "formacao", nome: "Formação e Desenvolvimento", icon: GraduationCap, bg: "bg-green-600/20", color: "text-green-400", desc: "Cursos, certificações, inscrições", rota: "/rh/formacao" },
  { key: "feriasLicencas", nome: "Férias e Licenças", icon: CalendarCheck, bg: "bg-purple-600/20", color: "text-purple-400", desc: "Pedidos, saldos, aprovações", rota: "/rh/ferias-licencas" },
  { key: "carreira", nome: "Carreira e Promoções", icon: TrendingUp, bg: "bg-yellow-600/20", color: "text-yellow-400", desc: "Planos de carreira, promoções, sucessão", rota: "/rh/carreira" },
  { key: "cargos", nome: "Cargos e Hierarquia", icon: Briefcase, bg: "bg-indigo-600/20", color: "text-indigo-400", desc: "Definição de cargos, níveis e salários", rota: "/rh/cargos" },
  { key: "disciplinar", nome: "Gestão Disciplinar", icon: Gavel, bg: "bg-red-600/20", color: "text-red-400", desc: "Advertências, sanções, processos", rota: "/rh/disciplinar" },
  { key: "competencias", nome: "Competências", icon: Target, bg: "bg-cyan-600/20", color: "text-cyan-400", desc: "Matriz de competências, gap analysis", rota: "/rh/competencias" },
  { key: "saudeSeguranca", nome: "Saúde e Segurança", icon: Shield, bg: "bg-orange-600/20", color: "text-orange-400", desc: "Exames, acidentes, EPIs", rota: "/rh/saude-seguranca" },
  { key: "workflow", nome: "Workflows e Aprovações", icon: GitBranch, bg: "bg-pink-600/20", color: "text-pink-400", desc: "Fluxos de aprovação configuráveis", rota: "/rh/workflow" }
];

const DashboardRH = () => {
  const navigate = useNavigate();
  const { user, isGestor, isTecnico, empresaId: userEmpresaId } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState("");
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (isTecnico() && userEmpresaId && !empresaSelecionada) {
      setEmpresaSelecionada(userEmpresaId);
    }
  }, [isTecnico, userEmpresaId, empresaSelecionada]);

  useEffect(() => { carregarEmpresas(); }, []);

  useEffect(() => {
    if (empresaSelecionada) {
      carregarDashboard();
    } else {
      setDados(null);
      setLoading(false);
    }
  }, [empresaSelecionada]);

  const carregarEmpresas = async () => {
    if (isTecnico()) { setLoadingEmpresas(false); return; }
    setLoadingEmpresas(true);
    try {
      const response = await fetch(`${API_URL}/empresa`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const empresasList = Array.isArray(data) ? data : [];
      setEmpresas(empresasList);
      const empresaPadrao = empresasList[0]?._id || user?.empresaId;
      if (empresaPadrao && !empresaSelecionada) {
        setEmpresaSelecionada(empresaPadrao);
      }
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const carregarDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/rh/dashboard?empresaId=${empresaSelecionada}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.sucesso) setDados(data.dados);
      }
    } catch (error) {
      console.error("Erro ao carregar dashboard RH:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingEmpresas) {
    return (
      <Layout title="Recursos Humanos" showBackButton backToRoute="/menu">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-blue-400" size={40} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Recursos Humanos" showBackButton backToRoute="/menu">
      <div className="space-y-6">
        <EmpresaSelector
          empresas={empresas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          onRefresh={carregarDashboard}
          loading={loadingEmpresas}
        />

        {!empresaSelecionada ? (
          <div className="bg-gray-800 rounded-2xl p-12 text-center">
            <Building2 className="mx-auto mb-4 text-gray-500" size={48} />
            <p className="text-gray-400 text-lg">
              {isTecnico() ? "Carregando sua empresa..." : "Selecione uma empresa"}
            </p>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Carregando...</div>
            ) : dados && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-5 border border-blue-500/30">
                  <p className="text-blue-300 text-sm">Total Funcionários</p>
                  <p className="text-3xl font-bold text-white">{dados.totalFuncionarios}</p>
                </div>
                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-5 border border-green-500/30">
                  <p className="text-green-300 text-sm">Custo Salarial (mês)</p>
                  <p className="text-xl font-bold text-green-400">{dados.custoSalarial?.toLocaleString()} Kz</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 rounded-2xl p-5 border border-yellow-500/30">
                  <p className="text-yellow-300 text-sm">Absentismo</p>
                  <p className="text-3xl font-bold text-yellow-400">{dados.taxaAbsentismo}%</p>
                </div>
                <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-2xl p-5 border border-red-500/30">
                  <p className="text-red-300 text-sm">Turnover</p>
                  <p className="text-3xl font-bold text-red-400">{dados.turnover}%</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map(mod => (
                <button
                  key={mod.key}
                  onClick={() => navigate(mod.rota)}
                  className="bg-gray-800 hover:bg-gray-750 rounded-2xl p-5 border border-gray-700 text-left transition text-white"
                >
                  <div className={`w-12 h-12 rounded-xl ${mod.bg} flex items-center justify-center mb-3`}>
                    <mod.icon className={`w-6 h-6 ${mod.color}`} />
                  </div>
                  <h3 className="font-semibold mb-1">{mod.nome}</h3>
                  <p className="text-gray-400 text-sm">{mod.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default DashboardRH;
