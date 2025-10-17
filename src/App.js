import React, { useState } from 'react';
import './App.css';
import AdminDashboard from './components/AdminDashboard';
import EmendaForm from './components/EmendaForm';

import brasao from './assets/Brasão Ibiúna.png'; 
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function App() {
  const [view, setView] = useState('emenda');

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <img src={brasao} alt="Brasão de Ibiúna" className="header-logo" />
          <div className="header-title-container">
            <h1 className="header-title">Câmara Municipal da Estância Turística de Ibiúna</h1>
            <h2 className="header-subtitle">Gerador de Emenda Impositiva</h2>
          </div>
        </div>

        {/* --- NOVO CONTAINER PARA OS ITENS DA DIREITA --- */}
        <div className="header-right">
          <nav className="header-nav">
            <div className="nav-icon" onClick={() => setView('emenda')} title="Criar Emenda (Home)">
              <HomeIcon />
            </div>
            <div className="nav-icon" onClick={() => setView('admin')} title="Administração">
              <AdminPanelSettingsIcon />
            </div>
          </nav>
          {/* --- TEXTO DE CRÉDITO ADICIONADO AQUI --- */}
          <p className="header-credit">Desenvolvido por: Marcos Camargo</p>
        </div>
      </header>

      <main>
        {view === 'admin' ? <AdminDashboard /> : <EmendaForm />}
      </main>
    </div>
  );
}

export default App;