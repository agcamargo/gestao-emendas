// /api/tables.js
import { createClient } from '@supabase/supabase-js';

const uniqueBy = (arr, key) => [...new Map(arr.filter(Boolean).map(item => [item[key], item])).values()];

function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
        throw new Error(`Variáveis ausentes. URL: ${url ? 'OK' : 'FALTANDO'}, KEY: ${key ? 'OK' : 'FALTANDO'}`);
    }

    const cleanUrl = url.trim().replace(/\/$/, ''); // remove espaços e barra final
    const cleanKey = key.trim();

    // Valida formato da URL
    if (!cleanUrl.startsWith('https://') || !cleanUrl.includes('.supabase.co')) {
        throw new Error(`SUPABASE_URL com formato inválido: "${cleanUrl}"`);
    }

    console.log(`Conectando ao Supabase: ${cleanUrl}`);
    return createClient(cleanUrl, cleanKey);
}

export default async function handler(req, res) {
    let supabase;
    try {
        supabase = getSupabaseClient();
    } catch (configError) {
        console.error('Erro de configuração:', configError.message);
        return res.status(500).json({ error: 'Erro de configuração.', details: configError.message });
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

            if (unidadeId && funcaoId && programaId && atividadeId && categoriaId) {
                const { data, error } = await supabase
                    .from('despesas').select('valor')
                    .eq('unidade_id', unidadeId).eq('funcao_id', funcaoId)
                    .eq('programa_id', programaId).eq('atividade_id', atividadeId)
                    .eq('categoria_id', categoriaId).maybeSingle();
                if (error) throw error;
                return res.status(200).json(data ? { valor: data.valor } : { valor: null });
            }

            if (unidadeId && funcaoId && programaId) {
                const { data, error } = await supabase
                    .from('despesas').select('atividades (*)')
                    .eq('unidade_id', unidadeId).eq('funcao_id', funcaoId).eq('programa_id', programaId);
                if (error) throw error;
                return res.status(200).json(uniqueBy(data.map(d => d.atividades), 'id'));
            }

            if (unidadeId && funcaoId) {
                const { data, error } = await supabase
                    .from('despesas').select('programas (*), subfuncoes (*)')
                    .eq('unidade_id', unidadeId).eq('funcao_id', funcaoId);
                if (error) throw error;
                return res.status(200).json({
                    programas: uniqueBy(data.map(d => d.programas), 'id'),
                    subfuncoes: uniqueBy(data.map(d => d.subfuncoes), 'id')
                });
            }

            if (unidadeId) {
                const { data, error } = await supabase
                    .from('despesas').select('funcoes (*)').eq('unidade_id', unidadeId);
                if (error) throw error;
                return res.status(200).json(uniqueBy(data.map(d => d.funcoes), 'id'));
            }

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
        // Log detalhado do erro completo
        console.error(`Erro na API /tables:`, {
            message: error.message,
            cause: error.cause?.message || 'sem causa',
            code: error.cause?.code || 'sem código',
            stack: error.stack?.split('\n')[1] || 'sem stack',
            query: req.query
        });
        res.status(500).json({
            error: 'Falha ao processar requisição.',
            details: error.message,
            cause: error.cause?.message || null,
            code: error.cause?.code || null
        });
    }
}
