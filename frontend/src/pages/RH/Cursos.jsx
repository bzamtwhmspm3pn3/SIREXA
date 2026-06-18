import RHListPage from "./RHListPage";

const columns = [
  { key: "nome", label: "Curso" },
  { key: "categoria", label: "Categoria", align: "center" },
  { key: "cargaHoraria", label: "Carga Horária", align: "center" },
  { key: "dataInicio", label: "Início", render: (item) => item.dataInicio ? new Date(item.dataInicio).toLocaleDateString() : "—" },
  { key: "status", label: "Status", align: "center", render: (item) => {
    const cores = { Planeado: "text-gray-400", EmAndamento: "text-yellow-400", Concluido: "text-green-400", Cancelado: "text-red-400" };
    return <span className={`px-2 py-1 rounded-full text-xs ${cores[item.status] || ""}`}>{item.status}</span>;
  }},
];

const formFields = [
  { key: "nome", label: "Nome do Curso" },
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "tipo", label: "Tipo", type: "select", options: [
    { value: "Presencial", label: "Presencial" }, { value: "Online", label: "Online" },
    { value: "Workshop", label: "Workshop" }, { value: "Seminario", label: "Seminário" }
  ]},
  { key: "categoria", label: "Categoria", type: "select", options: [
    { value: "Tecnica", label: "Técnica" }, { value: "Comportamental", label: "Comportamental" },
    { value: "Gestao", label: "Gestão" }, { value: "Idiomas", label: "Idiomas" }
  ]},
  { key: "cargaHoraria", label: "Carga Horária", type: "number" },
  { key: "nivel", label: "Nível", type: "select", options: [
    { value: "Basico", label: "Básico" }, { value: "Intermediario", label: "Intermediário" }, { value: "Avancado", label: "Avançado" }
  ]},
  { key: "instituicao", label: "Instituição" },
  { key: "instrutor", label: "Instrutor" },
  { key: "dataInicio", label: "Data de Início" },
  { key: "dataFim", label: "Data de Fim" },
  { key: "custo", label: "Custo (Kz)", type: "number" },
  { key: "vagas", label: "Vagas", type: "number" },
];

const Cursos = () => (
  <RHListPage title="Cursos e Formações" endpoint="cursos" columns={columns} formFields={formFields} emptyMessage="Nenhum curso cadastrado" />
);
export default Cursos;
