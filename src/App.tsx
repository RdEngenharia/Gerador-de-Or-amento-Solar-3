import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Settings, 
  Image as ImageIcon, 
  FileText, 
  ChevronRight,
  Sun,
  LayoutDashboard
} from 'lucide-react';
import { Page, CompanyConfig } from './types';
import PhotosPage from './components/PhotosPage';
import ProposalForm from './components/ProposalForm';
import ConfigPage from './components/ConfigPage';

// Chave para armazenamento local
const STORAGE_KEY_CONFIG = 'rd_solar_config';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('budget');
  
  // --- ESTADO DE CONFIGURAÇÃO DA EMPRESA ---
  // Inicializa a partir do localStorage para manter os dados salvos
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar do localStorage", e);
      }
    }
    return {
      razao: 'RD Solar',
      cnpj: '',
      tel: '',
      logo: '',
      themeColor: '#ea580c',
      chartColor1: '#b0bec5',
      chartColor2: '#f97316',
      inverterImage: '',
      panelImage: ''
    };
  });

  // --- PERSISTÊNCIA AUTOMÁTICA ---
  // Sempre que a configuração mudar (incluindo as fotos), salva no localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(companyConfig));
  }, [companyConfig]);

  const updateCompanyConfig = (newConfig: Partial<CompanyConfig>) => {
    setCompanyConfig(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col p-6 sticky top-0 h-auto md:h-screen z-40">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-orange-500 p-2 rounded-xl">
            <Sun className="text-white" size={24} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic leading-none">RD SOLAR</h1>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Gerador Pro</span>
          </div>
        </div>

        <nav className="space-y-2 flex-grow">
          <NavItem 
            active={currentPage === 'budget'} 
            onClick={() => setCurrentPage('budget')} 
            icon={<Calculator size={20} />} 
            label="Novo Orçamento" 
          />
          <NavItem 
            active={currentPage === 'photos'} 
            onClick={() => setCurrentPage('photos')} 
            icon={<ImageIcon size={20} />} 
            label="Fotos do PDF" 
          />
          <NavItem 
            active={currentPage === 'config'} 
            onClick={() => setCurrentPage('config')} 
            icon={<Settings size={20} />} 
            label="Minha Empresa" 
          />
        </nav>

        {/* PERFIL RESUMO NO RODAPÉ DA SIDEBAR */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            {companyConfig.logo ? (
              <img src={companyConfig.logo} className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
            ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <LayoutDashboard size={18} className="text-slate-500" />
                </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{companyConfig.razao}</p>
              <p className="text-[10px] text-slate-500 truncate">{companyConfig.tel || 'Sem telefone'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-grow p-4 md:p-10 max-h-screen overflow-y-auto custom-scroll">
        <div className="max-w-5xl mx-auto">
          {currentPage === 'budget' && (
            <ProposalForm companyConfig={companyConfig} />
          )}
          
          {currentPage === 'photos' && (
            <PhotosPage config={companyConfig} onUpdate={updateCompanyConfig} />
          )}

          {currentPage === 'config' && (
            <ConfigPage config={companyConfig} onUpdate={updateCompanyConfig} />
          )}
        </div>
      </main>

    </div>
  );
}

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ active, onClick, icon, label }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group ${
        active 
          ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm font-bold tracking-tight">{label}</span>
      </div>
      <ChevronRight 
        size={16} 
        className={`transition-transform duration-300 ${active ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} 
      />
    </button>
  );
}
