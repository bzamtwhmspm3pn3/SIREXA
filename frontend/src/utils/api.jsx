// Configuração base para requisições
const API_URL = 'http://localhost:5000/api';

// Função para fazer requisições autenticadas
export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
  
  // Se não autorizado, redirecionar para login
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Sessão expirada');
  }
  
  return response;
};

// Função específica para empresas
export const getEmpresas = async () => {
  const response = await apiRequest('/empresa');
  return response.json();
};

export const deleteEmpresa = async (id) => {
  const response = await apiRequest(`/empresa/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};