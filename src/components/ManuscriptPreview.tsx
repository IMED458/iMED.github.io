/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Manuscript } from '../types';
import { ARTICLE_TYPES, formatAMAReference } from '../utils';
import { Printer, Download, BookOpen, Clock, HeartHandshake, CheckCircle2, Award } from 'lucide-react';

interface ManuscriptPreviewProps {
  manuscript: Manuscript;
  onShowNotification?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

// Strip HTML tags for plain text rendering in preview
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Render HTML safely (used in preview)
function RichContent({ html }: { html: string }) {
  if (!html) return null;
  return (
    <div
      className="text-slate-850 text-[14px] leading-relaxed preview-rich"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function ManuscriptPreview({ manuscript, onShowNotification }: ManuscriptPreviewProps) {
  const articleConfig = ARTICLE_TYPES[manuscript.articleType];

  const handlePrint = () => {
    window.print();
    if (onShowNotification) {
      onShowNotification('Opening print dialog. Use "Save as PDF" to download.', 'success');
    }
  };

  const abstractWordCount = Object.values(manuscript.abstractContents)
    .reduce((sum, text) => sum + stripHtml(text || '').split(/\s+/).filter(Boolean).length, 0);

  const bodyWordCount = Object.values(manuscript.sections)
    .reduce((sum, text) => sum + stripHtml(text || '').split(/\s+/).filter(Boolean).length, 0);

  return (
    <div id="manuscript-preview-container" className="space-y-6 animate-fade-in">

      {/* Toolbar */}
      <div className="bg-white border border-slate-250 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 shadow-xs no-print">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-700" />
            Manuscript Preview
          </h4>
          <p className="text-xs text-slate-500">
            Formatted per GBMN style sheet — matches the published journal layout.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manuscript, null, 2));
              const a = document.createElement('a');
              a.href = dataStr;
              a.download = `GBMN_Manuscript_${manuscript.id || 'Draft'}.json`;
              a.click();
              if (onShowNotification) onShowNotification('JSON package exported.', 'info');
            }}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Word count bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center justify-between font-sans text-xs text-slate-600 no-print">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-teal-700" />
          <span>Word diagnostics:</span>
        </div>
        <div className="flex gap-4 font-mono font-medium">
          <span>Abstract: <strong>{abstractWordCount}</strong></span>
          <span>Body: <strong>{bodyWordCount}</strong></span>
          <span>Total: <strong>{abstractWordCount + bodyWordCount}</strong> / {articleConfig?.maxWordCount}</span>
          <span>Refs: <strong>{manuscript.references.length}</strong></span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          THE GBMN JOURNAL PAGE — matches the published template exactly
         ────────────────────────────────────────────────────────────────────── */}
      <div
        id="academic-manuscript-sheet"
        className="bg-white border border-slate-200 shadow-2xl max-w-4xl mx-auto font-serif text-[#111827] leading-relaxed select-text relative"
        style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
      >
        {/* ── TOP HEADER BAR (matches gbmn template) ── */}
        <div className="bg-white border-b-2 border-slate-800 px-10 pt-6 pb-4">
          {/* Logo row */}
          <div className="flex items-start justify-between mb-4">
            {/* Left: GBMN logo simulation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div
                  className="text-white font-black text-2xl px-2 py-1 rounded-sm"
                  style={{ background: '#1a1a2e', fontFamily: 'Arial Black, sans-serif', letterSpacing: '-1px' }}
                >
                  gbmn
                </div>
              </div>
              <div className="ml-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                <div className="font-black text-sm text-gray-900 leading-none">GEORGIAN</div>
                <div className="font-black text-sm text-gray-900 leading-none">BIOMEDICAL</div>
                <div className="font-black text-sm text-gray-900 leading-none">NEWS</div>
              </div>
            </div>
            {/* Right: Volume/Issue info */}
            <div className="text-right" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                VOLUME X. ISSUE X. {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Thin teal separator line */}
          <div className="h-0.5 bg-teal-700 mb-4" />

          {/* Article type badge */}
          <div className="mb-3">
            <span
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              {articleConfig?.name || 'Article'}
            </span>
          </div>

          {/* TITLE — large, bold, centered */}
          <h1
            className="text-2xl font-extrabold text-slate-900 text-center leading-tight mb-4"
            style={{ fontFamily: 'Georgia, serif', fontSize: '22px' }}
          >
            {manuscript.title || '[Article Title]'}
          </h1>

          {/* AUTHORS — centered, normal weight */}
          <div
            className="text-center text-[13px] text-slate-700 mb-3"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {manuscript.authors.length === 0 ? (
              <span className="italic text-slate-400">Author Name¹, Author Name²…</span>
            ) : (
              manuscript.authors.map((a, i) => (
                <span key={a.id}>
                  {a.firstName} {a.middleInitial ? `${a.middleInitial}. ` : ''}{a.lastName}
                  {a.isCorresponding && <span className="text-teal-700 ml-0.5" title="Corresponding">✉</span>}
                  <sup className="text-teal-700 font-semibold ml-0.5">{i + 1}</sup>
                  {i < manuscript.authors.length - 1 && ', '}
                </span>
              ))
            )}
          </div>

          {/* AFFILIATIONS */}
          {manuscript.authors.length > 0 && (
            <div className="text-center text-[10px] text-slate-500 space-y-0.5 mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
              {manuscript.authors.map((a, i) => (
                <p key={a.id}>
                  <sup className="text-teal-700 font-semibold">{i + 1}</sup>{' '}
                  {a.affiliation}
                  {a.isCorresponding && <span className="ml-2 italic">— Corresponding: {a.email}</span>}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── TWO-COLUMN BODY ── */}
        <div className="px-6 py-6 md:columns-2 gap-6 text-[13px] leading-relaxed">

          {/* ABSTRACT — full width, boxed */}
          {articleConfig?.abstractType !== 'none' && (
            <div className="break-inside-avoid mb-6 col-span-2" style={{ columnSpan: 'all' as any }}>
              <div className="border-t border-b border-slate-300 py-3">
                <h2
                  className="text-[10px] font-bold uppercase tracking-widest text-teal-800 mb-2"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  ABSTRACT
                </h2>
                {manuscript.abstractContents['text'] ? (
                  <RichContent html={manuscript.abstractContents['text']} />
                ) : (
                  <p className="text-slate-400 italic text-xs">
                    [Abstract not yet entered. Fill in Step 7.]
                  </p>
                )}
              </div>
            </div>
          )}

          {/* KEYWORDS */}
          {manuscript.sections['Keywords'] && (
            <div className="break-inside-avoid mb-4" style={{ columnSpan: 'all' as any }}>
              <p className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                <strong className="uppercase">Keywords:</strong>{' '}
                <span className="text-slate-700">{manuscript.sections['Keywords']}</span>
              </p>
            </div>
          )}

          {/* MANUSCRIPT SECTIONS */}
          {articleConfig?.requiredSections.filter(s => s !== 'Keywords').map((sectionName) => (
            <div key={sectionName} className="break-inside-avoid mb-5">
              <h2
                className="text-[10px] font-bold uppercase tracking-widest text-teal-800 border-b border-slate-200 pb-1 mb-2"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {sectionName}
              </h2>
              {manuscript.sections[sectionName] ? (
                <RichContent html={manuscript.sections[sectionName]} />
              ) : (
                <p className="text-slate-400 italic text-xs font-mono">
                  [Section empty — edit in Step 9]
                </p>
              )}
            </div>
          ))}
        </div>

        {/* FIGURES & TABLES — full width */}
        {manuscript.figuresAndTables.length > 0 && (
          <div className="px-6 pb-6 border-t border-slate-200 pt-4">
            <h2
              className="text-[10px] font-bold uppercase tracking-widest text-teal-800 mb-4"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              FIGURES AND TABLES
            </h2>
            <div className="space-y-6">
              {manuscript.figuresAndTables.map((item, idx) => (
                <div key={item.id} className="break-inside-avoid">
                  {item.type === 'figure' ? (
                    <div>
                      <div className="border border-slate-300 rounded h-44 bg-slate-50 flex items-center justify-center text-slate-400 text-xs italic mb-1">
                        [ {item.fileName || 'figure_file.png'} ]
                      </div>
                      <p className="text-[10px] text-slate-700" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <strong>FIGURE {idx + 1}.</strong> {item.title}
                        {item.caption && <span> — {item.caption}</span>}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-slate-700 mb-1 font-bold uppercase" style={{ fontFamily: 'Arial, sans-serif' }}>
                        TABLE {idx + 1}. {item.title}
                      </p>
                      {item.tableData ? (
                        <table className="w-full text-[11px] border-collapse border-t border-b border-slate-400" style={{ fontFamily: 'Arial, sans-serif' }}>
                          <tbody>
                            {item.tableData.map((row, rIdx) => (
                              <tr key={rIdx} className={rIdx === 0 ? 'border-b border-slate-400' : 'border-b border-slate-200'}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className={`p-1.5 ${rIdx === 0 ? 'font-bold text-center' : ''}`}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                      {item.caption && (
                        <p className="text-[10px] text-slate-500 mt-1 italic">{item.caption}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DECLARATIONS */}
        <div className="px-6 pb-4 border-t border-slate-200 pt-4 text-[10px] space-y-3" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Funding */}
          {manuscript.fundingDetails.fundingAgency && (
            <div>
              <strong className="uppercase text-slate-700">Funding: </strong>
              <span className="text-slate-600">
                This work was supported by {manuscript.fundingDetails.fundingAgency}
                {manuscript.fundingDetails.grantNumber && ` [grant number ${manuscript.fundingDetails.grantNumber}]`}.
              </span>
            </div>
          )}

          {/* Conflict of interest */}
          <div>
            <strong className="uppercase text-slate-700">Conflict of Interest Statement: </strong>
            <span className="text-slate-600 italic">
              {manuscript.conflictDisclosure.hasConflict
                ? manuscript.conflictDisclosure.conflictDetails
                : 'The authors declare that the research was conducted in the absence of any commercial or financial relationships that could be construed as a potential conflict of interest.'}
            </span>
          </div>

          {/* Ethics */}
          {manuscript.ethics.humanSubjectsApproved !== 'not-applicable' && (
            <div>
              <strong className="uppercase text-slate-700">Ethics Statement: </strong>
              <span className="text-slate-600">
                {manuscript.ethics.humanSubjectsApproved === 'yes'
                  ? `The study was approved by ${manuscript.ethics.irbInstitution || 'the Institutional Review Board'} (${manuscript.ethics.irbApprovalNumber || 'approval number pending'}).`
                  : `Ethics approval: ${manuscript.ethics.humanSubjectsApproved}.`}
              </span>
            </div>
          )}
        </div>

        {/* REFERENCES */}
        <div className="px-6 pb-8 border-t border-slate-200 pt-4">
          <h2
            className="text-[10px] font-bold uppercase tracking-widest text-teal-800 mb-3"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            REFERENCES
          </h2>
          {manuscript.references.length === 0 ? (
            <p className="text-slate-400 italic text-xs">
              [No references yet. Add in Step 11.]
            </p>
          ) : (
            <ol className="list-decimal pl-5 space-y-1.5 text-[11px] leading-snug" style={{ fontFamily: 'Arial, sans-serif' }}>
              {manuscript.references.map((ref) => (
                <li key={ref.id} className="pl-1">
                  <span className="text-slate-700">{formatAMAReference(ref)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="border-t border-slate-300 px-10 py-3 flex justify-between items-center text-[8px] text-slate-400"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <span>The Georgian Biomedical News</span>
          <span>Downloaded from gbmn.org. For personal use only. No other uses without permission.</span>
          <span>Copyright © {new Date().getFullYear()}. All rights reserved.</span>
        </div>
      </div>

      <style>{`
        .preview-rich ul { list-style: disc; padding-left: 1.5em; }
        .preview-rich ol { list-style: decimal; padding-left: 1.5em; }
        .preview-rich strong { font-weight: bold; }
        .preview-rich em { font-style: italic; }
        @media print {
          .no-print { display: none !important; }
          #academic-manuscript-sheet { border: none; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
