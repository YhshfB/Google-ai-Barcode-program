
export interface BarcodeData {
  id: string;
  code: string;
  label: string;
  productCode?: string;
  timestamp: number;
  aiInsights?: string;
  country?: string;
}

export interface EAN13Validation {
  isValid: boolean;
  message: string;
  checksum?: number;
}
