// /api/generate-modificativa.js
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import extenso from 'extenso';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    try {
        const templatePath = path.resolve(process.cwd(), 'public', 'modelo_emenda_modificativa.docx');
        const content = fs.readFileSync(templatePath, 'binary');

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const { reducao, acrescimos, justificativa, nome_proponente, valor_reduzir } = req.body;
        
        const hoje = new Date();
        const dia = hoje.getDate();
        const mes = hoje.toLocaleString('pt-BR', { month: 'long' });

        doc.render({
            DIA: dia,
            MES: mes,
            NOME: nome_proponente,
            VALOR_REDUZIR: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor_reduzir || 0),
            
            // --- CORREÇÃO AQUI ---
            // O tag no .docx é "{(valor_por_extenso)}" 
            // Renomeei de "valor_por_extenso_reduzir" para "(valor_por_extenso)"
            "(valor_por_extenso)": extenso(valor_reduzir || 0, { mode: 'currency' }), 
            
            // Dados do quadro de redução
            ORGAO_CODIGO_R: reducao.orgao.codigo,
            ORGAO_NOME_R: reducao.orgao.nome, //  (Isto está correto, corrija seu .docx para {ORGAO_NOME_R})
            UNIDADE_CODIGO_R: reducao.unidade.codigo,
            FUNCAO_CODIGO_R: reducao.funcao.codigo,
            SUBFUNCAO_CODIGO_R: reducao.subfuncao.codigo,
            PROGRAMA_CODIGO_R: reducao.programa.codigo,
            ATIVIDADE_CODIGO_R: reducao.atividade.codigo,
            CATEGORIA_CODIGO_R: reducao.categoria.codigo,
            CATEGORIA_NOME_R: reducao.categoria.nome,
            VALOR_FINAL_R: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reducao.valorFinal || 0),
            
            // Loop para os quadros de acréscimo [cite: 1050, 1051, 1052, 1053]
            acrescimos: acrescimos.map(item => ({
                ORGAO_CODIGO_A: item.orgao.codigo,
                ORGAO_NOME_A: item.orgao.nome,
                UNIDADE_CODIGO_A: item.unidade.codigo,
                FUNCAO_CODIGO_A: item.funcao.codigo,
                SUBFUNCAO_CODIGO_A: item.subfuncao.codigo,
                PROGRAMA_CODIGO_A: item.programa.codigo,
                ATIVIDADE_CODIGO_A: item.atividade.codigo,
                CATEGORIA_CODIGO_A: item.categoria.codigo,
                CATEGORIA_NOME_A: item.categoria.nome,
                VALOR_FINAL_A: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorFinal || 0),
                VALOR_ACRESCENTAR: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorAcrescentar || 0),
                "(valor_por_extenso)": extenso(item.valorAcrescentar || 0, { mode: 'currency' }), // Corrigido aqui também [cite: 1051]
            })),
            
            JUSTIFICATIVA: justificativa
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=emenda_modificativa.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.status(200).send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao gerar o documento.', details: error.message });
    }
}