export interface CompanyConfig {
  razao: string;
  cnpj: string;
  tel: string;
  logo: string;
  themeColor: string;
  chartColor1: string;
  chartColor2: string;
  inverterImage: string;
  panelImage: string;
}

export interface CompensationUnit {
  id: string;
  contractNumber: string;
  consumption: string;
}

export interface Equipment {
  description: string;
}

export type Page = 'budget' | 'photos' | 'config';
