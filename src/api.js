import axios from 'axios';

const api = axios.create({
 baseURL: '/api', // A Vercel entende isso automaticamente
});

// Busca dados de uma tabela genérica
export const fetchData = (tableName) => api.get(`/${tableName}`);

// Atualiza um item
export const updateData = (tableName, id, data) => api.put(`/${tableName}/${id}`, data);

// --- NOVAS FUNÇÕES DE FILTRAGEM ---
export const fetchFuncoesPorUnidade = (unidadeId) => api.get(`/unidades/${unidadeId}/funcoes`);
export const fetchSubgruposPorFuncao = (unidadeId, funcaoId) => api.get(`/unidades/${unidadeId}/funcoes/${funcaoId}/subgrupos`);

export default api;