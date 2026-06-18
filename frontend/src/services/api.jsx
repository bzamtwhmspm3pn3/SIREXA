import axios from "axios";
import API_URL from "../config/api";

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para enviar token com cada requisição protegida
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
