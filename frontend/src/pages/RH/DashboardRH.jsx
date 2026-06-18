import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Layout from "../../components/Layout";
import { Users, Briefcase, GraduationCap, CalendarCheck, TrendingUp, AlertTriangle, Gavel, Target, Shield, GitBranch, ClipboardList, BarChart3 } from "lucide-react";
import API_URL from "../../config/api";

const modules = [
  { key: "recrutamento", nome: "Recrutamento e Selecção", icon: Briefcase, cor: "blue", desc: "Vagas, candidaturas, entrevistas", rota: "/rh/recrutamento" },
  { key: "formacao", nome: "Formação e Desenvolvimento", icon: GraduationCap, cor: "green", desc: "Cursos, certificações, inscrições", rota: "/rh/formacao" },
  { key: "feriasLicencas", nome: "Férias e Licenças", icon: CalendarCheck, cor: "purple", desc: "Pedidos, saldos, aprovações", rota: "/rh/ferias-licencas" },
  { key: "carreira", nome: "Carreira e Promoções", icon: TrendingUp, cor: "yellow", desc: "Planos de carreira, promoções, sucessão", rota: "/rh/carreira" },
  { key: "disciplinar", nome: "Gestão Disciplinar", icon: Gavel, cor: "red", desc: "Advertências, sanções, processos", rota: "/rh/disciplinar" },
  { key: "competencias", nome: "Competências", icon: Target, cor: "cyan", desc: "Matriz de competências, gap analysis", rota: "/rh/competencias" },
  { key: "saudeSeguranca", nome: "Saúde e Segurança", icon: Shield, cor: "orange", desc: "Exames, acidentes, EPIs", rota: "/rh/saude-seguranca" },
  { key: "workflow", nome: "Workflows e Aprovações", icon: GitBranch, cor: "pink", desc: "Fluxos de aprovação configuráveis", rota: "/rh/workflows" }
];

const DashboardRH = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      const empresaId = user?.empresaId || localStorage.getItem("empresaId");
      const response = await fetch(`${API_URL}/rh/dashboard?empresaId=${empresaId}`, {
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

  return (
    <Layout title="Recursos Humanos" showBackButton backToRoute="/menu">
      <div className="space-y-6">
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
              <div className={`w-12 h-12 rounded-xl bg-${mod.cor}-600/20 flex items-center justify-center mb-3`}>
                <mod.icon className={`text-${mod.cor}-400`} size={24} />
              </div>
              <h3 className="font-semibold">{mod.nome}</h3>
              <p className="text-sm text-gray-400 mt-1">{mod.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardRH;
