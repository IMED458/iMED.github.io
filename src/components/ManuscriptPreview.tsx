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
function referenceUrl(ref: Manuscript['references'][number]) {
  if (ref.doi) return `https://doi.org/${ref.doi.replace(/^doi:/i, '').trim()}`;
  return ref.url || undefined;
}

function linkReferenceCitations(html: string, references: Manuscript['references']) {
  return html.replace(/\[(\d+(?:\s*[-,]\s*\d+)*)\]/g, (match, inner) => {
    const first = Number(inner.split(/[-,]/)[0]?.trim());
    const ref = references[first - 1];
    const url = ref ? referenceUrl(ref) : undefined;
    return url
      ? `<a class="gbmn-ref-link" href="${url}" target="_blank" rel="noreferrer">${match}</a>`
      : match;
  });
}

function RichContent({ html, references, dropCap = false }: { html: string; references: Manuscript['references']; dropCap?: boolean }) {
  if (!html) return null;
  return (
    <div
      className={`text-slate-850 text-[14px] leading-relaxed preview-rich ${dropCap ? 'preview-rich-dropcap' : ''}`}
      dangerouslySetInnerHTML={{ __html: linkReferenceCitations(html, references) }}
    />
  );
}

function RenderMediaItem({ item, index }: { item: Manuscript['figuresAndTables'][number]; index: number }) {
  const label = item.type === 'table' ? 'TABLE' : item.type === 'diagram' ? 'DIAGRAM' : 'FIGURE';

  if (item.htmlContent) {
    return (
      <figure className={`gbmn-inline-media gbmn-inline-media-${item.type}`}>
        <div dangerouslySetInnerHTML={{ __html: item.htmlContent }} />
        <figcaption>
          <strong>{label} {index + 1}.</strong> {item.title}
          {item.caption && <span> — {item.caption}</span>}
        </figcaption>
      </figure>
    );
  }

  if (item.type === 'figure') {
    return (
      <figure className="gbmn-inline-media gbmn-inline-media-figure">
        {item.fileUrl ? (
          <img src={item.fileUrl} alt={item.title || item.fileName || `Figure ${index + 1}`} />
        ) : (
          <div className="gbmn-media-placeholder">[ {item.fileName || 'figure_file.png'} ]</div>
        )}
        <figcaption>
          <strong>FIGURE {index + 1}.</strong> {item.title}
          {item.caption && <span> — {item.caption}</span>}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="gbmn-inline-media gbmn-inline-media-table">
      <p className="gbmn-table-title">
        TABLE {index + 1}. {item.title}
      </p>
      {item.tableData ? (
        <table className="gbmn-inline-table">
          <tbody>
            {item.tableData.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => rIdx === 0 ? (
                  <th key={cIdx}>{cell}</th>
                ) : (
                  <td key={cIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>
  );
}

function orcidUrl(orcidId?: string) {
  if (!orcidId) return undefined;
  const clean = orcidId.replace(/^https?:\/\/orcid\.org\//, '').trim();
  return `https://orcid.org/${clean}`;
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

      {/* GBMN journal page based on the supplied A4 case-generator template */}
      <div
        id="academic-manuscript-sheet"
        className="bg-white shadow-2xl mx-auto font-serif text-[#111] leading-relaxed select-text relative"
        style={{ fontFamily: 'Times New Roman, Times, serif', width: 560, minHeight: 792, padding: '40px 36px' }}
      >
        <div className="bg-white">
          <div className="flex items-start gap-3 mb-2">
            <div
              className="text-white font-black rounded-sm shrink-0 flex items-center justify-center"
              style={{ width: 90, height: 70, background: '#006B6B', fontFamily: 'Arial, sans-serif', fontSize: 28, letterSpacing: '-1px' }}
            >
              gbmn
            </div>
            <div className="pt-1.5" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="font-bold text-[17px] leading-tight text-[#1a1a2e]">GEORGIAN</div>
              <div className="font-bold text-[17px] leading-tight text-[#1a1a2e]">BIOMEDICAL</div>
              <div className="font-bold text-[17px] leading-tight text-[#1a1a2e]">NEWS</div>
            </div>
          </div>
          <div className="space-y-0.5 mb-1">
            <div style={{ height: 2.5, background: '#006B6B' }} />
            <div style={{ height: 2.5, background: '#006B6B' }} />
          </div>
          <div className="text-right text-[8.5px] font-bold uppercase tracking-wider text-[#1a1a2e] mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>
            VOLUME X ISSUE X. {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
          </div>

          <h1
            className="font-bold text-center leading-snug mb-3"
            style={{ fontFamily: 'Arial, sans-serif', fontSize: 15, color: '#006B6B' }}
          >
            {manuscript.title || '[Article Title]'}
          </h1>

          {/* AUTHORS — centered, normal weight */}
          <div
            className="text-center text-[9.5px] text-[#333] mb-3"
            style={{ fontFamily: 'Times New Roman, Times, serif' }}
          >
            {manuscript.authors.length === 0 ? (
              <span className="italic text-slate-400">Author Name¹, Author Name²…</span>
            ) : (
              manuscript.authors.map((a, i) => (
                <span key={a.id}>
                  {a.firstName} {a.middleInitial ? `${a.middleInitial}. ` : ''}{a.lastName}
                  {a.isCorresponding && <span className="text-teal-700 ml-0.5" title="Corresponding">✉</span>}
                  {orcidUrl(a.orcidId) ? (
                    <a href={orcidUrl(a.orcidId)} target="_blank" rel="noreferrer" className="text-teal-700 font-semibold ml-0.5 align-super text-[9px] hover:underline">
                      {i + 1}
                    </a>
                  ) : (
                    <sup className="text-teal-700 font-semibold ml-0.5">{i + 1}</sup>
                  )}
                  {i < manuscript.authors.length - 1 && ', '}
                </span>
              ))
            )}
          </div>

          {/* AFFILIATIONS */}
          {manuscript.authors.length > 0 && (
            <div className="text-center text-[8.5px] text-slate-500 space-y-0.5 mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        <div className="columns-2 gap-[18px] text-[8.5px] leading-relaxed">

          {/* ABSTRACT — full width, boxed */}
          {articleConfig?.abstractType !== 'none' && (
            <div className="break-inside-avoid mb-6 col-span-2" style={{ columnSpan: 'all' as any }}>
              <div className="border-t border-b border-slate-300 py-2 mb-3">
                <h2
                  className="gbmn-section-heading"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  ABSTRACT
                </h2>
                {manuscript.abstractContents['text'] ? (
                  <RichContent html={manuscript.abstractContents['text']} references={manuscript.references} />
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
          {articleConfig?.requiredSections.filter(s => s !== 'Keywords').map((sectionName, sectionIndex) => (
            <div key={sectionName} className="break-inside-avoid mb-5">
              <h2 className="gbmn-section-heading" style={{ fontFamily: 'Arial, sans-serif' }}>
                {sectionName}
              </h2>
              {manuscript.sections[sectionName] ? (
                <RichContent html={manuscript.sections[sectionName]} references={manuscript.references} dropCap={sectionIndex === 0} />
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
          <div className="pt-4">
            <h2 className="gbmn-section-heading" style={{ fontFamily: 'Arial, sans-serif' }}>
              FIGURES AND TABLES
            </h2>
            <div>
              {manuscript.figuresAndTables.map((item, idx) => (
                <RenderMediaItem key={item.id} item={item} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* DECLARATIONS */}
        <div className="border-t border-slate-200 pt-3 mt-3 text-[8.5px] space-y-2" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        <div className="border-t border-slate-200 pt-3 mt-3">
          <h2 className="gbmn-section-heading" style={{ fontFamily: 'Arial, sans-serif' }}>
            REFERENCES
          </h2>
          {manuscript.references.length === 0 ? (
            <p className="text-slate-400 italic text-xs">
              [No references yet. Add in Step 11.]
            </p>
          ) : (
            <ol className="list-decimal pl-5 space-y-1.5 text-[8.5px] leading-snug" style={{ fontFamily: 'Arial, sans-serif' }}>
              {manuscript.references.map((ref) => (
                <li key={ref.id} className="pl-1">
                  {referenceUrl(ref) ? (
                    <a href={referenceUrl(ref)} target="_blank" rel="noreferrer" className="text-slate-700 hover:text-teal-700 hover:underline">
                      {formatAMAReference(ref)}
                    </a>
                  ) : (
                    <span className="text-slate-700">{formatAMAReference(ref)}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* FOOTER */}
        <div
          className="border-t border-slate-300 pt-3 mt-4 text-center text-[7px] text-slate-400"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          <p>The Georgian Biomedical News</p>
          <p>Downloaded from gbmn.org. For personal use only. No other uses without permission.</p>
          <p>Copyright © {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        #academic-manuscript-sheet { box-sizing: border-box; }
        .gbmn-section-heading {
          color: #C0392B;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin: 10px 0 3px;
          text-transform: uppercase;
        }
        .preview-rich {
          color: #111;
          font-family: "Times New Roman", Times, serif;
          font-size: 8.5px;
          line-height: 1.65;
          text-align: justify;
        }
        .preview-rich p { margin: 0 0 5px; }
        .preview-rich-dropcap p:first-child:first-letter,
        .preview-rich-dropcap:first-letter {
          float: left;
          font-size: 30px;
          line-height: 22px;
          font-weight: 700;
          margin: 3px 3px 0 0;
          color: #111;
        }
        .gbmn-ref-link {
          color: #007f7f;
          font-size: 75%;
          vertical-align: super;
          text-decoration: none;
          font-weight: 700;
        }
        .preview-rich ul { list-style: disc; padding-left: 1.5em; }
        .preview-rich ol { list-style: decimal; padding-left: 1.5em; }
        .preview-rich strong { font-weight: bold; }
        .preview-rich em { font-style: italic; }
        .gbmn-inline-media {
          break-inside: avoid;
          margin: 10px 0;
          padding: 6px 0;
          font-family: Arial, sans-serif;
          font-size: 8.5px;
        }
        .gbmn-inline-media img {
          display: block;
          max-width: 100%;
          max-height: 240px;
          object-fit: contain;
          margin: 0 auto 4px;
        }
        .gbmn-media-placeholder {
          height: 150px;
          border: 0.5px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          background: #f8fafc;
          font-size: 8.5px;
          margin-bottom: 4px;
        }
        .gbmn-inline-media figcaption {
          color: #334155;
          font-size: 8px;
          line-height: 1.45;
        }
        .gbmn-table-title {
          color: #334155;
          font-size: 8px;
          font-weight: 700;
          margin: 0 0 3px;
          text-transform: uppercase;
        }
        .gbmn-inline-table {
          width: 100%;
          border-collapse: collapse;
          border-top: 0.5px solid #334155;
          border-bottom: 0.5px solid #334155;
          font-size: 8px;
        }
        .gbmn-inline-table th, .gbmn-inline-table td {
          padding: 3px 4px;
          border-bottom: 0.5px solid #cbd5e1;
          text-align: left;
        }
        .gbmn-inline-table th {
          font-weight: 700;
          text-align: center;
        }
        .gbmn-inline-media-diagram pre {
          white-space: pre-wrap;
          background: #f8fafc;
          border: 0.5px solid #cbd5e1;
          padding: 6px;
          font-size: 8px;
        }
        @media print {
          .no-print { display: none !important; }
          #academic-manuscript-sheet { border: none; box-shadow: none; width: 210mm; min-height: 297mm; }
        }
      `}</style>
    </div>
  );
}
