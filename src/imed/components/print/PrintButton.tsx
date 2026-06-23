import React from 'react';
import { Printer } from 'lucide-react';
import { printElement } from '../../utils/print';

interface Props {
  contentRef: React.RefObject<HTMLDivElement | null>;
  documentTitle?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  onBeforePrint?: () => void;
}

export default function PrintButton({
  contentRef,
  documentTitle,
  className = '',
  disabled = false,
  label = 'ბეჭდვა',
  onBeforePrint,
}: Props) {
  const handle = () => {
    onBeforePrint?.();
    const prevTitle = document.title;
    if (documentTitle) document.title = documentTitle;
    printElement(contentRef.current);
    if (documentTitle) setTimeout(() => { document.title = prevTitle; }, 1500);
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm no-print ${className}`}
    >
      <Printer size={16} />
      {label}
    </button>
  );
}
