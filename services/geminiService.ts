
import { GoogleGenAI, Type } from "@google/genai";

// Always use direct process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getBarcodeInsights = async (code: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze this EAN-13 barcode: ${code}.
        1. Identify the country of origin based on the GS1 prefix.
        2. Explain the structure (Manufacturer, Product codes).
        3. Suggest 3 common product categories this barcode might belong to.
        4. Provide the info in Turkish.
        Return as Markdown.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Analiz alınamadı. Lütfen internet bağlantınızı kontrol edin.";
  }
};

export const generateBulkCodes = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User wants to generate barcodes based on this prompt: "${prompt}". 
      Suggest a list of valid 12-digit numbers that would make good barcodes for these items.`,
      config: {
        responseMimeType: "application/json",
        // Use responseSchema for structured JSON output as recommended
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: {
                type: Type.STRING,
                description: 'The 12-digit base barcode number.',
              },
              label: {
                type: Type.STRING,
                description: 'The product name or label.',
              },
              productCode: {
                type: Type.STRING,
                description: 'A short product identifier or SKU.',
              },
            },
            required: ['code', 'label', 'productCode'],
          },
        },
      },
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Bulk Generation Error:", error);
    return [];
  }
};
