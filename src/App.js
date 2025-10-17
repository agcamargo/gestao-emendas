import React, { useState } from 'react';
import './App.css';
import AdminDashboard from './components/AdminDashboard';
import EmendaForm from './components/EmendaForm';

// Importa o brasão da pasta assets
import brasao from './assets/Brasão Ibiúna.png'; 

// Importa os ícones que vamos usar
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';


function App() {
  const [view, setView] = useState('emenda'); // 'admin' or 'emenda'

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
        <nav className="header-nav">
          <div className="nav-icon" onClick={() => setView('emenda')} title="Criar Emenda (Home)">
            <HomeIcon />
          </div>
          <div className="nav-icon" onClick={() => setView('admin')} title="Administração">
            <AdminPanelSettingsIcon />
          </div>
        </nav>
      </header>
      <main>
        {view === 'admin' ? <AdminDashboard /> : <EmendaForm />}
      </main>
    </div>
  );
}

export default App;