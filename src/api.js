// /src/api.js
import axios from 'axios';

/**
 * Busca dados genéricos (tabelas completas).
 * Chama: GET /api/tables?name=<tableName>
 */
export const fetchData = (tableName) => {
    return axios.get(`/api/tables?name=${tableName}`);
};

/**
 * Busca Funções filtradas por um ID de Unidade.
 * Chama: GET /api/tables?unidadeId=<unidadeId>
 */
export const fetchFuncoesPorUnidade = (unidadeId) => {
    return axios.get(`/api/tables?unidadeId=${unidadeId}`);
};

/**
 * CORRIGIDO: Busca Subfunções E Programas filtrados por Unidade E Função.
 * Chama: GET /api/tables?unidadeId=...&funcaoId=...
 */
export const fetchSubgruposPorFuncao = (unidadeId, funcaoId) => {
    // Agora passa ambos os IDs para o backend
    return axios.get(`/api/tables?unidadeId=${unidadeId}&funcaoId=${funcaoId}`);
};

/**
 * CORRIGIDO: Busca Atividades filtradas por Unidade, Função E Programa.
 * Chama: GET /api/tables?unidadeId=...&funcaoId=...&programaId=...
 */
export const fetchAtividadesPorPrograma = (unidadeId, funcaoId, programaId) => {
    // Agora passa todos os IDs da cadeia
    return axios.get(`/api/tables?unidadeId=${unidadeId}&funcaoId=${funcaoId}&programaId=${programaId}`);
};

/**
 * Atualiza um registro.
 * Chama: PUT /api/tables?name=<tableName>&id=<id>
 */
export const updateData = (tableName, id, data) => {
    return axios.put(`/api/tables?name=${tableName}&id=${id}`, data);
};

/**
 * Busca o valor de uma dotação específica com base em todos os IDs.
 * Chama: GET /api/tables?unidadeId=...&funcaoId=...&programaId=...&atividadeId=...&categoriaId=...
 */
export const fetchValorDotacao = (ids) => {
    const { unidadeId, funcaoId, programaId, atividadeId, categoriaId } = ids;
    
    if (!unidadeId || !funcaoId || !programaId || !atividadeId || !categoriaId) {
        return Promise.resolve({ data: { valor: null } }); 
    }
    
    return axios.get(`/api/tables?unidadeId=${unidadeId}&funcaoId=${funcaoId}&programaId=${programaId}&atividadeId=${atividadeId}&categoriaId=${categoriaId}`);
};