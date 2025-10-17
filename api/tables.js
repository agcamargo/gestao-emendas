// /api/tables.js
import { createClient } from '@supabase/supabase-js';

const uniqueBy = (arr, key) => {
    return [...new Map(arr.map(item => [item[key], item])).values()];
};

export default async function handler(req, res) {
    // --- CORREÇÃO APLICADA AQUI ---
    // A conexão é criada dentro da função, garantindo que seja sempre nova.
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // --- FIM DA CORREÇÃO ---

    const { name, unidadeId, funcaoId } = req.query;

    try {
        if (unidadeId && funcaoId) {
            const { data, error } = await supabase.from('despesas').select('subfuncoes (*), programas (*)').eq('unidade_id', unidadeId).eq('funcao_id', funcaoId);
            if (error) throw error;
            const subfuncoes = uniqueBy(data.map(d => d.subfuncoes).filter(Boolean), 'id');
            const programas = uniqueBy(data.map(d => d.programas).filter(Boolean), 'id');
            return res.status(200).json({ subfuncoes, programas });
        }
        
        if (unidadeId) {
            const { data, error } = await supabase.from('despesas').select('funcoes (*)').eq('unidade_id', unidadeId);
            if (error) throw error;
            const funcoes = uniqueBy(data.map(d => d.funcoes).filter(Boolean), 'id');
            return res.status(200).json(funcoes);
        }

        if (name) {
            const { data, error } = await supabase.from(name).select('*').order('codigo'); // Adicionado 'order' para consistência
            if (error) throw error;
            return res.status(200).json(data);
        }

        return res.status(400).json({ error: 'Parâmetro de busca inválido.' });

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ error: 'Falha ao buscar dados.', details: error.message });
    }
}