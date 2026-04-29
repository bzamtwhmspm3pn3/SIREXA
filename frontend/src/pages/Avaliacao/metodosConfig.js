// src/pages/Avaliacao/metodosConfig.js
export const metodosComCriterios = {
  escalas_graficas: {
    nome: "Escalas Gráficas",
    descricao: "Avaliação baseada em fatores e intensidade escalar (1 a 5)",
    categoria: "Tradicionais",
    icon: "📊",
    categorias: [
      {
        id: "cat1",
        nome: "Produtividade",
        descricao: "Capacidade de produzir resultados dentro do prazo",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Cumprimento de prazos", descricao: "Entrega de tarefas no prazo estipulado", peso: 1 },
          { id: "crit2", nome: "Volume de trabalho", descricao: "Quantidade de trabalho executado", peso: 1 },
          { id: "crit3", nome: "Eficiência", descricao: "Uso otimizado de recursos", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Qualidade",
        descricao: "Excelência na execução das atividades",
        peso: 1,
        criterios: [
          { id: "crit4", nome: "Precisão", descricao: "Ausência de erros no trabalho", peso: 1 },
          { id: "crit5", nome: "Conformidade", descricao: "Adequação aos padrões estabelecidos", peso: 1 },
          { id: "crit6", nome: "Apresentação", descricao: "Organização e clareza do trabalho", peso: 1 }
        ]
      },
      {
        id: "cat3",
        nome: "Comportamento",
        descricao: "Atitudes e postura profissional",
        peso: 1,
        criterios: [
          { id: "crit7", nome: "Pontualidade", descricao: "Assiduidade e cumprimento de horários", peso: 1 },
          { id: "crit8", nome: "Colaboração", descricao: "Trabalho em equipe", peso: 1 },
          { id: "crit9", nome: "Iniciativa", descricao: "Proatividade e autonomia", peso: 1 }
        ]
      }
    ]
  },
  
  avaliacao_360: {
    nome: "Avaliação 360 Graus",
    descricao: "Feedback de superiores, pares, subordinados e autoavaliação",
    categoria: "Sistêmicos",
    icon: "🌐",
    categorias: [
      {
        id: "cat1",
        nome: "Liderança",
        descricao: "Capacidade de influenciar e guiar pessoas",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Visão estratégica", descricao: "Capacidade de antever cenários", peso: 1 },
          { id: "crit2", nome: "Tomada de decisão", descricao: "Decisões assertivas", peso: 1 },
          { id: "crit3", nome: "Delegação", descricao: "Distribuição adequada de tarefas", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Comunicação",
        descricao: "Habilidade de se expressar e ouvir",
        peso: 1,
        criterios: [
          { id: "crit4", nome: "Clareza", descricao: "Comunicação objetiva", peso: 1 },
          { id: "crit5", nome: "Escuta ativa", descricao: "Capacidade de ouvir", peso: 1 },
          { id: "crit6", nome: "Feedback", descricao: "Dar e receber feedback", peso: 1 }
        ]
      },
      {
        id: "cat3",
        nome: "Relacionamento Interpessoal",
        descricao: "Interação com colegas e equipe",
        peso: 1,
        criterios: [
          { id: "crit7", nome: "Empatia", descricao: "Compreensão do outro", peso: 1 },
          { id: "crit8", nome: "Respeito", descricao: "Tratamento respeitoso", peso: 1 },
          { id: "crit9", nome: "Conflitos", descricao: "Gestão de conflitos", peso: 1 }
        ]
      }
    ]
  },
  
  competencias_cha: {
    nome: "Competências CHA",
    descricao: "Conhecimento, Habilidade e Atitude",
    categoria: "Sistêmicos",
    icon: "🧠",
    categorias: [
      {
        id: "cat1",
        nome: "Conhecimento (Saber)",
        descricao: "Conhecimentos teóricos e técnicos",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Formação", descricao: "Conhecimento técnico da área", peso: 1 },
          { id: "crit2", nome: "Atualização", descricao: "Busca por atualização", peso: 1 },
          { id: "crit3", nome: "Procedimentos", descricao: "Conhecimento de processos", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Habilidade (Saber Fazer)",
        descricao: "Capacidade de executar tarefas",
        peso: 1,
        criterios: [
          { id: "crit4", nome: "Técnica", descricao: "Domínio das ferramentas", peso: 1 },
          { id: "crit5", nome: "Resolução", descricao: "Resolver problemas", peso: 1 },
          { id: "crit6", nome: "Adaptabilidade", descricao: "Adaptar-se a mudanças", peso: 1 }
        ]
      },
      {
        id: "cat3",
        nome: "Atitude (Querer Fazer)",
        descricao: "Disposição e comportamento",
        peso: 1,
        criterios: [
          { id: "crit7", nome: "Comprometimento", descricao: "Dedicação ao trabalho", peso: 1 },
          { id: "crit8", nome: "Proatividade", descricao: "Antecipar-se a necessidades", peso: 1 },
          { id: "crit9", nome: "Responsabilidade", descricao: "Assumir responsabilidades", peso: 1 }
        ]
      }
    ]
  },
  
  okrs: {
    nome: "OKRs",
    descricao: "Objetivos e Resultados-Chave com metas trimestrais",
    categoria: "Tendências",
    icon: "🎯",
    categorias: [
      {
        id: "cat1",
        nome: "Objetivos Qualitativos",
        descricao: "Metas de curto prazo",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Clareza do Objetivo", descricao: "Objetivo bem definido", peso: 1 },
          { id: "crit2", nome: "Alinhamento", descricao: "Alinhado à estratégia", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Resultados-Chave",
        descricao: "Métricas quantitativas",
        peso: 2,
        criterios: [
          { id: "crit3", nome: "Atingimento", descricao: "Percentual de alcance", peso: 2 },
          { id: "crit4", nome: "Desafio", descricao: "Nível de dificuldade", peso: 1 }
        ]
      }
    ]
  },
  
  avaliacao_objetivos: {
    nome: "Avaliação por Objetivos",
    descricao: "Baseada em metas quantitativas e percentual de alcance",
    categoria: "Modernos",
    icon: "🎯",
    categorias: [
      {
        id: "cat1",
        nome: "Metas Quantitativas",
        descricao: "Resultados numéricos",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Atingimento de metas", descricao: "Percentual de alcance", peso: 2 },
          { id: "crit2", nome: "Dificuldade", descricao: "Complexidade da meta", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Planos de Ação",
        descricao: "Execução das atividades planejadas",
        peso: 1,
        criterios: [
          { id: "crit3", nome: "Execução", descricao: "Cumprimento do plano", peso: 1 },
          { id: "crit4", nome: "Cronograma", descricao: "Respeito aos prazos", peso: 1 }
        ]
      }
    ]
  },
  
  autoavaliacao: {
    nome: "Autoavaliação",
    descricao: "Autopercepção de competências e conquistas",
    categoria: "Modernos",
    icon: "🪞",
    categorias: [
      {
        id: "cat1",
        nome: "Autopercepção",
        descricao: "Visão sobre o próprio desempenho",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Autoconhecimento", descricao: "Consciência de pontos fortes/fracos", peso: 1 },
          { id: "crit2", nome: "Honestidade", descricao: "Avaliação sincera", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Realizações",
        descricao: "Conquistas no período",
        peso: 1,
        criterios: [
          { id: "crit3", nome: "Resultados", descricao: "Entregas realizadas", peso: 1 },
          { id: "crit4", nome: "Desafios", descricao: "Superação de obstáculos", peso: 1 }
        ]
      }
    ]
  },
  
  feedback_continuo: {
    nome: "Feedback Contínuo",
    descricao: "Feedbacks semanais sobre obstáculos e prioridades",
    categoria: "Tendências",
    icon: "💬",
    categorias: [
      {
        id: "cat1",
        nome: "Progresso Semanal",
        descricao: "Acompanhamento semanal",
        peso: 1,
        criterios: [
          { id: "crit1", nome: "Entregas", descricao: "O que foi entregue", peso: 1 },
          { id: "crit2", nome: "Obstáculos", descricao: "Dificuldades encontradas", peso: 1 }
        ]
      },
      {
        id: "cat2",
        nome: "Desenvolvimento",
        descricao: "Crescimento profissional",
        peso: 1,
        criterios: [
          { id: "crit3", nome: "Aprendizado", descricao: "Novas habilidades", peso: 1 },
          { id: "crit4", nome: "Adaptação", descricao: "Resposta a mudanças", peso: 1 }
        ]
      }
    ]
  }
};

// Método padrão para quando não há configuração específica
export const metodoPadrao = {
  nome: "Avaliação Geral",
  descricao: "Avaliação baseada em critérios gerais de desempenho",
  categoria: "Geral",
  icon: "⭐",
  categorias: [
    {
      id: "cat1",
      nome: "Desempenho Geral",
      descricao: "Avaliação global do funcionário",
      peso: 1,
      criterios: [
        { id: "crit1", nome: "Produtividade", descricao: "Capacidade de produzir resultados", peso: 1 },
        { id: "crit2", nome: "Qualidade", descricao: "Excelência na execução", peso: 1 },
        { id: "crit3", nome: "Pontualidade", descricao: "Cumprimento de horários", peso: 1 },
        { id: "crit4", nome: "Trabalho em Equipe", descricao: "Colaboração com colegas", peso: 1 },
        { id: "crit5", nome: "Iniciativa", descricao: "Proatividade e autonomia", peso: 1 }
      ]
    }
  ]
};