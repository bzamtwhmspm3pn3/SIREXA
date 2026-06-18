const API_URL = import.meta.env.VITE_API_URL || 'https://sirexa-api.onrender.com/api';
export const BASE_URL = API_URL.replace(/\/api$/, '');
export default API_URL;
