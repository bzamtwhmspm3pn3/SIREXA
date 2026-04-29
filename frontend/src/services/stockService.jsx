// services/stockService.js
const BASE_URL = 'https://sirexa-api.onrender.com/api/stock';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const buscarStock = async (search = '', page = 1, limit = 100) => {
  const params = new URLSearchParams({ search, page, limit });
  const response = await fetch(`${BASE_URL}?${params}`, { headers: getHeaders() });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data.dados;
};

export const buscarEstatisticas = async () => {
  const response = await fetch(`${BASE_URL}/stats`, { headers: getHeaders() });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data.dados;
};

export const adicionarProduto = async (produto) => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(produto)
  });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data;
};

export const atualizarProduto = async (id, produto) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(produto)
  });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data;
};

export const removerProduto = async (id) => {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data;
};

export const buscarPorCodigoBarras = async (codigo) => {
  const response = await fetch(`${BASE_URL}/por-codigo-barras/${codigo}`, {
    headers: getHeaders()
  });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data.dados;
};

export const ajustarEstoque = async (id, quantidade, tipo, motivo = '') => {
  const response = await fetch(`${BASE_URL}/${id}/ajustar-estoque`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ quantidade, tipo, motivo })
  });
  const data = await response.json();
  if (!data.sucesso) throw new Error(data.mensagem);
  return data;
};