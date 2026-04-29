// Função para voltar ao menu operacional
export const voltarParaMenuOperacional = (navigate, location) => {
  // Se já estiver no menu, não faz nada
  if (location.pathname === "/menu" || location.pathname === "/") {
    return;
  }
  
  // Sempre vai para /menu
  navigate("/menu");
};

// Função para voltar à lista de empresas
export const voltarParaListaEmpresas = (navigate, location) => {
  if (location.pathname === "/empresa") {
    return;
  }
  navigate("/empresa");
};
