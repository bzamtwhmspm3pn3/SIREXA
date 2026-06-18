import RHListPage from "./RHListPage";

const columns = [
  { key: "titulo", label: "Vaga" },
  { key: "departamento", label: "Departamento" },
  { key: "tipoContrato", label: "Tipo Contrato", align: "center" },
  { key: "status", label: "Status", align: "center", render: (item) => {
    const cores = { Aberta: "text-green-400", Pausada: "text-yellow-400", Fechada: "text-red-400", Cancelada: "text-gray-400" };
    return <span className={`px-2 py-1 rounded-full text-xs bg-opacity-20 ${cores[item.status] || "text-gray-400"}`}>{item.status}</span>;
  }},
  { key: "vagasDisponiveis", label: "Vagas", align: "center" },
];

const formFields = [
  { key: "titulo", label: "Título da Vaga" },
  { key: "departamento", label: "Departamento" },
  { key: "local", label: "Local" },
  { key: "tipoContrato", label: "Tipo de Contrato", type: "select", options: [
    { value: "Efetivo", label: "Efetivo" }, { value: "Estagio", label: "Estágio" },
    { value: "TermoCerto", label: "Termo Certo" }, { value: "PrestacaoServicos", label: "Prestação de Serviços" }
  ]},
  { key: "regime", label: "Regime", type: "select", options: [
    { value: "Presencial", label: "Presencial" }, { value: "Remoto", label: "Remoto" }, { value: "Hibrido", label: "Híbrido" }
  ]},
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "requisitos", label: "Requisitos", type: "textarea" },
  { key: "salarioMin", label: "Salário Mínimo", type: "number" },
  { key: "salarioMax", label: "Salário Máximo", type: "number" },
  { key: "vagasDisponiveis", label: "Nº Vagas", type: "number" },
  { key: "dataFecho", label: "Data de Fecho" },
  { key: "prioridade", label: "Prioridade", type: "select", options: [
    { value: "Baixa", label: "Baixa" }, { value: "Media", label: "Média" },
    { value: "Alta", label: "Alta" }, { value: "Urgente", label: "Urgente" }
  ]},
];

const Vagas = () => (
  <RHListPage title="Vagas de Emprego" endpoint="vagas" columns={columns} formFields={formFields} emptyMessage="Nenhuma vaga cadastrada" />
);
export default Vagas;
