# 🚀 SIREXA - Plataforma Integrada

![SIREXA](frontend/src/assets/sirexa-logo.ico)

**Sistema Corporativo de Gestão Empresarial com Integração Inteligente e Automática**

---

## 📋 Sobre o Projeto

O **SIREXA** é uma plataforma completa de gestão empresarial desenvolvida para centralizar e automatizar todos os processos corporativos. Com **13+ integrações automáticas** entre módulos, o sistema elimina retrabalho manual e garante dados consistentes em tempo real.

### 🎯 Funcionalidades Principais

| Módulo | Funcionalidades |
|--------|----------------|
| 🏢 **Administração** | Gestão de Empresas, Técnicos, Fornecedores |
| 🛒 **Operacional** | Vendas, Stock, Facturação |
| 👥 **Recursos Humanos** | Funcionários, Folha Salarial, Gestão de Faltas, Abonos, Avaliação |
| 🚗 **Gestão Patrimonial** | Viaturas, Abastecimentos, Manutenções, Inventário |
| 💰 **Financeiro** | Fluxo de Caixa, Conta Corrente, Controlo de Pagamentos, Custos/Receitas, Orçamentos, DRE, Indicadores, Transferências, Reconciliação Bancária |
| 📊 **Relatórios** | Relatórios, Gráficos, Análise Geral |

---

## 🔗 Integrações Automáticas (13+)

| # | Origem → Destino | Ação |
|---|-----------------|------|
| 1 | Vendas → Estoque | Baixa automática de stock |
| 2 | Vendas → Fluxo de Caixa | Registro de receitas |
| 3 | Vendas → Conta Corrente | Atualização de saldo de clientes |
| 4 | Fornecedores → Conta Corrente | Registro de créditos |
| 5 | Pagamentos → Conta Corrente | Baixa de débitos |
| 6 | Folha Salarial → Fluxo de Caixa | Despesa com pessoal |
| 7 | Abastecimentos → Fluxo de Caixa | Despesa operacional |
| 8 | Manutenções → Fluxo de Caixa | Despesa patrimonial |
| 9 | Orçamentos → DRE | Comparativo Real vs Orçado |
| 10 | Todos Módulos → Relatórios | Dashboards automáticos |
| 11 | Fluxo de Caixa → DRE | Demonstração de Resultados |
| 12 | Transferências → Reconciliação | Sincronização automática |
| 13 | Custos/Receitas → Indicadores | KPIs financeiros |

---

## 🛠 Stack Tecnológica

### Frontend
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide-Icons-6366F1)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)

---

## 🚀 Instalação e Execução

### Pré-requisitos
- **Node.js** (v18 ou superior)
- **MongoDB** (v8 ou superior)
- **npm** ou **yarn**

### 1. Clonar o repositório
```bash
git clone https://github.com/bzamtwhmspm3pn3/SIREXA.git
cd SIREXA
2. Configurar o Backend
bash
cd backend
npm install
Criar arquivo .env:

env
PORT=5000
JWT_SECRET=sua-chave-secreta-aqui
DB_URI=mongodb://localhost:27017/sirexa
Iniciar o servidor:

bash
npm start
# ou para desenvolvimento:
npm run dev
3. Configurar o Frontend
bash
cd ../frontend
npm install
npm run dev
O sistema estará disponível em: http://localhost:5173

👥 Tipos de Usuários
Tipo	Descrição	Acessos
👑 Gestor	Administrador do sistema	Todos os módulos e funcionalidades
🔧 Técnico	Usuário com permissões específicas	Apenas módulos atribuídos pelo Gestor
📁 Estrutura do Projeto
text
SIREXA/
├── frontend/                   # Aplicação React + Vite
│   ├── public/                 # Arquivos estáticos
│   │   ├── index.html          # Página principal
│   │   └── sirexa-logo.ico     # Logo SIREXA
│   └── src/
│       ├── assets/             # Imagens e recursos
│       ├── components/         # Componentes reutilizáveis
│       │   ├── Layout.jsx      # Layout principal com sidebar
│       │   └── ProtectedRoute.jsx
│       ├── contexts/           # Contextos React
│       │   └── AuthContext.jsx # Contexto de autenticação
│       └── pages/              # Páginas do sistema
│           ├── Login.jsx       # Tela de login
│           ├── Menu.jsx        # Menu principal
│           ├── Sobre.jsx       # Sobre o sistema
│           ├── Gestor/         # Páginas do gestor
│           ├── Tecnico/        # Páginas do técnico
│           ├── Empresa/        # Gestão de empresas
│           ├── Funcionarios/   # Gestão de funcionários
│           └── ...             # Demais módulos
├── backend/                    # API REST + Node.js
│   ├── middlewares/            # Middlewares (auth, security)
│   ├── models/                 # Modelos MongoDB
│   ├── routes/                 # Rotas da API
│   ├── scripts/                # Scripts utilitários
│   └── server.js               # Servidor principal
└── README.md                   # Este arquivo
👨‍💻 Desenvolvedor
Nome	Venâncio Elavoco Cassova Martins
Título	Pesquisador em Economia & Cientista de Dados
Localização	Huambo, Angola
Email	venanciomartinse@gmail.com
Telefone	+244 928 565 837
LinkedIn	Venâncio Martins
GitHub	bzamtwhmspm3pn3
🏆 Premiação
Prêmio Nacional de Ciência e Inovação 2025 — Categoria Jovem Inventor (FUNDECIT e MESCTI)

📄 Licença
© 2026 SIREXA — Plataforma Integrada. Todos os direitos reservados.

Desenvolvido por Venâncio Martins para o ecossistema empresarial angolano 🇦🇴
