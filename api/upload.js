// /api/upload.js
import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import { formidable } from 'formidable';

// Configuração do Supabase (use as variáveis de ambiente da Vercel)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Desabilita o bodyParser padrão da Vercel para que o formidable possa lidar com o upload
export const config = {
    api: {
        bodyParser: false,
    },
};

const getCellValue = (row, key) => (row[key] ? String(row[key]).trim() : null);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const qddFile = files.qddFile[0];

        if (!qddFile) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        
        // Lê o arquivo que foi enviado
        const workbook = xlsx.readFile(qddFile.filepath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        // Limpa a tabela de despesas para reconstruir o mapa
        await supabase.from('despesas').delete().neq('id', 0);

        let currentOrgao, currentUnidade;
        for (const row of data) {
            const orgaoUnidadeCodigo = getCellValue(row, 'Órgão Un. Orc/Exec');
            const descricaoGeral = getCellValue(row, 'Descrição');
            const fspCode = getCellValue(row, 'Func/Sub/Prog Proj/Atividade');

            if (orgaoUnidadeCodigo && descricaoGeral) {
                if (orgaoUnidadeCodigo.length <= 2) {
                    const { data: orgao } = await supabase.from('orgaos').upsert({ codigo: orgaoUnidadeCodigo, nome: descricaoGeral }, { onConflict: 'codigo' }).select().single();
                    currentOrgao = orgao;
                } else if (orgaoUnidadeCodigo.includes('.')) {
                    const { data: unidade } = await supabase.from('unidades').upsert({ codigo: orgaoUnidadeCodigo, nome: descricaoGeral }, { onConflict: 'codigo' }).select().single();
                    currentUnidade = unidade;
                }
            }
            if (fspCode && fspCode.includes('.') && currentUnidade) {
                const parts = fspCode.split('.');
                const [funcCode, subFuncCode, progCode] = parts;
                const { data: funcao } = await supabase.from('funcoes').upsert({ codigo: funcCode, nome: `Função ${funcCode}` }, { onConflict: 'codigo' }).select().single();
                const { data: subfuncao } = await supabase.from('subfuncoes').upsert({ codigo: subFuncCode, nome: `Subfunção ${subFuncCode}` }, { onConflict: 'codigo' }).select().single();
                const { data: programa } = await supabase.from('programas').upsert({ codigo: progCode, nome: `Programa ${progCode}` }, { onConflict: 'codigo' }).select().single();
                if (funcao && subfuncao && programa) {
                    await supabase.from('despesas').insert({ orgao_id: currentOrgao?.id, unidade_id: currentUnidade.id, funcao_id: funcao.id, subfuncao_id: subfuncao.id, programa_id: programa.id });
                }
            }
            const codigoCategoria = getCellValue(row, 'Categoria Elemento');
            if (codigoCategoria && codigoCategoria.includes('.')) {
                const nomeCategoria = getCellValue(row, 'Descrição');
                await supabase.from('categorias').upsert({ codigo: codigoCategoria, nome: nomeCategoria, descricao: nomeCategoria }, { onConflict: 'codigo' });
            }
        }
        res.status(200).json({ message: 'Arquivo processado e relações importadas com sucesso!' });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Falha ao processar o arquivo.', details: error.message });
    }
}