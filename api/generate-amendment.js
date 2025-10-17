// /api/generate-amendment.js
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import extenso from 'extenso';

export default async function handler(req, res) {
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

        doc.render({ DIA: dia, MES: mes, NOME, valor_por_extenso: valorExtenso, ...req.body });

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

        res.setHeader('Content-Disposition', 'attachment; filename=emenda_gerada.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.status(200).send(buf);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Falha ao gerar o documento.', details: error.message });
    }
}