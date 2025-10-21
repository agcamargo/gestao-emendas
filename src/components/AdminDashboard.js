// /src/components/AdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react'; // 1. Importe useCallback
import { fetchData, updateData } from '../api';
import axios from 'axios';

function AdminDashboard() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const tables = ['orgaos', 'unidades', 'funcoes', 'subfuncoes', 'programas', 'atividades', 'categorias'];

  const [data, setData] = useState(
    tables.reduce((acc, table) => ({ ...acc, [table]: [] }), {})
  );

  // 2. Envolva a função 'loadAllData' em useCallback
  const loadAllData = useCallback(async () => {
    try {
      setMessage('Carregando dados...');
      const allData = {};
      for (const table of tables) {
        const response = await fetchData(table);
        allData[table] = response.data;
      }
      setData(allData);
      setMessage('');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados. Verifique o console.');
    }
  }, []); // O array de dependências vazio significa que esta função nunca será recriada

  useEffect(() => {
    loadAllData();
  }, [loadAllData]); // 3. Adicione 'loadAllData' ao array de dependências do useEffect

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Por favor, selecione um arquivo.');
      return;
    }
    const formData = new FormData();
    formData.append('qddFile', file);

    try {
      setMessage('Enviando arquivo... Isso pode levar um momento.');
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.message);
      await loadAllData(); // Chama a função "memoizada"
    } catch (error) {
      setMessage('Erro no upload: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = async (tableName, id, field, currentValue) => {
    const newValue = prompt(`Editar ${field} para:`, currentValue);

    if (newValue && newValue !== currentValue) {
      setIsUpdating(true);
      setMessage('Atualizando...');
      try {
        await updateData(tableName, id, { [field]: newValue });
        setMessage('Atualizado com sucesso! Recarregando dados...');
        await loadAllData(); // Chama a função "memoizada"
        setMessage('Dados recarregados.');
      } catch (error) {
        console.error('Erro ao atualizar:', error);
        setMessage(`Falha ao atualizar: ${error.message || 'Erro desconhecido'}`);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // ... (o JSX permanece o mesmo)
  return (
    <div>
      <h2>Área Administrativa</h2>
      <div className="upload-section">
        <h3>Importar QDD (.xlsx)</h3>
        <input type="file" onChange={handleFileChange} accept=".xlsx" />
        <button onClick={handleUpload} disabled={isUpdating}>Enviar e Processar Arquivo</button>
        {message && <p className="form-message">{message}</p>}
      </div>

      {tables.map(tableName => (
        <div key={tableName}>
          <h3>Tabela: {tableName.charAt(0).toUpperCase() + tableName.slice(1)}</h3>
          <table>
            <thead>
              <tr><th>ID</th><th>Código</th><th>Nome/Descrição</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {data[tableName]?.map(item => {
                const fieldToEdit = item.nome ? 'nome' : 'descricao';
                const valueToEdit = item.nome || item.descricao || '';
                return (
                  <tr key={item.id}><td>{item.id}</td><td>{item.codigo}</td><td>{valueToEdit}</td><td>
                      <button
                        onClick={() => handleEdit(tableName, item.id, fieldToEdit, valueToEdit)}
                        className="edit-button"
                        disabled={isUpdating}
                      >
                        Editar
                      </button>
                    </td></tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboard;