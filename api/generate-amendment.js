// /api/generate-amendment.js
import { createClient } from '@supabase/supabase-js'; // Adicionado para consistência, embora não seja usado
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import extenso from 'extenso';

export default async function handler(req, res) {
    // Nenhuma conexão com Supabase é necessária aqui, então não adicionamos o cliente.
    // A lógica permanece a mesma.

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        const templatePath = path.resolve(process.cwd(), 'public', 'modelo_emenda.docx');
        const content = fs.readFileSync(templatePath, 'binary');

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const { NOME, orgao, unidade, funcao, subfuncao, programa, categoria, valor, justificativa } = req.body;
        
        const hoje = new Date();
        const dia = hoje.getDate();
        const mes = hoje.toLocaleString('pt-BR', { month: 'long' });
        
        let valorExtenso = 'zero reais';
        const valorNumerico = parseFloat(valor);
        if (!isNaN(valorNumerico)) {
            valorExtenso = extenso(valorNumerico, { mode: 'currency' });
        }

        doc.render({
            DIA: dia,
            MES: mes,
            NOME: NOME || '',
            valor_por_extenso: valorExtenso,
            ORGAO_CODIGO: orgao?.codigo || '',
            ORGAO_NOME: orgao?.nome || '',
            UNIDADE_CODIGO: unidade?.codigo || '',
            UNIDADE_NOME: unidade?.nome || '',
            FUNCAO_CODIGO: funcao?.codigo || '',
            FUNCAO_NOME: funcao?.nome || '',
            SUBFUNCAO_CODIGO: subfuncao?.codigo || '',
            SUBFUNCAO_NOME: subfuncao?.nome || '',
            PROGRAMA_CODIGO: programa?.codigo || '',
            PROGRAMA_NOME: programa?.nome || '',
            CATEGORIA_CODIGO: categoria?.codigo || '',
            CATEGORIA_NOME: categoria?.nome || '',
            VALOR: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNumerico || 0),
            JUSTIFICATIVA: justificativa || '',
        });

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=emenda_gerada.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.status(200).send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao gerar o documento.', details: error.message });
    }
}