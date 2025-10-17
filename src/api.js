// /src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// --- CORREÇÃO APLICADA AQUI ---
// Agora todas as chamadas apontam para o nosso endpoint 'tables' com os parâmetros corretos.

export const fetchData = (tableName) => api.get(`/tables?name=${tableName}`);

export const fetchFuncoesPorUnidade = (unidadeId) => api.get(`/tables?unidadeId=${unidadeId}`);

export const fetchSubgruposPorFuncao = (unidadeId, funcaoId) => api.get(`/tables?unidadeId=${unidadeId}&funcaoId=${funcaoId}`);

// A função de update permanece, embora não seja usada no formulário principal.
export const updateData = (tableName, id, data) => api.put(`/tables?name=${tableName}&id=${id}`, data);

export default api;