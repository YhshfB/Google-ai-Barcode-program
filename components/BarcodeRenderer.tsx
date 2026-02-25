
import React from 'react';
import { generateEAN13Binary } from '../utils/ean13';

interface BarcodeRendererProps {
  code: string;
  width?: number;
  height?: number;
}

const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({ code, width = 200, height = 100 }) => {
  if (code.length < 13) return null;

  const binary = generateEAN13Binary(code);
  const barWidth = width / binary.length;

  return (
    <div className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
      <div className="bg-white p-2 rounded-lg inline-block">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {binary.split('').map((bit, index) => {
            if (bit === '1') {
              return (
                <rect
                  key={index}
                  x={index * barWidth}
                  y={0}
                  width={barWidth + 0.1} // small overlap to avoid rendering gaps
                  height={height}
                  fill="black"
                />
              );
            }
            return null;
          })}
        </svg>
      </div>
      <div className="mt-4 flex justify-between w-full px-2 mono text-lg font-bold tracking-widest text-slate-800">
        <span>{code[0]}</span>
        <div className="flex gap-2">
          <span>{code.substring(1, 7)}</span>
          <span>{code.substring(7, 13)}</span>
        </div>
      </div>
    </div>
  );
};

export default BarcodeRenderer;
