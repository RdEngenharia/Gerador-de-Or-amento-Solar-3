import React from 'react';
import { CompanyConfig } from '../types';
import { Building2, CreditCard, Phone, Palette } from 'lucide-react';

interface ConfigPageProps {
  config: CompanyConfig;
  onUpdate: (newConfig: Partial<CompanyConfig>) => void;
}

export default function ConfigPage({ config, onUpdate }: ConfigPageProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-8 uppercase italic border-l-8 border-orange-600 pl-4">
          Dados da Empresa
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* NOME E CNPJ */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Building2 size={12} className="text-orange-600" /> Razão Social ou Nome Fantasia
              </label>
              <input 
                type="text" 
                value={config.razao} 
                onChange={e => onUpdate({ razao: e.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <CreditCard size={12} className="text-orange-600" /> CNPJ / CPF Profissional
              </label>
              <input 
                type="text" 
                value={config.cnpj} 
                onChange={e => onUpdate({ cnpj: e.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Phone size={12} className="text-orange-600" /> Telefone / WhatsApp
              </label>
              <input 
                type="text" 
                value={config.tel} 
                onChange={e => onUpdate({ tel: e.target.value })}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none font-bold text-slate-700"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* PALETA DE CORES */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <h3 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              <Palette size={12} className="text-orange-600" /> Identidade Visual do PDF
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Cor Temática principais:</span>
                <input 
                  type="color" 
                  value={config.themeColor} 
                  onChange={e => onUpdate({ themeColor: e.target.value })}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Cor Gráfico (Consumo):</span>
                <input 
                  type="color" 
                  value={config.chartColor1} 
                  onChange={e => onUpdate({ chartColor1: e.target.value })}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Cor Gráfico (Geração):</span>
                <input 
                  type="color" 
                  value={config.chartColor2} 
                  onChange={e => onUpdate({ chartColor2: e.target.value })}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white shadow-sm"
                />
              </div>
            </div>

            <div className="mt-8 p-4 bg-white rounded-2xl border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-300 uppercase mb-3">Exemplo do Layout</h4>
              <div className="flex gap-2 h-8">
                <div className="w-1/2 rounded-md" style={{ backgroundColor: config.themeColor }}></div>
                <div className="w-1/4 rounded-md" style={{ backgroundColor: config.chartColor1 }}></div>
                <div className="w-1/4 rounded-md" style={{ backgroundColor: config.chartColor2 }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
