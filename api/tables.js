// /api/tables.js
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (use as variáveis de ambiente da Vercel)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Função auxiliar para remover duplicatas de um array de objetos por uma chave
const uniqueBy = (arr, key) => {
    return [...new Map(arr.map(item => [item[key], item])).values()];
};

export default async function handler(req, res) {
    // Pega os parâmetros da URL, ex: /api/tables?name=orgaos ou /api/tables?unidadeId=123
    const { name, unidadeId, funcaoId } = req.query;

    try {
        // --- LÓGICA DE FILTRO EM CASCATA ---
        if (unidadeId && funcaoId) { // Busca subfunções e programas
            const { data, error } = await supabase.from('despesas').select('subfuncoes (*), programas (*)').eq('unidade_id', unidadeId).eq('funcao_id', funcaoId);
            if (error) throw error;
            const subfuncoes = uniqueBy(data.map(d => d.subfuncoes).filter(Boolean), 'id');
            const programas = uniqueBy(data.map(d => d.programas).filter(Boolean), 'id');
            return res.status(200).json({ subfuncoes, programas });
        }
        
        if (unidadeId) { // Busca funções
            const { data, error } = await supabase.from('despesas').select('funcoes (*)').eq('unidade_id', unidadeId);
            if (error) throw error;
            const funcoes = uniqueBy(data.map(d => d.funcoes).filter(Boolean), 'id');
            return res.status(200).json(funcoes);
        }

        // --- LÓGICA PARA BUSCAR UMA TABELA COMPLETA ---
        if (name) {
            const { data, error } = await supabase.from(name).select('*');
            if (error) throw error;
            return res.status(200).json(data);
        }

        // Se nenhum parâmetro for válido
        return res.status(400).json({ error: 'Parâmetro de busca inválido.' });

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ error: 'Falha ao buscar dados.', details: error.message });
    }
}