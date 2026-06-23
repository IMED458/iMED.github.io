import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

interface Props {
  contentRef: React.RefObject<HTMLDivElement | null>;
  documentTitle?: string;
  className?: string;
  disabled?: boolean;
  onBeforePrint?: () => void;
}

export default function PrintButton({
  contentRef,
  documentTitle = 'iMED დოკუმენტი',
  className = '',
  disabled = false,
  onBeforePrint,
}: Props) {
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle,
    onBeforePrint: async () => {
      onBeforePrint?.();
    },
    pageStyle: `
      @page {
        size: A4;
        margin: 14mm 14mm 18mm 14mm;
      }
      @media print {
        body {
          font-family: 'Noto Sans Georgian', 'Sylfaen', sans-serif;
          font-size: 11pt;
          color: #000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* ფერადი ფონების მოცილება — ბეჭდვა სუფთა, თეთრ ფურცელზე */
        * {
          background-image: none !important;
          box-shadow: none !important;
          color: #000 !important;
        }
        [class*="bg-"], .bg-white, [style*="background"] {
          background-color: #fff !important;
          background: #fff !important;
        }
        .rounded-xl, .rounded-lg, .border, [class*="border-"] {
          border-color: #d1d5db !important;
        }
        .no-print { display: none !important; }
        .print-only { display: block !important; }
        .print-title-page { display: block !important; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #999; padding: 4px 6px; }
        /* მონიშნული/ფერადი ბარკოდი — შავი დარჩეს */
        svg rect[fill="#000"] { fill: #000 !important; }
        .receipt-copy { page-break-inside: avoid; }
      }
      .print-title-page { display: none; }
    `,
  });

  return (
    <button
      onClick={() => handlePrint()}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm ${className}`}
    >
      <Printer size={16} />
      ბეჭდვა
    </button>
  );
}
