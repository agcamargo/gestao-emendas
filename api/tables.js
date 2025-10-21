// /api/tables.js
import { createClient } from '@supabase/supabase-js';

const uniqueBy = (arr, key) => [...new Map(arr.filter(Boolean).map(item => [item[key], item])).values()];

export default async function handler(req, res) {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
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

            // --- CASCATA DE FILTROS CORRIGIDA ---
            // A ordem importa: o mais específico (que precisa de mais IDs) vem primeiro.

            // 2. Busca Atividades (REQUER Unidade, Função E Programa)
            if (unidadeId && funcaoId && programaId) {
                const { data, error } = await supabase
                    .from('despesas')
                    .select('atividades (*)')
                    .eq('unidade_id', unidadeId)
                    .eq('funcao_id', funcaoId)
                    .eq('programa_id', programaId); // Filtra pela cadeia completa
                if (error) throw error;
                return res.status(200).json(uniqueBy(data.map(d => d.atividades), 'id'));
            }
            
            // 3. Busca Subfunções/Programas (REQUER Unidade E Função)
            if (unidadeId && funcaoId) {
                const { data, error } = await supabase
                    .from('despesas')
                    .select('programas (*), subfuncoes (*)')
                    .eq('unidade_id', unidadeId)
                    .eq('funcao_id', funcaoId); // Filtra pela cadeia completa
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
            // --- FIM DA CASCATA ---

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