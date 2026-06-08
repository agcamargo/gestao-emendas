// /api/tables.js
import { createClient } from '@supabase/supabase-js';

const uniqueBy = (arr, key) => [...new Map(arr.filter(Boolean).map(item => [item[key], item])).values()];

function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
        throw new Error(`Variáveis de ambiente ausentes. SUPABASE_URL: ${url ? 'OK' : 'FALTANDO'}, SUPABASE_SERVICE_KEY: ${key ? 'OK' : 'FALTANDO'}`);
    }

    return createClient(url.trim(), key.trim());
}

export default async function handler(req, res) {
    let supabase;
    try {
        supabase = getSupabaseClient();
    } catch (configError) {
        console.error('Erro de configuração:', configError.message);
        return res.status(500).json({ error: 'Erro de configuração do servidor.', details: configError.message });
    }

    const { name, unidadeId, funcaoId, programaId, atividadeId, categoriaId, id } = req.query;

    try {
        if (req.method === 'PUT') {
            if (!name || !id) return res.status(400).json({ error: 'Nome da tabela e ID são obrigatórios.' });
            const { data, error } = await supabase.from(name).update(req.body).eq('id', id).select().single();
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (req.method === 'GET') {

            // 1. Busca de VALOR (requer todos os 5 IDs)
            if (unidadeId && funcaoId && programaId && atividadeId && categoriaId) {
                const { data, error } = await supabase
                    .from('despesas')
                    .select('valor')
                    .eq('unidade_id', unidadeId)
                    .eq('funcao_id', funcaoId)
                    .eq('programa_id', programaId)
                    .eq('atividade_id', atividadeId)
                    .eq('categoria_id', categoriaId)
                    .maybeSingle();

                if (error) throw error;
                return res.status(200).json(data ? { valor: data.valor } : { valor: null });
            }

            // 2. Busca Atividades (REQUER Unidade, Função E Programa)
            if (unidadeId && funcaoId && programaId) {
                const { data, error } = await supabase
                    .from('despesas')
                    .select('atividades (*)')
                    .eq('unidade_id', unidadeId)
                    .eq('funcao_id', funcaoId)
                    .eq('programa_id', programaId);
                if (error) throw error;
                return res.status(200).json(uniqueBy(data.map(d => d.atividades), 'id'));
            }

            // 3. Busca Subfunções/Programas (REQUER Unidade E Função)
            if (unidadeId && funcaoId) {
                const { data, error } = await supabase
                    .from('despesas')
                    .select('programas (*), subfuncoes (*)')
                    .eq('unidade_id', unidadeId)
                    .eq('funcao_id', funcaoId);
                if (error) throw error;
                const programas = uniqueBy(data.map(d => d.programas), 'id');
                const subfuncoes = uniqueBy(data.map(d => d.subfuncoes), 'id');
                return res.status(200).json({ programas, subfuncoes });
            }

            // 4. Busca Funções (REQUER Unidade)
            if (unidadeId) {
                const { data, error } = await supabase
                    .from('despesas')
                    .select('funcoes (*)')
                    .eq('unidade_id', unidadeId);
                if (error) throw error;
                return res.status(200).json(uniqueBy(data.map(d => d.funcoes), 'id'));
            }

            // 5. Busca Tabela Completa (ex: orgaos, categorias)
            if (name) {
                const { data, error } = await supabase.from(name).select('*').order('codigo');
                if (error) throw error;
                return res.status(200).json(data);
            }

            return res.status(400).json({ error: 'Parâmetro de busca inválido.' });
        }

        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Método ${req.method} não permitido.` });

    } catch (error) {
        console.error(`Erro na API /tables: ${error.message}`, req.query);
        res.status(500).json({ error: 'Falha ao processar requisição.', details: error.message });
    }
}
