// /src/components/EmendaModificativaForm.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    fetchData, 
    fetchFuncoesPorUnidade, 
    fetchSubgruposPorFuncao, 
    fetchAtividadesPorPrograma,
    fetchValorDotacao
} from '../api.js'; 
import axios from 'axios';

// --- Estilos ---
const fieldsetStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  backgroundColor: '#f9f9f9',
};
const legendStyle = {
  fontWeight: 'bold',
  padding: '0 10px',
  fontSize: '1.2em',
  color: '#1a237e',
};
const valorInfoStyle = {
    backgroundColor: '#e3f2fd',
    padding: '10px 14px',
    borderRadius: '4px',
    marginTop: '10px',
    fontSize: '1rem',
    border: '1px solid #bbdefb',
    width: '100%',
    boxSizing: 'border-box',
    color: '#1976d2',
    fontWeight: '500'
};
const saldoInfoStyle = {
    ...valorInfoStyle,
    backgroundColor: '#fffbe6',
    borderColor: '#fff176',
    color: '#795548',
    fontSize: '1.1rem',
    textAlign: 'center',
};
const errorStyle = {
    color: '#d32f2f',
    fontWeight: 'bold'
};
// --- Fim Estilos ---

const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '...';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const initialAcrescimoId = Date.now();

function EmendaModificativaForm() {
    const [nomeProponente, setNomeProponente] = useState('');
    const [valorTotalReduzir, setValorTotalReduzir] = useState('');
    const [justificativa, setJustificativa] = useState('');

    const [reducaoData, setReducaoData] = useState({
        orgao_id: '', unidade_id: '', funcao_id: '', subfuncao_id: '',
        programa_id: '', atividade_id: '', categoria_id: '',
    });
    const [reducaoFilteredData, setReducaoFilteredData] = useState({
        unidades: [], funcoes: [], subfuncoes: [], programas: [], atividades: [],
    });
    const [reducaoDotacaoValor, setReducaoDotacaoValor] = useState(null);
    const [loadingReducaoValor, setLoadingReducaoValor] = useState(false);

    const [acrescimos, setAcrescimos] = useState([
        { id: initialAcrescimoId, valor: '', orgao_id: '', unidade_id: '', funcao_id: '', 
          subfuncao_id: '', programa_id: '', atividade_id: '', categoria_id: '' }
    ]);
    const [acrescimosFilteredData, setAcrescimosFilteredData] = useState({
        [initialAcrescimoId]: { unidades: [], funcoes: [], subfuncoes: [], programas: [], atividades: [] }
    });
    const [acrescimosDotacaoValores, setAcrescimosDotacaoValores] = useState({});
    const [acrescimosLoading, setAcrescimosLoading] = useState({});

    const [selectData, setSelectData] = useState({ orgaos: [], categorias: [] });
    const [allUnidades, setAllUnidades] = useState([]);
    const [message, setMessage] = useState('');
    const [loadingInitial, setLoadingInitial] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingInitial(true);
            setMessage('Carregando dados iniciais...');
            try {
                const [orgaosRes, unidadesRes, categoriasRes] = await Promise.all([
                    fetchData('orgaos'),
                    fetchData('unidades'),
                    fetchData('categorias'),
                ]);
                setSelectData({
                    orgaos: orgaosRes.data || [],
                    categorias: categoriasRes.data || []
                });
                setAllUnidades(unidadesRes.data || []);
                setMessage('');
            } catch (error) {
                console.error("Erro carregando dados iniciais:", error);
                setMessage("Falha ao carregar dados iniciais.");
            } finally {
                setLoadingInitial(false);
            }
        };
        loadInitialData();
    }, []);

    const resetReducaoCamposFilhos = useCallback((nivel) => {
        const resetData = {};
        const resetFilters = {};
        if (nivel <= 1) {
            resetData.unidade_id = '';
            resetFilters.unidades = [];
        }
        if (nivel <= 2) {
            resetData.funcao_id = '';
            resetFilters.funcoes = [];
        }
        if (nivel <= 3) {
            resetData.subfuncao_id = '';
            resetData.programa_id = '';
            resetFilters.subfuncoes = [];
            resetFilters.programas = [];
        }
        if (nivel <= 4) {
            resetData.atividade_id = '';
            resetFilters.atividades = [];
        }
        if (nivel <= 5) {
            resetData.categoria_id = '';
        }
        setReducaoData(prev => ({ ...prev, ...resetData }));
        setReducaoFilteredData(prev => ({ ...prev, ...resetFilters }));
        setReducaoDotacaoValor(null);
    }, []);

    // --- CASCATA REDUÇÃO ---
    
    // Órgão -> Unidade
    useEffect(() => {
        resetReducaoCamposFilhos(1);
        if (reducaoData.orgao_id) {
            const selectedOrgao = selectData.orgaos.find(o => o.id.toString() === reducaoData.orgao_id);
            if (selectedOrgao && selectedOrgao.codigo) {
                const organCodePrefix = selectedOrgao.codigo.padStart(2, '0');
                setReducaoFilteredData(prev => ({ ...prev, unidades: allUnidades.filter(u => u.codigo && u.codigo.startsWith(organCodePrefix + '.')) }));
            }
        }
    }, [reducaoData.orgao_id, selectData.orgaos, allUnidades, resetReducaoCamposFilhos]);

    // Unidade -> Função
    useEffect(() => {
        resetReducaoCamposFilhos(2);
        if (reducaoData.unidade_id) {
            fetchFuncoesPorUnidade(reducaoData.unidade_id)
                .then(response => setReducaoFilteredData(prev => ({ ...prev, funcoes: response.data })))
                .catch(() => setMessage("Erro ao buscar funções de redução."));
        }
    }, [reducaoData.unidade_id, resetReducaoCamposFilhos]);

    // *** CORREÇÃO AQUI ***
    // Função -> Subfunção/Programa (Passa unidade_id E funcao_id)
    useEffect(() => {
        resetReducaoCamposFilhos(3);
        if (reducaoData.unidade_id && reducaoData.funcao_id) { 
            fetchSubgruposPorFuncao(reducaoData.unidade_id, reducaoData.funcao_id) // Passa os dois IDs
                .then(response => setReducaoFilteredData(prev => ({ 
                    ...prev, 
                    subfuncoes: response.data.subfuncoes || [],
                    programas: response.data.programas || []
                })))
                .catch(() => setMessage("Erro ao buscar subgrupos de redução."));
        }
    }, [reducaoData.unidade_id, reducaoData.funcao_id, resetReducaoCamposFilhos]); // Depende dos dois IDs

    // *** CORREÇÃO AQUI ***
    // Programa -> Atividade (Passa unidade_id, funcao_id E programa_id)
    useEffect(() => {
        resetReducaoCamposFilhos(4);
        if (reducaoData.unidade_id && reducaoData.funcao_id && reducaoData.programa_id) {
            fetchAtividadesPorPrograma(reducaoData.unidade_id, reducaoData.funcao_id, reducaoData.programa_id) // Passa os três IDs
                .then(response => setReducaoFilteredData(prev => ({ ...prev, atividades: response.data })))
                .catch(() => setMessage("Erro ao buscar atividades de redução."));
        }
    }, [reducaoData.unidade_id, reducaoData.funcao_id, reducaoData.programa_id, resetReducaoCamposFilhos]); // Depende dos três IDs

    // Busca Valor da Dotação (Redução)
    useEffect(() => {
        const { unidade_id, funcao_id, programa_id, atividade_id, categoria_id } = reducaoData;
        setReducaoDotacaoValor(null);
        if (unidade_id && funcao_id && programa_id && atividade_id && categoria_id) {
            setLoadingReducaoValor(true);
            fetchValorDotacao({
                unidadeId: unidade_id,
                funcaoId: funcao_id,
                programaId: programa_id,
                atividadeId: atividade_id,
                categoriaId: categoria_id
            })
            .then(response => setReducaoDotacaoValor(response.data.valor))
            .catch(() => setMessage("Erro ao buscar valor da dotação de redução."))
            .finally(() => setLoadingReducaoValor(false));
        }
    }, [reducaoData.unidade_id, reducaoData.funcao_id, reducaoData.programa_id, reducaoData.atividade_id, reducaoData.categoria_id]);


    // --- 8. HANDLERS PARA BLOCOS DINÂMICOS (ACRÉSCIMO) ---
    
    // *** CORREÇÃO AQUI (Toda a função foi atualizada para a nova lógica de cascata) ***
    const handleAcrescimoChange = async (id, field, value) => {
        setMessage('');
        
        // 1. Atualiza o estado do bloco
        const blocosAtualizados = acrescimos.map(a => 
            a.id === id ? { ...a, [field]: value } : a
        );
        setAcrescimos(blocosAtualizados);
        
        // Pega o estado *atualizado* do bloco
        const blocoAtual = blocosAtualizados.find(a => a.id === id);

        // 2. Lógica de cascata e reset
        const resetFilters = (filters) => {
            setAcrescimosFilteredData(prev => ({
                ...prev,
                [id]: { ...(prev[id] || {}), ...filters }
            }));
        };
        const resetLoading = () => {
             setAcrescimosLoading(prev => ({ ...prev, [id]: false }));
             setAcrescimosDotacaoValores(prev => ({ ...prev, [id]: null }));
        };

        if (field === 'orgao_id') {
            resetFilters({ unidades: [], funcoes: [], subfuncoes: [], programas: [], atividades: [] });
            resetLoading();
            if (value) {
                const selectedOrgao = selectData.orgaos.find(o => o.id.toString() === value);
                if (selectedOrgao && selectedOrgao.codigo) {
                    const organCodePrefix = selectedOrgao.codigo.padStart(2, '0');
                    const unidadesFiltradas = allUnidades.filter(u => u.codigo && u.codigo.startsWith(organCodePrefix + '.'));
                    setAcrescimosFilteredData(prev => ({ ...prev, [id]: { ...prev[id], unidades: unidadesFiltradas } }));
                }
            }
        }
        else if (field === 'unidade_id') {
            resetFilters({ funcoes: [], subfuncoes: [], programas: [], atividades: [] });
            resetLoading();
            if (value) {
                try {
                    const res = await fetchFuncoesPorUnidade(value);
                    setAcrescimosFilteredData(prev => ({ ...prev, [id]: { ...prev[id], funcoes: res.data } }));
                } catch (e) { setMessage("Erro ao buscar funções de acréscimo."); }
            }
        }
        else if (field === 'funcao_id') {
            resetFilters({ subfuncoes: [], programas: [], atividades: [] });
            resetLoading();
            if (value && blocoAtual.unidade_id) { // Precisa da unidade
                try {
                    const res = await fetchSubgruposPorFuncao(blocoAtual.unidade_id, value); // Passa os dois IDs
                    setAcrescimosFilteredData(prev => ({ ...prev, [id]: { ...prev[id], subfuncoes: res.data.subfuncoes || [], programas: res.data.programas || [] } }));
                } catch (e) { setMessage("Erro ao buscar subgrupos de acréscimo."); }
            }
        }
        else if (field === 'programa_id') {
            resetFilters({ atividades: [] });
            resetLoading();
            if (value && blocoAtual.unidade_id && blocoAtual.funcao_id) { // Precisa da unidade e função
                 try {
                    const res = await fetchAtividadesPorPrograma(blocoAtual.unidade_id, blocoAtual.funcao_id, value); // Passa os três IDs
                    setAcrescimosFilteredData(prev => ({ ...prev, [id]: { ...prev[id], atividades: res.data } }));
                 } catch(e) { setMessage("Erro ao buscar atividades de acréscimo."); }
            }
        }
        else if (field === 'atividade_id' || field === 'categoria_id') {
             resetLoading();
             
             // Pega os valores atuais (incluindo o que acabou de mudar)
             const { unidade_id, funcao_id, programa_id } = blocoAtual;
             const categoriaId = (field === 'categoria_id') ? value : blocoAtual.categoria_id;
             const atividadeId = (field === 'atividade_id') ? value : blocoAtual.atividade_id;
             
             if (unidade_id && funcao_id && programa_id && atividadeId && categoriaId) {
                setAcrescimosLoading(prev => ({ ...prev, [id]: true }));
                try {
                    const res = await fetchValorDotacao({
                        unidadeId: unidade_id,
                        funcaoId: funcao_id,
                        programaId: programa_id,
                        atividadeId: atividadeId,
                        categoriaId: categoriaId
                    });
                    setAcrescimosDotacaoValores(prev => ({ ...prev, [id]: res.data.valor }));
                } catch (e) {
                    setMessage("Erro ao buscar valor da dotação de acréscimo.");
                } finally {
                    setAcrescimosLoading(prev => ({ ...prev, [id]: false }));
                }
             }
        }
    };
    
    const addAcrescimo = () => {
        const newId = Date.now();
        setAcrescimos(prev => [
            ...prev,
            { id: newId, valor: '', orgao_id: '', unidade_id: '', funcao_id: '', 
              subfuncao_id: '', programa_id: '', atividade_id: '', categoria_id: '' }
        ]);
        setAcrescimosFilteredData(prev => ({ ...prev, [newId]: { unidades: [], funcoes: [], subfuncoes: [], programas: [], atividades: [] } }));
        setAcrescimosDotacaoValores(prev => ({ ...prev, [newId]: null }));
        setAcrescimosLoading(prev => ({ ...prev, [newId]: false }));
    };

    const removeAcrescimo = (id) => {
        setAcrescimos(prev => prev.filter(a => a.id !== id));
        setAcrescimosFilteredData(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
        setAcrescimosDotacaoValores(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
         setAcrescimosLoading(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
    };

    // --- CÁLCULOS DE VALOR ---
    const valorTotalAcrescimos = useMemo(() => {
        return acrescimos.reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);
    }, [acrescimos]);

    const saldoADestinar = useMemo(() => {
        return (parseFloat(valorTotalReduzir) || 0) - valorTotalAcrescimos;
    }, [valorTotalReduzir, valorTotalAcrescimos]);

    const valorReducaoFinal = useMemo(() => {
        if (reducaoDotacaoValor === null || isNaN(reducaoDotacaoValor) || !valorTotalReduzir) {
            return null;
        }
        return reducaoDotacaoValor - (parseFloat(valorTotalReduzir) || 0);
    }, [reducaoDotacaoValor, valorTotalReduzir]);

    // --- SUBMIT ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const valorTotalNum = parseFloat(valorTotalReduzir);
        if (isNaN(valorTotalNum) || valorTotalNum <= 0) {
            setMessage("Erro: O 'Valor a Reduzir' deve ser um número positivo.");
            return;
        }

        if (saldoADestinar !== 0) {
            setMessage(`Erro: O Saldo a Destinar deve ser R$ 0,00. (Atualmente: ${formatCurrency(saldoADestinar)})`);
            return;
        }

        if (reducaoDotacaoValor === null) {
            setMessage("Erro: Não foi possível encontrar o valor da dotação de redução. Verifique os campos.");
            return;
        }
        if (valorTotalNum > reducaoDotacaoValor) {
            setMessage(`Erro: O valor a reduzir (${formatCurrency(valorTotalNum)}) é maior que o valor disponível na dotação (${formatCurrency(reducaoDotacaoValor)}).`);
            return;
        }

        setMessage('Gerando documento...');
        
        const findById = (arr, id) => arr ? arr.find(item => item && item.id.toString() === id) : null;

        const payload = {
            nome_proponente: nomeProponente,
            valor_reduzir: valorTotalNum,
            justificativa: justificativa,
            reducao: {
                orgao: findById(selectData.orgaos, reducaoData.orgao_id),
                unidade: findById(allUnidades, reducaoData.unidade_id),
                funcao: findById(reducaoFilteredData.funcoes, reducaoData.funcao_id),
                subfuncao: findById(reducaoFilteredData.subfuncoes, reducaoData.subfuncao_id),
                programa: findById(reducaoFilteredData.programas, reducaoData.programa_id),
                atividade: findById(reducaoFilteredData.atividades, reducaoData.atividade_id),
                categoria: findById(selectData.categorias, reducaoData.categoria_id),
                valorFinal: valorReducaoFinal,
            },
            acrescimos: acrescimos.map(bloco => {
                const valorAcrescimoNum = parseFloat(bloco.valor) || 0;
                const valorDotacaoAtual = acrescimosDotacaoValores[bloco.id] || 0;
                return {
                    orgao: findById(selectData.orgaos, bloco.orgao_id),
                    unidade: findById(allUnidades, bloco.unidade_id),
                    funcao: findById(acrescimosFilteredData[bloco.id]?.funcoes, bloco.funcao_id),
                    subfuncao: findById(acrescimosFilteredData[bloco.id]?.subfuncoes, bloco.subfuncao_id),
                    programa: findById(acrescimosFilteredData[bloco.id]?.programas, bloco.programa_id),
                    atividade: findById(acrescimosFilteredData[bloco.id]?.atividades, bloco.atividade_id),
                    categoria: findById(selectData.categorias, bloco.categoria_id),
                    valorFinal: valorDotacaoAtual + valorAcrescimoNum,
                    valorAcrescentar: valorAcrescimoNum,
                };
            })
        };
        
        let payloadInvalido = !payload.reducao.orgao || !payload.reducao.unidade || !payload.reducao.funcao || !payload.reducao.subfuncao || !payload.reducao.programa || !payload.reducao.atividade || !payload.reducao.categoria;
        
        payload.acrescimos.forEach(item => {
            if (!item.orgao || !item.unidade || !item.funcao || !item.subfuncao || !item.programa || !item.atividade || !item.categoria || item.valorAcrescentar <= 0) {
                payloadInvalido = true;
                if(item.valorAcrescentar <= 0) setMessage("Erro: O valor a acrescentar em um dos blocos deve ser maior que zero.");
            }
        });

        if (payloadInvalido) {
            console.error("Payload incompleto ou inválido:", payload);
            if (!message.startsWith("Erro:")) { // Não sobrescreve a mensagem de erro de valor
                setMessage("Erro: Falha ao encontrar dados para preencher o documento. Verifique todos os campos selecionados.");
            }
            return;
        }

        try {
            const response = await axios.post('/api/generate-modificativa', payload, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `emenda_modificativa_${nomeProponente.replace(/\s+/g, '_')}.docx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setMessage('Documento gerado com sucesso!');
        } catch (error) {
            console.error('Erro ao gerar emenda:', error);
            setMessage(`Erro ao gerar o documento: ${error.response?.data?.error || error.message}`);
        }
    };
    
    const isLoading = loadingInitial || loadingReducaoValor || Object.values(acrescimosLoading).some(Boolean);

    return (
        <div>
            <form onSubmit={handleSubmit} className="emenda-form">
                
                <div className="form-group form-group-full">
                    <label>Nome do Proponente</label>
                    <input 
                        type="text" 
                        name="nome_proponente" 
                        value={nomeProponente} 
                        onChange={(e) => setNomeProponente(e.target.value)} 
                        required 
                        placeholder="Digite o seu nome completo"
                    />
                </div>
                
                <div className="form-group form-group-full" style={{flexBasis: '100%'}}>
                    <label>Valor Total a Modificar (R$)</label>
                    <input 
                        type="number" 
                        name="valor_total" 
                        value={valorTotalReduzir} 
                        onChange={(e) => setValorTotalReduzir(e.target.value)} 
                        step="0.01" 
                        required 
                        placeholder="Ex: 15000.00"
                        style={{fontSize: '1.2rem', padding: '12px'}}
                    />
                </div>
                
                <fieldset style={fieldsetStyle} disabled={loadingInitial}>
                    <legend style={legendStyle}>1. Dados da Redução (Origem)</legend>
                    <div className="form-group">
                        <label>Órgão</label>
                        <select name="orgao_id" value={reducaoData.orgao_id} onChange={(e) => setReducaoData(p => ({...p, orgao_id: e.target.value}))} required>
                            <option value="">{loadingInitial ? 'Carregando...' : 'Selecione...'}</option>
                            {selectData.orgaos.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Unidade</label>
                        <select name="unidade_id" value={reducaoData.unidade_id} onChange={(e) => setReducaoData(p => ({...p, unidade_id: e.target.value}))} required disabled={!reducaoData.orgao_id}>
                            <option value="">Selecione um órgão...</option>
                            {reducaoFilteredData.unidades.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Função</label>
                        <select name="funcao_id" value={reducaoData.funcao_id} onChange={(e) => setReducaoData(p => ({...p, funcao_id: e.target.value}))} required disabled={!reducaoData.unidade_id}>
                            <option value="">Selecione uma unidade...</option>
                            {reducaoFilteredData.funcoes.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Subfunção</label>
                        <select name="subfuncao_id" value={reducaoData.subfuncao_id} onChange={(e) => setReducaoData(p => ({...p, subfuncao_id: e.target.value}))} required disabled={!reducaoData.funcao_id}>
                            <option value="">Selecione uma função...</option>
                            {reducaoFilteredData.subfuncoes.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Programa</label>
                        <select name="programa_id" value={reducaoData.programa_id} onChange={(e) => setReducaoData(p => ({...p, programa_id: e.target.value}))} required disabled={!reducaoData.funcao_id}>
                            <option value="">Selecione uma função...</option>
                            {reducaoFilteredData.programas.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Atividade</label>
                        <select name="atividade_id" value={reducaoData.atividade_id} onChange={(e) => setReducaoData(p => ({...p, atividade_id: e.target.value}))} required disabled={!reducaoData.programa_id}>
                            <option value="">Selecione um programa...</option>
                            {reducaoFilteredData.atividades.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group form-group-full">
                        <label>Categoria da Despesa</label>
                        <select name="categoria_id" value={reducaoData.categoria_id} onChange={(e) => setReducaoData(p => ({...p, categoria_id: e.target.value}))} required>
                            <option value="">Selecione...</option>
                            {selectData.categorias.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                        </select>
                    </div>
                     <div style={valorInfoStyle}>
                        <strong>Valor da Dotação:</strong> 
                        <span style={reducaoDotacaoValor === null ? {color: '#777'} : {}}>
                            {loadingReducaoValor ? ' Carregando...' : ` ${formatCurrency(reducaoDotacaoValor)}`}
                        </span>
                        <br/>
                        <strong>Valor de Redução:</strong> 
                        <span style={!valorTotalReduzir ? {color: '#777'} : errorStyle}>
                            {` - ${formatCurrency(parseFloat(valorTotalReduzir) || 0)}`}
                        </span>
                        <br/>
                        <strong>Valor Atualizado:</strong> 
                        <strong style={valorReducaoFinal === null ? {color: '#777'} : (valorReducaoFinal < 0 ? errorStyle : {})}>
                            {` ${formatCurrency(valorReducaoFinal)}`}
                        </strong>
                    </div>
                </fieldset>
                
                <legend style={{...legendStyle, width: '100%', textAlign: 'left', marginBottom: '1rem'}}>
                    2. Dados do Acréscimo (Destino)
                </legend>
                
                {acrescimos.map((bloco, index) => (
                    <fieldset key={bloco.id} style={{...fieldsetStyle, width: '100%', borderColor: '#1a237e'}} disabled={loadingInitial}>
                       <legend style={{...legendStyle, fontSize: '1rem', color: '#555'}}>Destinação #{index + 1}</legend>
                       
                       <div className="form-group" style={{flexBasis: '100%'}}>
                           <label>Valor a Acrescentar (R$)</label>
                           <input 
                                type="number" 
                                name="valor" 
                                value={bloco.valor}
                                onChange={(e) => handleAcrescimoChange(bloco.id, 'valor', e.target.value)}
                                step="0.01" 
                                required 
                                placeholder="Ex: 5000.00"
                           />
                       </div>

                       <div className="form-group">
                           <label>Órgão</label>
                           <select name="orgao_id" value={bloco.orgao_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'orgao_id', e.target.value)} required>
                               <option value="">{loadingInitial ? 'Carregando...' : 'Selecione...'}</option>
                               {selectData.orgaos.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       <div className="form-group">
                           <label>Unidade</label>
                           <select name="unidade_id" value={bloco.unidade_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'unidade_id', e.target.value)} required disabled={!bloco.orgao_id}>
                               <option value="">Selecione um órgão...</option>
                               {(acrescimosFilteredData[bloco.id]?.unidades || []).map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       <div className="form-group">
                           <label>Função</label>
                           <select name="funcao_id" value={bloco.funcao_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'funcao_id', e.target.value)} required disabled={!bloco.unidade_id}>
                               <option value="">Selecione uma unidade...</option>
                               {(acrescimosFilteredData[bloco.id]?.funcoes || []).map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       <div className="form-group">
                           <label>Subfunção</label>
                           <select name="subfuncao_id" value={bloco.subfuncao_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'subfuncao_id', e.target.value)} required disabled={!bloco.funcao_id}>
                               <option value="">Selecione uma função...</option>
                               {(acrescimosFilteredData[bloco.id]?.subfuncoes || []).map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       <div className="form-group">
                           <label>Programa</label>
                           <select name="programa_id" value={bloco.programa_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'programa_id', e.target.value)} required disabled={!bloco.funcao_id}>
                               <option value="">Selecione uma função...</option>
                               {(acrescimosFilteredData[bloco.id]?.programas || []).map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       <div className="form-group">
                           <label>Atividade</label>
                           <select name="atividade_id" value={bloco.atividade_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'atividade_id', e.target.value)} required disabled={!bloco.programa_id}>
                               <option value="">Selecione um programa...</option>
                               {(acrescimosFilteredData[bloco.id]?.atividades || []).map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       <div className="form-group form-group-full">
                           <label>Categoria da Despesa</label>
                           <select name="categoria_id" value={bloco.categoria_id} onChange={(e) => handleAcrescimoChange(bloco.id, 'categoria_id', e.target.value)} required>
                               <option value="">Selecione...</option>
                               {selectData.categorias.map(item => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}
                           </select>
                       </div>
                       
                       <div style={valorInfoStyle}>
                           Valor Atual da Dotação (Acréscimo): 
                           <strong style={acrescimosDotacaoValores[bloco.id] === null ? {color: '#777'} : {}}>
                              {acrescimosLoading[bloco.id] ? ' Carregando...' : ` ${formatCurrency(acrescimosDotacaoValores[bloco.id])}`}
                           </strong>
                           {(acrescimosDotacaoValores[bloco.id] !== null && bloco.valor > 0) && (
                                <span>
                                   {` (Valor Final: ${formatCurrency((acrescimosDotacaoValores[bloco.id] || 0) + parseFloat(bloco.valor))})`}
                                </span>
                           )}
                       </div>
                       
                       {acrescimos.length > 1 && (
                           <button type="button" className="remove-button" onClick={() => removeAcrescimo(bloco.id)}>
                               Remover Destinação #{index + 1}
                           </button>
                       )}
                    </fieldset>
                ))}
                
                <div className="form-group form-group-full">
                    <button type="button" onClick={addAcrescimo} style={{backgroundColor: '#4caf50', marginTop: '-0.5rem'}}>
                        + Adicionar outra Destinação (Acréscimo)
                    </button>
                </div>
                
                <div className="form-group form-group-full" style={saldoInfoStyle}>
                    <strong>Saldo a Destinar: </strong>
                    <span style={saldoADestinar !== 0 ? errorStyle : {color: '#388e3c'}}>
                        {formatCurrency(saldoADestinar)}
                    </span>
                    <small style={{fontSize: '0.8rem', color: '#777', marginTop: '5px'}}>
                        (Valor Total a Reduzir: {formatCurrency(parseFloat(valorTotalReduzir) || 0)} | 
                        Total Acrescentado: {formatCurrency(valorTotalAcrescimos)})
                    </small>
                </div>

                <div className="form-group form-group-full">
                    <label>Justificativa</label>
                    <textarea 
                        name="justificativa" 
                        value={justificativa} 
                        onChange={(e) => setJustificativa(e.target.value)} 
                        rows="6" 
                        required 
                        placeholder="Digite a justificativa..."
                    />
                </div>
                <div className="form-group form-group-full">
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Carregando dados...' : 'Gerar Emenda Modificativa'}
                    </button>
                    {message && <p className={`form-message ${message.startsWith('Erro') ? 'error' : ''}`}>{message}</p>}
                </div>
            </form>
        </div>
    );
}

export default EmendaModificativaForm;