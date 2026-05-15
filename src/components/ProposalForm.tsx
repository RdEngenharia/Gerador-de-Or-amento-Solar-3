import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Zap, 
  HardHat, 
  MapPin, 
  Plus, 
  Trash2, 
  FileDown, 
  Info,
  Calendar,
  Layers,
  Sun,
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { CompanyConfig, CompensationUnit, Equipment } from '../types';
import { hspCapitais, inversoresPadrao, paineisPadrao } from '../lib/constants';
import { jsPDF } from 'jspdf';
import { Chart, registerables } from 'chart.js';
import { analyzeEnergyConsumption } from '../services/gemini';

Chart.register(...registerables);

interface ProposalFormProps {
  companyConfig: CompanyConfig;
}

export default function ProposalForm({ companyConfig }: ProposalFormProps) {
  // --- ESTADOS DO CLIENTE ---
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [ugContract, setUgContract] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);

  // --- ESTADOS DE CONSUMO ---
  const [consumptionType, setConsumptionType] = useState<'media' | 'individual'>('media');
  const [avgConsumption, setAvgConsumption] = useState('');
  const [monthlyConsumptions, setMonthlyConsumptions] = useState<string[]>(Array(12).fill(''));
  const [simultaneity, setSimultaneity] = useState(0.3); // 30% padrão
  const [compensationUnits, setCompensationUnits] = useState<CompensationUnit[]>([]);

  // --- ESTADOS TÉCNICOS ---
  const [cityHsp, setCityHsp] = useState(5.22); 
  const [inverterBrand, setInverterBrand] = useState(inversoresPadrao[0]);
  const [manualInverter, setManualInverter] = useState('');
  const [inverterWarranty, setInverterWarranty] = useState('10');
  const [panelBrand, setPanelBrand] = useState(paineisPadrao[0]);
  const [manualPanel, setManualPanel] = useState('');
  const [panelPower, setPanelPower] = useState(575);
  const [panelWarranty, setPanelWarranty] = useState('12');
  const [manualEquipment, setManualEquipment] = useState<Equipment[]>([]);
  
  // --- ESTADOS FINANCEIROS ---
  const [overrideQtdP, setOverrideQtdP] = useState('');
  const [calculatedQtdP, setCalculatedQtdP] = useState<number | null>(null);
  const [kitValue, setKitValue] = useState(0);
  const [formattedKitValue, setFormattedKitValue] = useState('');
  const [laborValue, setLaborValue] = useState(0);
  const [formattedLaborValue, setFormattedLaborValue] = useState('');
  
  // Coeficientes de financiamento (exemplo: BV/Santander)
  const financingCoeff = { 24: 0.058, 36: 0.045, 48: 0.038, 60: 0.034 };

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- LÓGICA DE DIMENSIONAMENTO ORIGINAL ---
  useEffect(() => {
    const pot = parseFloat(panelPower.toString() || '0');
    if (pot <= 0) return setCalculatedQtdP(null);
    
    let mediaUG = 0;
    if (consumptionType === 'media') {
      mediaUG = parseFloat(avgConsumption || '0');
    } else {
      const valid = monthlyConsumptions.map(v => parseFloat(v || '0')).filter(v => v > 0);
      if (valid.length > 0) mediaUG = valid.reduce((a, b) => a + b, 0) / valid.length;
    }
    
    // Soma o consumo de todas as unidades de rateio
    const totalComp = compensationUnits.reduce((acc, u) => acc + (parseFloat(u.consumption) || 0), 0);
    const totalNec = mediaUG + totalComp;

    if (totalNec <= 0) return setCalculatedQtdP(null);
    
    // Fórmula: (Consumo mensal / 30 dias) / (HSP Cidade * Eficiência Sistema 80%)
    const kwpNec = (totalNec / 30) / (cityHsp * 0.80);
    // Quantidade = (kWp necessário * 1000 p/ watts) / Potência do Painel
    setCalculatedQtdP(Math.ceil((kwpNec * 1000) / pot));
  }, [consumptionType, avgConsumption, monthlyConsumptions, panelPower, cityHsp, compensationUnits]);

  // --- FUNÇÕES DE AUXÍLIO ---
  const formatCurrency = (v: number) => 
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCurrencyInput = (val: string, setterValue: (v: number) => void, setterFormatted: (v: string) => void) => {
    const numeric = val.replace(/\D/g, '');
    const num = numeric ? parseInt(numeric, 10) / 100 : 0;
    setterValue(num);
    setterFormatted(num === 0 ? '' : formatCurrency(num));
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // --- GERAÇÃO DE PDF ---
  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const theme = hexToRgb(companyConfig.themeColor);
      const qtd = overrideQtdP ? Number(overrideQtdP) : (calculatedQtdP || 0);
      const totalInvest = kitValue + laborValue;
      const totalKwp = ((qtd * Number(panelPower)) / 1000).toFixed(2);
      
      // Definições de taxa para economia estimada
      const custoKwhInjetado = 0.22; // Valor estimado de encargos sobre o excedente
      const taxaMinima = 50.00; // Taxa de disponibilidade média

      let mediaUG = consumptionType === 'media' ? parseFloat(avgConsumption || '0') : 
          (monthlyConsumptions.reduce((a, b) => Number(a) + Number(b), 0) / 12);
      
      // Cálculo de fatura estimada
      const injetadoUG = mediaUG * (1 - simultaneity);
      const faturaUG = Math.max(taxaMinima, (injetadoUG * custoKwhInjetado));

      // --- CABEÇALHO ---
      doc.setFillColor(...theme);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255);
      doc.setFontSize(20);
      doc.text(companyConfig.razao, 15, 12);
      
      doc.setFontSize(8);
      doc.text(`CNPJ: ${companyConfig.cnpj || "Não informado"}`, 15, 18);
      doc.text(`WhatsApp: ${companyConfig.tel || "Não informado"}`, 15, 23);
      doc.text("Soluções Inteligentes em Energia Fotovoltaica", 15, 28);
      
      if (companyConfig.logo) {
        try { doc.addImage(companyConfig.logo, 'PNG', 165, 3, 30, 25); } catch(e){}
      }

      // --- DADOS CLIENTE ---
      let y = 45;
      doc.setTextColor(40);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("PROPOSTA TÉCNICO-COMERCIAL", 15, y);
      
      y += 8;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Cliente: ${clientName || "Não identificado"}`, 15, y);
      doc.text(`Doc: ${clientDoc || "---"}`, 120, y);
      y += 4;
      doc.text(`Endereço: ${clientAddress || "---"}`, 15, y);
      y += 4;
      doc.text(`Data: ${new Date(quoteDate).toLocaleDateString('pt-BR')}`, 15, y);

      // --- GRÁFICO (Canvas oculto) ---
      if (chartCanvasRef.current) {
        const ctx = chartCanvasRef.current.getContext('2d');
        if (ctx) {
          const consData = consumptionType === 'media' ? Array(12).fill(avgConsumption) : monthlyConsumptions.map(v => Number(v));
          const genData = Array(12).fill((qtd * Number(panelPower) * cityHsp * 30 * 0.8 / 1000));
          
          const chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
              datasets: [
                { label: 'Consumo', data: consData.map(c => Number(c) || 0), backgroundColor: companyConfig.chartColor1 },
                { label: 'Geração', data: genData, backgroundColor: companyConfig.chartColor2 }
              ]
            },
            options: { animation: false, responsive: false, devicePixelRatio: 2 }
          });
          
          const chartImg = chart.toBase64Image();
          doc.addImage(chartImg, 'PNG', 15, y + 4, 180, 50);
          chart.destroy();
        }
      }

      y += 60;

      // --- ESPECIFICAÇÕES TÉCNICAS ---
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 40, 'F');
      doc.setTextColor(...theme);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("ENGENHARIA E EQUIPAMENTOS", 20, y + 8);
      
      doc.setTextColor(60);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      const finalInv = inverterBrand === 'Outro' ? manualInverter : inverterBrand;
      const finalPan = panelBrand === 'Outro' ? manualPanel : panelBrand;

      doc.text(`• Potência do Sistema: ${totalKwp} kWp`, 20, y + 16);
      doc.text(`• Módulos Solar: ${qtd}x ${finalPan} ${panelPower}Wp`, 20, y + 21);
      doc.text(`• Inversor: ${finalInv} (Gar. ${inverterWarranty} Anos)`, 20, y + 26);
      doc.text(`• Produção Estimada: ${(Number(totalKwp) * cityHsp * 30 * 0.8).toFixed(0)} kWh/mês`, 20, y + 31);

      // Adiciona fotos do Inversor/Painel se existirem
      if (companyConfig.panelImage) try { doc.addImage(companyConfig.panelImage, 'PNG', 160, y + 8, 22, 22); } catch(e){}
      if (companyConfig.inverterImage) try { doc.addImage(companyConfig.inverterImage, 'PNG', 130, y + 8, 22, 22); } catch(e){}

      y += 48;

      // --- ECONOMIA ESTIMADA ---
      doc.setTextColor(...theme);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("ESTIMATIVA DE NOVAS FATURAS (Pós-Solar)", 15, y);
      
      doc.setTextColor(60);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      y += 6;
      doc.text(`Unidade Geradora (${ugContract || 'Principal'}): ~ ${formatCurrency(faturaUG)} (Consumo + Taxa)`, 15, y);
      
      compensationUnits.forEach((unit, idx) => {
        y += 5;
        const cons = parseFloat(unit.consumption) || 0;
        const f = Math.max(taxaMinima, (cons * custoKwhInjetado));
        doc.text(`Unidade Rateio (${unit.contractNumber || 'Contrato'}): ~ ${formatCurrency(f)} (Incluso Taxa Mínima)`, 15, y);
      });

      if (aiAnalysis) {
        y += 10;
        doc.setTextColor(...theme);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text("ANÁLISE DO ESPECIALISTA IA", 15, y);
        doc.setTextColor(80);
        doc.setFontSize(7);
        doc.setFont(undefined, 'italic');
        const lines = doc.splitTextToSize(aiAnalysis, 180);
        doc.text(lines, 15, y + 5);
        y += (lines.length * 3.5) + 4;
      } else {
        y += 8;
      }

      // --- INVESTIMENTO ---
      doc.setFillColor(...theme);
      doc.rect(15, y, 180, 16, 'F');
      doc.setTextColor(255);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`INVESTIMENTO TOTAL: ${formatCurrency(totalInvest)}`, 25, y + 10);

      // --- RETORNO FINANCEIRO (PAYBACK) ---
      y += 22;
      doc.setTextColor(...theme);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("RETORNO FINANCEIRO E ECONOMIA", 15, y);

      const tariff = 0.95;
      const totalMonthlyCons = consumptionType === 'media' ? parseFloat(avgConsumption || '0') : 
        (monthlyConsumptions.reduce((a, b) => Number(a) + Number(b), 0) / 12);
      const totalCompCons = compensationUnits.reduce((acc, u) => acc + (parseFloat(u.consumption) || 0), 0);
      const totalSystemCons = totalMonthlyCons + totalCompCons;
      
      const currentMonthlyBill = totalSystemCons * tariff;
      const totalRateioFatura = compensationUnits.reduce((acc, u) => {
        const c = parseFloat(u.consumption) || 0;
        return acc + Math.max(taxaMinima, (c * custoKwhInjetado));
      }, 0);
      const newEstimatedBill = faturaUG + totalRateioFatura;
      const monthlySaving = currentMonthlyBill - newEstimatedBill;

      const paybackMonths = monthlySaving > 0 ? totalInvest / monthlySaving : 0;

      y += 8;
      doc.setTextColor(60);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`• Payback (Retorno do Investimento): ~ ${(paybackMonths / 12).toFixed(1)} anos`, 15, y);
      doc.text(`• Economia Estimada (25 anos): ~ ${formatCurrency(monthlySaving * 12 * 25)}`, 110, y);

      // --- FINANCIAMENTO ---
      y += 12;
      doc.setTextColor(...theme);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("OPÇÕES DE FINANCIAMENTO (Estimado)", 15, y);
      
      y += 8;
      doc.setTextColor(60);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`• 24x de ${formatCurrency(totalInvest * financingCoeff[24])}`, 15, y);
      doc.text(`• 36x de ${formatCurrency(totalInvest * financingCoeff[36])}`, 65, y);
      doc.text(`• 48x de ${formatCurrency(totalInvest * financingCoeff[48])}`, 115, y);
      doc.text(`• 60x de ${formatCurrency(totalInvest * financingCoeff[60])}`, 165, y);
      
      y += 6;
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text("* Valores sujeitos a análise de crédito e alteração sem aviso prévio.", 15, y);

      // SALVAMENTO
      doc.save(`Proposta_${clientName || 'RD_Solar'}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar PDF. Verifique os dados.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeEnergyConsumption({
      clientCity: hspCapitais.find(c => c.hsp === cityHsp)?.capital || 'Desconhecida',
      avgConsumption: Number(avgConsumption) || 0,
      monthlyConsumptions: monthlyConsumptions.map(v => Number(v) || 0),
      panelPower: Number(panelPower),
      inverterBrand
    });
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* 1. CABEÇALHO DO FORMULÁRIO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Novo Orçamento</h2>
          <p className="text-slate-400 text-sm font-medium">Preencha os dados abaixo para gerar a proposta técnica.</p>
        </div>
        <button 
          onClick={generatePDF}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 active:scale-95 disabled:bg-slate-400"
        >
          {isGenerating ? 'Processando...' : <><FileDown size={18} /> Gerar Proposta PDF</>}
        </button>
      </div>

      {/* 2. DADOS DO CLIENTE */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="md:col-span-2 flex items-center gap-2 mb-2">
            <Users className="text-orange-600" size={18} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Perfil do Cliente</span>
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Nome Completo</label>
          <input 
            type="text" 
            value={clientName} 
            onChange={e => setClientName(e.target.value)}
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold"
            placeholder="Ex: João Silva"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">CPF / CNPJ</label>
          <input 
            type="text" 
            value={clientDoc} 
            onChange={e => setClientDoc(e.target.value)}
            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold"
            placeholder="000.000.000-00"
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Endereço da Instalação</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              value={clientAddress} 
              onChange={e => setClientAddress(e.target.value)}
              className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold"
              placeholder="Rua, Número, Bairro, Cidade - UF"
            />
          </div>
        </div>
      </div>

      {/* 3. CONSUMO E ENERGIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* UNIDADE GERADORA */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center gap-2">
                    <Zap className="text-orange-600" size={18} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Unidade Geradora (UG)</span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                  <span className="text-[8px] font-black text-slate-400 uppercase ml-2 mr-1">Simultaneidade:</span>
                  {[0.3, 0.5, 0.7].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setSimultaneity(val)}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${simultaneity === val ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-orange-600'}`}
                    >
                      {val * 100}%
                    </button>
                  ))}
                </div>

                <select 
                    value={consumptionType} 
                    onChange={e => setConsumptionType(e.target.value as any)}
                    className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none"
                >
                    <option value="media">Média Mensal</option>
                    <option value="individual">Consumo 12 Meses</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Conta Contrato / UC</label>
                    <input 
                        type="text" 
                        value={ugContract} 
                        onChange={e => setUgContract(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold"
                    />
                </div>
                
                {consumptionType === 'media' ? (
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Média de Consumo (kWh)</label>
                        <input 
                            type="number" 
                            value={avgConsumption} 
                            onChange={e => setAvgConsumption(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-orange-600 text-xl"
                            placeholder="0"
                        />
                    </div>
                ) : (
                    <div className="md:col-span-2 grid grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                        {monthlyConsumptions.map((val, i) => (
                            <div key={i}>
                                <label className="text-[8px] font-black text-slate-300 uppercase block text-center mb-1">Mês {i+1}</label>
                                <input 
                                    type="number" 
                                    value={val} 
                                    onChange={e => {
                                        const newVals = [...monthlyConsumptions];
                                        newVals[i] = e.target.value;
                                        setMonthlyConsumptions(newVals);
                                    }}
                                    className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-center font-bold text-xs outline-none"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* UNIDADES DE RATEIO */}
            <div className="mt-10 pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Layers className="text-orange-600" size={16} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades de Rateio</span>
                    </div>
                    <button 
                        onClick={() => setCompensationUnits([...compensationUnits, { id: Math.random().toString(), contractNumber: '', consumption: '' }])}
                        className="text-[10px] font-black text-orange-600 flex items-center gap-1 hover:underline"
                    >
                        <Plus size={14} /> ADICIONAR UNIDADE
                    </button>
                </div>

                <div className="space-y-4">
                    {compensationUnits.map(unit => (
                        <div key={unit.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-slate-50 p-4 rounded-2xl">
                             <div className="md:col-span-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Conta Contrato</label>
                                <input 
                                    type="text" 
                                    value={unit.contractNumber}
                                    onChange={e => setCompensationUnits(prev => prev.map(u => u.id === unit.id ? {...u, contractNumber: e.target.value} : u))}
                                    className="w-full p-2 rounded-lg border-none shadow-sm text-sm"
                                />
                             </div>
                             <div className="md:col-span-2">
                                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Consumo (kWh)</label>
                                <input 
                                    type="number" 
                                    value={unit.consumption}
                                    onChange={e => setCompensationUnits(prev => prev.map(u => u.id === unit.id ? {...u, consumption: e.target.value} : u))}
                                    className="w-full p-2 rounded-lg border-none shadow-sm text-sm"
                                />
                             </div>
                             <button 
                                onClick={() => setCompensationUnits(prev => prev.filter(u => u.id !== unit.id))}
                                className="bg-red-50 text-red-500 p-2 rounded-lg flex justify-center hover:bg-red-500 hover:text-white transition-colors"
                             >
                                <Trash2 size={16} />
                             </button>
                        </div>
                    ))}
                    {compensationUnits.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                            <p className="text-xs text-slate-300 font-medium italic">Nenhuma unidade de rateio vinculada</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* DIMENSIONAMENTO */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <Sun className="absolute -top-10 -right-10 text-orange-600 opacity-20" size={200} />
            <div className="relative z-10">
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Resumo Técnico</span>
                <h3 className="text-2xl font-black mt-2 mb-10 leading-none">Dimensionamento<br/>Sugerido</h3>

                <div className="space-y-8">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-bold">kWp Necessário</span>
                        <span className="text-xl font-black text-orange-500">{(calculatedQtdP ? (calculatedQtdP * panelPower / 1000).toFixed(2) : '0.00')} kWp</span>
                    </div>
                    
                    <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Painéis Sugeridos</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black">{calculatedQtdP || 0}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase">Módulos</span>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 mt-2 italic">Baseado em HSP {cityHsp} para {panelPower}Wp</p>
                    </div>

                    <div className="bg-orange-600 p-6 rounded-3xl">
                        <p className="text-[10px] font-bold text-orange-200 uppercase tracking-widest mb-1 text-center">Produção Estimada</p>
                        <p className="text-3xl font-black text-center">~ {(calculatedQtdP ? (calculatedQtdP * panelPower * cityHsp * 30 * 0.8 / 1000).toFixed(0) : '0')} <span className="text-sm">kWh/mês</span></p>
                    </div>

                    {/* PAYBACK UI */}
                    {kitValue + laborValue > 0 && (
                      <div className="bg-slate-800/80 p-6 rounded-3xl border border-slate-700">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Payback Estimado</p>
                        <p className="text-4xl font-black text-white text-center">
                          {(() => {
                            const tariff = 0.95;
                            const totalInvest = kitValue + laborValue;
                            const totalMonthlyCons = consumptionType === 'media' ? parseFloat(avgConsumption || '0') : 
                              (monthlyConsumptions.reduce((a, b) => Number(a) + Number(b), 0) / 12);
                            const totalCompCons = compensationUnits.reduce((acc, u) => acc + (parseFloat(u.consumption) || 0), 0);
                            const totalSystemCons = totalMonthlyCons + totalCompCons;
                            
                            const currentMonthlyBill = totalSystemCons * tariff;
                            const injetadoUG = (consumptionType === 'media' ? parseFloat(avgConsumption || '0') : (monthlyConsumptions.reduce((a, b) => Number(a) + Number(b), 0) / 12)) * (1 - simultaneity);
                            const fUG = Math.max(50, (injetadoUG * 0.22));
                            const fRateio = compensationUnits.reduce((acc, u) => acc + Math.max(50, (parseFloat(u.consumption) || 0) * 0.22), 0);
                            
                            const savings = currentMonthlyBill - (fUG + fRateio);
                            return savings > 0 ? (totalInvest / savings / 12).toFixed(1) : '0';
                          })()} <span className="text-sm text-slate-400 font-bold uppercase">Anos</span>
                        </p>
                      </div>
                    )}

                    {/* AI ASSISTANT SECTION */}
                    <div className="mt-8 pt-6 border-t border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="text-orange-400" size={16} />
                          <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Assistente IA</span>
                        </div>
                        <button 
                          onClick={handleAIAnalysis}
                          disabled={isAnalyzing}
                          className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                          title="Analisar com IA"
                        >
                          <RefreshCcw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                        </button>
                      </div>
                      
                      {aiAnalysis ? (
                        <div className="bg-slate-800/80 p-4 rounded-2xl text-[10px] leading-relaxed text-slate-300 font-medium italic animate-in fade-in zoom-in duration-300">
                          {aiAnalysis}
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-500 italic text-center">
                          Clique em analisar para obter recomendações técnicas inteligentes.
                        </p>
                      )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 4. ESPECIFICAÇÕES TÉCNICAS */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        <div className="flex items-center gap-2 mb-8 uppercase tracking-[0.2em]">
            <HardHat className="text-orange-600" size={18} />
            <span className="text-[10px] font-black text-slate-400">Engenharia e Equipamentos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Cidade Base (HSP)</label>
                <select 
                    value={cityHsp} 
                    onChange={e => setCityHsp(Number(e.target.value))}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none"
                >
                    {hspCapitais.map(c => <option key={c.capital} value={c.hsp}>{c.capital} ({c.hsp})</option>)}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Marca Inversor</label>
                <select 
                    value={inverterBrand} 
                    onChange={e => setInverterBrand(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none"
                >
                    {inversoresPadrao.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Marca Painel</label>
                <select 
                    value={panelBrand} 
                    onChange={e => setPanelBrand(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none"
                >
                    {paineisPadrao.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Potência Painel (W)</label>
                <input 
                    type="number" 
                    value={panelPower} 
                    onChange={e => setPanelPower(Number(e.target.value))}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none"
                />
            </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-1/3">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1">
                    Definir Quantidade Manualmente <Info size={12} className="text-blue-500" />
                </label>
                <input 
                    type="number" 
                    value={overrideQtdP} 
                    onChange={e => setOverrideQtdP(e.target.value)}
                    placeholder={`Automático: ${calculatedQtdP || 0}`}
                    className="w-full p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl font-black text-orange-600 outline-none"
                />
            </div>
            <div className="hidden md:block flex-grow">
                <p className="text-[10px] text-slate-400 uppercase font-black italic tracking-widest text-right">
                    Kit Solar RD PRÓ - Garantia de Desempenho e Tecnologia
                </p>
            </div>
        </div>
      </div>

      {/* 5. INVESTIMENTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Composição de Preços</span>
              
              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 italic">Valor do Kit (Materiais)</label>
                  <input 
                    type="text" 
                    value={formattedKitValue} 
                    onChange={e => handleCurrencyInput(e.target.value, setKitValue, setFormattedKitValue)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-600 outline-none focus:border-orange-500"
                    placeholder="R$ 0,00"
                  />
              </div>

              <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 italic">Serviços e Projetos</label>
                  <input 
                    type="text" 
                    value={formattedLaborValue} 
                    onChange={e => handleCurrencyInput(e.target.value, setLaborValue, setFormattedLaborValue)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-600 outline-none focus:border-orange-500"
                    placeholder="R$ 0,00"
                  />
              </div>

              {/* SIMULAÇÃO DE PARCELAMENTO NA UI */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-3">Simulação de Parcelamento (Estimado)</span>
                <div className="grid grid-cols-2 gap-3">
                  {[24, 36, 48, 60].map(month => (
                    <div key={month} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase">{month} Vezes</p>
                      <p className="text-sm font-bold text-slate-700">{formatCurrency((kitValue + laborValue) * financingCoeff[month as keyof typeof financingCoeff])}</p>
                    </div>
                  ))}
                </div>
              </div>
          </div>

          <div className="bg-orange-600 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-black text-orange-200 uppercase tracking-[0.4em] mb-4">Valor Final Proposta</span>
              <h2 className="text-5xl font-black leading-none mb-4">{formatCurrency(kitValue + laborValue)}</h2>
              <p className="text-xs text-orange-200 font-bold uppercase tracking-widest">Opções de parcelamento via Banco BV e Santander em até 84x</p>
          </div>
      </div>

      {/* CANVAS OCULTO PARA CHART.JS */}
      <div className="hidden">
        <canvas ref={chartCanvasRef} width="800" height="400"></canvas>
      </div>

    </div>
  );
}
