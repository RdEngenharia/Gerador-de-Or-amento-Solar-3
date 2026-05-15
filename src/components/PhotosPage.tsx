import React from 'react';
import { Camera, Trash2, Upload, CheckCircle } from 'lucide-react';
import { CompanyConfig } from '../types';

interface PhotosPageProps {
  config: CompanyConfig;
  onUpdate: (newConfig: Partial<CompanyConfig>) => void;
}

export default function PhotosPage({ config, onUpdate }: PhotosPageProps) {
  
  // Função para lidar com o upload de arquivos transformando em Base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: keyof CompanyConfig) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        onUpdate({ [key]: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (key: keyof CompanyConfig) => {
    onUpdate({ [key]: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase italic border-l-8 border-orange-600 pl-4">
          Galeria de Fotos do PDF
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          Gerencie aqui as imagens que aparecerão na sua proposta comercial. Elas são salvas automaticamente no seu navegador.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* LOGO DA EMPRESA */}
          <PhotoCard 
            title="Logo da Empresa" 
            image={config.logo} 
            onUpload={(e) => handleFileUpload(e, 'logo')} 
            onRemove={() => removePhoto('logo')}
            description="Aparece no cabeçalho de todas as páginas."
          />

          {/* FOTO DO INVERSOR */}
          <PhotoCard 
            title="Foto do Inversor" 
            image={config.inverterImage} 
            onUpload={(e) => handleFileUpload(e, 'inverterImage')} 
            onRemove={() => removePhoto('inverterImage')}
            description="Exibida na seção de especificações técnicas."
          />

          {/* FOTO DO PAINEL */}
          <PhotoCard 
            title="Foto do Painel" 
            image={config.panelImage} 
            onUpload={(e) => handleFileUpload(e, 'panelImage')} 
            onRemove={() => removePhoto('panelImage')}
            description="Exibida junto aos dados do módulo solar."
          />
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex items-start gap-4">
        <CheckCircle className="text-orange-600 w-6 h-6 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-orange-800 text-sm uppercase">Dica de Persistência</h4>
          <p className="text-orange-700 text-xs mt-1 leading-relaxed">
            As fotos são armazenadas no banco de dados local do seu navegador (LocalStorage). 
            Se você limpar os dados de navegação ou trocar de computador, as fotos precisarão ser carregadas novamente.
            Para salvar permanentemente "na nuvem", considere exportar as configurações no futuro.
          </p>
        </div>
      </div>
    </div>
  );
}

interface PhotoCardProps {
  title: string;
  description: string;
  image: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

function PhotoCard({ title, description, image, onUpload, onRemove }: PhotoCardProps) {
  return (
    <div className="group relative flex flex-col bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 transition-all hover:border-orange-400 hover:bg-white hover:shadow-lg">
      <h3 className="font-bold text-slate-700 text-sm mb-1 uppercase tracking-tight">{title}</h3>
      <p className="text-[10px] text-slate-400 mb-4">{description}</p>
      
      <div className="relative aspect-video w-full bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden mb-4 shadow-inner">
        {image ? (
          <>
            <img src={image} alt={title} className="max-h-full max-w-full object-contain p-2" />
            <button 
              onClick={onRemove}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <Trash2 size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-slate-300">
            <Camera size={32} strokeWidth={1.5} />
            <span className="text-[10px] mt-2 font-medium">Nenhuma imagem</span>
          </div>
        )}
      </div>

      <label className="cursor-pointer bg-slate-800 text-white text-center py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-sm">
        <Upload size={14} />
        {image ? 'Trocar Foto' : 'Carregar Foto'}
        <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </label>
    </div>
  );
}
