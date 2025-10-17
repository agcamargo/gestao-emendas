import React, { useState, useEffect } from 'react';
import { fetchData, updateData } from '../api';
import api from '../api'; // Import a instância do axios

function AdminDashboard() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [data, setData] = useState({ orgaos: [], unidades: [], funcoes: [], subfuncoes: [], programas: [], categorias: [] });

  const tables = ['orgaos', 'unidades', 'funcoes', 'subfuncoes', 'programas', 'categorias'];

  const loadAllData = async () => {
    try {
      const allData = {};
      for (const table of tables) {
        const response = await fetchData(table);
        allData[table] = response.data;
      }
      setData(allData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados.');
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

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
      setMessage('Enviando arquivo...');
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.message);
      loadAllData(); // Recarrega os dados após o upload
    } catch (error) {
      setMessage('Erro no upload: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEdit = async (tableName, id, field, currentValue) => {
    const newValue = prompt(`Editar ${field}:`, currentValue);
    if (newValue && newValue !== currentValue) {
      try {
        await updateData(tableName, id, { [field]: newValue });
        loadAllData(); // Recarrega para refletir a mudança
      } catch (error) {
        alert('Erro ao atualizar.');
      }
    }
  };

  return (
    <div>
      <h2>Área Administrativa</h2>
      <div className="upload-section">
        <h3>Importar QDD (.xlsx)</h3>
        <input type="file" onChange={handleFileChange} accept=".xlsx" />
        <button onClick={handleUpload}>Enviar Arquivo</button>
        {message && <p>{message}</p>}
      </div>

      {tables.map(tableName => (
        <div key={tableName}>
          <h3>Tabela: {tableName.charAt(0).toUpperCase() + tableName.slice(1)}</h3>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Código</th>
                <th>Nome/Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data[tableName]?.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.codigo}</td>
                  <td>{item.nome || item.descricao}</td>
                  <td>
                    <button onClick={() => handleEdit(tableName, item.id, item.nome ? 'nome' : 'descricao', item.nome || item.descricao)}>
                      Editar Nome/Descrição
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default AdminDashboard;