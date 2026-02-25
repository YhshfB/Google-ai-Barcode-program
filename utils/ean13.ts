
import { EAN13Validation } from '../types';

export const calculateEAN13Checksum = (code: string): number => {
  const digits = code.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
};

export const validateEAN13 = (code: string): EAN13Validation => {
  const cleanCode = code.replace(/\s/g, '');
  if (!/^\d{12,13}$/.test(cleanCode)) {
    return { isValid: false, message: 'Barkod tam olarak 12 veya 13 rakamdan oluşmalıdır.' };
  }

  const baseCode = cleanCode.substring(0, 12);
  const providedChecksum = cleanCode.length === 13 ? parseInt(cleanCode[12]) : null;
  const calculatedChecksum = calculateEAN13Checksum(baseCode);

  if (providedChecksum !== null && providedChecksum !== calculatedChecksum) {
    return { 
      isValid: false, 
      message: `Geçersiz kontrol basamağı. Beklenen: ${calculatedChecksum}`,
      checksum: calculatedChecksum 
    };
  }

  return { isValid: true, message: 'Geçerli EAN-13 barkodu.', checksum: calculatedChecksum };
};

// Simplified EAN-13 Encoding patterns
// L: Left-hand odd parity, G: Left-hand even parity, R: Right-hand
const L_PATTERNS = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G_PATTERNS = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R_PATTERNS = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];

const FIRST_DIGIT_PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

export const generateEAN13Binary = (code: string): string => {
  const digits = code.split('').map(Number);
  const firstDigit = digits[0];
  const parityPattern = FIRST_DIGIT_PARITY[firstDigit];
  
  let binary = "101"; // Left guard

  // Left 6 digits
  for (let i = 1; i <= 6; i++) {
    const digit = digits[i];
    const parity = parityPattern[i - 1];
    binary += (parity === 'L' ? L_PATTERNS[digit] : G_PATTERNS[digit]);
  }

  binary += "01010"; // Center guard

  // Right 6 digits
  for (let i = 7; i <= 12; i++) {
    binary += R_PATTERNS[digits[i]];
  }

  binary += "101"; // Right guard
  return binary;
};
