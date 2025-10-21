import React, { useState } from 'react';
import './App.css';
import EmendaForm from './components/EmendaForm';
import EmendaModificativaForm from './components/EmendaModificativaForm'; // Novo
import AdminDashboard from './components/AdminDashboard';

// Importações de ícones e logo
import brasao from './assets/Brasão Ibiúna.png'; 
import HomeIcon from '@mui/icons-material/Home';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function App() {
  // 'impositiva' será nossa "home"
  const [view, setView] = useState('impositiva'); // impositiva, modificativa, admin

  return (
    <div className="App">
      {/* --- CABEÇALHO COMPLETO RESTAURADO --- */}
      <header className="App-header">
        <div className="header-left">
          <img src={brasao} alt="Brasão de Ibiúna" className="header-logo" />
          <div className="header-title-container">
            <h1 className="header-title">Câmara Municipal da Estância Turística de Ibiúna</h1>
            <h2 className="header-subtitle">Gerador de Emenda Impositiva</h2>
          </div>
        </div>
        <div className="header-right">
          <nav className="header-nav">
            {/* O ícone Home agora aponta para a view 'impositiva' */}
            <div className="nav-icon" onClick={() => setView('impositiva')} title="Criar Emenda (Home)">
              <HomeIcon />
            </div>
            <div className="nav-icon" onClick={() => setView('admin')} title="Administração">
              <AdminPanelSettingsIcon />
            </div>
          </nav>
          <p className="header-credit">Desenvolvido por: Marcos Camargo</p>
        </div>
      </header>
      {/* --- FIM DO CABEÇALHO --- */}

      <main>
        {/* Se a view NÃO for 'admin', mostra os botões de seleção de emenda */}
        {view !== 'admin' && (
          <div className="view-selector">
            <button 
              onClick={() => setView('impositiva')} 
              className={view === 'impositiva' ? 'active' : ''}
            >
              Emenda Impositiva
            </button>
            <button 
              onClick={() => setView('modificativa')} 
              className={view === 'modificativa' ? 'active' : ''}
            >
              Emenda Modificativa
            </button>
          </div>
        )}

        {/* Renderização condicional das três visualizações */}
        {view === 'admin' && <AdminDashboard />}
        {view === 'impositiva' && <EmendaForm />}
        {view === 'modificativa' && <EmendaModificativaForm />}
      </main>
    </div>
  );
}

export default App;