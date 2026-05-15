import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeEnergyConsumption(data: {
  clientCity: string;
  avgConsumption: number;
  monthlyConsumptions: number[];
  panelPower: number;
  inverterBrand: string;
}) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Você é um especialista em energia solar fotovoltaica. 
    Analise os seguintes dados de um cliente e forneça uma recomendação técnica curta e persuasiva (máximo 500 caracteres).
    
    Dados:
    - Cidade: ${data.clientCity}
    - Consumo Médio: ${data.avgConsumption} kWh/mês
    - Histórico (se houver): ${data.monthlyConsumptions.join(', ')}
    - Painel: ${data.panelPower}Wp
    - Inversor: ${data.inverterBrand}
    
    O que você deve fornecer:
    1. Uma breve análise da viabilidade.
    2. Uma dica técnica para aumentar a eficiência.
    3. Uma frase de fechamento impactante.
    
    Responda em Português do Brasil.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, não consegui processar a análise agora. Por favor, tente novamente mais tarde.";
  }
}
