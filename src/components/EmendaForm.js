import React, { useState, useEffect } from 'react';
import { fetchData, fetchFuncoesPorUnidade, fetchSubgruposPorFuncao } from '../api';
import api from '../api';

function EmendaForm() {
    const [formData, setFormData] = useState({
        nome_proponente: '',
        orgao_id: '', unidade_id: '', funcao_id: '', subfuncao_id: '',
        programa_id: '', categoria_id: '', valor: '', justificativa: '',
    });

    const [selectData, setSelectData] = useState({ orgaos: [], categorias: [] });
    const [filteredData, setFilteredData] = useState({
        unidades: [], funcoes: [], subfuncoes: [], programas: [],
    });

    const [message, setMessage] = useState('');
    const [allUnidades, setAllUnidades] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [orgaosRes, unidadesRes, categoriasRes] = await Promise.all([
                    fetchData('orgaos'), fetchData('unidades'), fetchData('categorias'),
                ]);
                setSelectData({ orgaos: orgaosRes.data, categorias: categoriasRes.data });
                setAllUnidades(unidadesRes.data);
            } catch (error) {
                setMessage("Falha ao carregar dados iniciais.");
            }
        };
        loadInitialData();
    }, []);

    const resetFieldsAndFilters = (fieldsToReset, filtersToReset) => {
        const resetState = fieldsToReset.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
        setFormData(prev => ({ ...prev, ...resetState }));
        const resetFilters = filtersToReset.reduce((acc, filter) => ({ ...acc, [filter]: [] }), {});
        setFilteredData(prev => ({...prev, ...resetFilters}));
    };

    useEffect(() => {
        resetFieldsAndFilters(
            ['unidade_id', 'funcao_id', 'subfuncao_id', 'programa_id'],
            ['unidades', 'funcoes', 'subfuncoes', 'programas']
        );
        if (formData.orgao_id) {
            const selectedOrgao = selectData.orgaos.find(o => o.id.toString() === formData.orgao_id);
            if (selectedOrgao) {
                const organCodePrefix = selectedOrgao.codigo.padStart(2, '0');
                setFilteredData(prev => ({ ...prev, unidades: allUnidades.filter(u => u.codigo.startsWith(organCodePrefix + '.')) }));
            }
        }
    }, [formData.orgao_id, selectData.orgaos, allUnidades]);
    
    useEffect(() => {
        resetFieldsAndFilters(['funcao_id', 'subfuncao_id', 'programa_id'], ['funcoes', 'subfuncoes', 'programas']);
        if (formData.unidade_id) {
            fetchFuncoesPorUnidade(formData.unidade_id)
                .then(response => setFilteredData(prev => ({ ...prev, funcoes: response.data })))
                .catch(() => setMessage("Erro ao buscar funções."));
        }
    }, [formData.unidade_id]);

    useEffect(() => {
        resetFieldsAndFilters(['subfuncao_id', 'programa_id'], ['subfuncoes', 'programas']);
        if (formData.funcao_id && formData.unidade_id) {
            fetchSubgruposPorFuncao(formData.unidade_id, formData.funcao_id)
                .then(response => setFilteredData(prev => ({ ...prev, ...response.data })))
                .catch(() => setMessage("Erro ao buscar subgrupos."));
        }
    }, [formData.funcao_id, formData.unidade_id]);

    const handleChange = (e) => {
        setMessage('');
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Gerando documento...');
        try {
            const { orgao_id, unidade_id, funcao_id, subfuncao_id, programa_id, categoria_id, valor, justificativa, nome_proponente } = formData;
            const findById = (arr, id) => arr.find(item => item && item.id.toString() === id);

            const payload = {
                NOME: nome_proponente,
                orgao: findById(selectData.orgaos, orgao_id),
                unidade: findById(allUnidades, unidade_id),
                funcao: findById(filteredData.funcoes, funcao_id),
                subfuncao: findById(filteredData.subfuncoes, subfuncao_id),
                programa: findById(filteredData.programas, programa_id),
                categoria: findById(selectData.categorias, categoria_id),
                valor: parseFloat(valor),
                justificativa: justificativa,
            };

            const response = await api.post('/generate-amendment', payload, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `emenda_${nome_proponente.replace(/\s+/g, '_')}.docx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setMessage('Documento gerado com sucesso!');
        } catch (error) {
            console.error('Erro ao gerar emenda:', error);
            setMessage('Erro ao gerar o documento.');
        }
    };
    
    return (
        <div>
            <h2>Criação de Emendas</h2>
            <form onSubmit={handleSubmit} className="emenda-form">
                <div className="form-group form-group-full">
                    <label>Nome do Proponente</label>
                    <input type="text" name="nome_proponente" value={formData.nome_proponente} onChange={handleChange} required placeholder="Digite o seu nome completo"/>
                </div>

                <div className="form-group">
                    <label>Órgão</label>
                    <select name="orgao_id" value={formData.orgao_id} onChange={handleChange} required>
                        <option value="">Selecione...</option>
                        {selectData.orgaos.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Unidade</label>
                    <select name="unidade_id" value={formData.unidade_id} onChange={handleChange} required disabled={!formData.orgao_id}>
                        <option value="">Selecione um órgão...</option>
                        {filteredData.unidades.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Função</label>
                    <select name="funcao_id" value={formData.funcao_id} onChange={handleChange} required disabled={!formData.unidade_id}>
                        <option value="">Selecione uma unidade...</option>
                        {filteredData.funcoes.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Subfunção</label>
                    <select name="subfuncao_id" value={formData.subfuncao_id} onChange={handleChange} required disabled={!formData.funcao_id}>
                        <option value="">Selecione uma função...</option>
                        {filteredData.subfuncoes.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Programa</label>
                    <select name="programa_id" value={formData.programa_id} onChange={handleChange} required disabled={!formData.funcao_id}>
                        <option value="">Selecione uma função...</option>
                        {filteredData.programas.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Categoria da Despesa</label>
                    <select name="categoria_id" value={formData.categoria_id} onChange={handleChange} required>
                        <option value="">Selecione...</option>
                        {selectData.categorias.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Valor</label>
                    <input type="number" name="valor" value={formData.valor} onChange={handleChange} step="0.01" required placeholder="Ex: 1500.50"/>
                </div>

                <div className="form-group form-group-full">
                    <label>Justificativa</label>
                    <textarea name="justificativa" value={formData.justificativa} onChange={handleChange} rows="6" required placeholder="Digite a justificativa..."/>
                </div>

                <div className="form-group form-group-full">
                    <button type="submit">Gerar Emenda</button>
                    {message && <p className="form-message">{message}</p>}
                </div>
            </form>
        </div>
    );
}

export default EmendaForm;