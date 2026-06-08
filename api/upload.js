// /api/upload.js
import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import { formidable } from 'formidable';

export const config = { api: { bodyParser: false } };

const getCellValue = (row, key) => (row[key] ? String(row[key]).trim() : null);

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

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const qddFile = files.qddFile[0];
        if (!qddFile) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

        const workbook = xlsx.readFile(qddFile.filepath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        await supabase.from('despesas').delete().neq('id', 0);

        let currentOrgao = null, currentUnidade = null;
        const cacheIds = { orgaos: {}, unidades: {}, funcoes: {}, subfuncoes: {}, programas: {}, atividades: {}, categorias: {} };

        for (const row of data) {
            const orgaoUnidadeCodigo = getCellValue(row, 'Órgão Un. Orc/Exec');
            const descricaoGeral = getCellValue(row, 'Descrição');
            const fspCode = getCellValue(row, 'Func/Sub/Prog Proj/Atividade');
            const valorDotacaoStr = getCellValue(row, 'Vl. Dotação');
            const valorDotacao = valorDotacaoStr ? parseFloat(String(valorDotacaoStr).replace('.', '').replace(',', '.')) : null;
            const codigoCategoria = getCellValue(row, 'Categoria Elemento');
            const nomeCategoria = codigoCategoria ? descricaoGeral : null;

            let orgaoId = currentOrgao?.id, unidadeId = currentUnidade?.id;
            let funcaoId, subfuncaoId, programaId, atividadeId, categoriaId;

            if (orgaoUnidadeCodigo && descricaoGeral) {
                if (orgaoUnidadeCodigo.length <= 2) {
                    if (!cacheIds.orgaos[orgaoUnidadeCodigo]) {
                        const { data: orgao, error } = await supabase.from('orgaos').upsert({ codigo: orgaoUnidadeCodigo, nome: descricaoGeral }, { onConflict: 'codigo' }).select('id').single();
                        if (error) throw new Error(`Erro ao salvar órgão ${orgaoUnidadeCodigo}: ${error.message}`);
                        cacheIds.orgaos[orgaoUnidadeCodigo] = orgao.id;
                    }
                    orgaoId = cacheIds.orgaos[orgaoUnidadeCodigo];
                    currentOrgao = { id: orgaoId };
                } else if (orgaoUnidadeCodigo.includes('.')) {
                    if (!cacheIds.unidades[orgaoUnidadeCodigo]) {
                        const { data: unidade, error } = await supabase.from('unidades').upsert({ codigo: orgaoUnidadeCodigo, nome: descricaoGeral }, { onConflict: 'codigo' }).select('id').single();
                        if (error) throw new Error(`Erro ao salvar unidade ${orgaoUnidadeCodigo}: ${error.message}`);
                        cacheIds.unidades[orgaoUnidadeCodigo] = unidade.id;
                    }
                    unidadeId = cacheIds.unidades[orgaoUnidadeCodigo];
                    currentUnidade = { id: unidadeId };
                }
            }

            if (codigoCategoria && codigoCategoria.includes('.') && nomeCategoria) {
                if (!cacheIds.categorias[codigoCategoria]) {
                    const { data: cat, error } = await supabase.from('categorias').upsert({ codigo: codigoCategoria, nome: nomeCategoria, descricao: nomeCategoria }, { onConflict: 'codigo' }).select('id').single();
                    if (error) throw new Error(`Erro ao salvar categoria ${codigoCategoria}: ${error.message}`);
                    cacheIds.categorias[codigoCategoria] = cat.id;
                }
                categoriaId = cacheIds.categorias[codigoCategoria];
            }

            if (fspCode && fspCode.split('.').length === 4 && currentUnidade && valorDotacao !== null && categoriaId) {
                const parts = fspCode.split('.');
                const [funcCode, subFuncCode, progCode, ativCode] = parts;

                if (!cacheIds.funcoes[funcCode]) {
                    const { data: f } = await supabase.from('funcoes').upsert({ codigo: funcCode, nome: `Função ${funcCode}` }, { onConflict: 'codigo' }).select('id').single();
                    cacheIds.funcoes[funcCode] = f.id;
                }
                funcaoId = cacheIds.funcoes[funcCode];

                if (!cacheIds.subfuncoes[subFuncCode]) {
                    const { data: sf } = await supabase.from('subfuncoes').upsert({ codigo: subFuncCode, nome: `Subfunção ${subFuncCode}` }, { onConflict: 'codigo' }).select('id').single();
                    cacheIds.subfuncoes[subFuncCode] = sf.id;
                }
                subfuncaoId = cacheIds.subfuncoes[subFuncCode];

                if (!cacheIds.programas[progCode]) {
                    const { data: p } = await supabase.from('programas').upsert({ codigo: progCode, nome: `Programa ${progCode}` }, { onConflict: 'codigo' }).select('id').single();
                    cacheIds.programas[progCode] = p.id;
                }
                programaId = cacheIds.programas[progCode];

                if (!cacheIds.atividades[ativCode]) {
                    const { data: a } = await supabase.from('atividades').upsert({ codigo: ativCode, nome: `Atividade ${ativCode}` }, { onConflict: 'codigo' }).select('id').single();
                    cacheIds.atividades[ativCode] = a.id;
                }
                atividadeId = cacheIds.atividades[ativCode];

                if (unidadeId && funcaoId && subfuncaoId && programaId && atividadeId && categoriaId) {
                    const { error: insertError } = await supabase.from('despesas').insert({
                        orgao_id: orgaoId,
                        unidade_id: unidadeId,
                        funcao_id: funcaoId,
                        subfuncao_id: subfuncaoId,
                        programa_id: programaId,
                        atividade_id: atividadeId,
                        categoria_id: categoriaId,
                        valor: valorDotacao
                    });
                    if (insertError) console.error("Erro ao inserir despesa:", insertError.message, { fspCode, codigoCategoria, valorDotacao });
                } else {
                    console.warn("Skipping despesa row due to missing ID(s):", { fspCode, codigoCategoria, unidadeId, funcaoId, subfuncaoId, programaId, atividadeId, categoriaId });
                }
            }
        }
        res.status(200).json({ message: 'Arquivo processado e relações importadas com sucesso!' });
    } catch (error) {
        console.error('Erro detalhado no upload:', error);
        res.status(500).json({ error: 'Falha ao processar o arquivo.', details: error.message });
    }
}
