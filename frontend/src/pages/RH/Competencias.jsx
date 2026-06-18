import RHListPage from "./RHListPage";

const columns = [
  { key: "nome", label: "Competência" },
  { key: "categoria", label: "Categoria" },
  { key: "nivelEsperado", label: "Nível Esperado" },
  { key: "certificacaoObrigatoria", label: "Cert. Obrigatória", align: "center", render: (item) => item.certificacaoObrigatoria ? "Sim" : "Não" },
];

const formFields = [
  { key: "nome", label: "Nome da Competência" },
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "categoria", label: "Categoria", type: "select", options: [
    { value: "Tecnica", label: "Técnica" }, { value: "Comportamental", label: "Comportamental" },
    { value: "Idiomas", label: "Idiomas" }, { value: "Lideranca", label: "Liderança" },
    { value: "Gestao", label: "Gestão" }, { value: "Digital", label: "Digital" }
  ]},
  { key: "nivelEsperado", label: "Nível Esperado", type: "select", options: [
    { value: "Basico", label: "Básico" }, { value: "Intermediario", label: "Intermediário" },
    { value: "Avancado", label: "Avançado" }, { value: "Expert", label: "Expert" }
  ]},
  { key: "certificacaoObrigatoria", label: "Certificação Obrigatória", type: "select", options: [
    { value: true, label: "Sim" }, { value: false, label: "Não" }
  ]},
];

const Competencias = () => (
  <RHListPage title="Gestão de Competências" endpoint="competencias" columns={columns} formFields={formFields} emptyMessage="Nenhuma competência cadastrada" />
);
export default Competencias;
