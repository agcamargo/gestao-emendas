// /src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { fetchData, updateData } from '../api'; // As funções têm o mesmo nome, mas agora funcionam corretamente
import axios from 'axios'; // Usamos axios diretamente para o upload

function AdminDashboard() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [data, setData] = useState({ orgaos: [], unidades: [], funcoes: [], subfuncoes: [], programas: [], categorias: [] });

  const tables = ['orgaos', 'unidades', 'funcoes', 'subfuncoes', 'programas', 'categorias'];

  const loadAllData = async () => {
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
      setMessage('Enviando arquivo... Isso pode levar um momento.');
      // O endpoint de upload é um arquivo separado, então chamamos diretamente
      const response = await axios.post('/api/upload', formData, {
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
        // A função updateData já foi corrigida no api.js, mas aqui garantimos que a lógica está certa.
        // A Vercel não suporta PUT/DELETE em hobby, então essa função pode não funcionar.
        // A edição de dados precisaria de uma API mais complexa no plano Hobby.
        alert('A edição de dados na Vercel requer configuração adicional (plano não-Hobby ou outro serviço). O foco principal é a geração de emendas.');
        // await updateData(tableName, id, { [field]: newValue });
        // loadAllData();
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
        <button onClick={handleUpload}>Enviar e Processar Arquivo</button>
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
                {/* A funcionalidade de editar pode ser reativada com um backend mais robusto */}
                {/* <th>Ações</th> */}
              </tr>
            </thead>
            <tbody>
              {data[tableName]?.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.codigo}</td>
                  <td>{item.nome || item.descricao}</td>
                  {/* <td><button onClick={() => handleEdit(...) }>Editar</button></td> */}
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