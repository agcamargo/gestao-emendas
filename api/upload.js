// /api/upload.js
import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import { formidable } from 'formidable';

export const config = { api: { bodyParser: false } };

function getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
        throw new Error(`Variáveis ausentes. URL: ${url ? 'OK' : 'FALTANDO'}, KEY: ${key ? 'OK' : 'FALTANDO'}`);
    }
    return createClient(url.trim().replace(/\/$/, ''), key.trim());
}

/**
 * O Excel converte automaticamente códigos no formato DD.MM.AA para datas.
 * Ex: "01.02.03" vira datetime(2001, 2, 3)
 * Esta função reverte essa conversão.
 */
function normalizeCellValue(val) {
    if (val === null || val === undefined) return null;

    // Caso 1: Excel converteu "01.02.03" para Date -> reverte para "01.02.03"
    if (val instanceof Date) {
        const year  = String(val.getFullYear() - 2000).padStart(2, '0');
        const month = String(val.getMonth() + 1).padStart(2, '0');
        const day   = String(val.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    }

    const str = String(val).trim();
    if (!str) return null;
    return str;
}

/**
 * Algumas células têm múltiplos valores separados por \n
 * Ex: "01\n01.01.01" contém o código do órgão E da unidade juntos.
 * Retorna array com todos os pares [codigo, descricao] encontrados.
 */
function parseOrgaoUnidadeCell(rawVal, rawDesc) {
    const val  = normalizeCellValue(rawVal);
    const desc = normalizeCellValue(rawDesc);
    if (!val) return [];

    const results = [];

    // Verifica se há quebra de linha na coluna de código ou descrição
    const codes = val.split('\n').map(s => s.trim()).filter(Boolean);
    const descs = desc ? desc.split('\n').map(s => s.trim()).filter(Boolean) : [];

    codes.forEach((code, i) => {
        results.push({
            codigo: code,
            descricao: descs[i] || descs[0] || ''
        });
    });

    return results;
}

export default async function handler(req, res) {
    let supabase;
    try {
        supabase = getSupabaseClient();
    } catch (configError) {
        console.error('Erro de configuração:', configError.message);
        return res.status(500).json({ error: 'Erro de configuração.', details: configError.message });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const qddFile = files.qddFile?.[0];
        if (!qddFile) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

        // Lê o xlsx sem conversão de datas para preservar os códigos originais
        const workbook = xlsx.readFile(qddFile.filepath, { cellDates: false, raw: false });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Converte para array de arrays (sem usar sheet_to_json para ter controle total)
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'dd.mm.yy' });

        // Remove linha de cabeçalho
        const dataRows = rows.slice(1);

        // Limpa tabela de despesas antes de reimportar
        await supabase.from('despesas').delete().neq('id', 0);

        let currentOrgaoId  = null;
        let currentUnidadeId = null;

        const cache = {
            orgaos: {}, unidades: {}, funcoes: {},
            subfuncoes: {}, programas: {}, atividades: {}, categorias: {}
        };

        const upsert = async (tabela, codigo, nome, extra = {}) => {
            if (cache[tabela][codigo]) return cache[tabela][codigo];
            const { data, error } = await supabase
                .from(tabela)
                .upsert({ codigo, nome, ...extra }, { onConflict: 'codigo' })
                .select('id')
                .single();
            if (error) throw new Error(`Erro ao salvar ${tabela} ${codigo}: ${error.message}`);
            cache[tabela][codigo] = data.id;
            return data.id;
        };

        let despesasInseridas = 0;
        let categoriaAtualId  = null;

        for (const row of dataRows) {
            // Colunas conforme o arquivo:
            // 0: Órgão Un. Orc/Exec
            // 1: Func/Sub/Prog Proj/Atividade
            // 2: Categoria Elemento
            // 3: Descrição
            // 7: Vl. Dotação

            const rawOrgUnid    = row[0];
            const rawFSP        = row[1];
            const rawCategoria  = row[2];
            const rawDescricao  = row[3];
            const rawValor      = row[7];

            const orgUnidVal    = rawOrgUnid  ? String(rawOrgUnid).trim()  : null;
            const fspVal        = rawFSP      ? String(rawFSP).trim()      : null;
            const categoriaVal  = rawCategoria ? String(rawCategoria).trim() : null;
            const descricaoVal  = rawDescricao ? String(rawDescricao).trim() : null;

            // --- Processa Órgão / Unidade ---
            if (orgUnidVal) {
                const entries = parseOrgaoUnidadeCell(orgUnidVal, descricaoVal);

                for (const entry of entries) {
                    const { codigo, descricao } = entry;

                    // Verifica se é órgão (sem ponto) ou unidade (com ponto)
                    if (!codigo.includes('.')) {
                        // É órgão
                        currentOrgaoId  = await upsert('orgaos', codigo, descricao || `Órgão ${codigo}`);
                        currentUnidadeId = null;
                    } else {
                        // É unidade
                        currentUnidadeId = await upsert('unidades', codigo, descricao || `Unidade ${codigo}`);
                    }
                }
            }

            // --- Processa Categoria ---
            if (categoriaVal && categoriaVal.includes('.') && descricaoVal) {
                categoriaAtualId = await upsert('categorias', categoriaVal, descricaoVal, { descricao: descricaoVal });
            }

            // --- Processa Despesa (linha completa com FSP + Categoria + Valor) ---
            if (fspVal && currentUnidadeId && rawValor !== null && rawValor !== undefined && rawValor !== '') {
                const parts = fspVal.split('.');
                if (parts.length === 4) {
                    const [funcCode, subFuncCode, progCode, ativCode] = parts;

                    // Valor: remove pontos de milhar e troca vírgula por ponto
                    const valorStr   = String(rawValor).replace(/\./g, '').replace(',', '.');
                    const valorFloat = parseFloat(valorStr);

                    if (!isNaN(valorFloat) && categoriaAtualId) {
                        const funcaoId    = await upsert('funcoes',    funcCode,    `Função ${funcCode}`);
                        const subfuncaoId = await upsert('subfuncoes', subFuncCode, `Subfunção ${subFuncCode}`);
                        const programaId  = await upsert('programas',  progCode,    `Programa ${progCode}`);
                        const atividadeId = await upsert('atividades', ativCode,    `Atividade ${ativCode}`);

                        const { error: insertError } = await supabase.from('despesas').insert({
                            orgao_id:     currentOrgaoId,
                            unidade_id:   currentUnidadeId,
                            funcao_id:    funcaoId,
                            subfuncao_id: subfuncaoId,
                            programa_id:  programaId,
                            atividade_id: atividadeId,
                            categoria_id: categoriaAtualId,
                            valor:        valorFloat
                        });

                        if (insertError) {
                            console.error('Erro ao inserir despesa:', insertError.message, { fspVal, categoriaVal, valorFloat });
                        } else {
                            despesasInseridas++;
                        }
                    }
                }
            }
        }

        res.status(200).json({
            message: `Arquivo processado com sucesso! ${despesasInseridas} despesas importadas.`
        });

    } catch (error) {
        console.error('Erro detalhado no upload:', error);
        res.status(500).json({ error: 'Falha ao processar o arquivo.', details: error.message });
    }
}
