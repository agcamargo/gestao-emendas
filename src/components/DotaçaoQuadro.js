// Arquivo: /src/components/DotaçaoQuadro.js

import React, { useEffect, useMemo } from 'react';

// Estilos básicos para o quadro (opcional)
const quadroStyle = {
  marginTop: '20px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  padding: '16px',
  backgroundColor: '#f9f9f9',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle = {
  borderBottom: '2px solid #333',
  padding: '8px',
  textAlign: 'left',
  backgroundColor: '#eee',
};

const tdStyle = {
  borderBottom: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
};

const tfootStyle = {
  fontWeight: 'bold',
};

function DotaçaoQuadro({ dotaçoes, onTotalCalculado }) {
  
  // Usamos useMemo para calcular o total. 
  // Isso só será recalculado se a lista de 'dotaçoes' mudar.
  const valorTotal = useMemo(() => {
    if (!dotaçoes || dotaçoes.length === 0) {
      return 0;
    }
    // Garante que o valor é um número antes de somar
    return dotaçoes.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
  }, [dotaçoes]);

  // --- CORREÇÃO DO ERRO ---
  // O erro acontecia porque 'onTotalCalculado' (que é um setState do pai)
  // era chamado diretamente durante a renderização.
  // A solução é movê-la para um useEffect, que executa *após* a renderização.
  useEffect(() => {
    // Atualiza o componente pai (EmendaModificativaForm) com o novo total
    onTotalCalculado(valorTotal);
  }, [valorTotal, onTotalCalculado]); // Dependências: rode se o total ou a função mudarem

  return (
    <div style={quadroStyle}>
      <h4>Quadro de Dotações Orçamentárias</h4>
      {(!dotaçoes || dotaçoes.length === 0) ? (
        <p>Nenhuma dotação encontrada para os filtros selecionados.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Descrição</th>
              <th style={thStyle}>Fonte</th>
              <th style={thStyle} align="right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {dotaçoes.map((d, index) => (
              <tr key={d.id || index}>
                <td style={tdStyle}>{d.descricao}</td>
                <td style={tdStyle}>{d.fonte || 'N/A'}</td>
                <td style={tdStyle} align="right">
                  {(parseFloat(d.valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={tfootStyle}>
              <td style={tdStyle} colSpan="2" align="right">Total:</td>
              <td style={tdStyle} align="right">
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

export default DotaçaoQuadro;