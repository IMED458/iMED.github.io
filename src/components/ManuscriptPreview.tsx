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

function toGbmnTitleCase(title: string) {
  const minor = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'if', 'in', 'into', 'on', 'or', 'of', 'the', 'to', 'with']);
  return title.split(/\s+/).map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && minor.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

export default function ManuscriptPreview({ manuscript, onShowNotification }: ManuscriptPreviewProps) {
  const articleConfig = ARTICLE_TYPES[manuscript.articleType];

  const handlePrint = () => {
    window.print();
    if (onShowNotification) {
      onShowNotification('Opening print dialog. Use "Save as PDF" to download.', 'success');
    }
  };

  const handleDownloadWord = () => {
    const sheet = document.getElementById('academic-manuscript-sheet');
    if (!sheet) return;
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${manuscript.title || 'GBMN Manuscript'}</title>
<style>
@page WordSection1 { size: 8.27in 11.69in; margin: .75in .51in 1.18in .51in; }
body { font-family: "Times New Roman", serif; color: #111; }
#academic-manuscript-sheet { width: 7.27in; margin: 0 auto; box-shadow: none !important; padding: 0 !important; }
.gbmn-body-columns { column-count: 2; column-gap: .236in; font-size: 11pt; line-height: 1.5; text-align: justify; }
.gbmn-section-heading { color: #2F6B5A; font-family: "Times New Roman", serif; font-size: 12pt; font-weight: 700; text-transform: uppercase; margin: 20pt 0 10pt; }
.gbmn-abstract .preview-rich { font-size: 11pt; line-height: 1.5; }
.preview-rich { font-size: 11pt; line-height: 1.5; text-align: justify; }
.preview-rich p { text-indent: .5in; margin: 0 0 6pt; }
.preview-rich-dropcap p:first-child:first-letter, .preview-rich-dropcap:first-letter { float: left; font-size: 42pt; line-height: 34pt; margin: 3pt 4pt 0 0; }
.gbmn-inline-media { break-inside: avoid; page-break-inside: avoid; margin: 12px 0 20px; }
.gbmn-inline-media figcaption, .gbmn-table-title { font-family: "Times New Roman", serif; font-size: 8pt; color: #222; margin: 0 0 5pt; }
.gbmn-inline-table { width: 100%; border-collapse: collapse; font-size: 10pt; border: 1px solid #A8C28F; }
.gbmn-inline-table th, .gbmn-inline-table td { border: 1px solid #A8C28F; padding: 4pt 5pt; text-align: center; }
.gbmn-inline-table th { background: #DCE8D0; font-weight: 700; }
.gbmn-inline-table tr:nth-child(even) td { background: #D9E3D1; }
a { color: #007f7f; }
</style>
</head>
<body>${sheet.outerHTML}</body>
</html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `GBMN_Manuscript_${manuscript.id || 'Draft'}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
    if (onShowNotification) onShowNotification('Word-editable manuscript downloaded.', 'success');
  };

  const abstractWordCount = Object.values(manuscript.abstractContents)
    .reduce((sum, text) => sum + stripHtml(text || '').split(/\s+/).filter(Boolean).length, 0);

  const bodyWordCount = Object.values(manuscript.sections)
    .reduce((sum, text) => sum + stripHtml(text || '').split(/\s+/).filter(Boolean).length, 0);
  const combinedHtml = [
    ...Object.values(manuscript.abstractContents),
    ...Object.values(manuscript.sections),
  ].join(' ');
  const inlineFigureCount = (combinedHtml.match(/gbmn-inline-media-figure/g) || []).length;
  const inlineTableCount = (combinedHtml.match(/gbmn-inline-media-table/g) || []).length;
  const mentionedFigures = Array.from(combinedHtml.matchAll(/\bFig\.?\s*(\d+)/gi)).map(match => Number(match[1]));
  const mentionedTables = Array.from(combinedHtml.matchAll(/\bTable\s*(\d+)/gi)).map(match => Number(match[1]));
  const missingMediaWarnings = [
    ...mentionedFigures.filter(number => number > inlineFigureCount).map(number => `Fig. ${number} is mentioned but no matching figure exists.`),
    ...mentionedTables.filter(number => number > inlineTableCount).map(number => `Table ${number} is mentioned but no matching table exists.`),
  ];

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
            onClick={handleDownloadWord}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer shadow-xs"
          >
            <Download className="h-4 w-4" />
            Download Word
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
      {missingMediaWarnings.length > 0 && (
        <div className="no-print bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-xs">
          <strong>Media check:</strong> {missingMediaWarnings.join(' ')}
        </div>
      )}

      {/* GBMN journal page based on the supplied A4 case-generator template */}
      <div
        id="academic-manuscript-sheet"
        className="bg-white shadow-2xl mx-auto font-serif text-[#111] leading-relaxed select-text relative"
        style={{ fontFamily: 'Times New Roman, Georgia, serif', width: 794, minHeight: 1123, padding: '72px 49px 113px' }}
      >
        <div className="bg-white">
          <div className="flex items-start gap-3 mb-5">
            <div
              className="text-white font-black rounded-sm shrink-0 flex items-center justify-center"
              style={{ width: 350, height: 96, background: '#3b8790', fontFamily: 'Arial, sans-serif', fontSize: 90, lineHeight: 1, letterSpacing: '-4px' }}
            >
              gbmn
            </div>
            <div className="pt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div className="font-bold text-[34px] leading-none text-black">GEORGIAN</div>
              <div className="font-bold text-[34px] leading-none text-black">BIOMEDICAL</div>
              <div className="font-bold text-[34px] leading-none text-black">NEWS</div>
            </div>
          </div>
          <div className="flex items-center gap-6 mb-9">
            <div className="flex-1 space-y-1">
              <div style={{ height: 3, background: '#007f7f' }} />
              <div style={{ height: 3, background: '#007f7f' }} />
            </div>
            <div className="text-right text-[17px] font-bold uppercase text-black whitespace-nowrap" style={{ fontFamily: 'Arial, sans-serif' }}>
              VOLUME X ISSUE X. {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
          </div>

          <h1
            className="font-bold text-left leading-tight mb-3 uppercase"
            style={{ fontFamily: 'Times New Roman, Georgia, serif', fontSize: '20pt', color: '#222222' }}
          >
            {manuscript.title ? toGbmnTitleCase(manuscript.title).toUpperCase() : '[ARTICLE TITLE]'}
          </h1>

          {/* AUTHORS — centered, normal weight */}
          <div
            className="text-center text-[#777] mb-5"
            style={{ fontFamily: 'Times New Roman, Georgia, serif', fontSize: '11pt', lineHeight: 1.35 }}
          >
            {manuscript.authors.length === 0 ? (
              <span className="italic text-slate-400">Author Name¹, Author Name²…</span>
            ) : (
              manuscript.authors.map((a, i) => (
                <span key={a.id}>
                  {a.firstName} {a.middleInitial ? `${a.middleInitial}. ` : ''}{a.lastName}
                  {a.isCorresponding && <span className="text-teal-700 ml-0.5" title="Corresponding">✉</span>}
                  {orcidUrl(a.orcidId) ? (
                    <a href={orcidUrl(a.orcidId)} target="_blank" rel="noreferrer" className="text-teal-700 font-semibold ml-0.5 align-super text-[10pt] hover:underline">
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
            <div className="text-left text-[#666666] space-y-0.5 mb-6" style={{ fontFamily: 'Times New Roman, Georgia, serif', fontSize: '10pt', lineHeight: 1.35 }}>
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

        {/* ABSTRACT — single column */}
        {articleConfig?.abstractType !== 'none' && (
          <div className="gbmn-abstract mb-7">
            <h2 className="gbmn-section-heading" style={{ fontFamily: 'Arial, sans-serif' }}>
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
        )}

        {/* KEYWORDS — single column */}
        {manuscript.sections['Keywords'] && (
          <div className="break-inside-avoid mb-7">
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt' }}>
              <strong className="uppercase">Keywords:</strong>{' '}
              <span className="text-slate-700">{manuscript.sections['Keywords']}</span>
            </p>
          </div>
        )}

        {/* ── TWO-COLUMN BODY ── */}
        <div className="gbmn-body-columns">

          {/* MANUSCRIPT SECTIONS */}
          {articleConfig?.requiredSections.filter(s => s !== 'Keywords').map((sectionName, sectionIndex) => (
            manuscript.sections[sectionName]?.replace(/<[^>]+>/g, '').trim() ? (
              <div key={sectionName} className="break-inside-avoid mb-5">
                <h2 className="gbmn-section-heading" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {sectionName}
                </h2>
                <RichContent html={manuscript.sections[sectionName]} references={manuscript.references} dropCap={sectionIndex === 0} />
              </div>
            ) : null
          ))}
        </div>

        {/* DECLARATIONS */}
        <div className="border-t border-slate-200 pt-3 mt-3 text-[10pt] leading-snug space-y-2" style={{ fontFamily: 'Times New Roman, Georgia, serif' }}>
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
            <ol className="gbmn-references list-decimal pl-5 space-y-1.5 text-[10pt] leading-snug" style={{ fontFamily: 'Times New Roman, Georgia, serif' }}>
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
        .gbmn-body-columns {
          column-count: 2;
          column-width: 3.5in;
          column-gap: 0.6cm;
          font-size: 11pt;
          line-height: 1.5;
          text-align: justify;
        }
        .gbmn-section-heading {
          color: #2F6B5A;
          font-size: 12pt;
          font-weight: 700;
          letter-spacing: 0;
          margin: 20pt 0 10pt;
          text-transform: uppercase;
        }
        .preview-rich {
          color: #222222;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 11pt;
          line-height: 1.5;
          text-align: justify;
        }
        .gbmn-abstract .preview-rich {
          font-size: 11pt;
          line-height: 1.5;
        }
        .preview-rich p {
          margin: 0 0 6pt;
          text-indent: 1.27cm;
        }
        .gbmn-abstract .preview-rich p,
        .preview-rich .gbmn-inline-media + p,
        .preview-rich p:first-child {
          text-indent: 0;
        }
        .preview-rich-dropcap p:first-child:first-letter,
        .preview-rich-dropcap:first-letter {
          float: left;
          font-size: 42pt;
          line-height: 34pt;
          font-weight: 400;
          margin: 3px 5px 0 0;
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
        .gbmn-references li {
          padding-left: 0.2in;
          text-indent: -0.2in;
          margin-bottom: 4pt;
        }
        .gbmn-inline-media {
          break-inside: avoid;
          page-break-inside: avoid;
          margin: 12px 0 20px;
          padding: 0;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 8pt;
          background: #ffffff;
        }
        .gbmn-inline-media img {
          display: block;
          max-width: 100%;
          max-height: 260px;
          object-fit: contain;
          margin: 4px auto 4px;
        }
        .gbmn-media-placeholder {
          height: 150px;
          border: 1px solid #A8C28F;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          background: #f8fafc;
          font-size: 8pt;
          margin-bottom: 4px;
        }
        .gbmn-inline-media figcaption {
          color: #222222;
          font-size: 8pt;
          line-height: 1.45;
          margin: 0 0 5px;
        }
        .gbmn-table-title {
          color: #222222;
          font-size: 8pt;
          font-weight: 700;
          margin: 0 0 5px;
        }
        .gbmn-inline-media-table figcaption {
          font-weight: 400;
        }
        .gbmn-inline-media-table figcaption strong,
        .gbmn-inline-media-figure figcaption strong,
        .gbmn-inline-media-diagram figcaption strong {
          font-weight: 700;
        }
        .gbmn-inline-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #A8C28F;
          font-size: 10pt;
          margin: 0;
        }
        .gbmn-inline-table th, .gbmn-inline-table td {
          padding: 4px 6px;
          border: 1px solid #A8C28F;
          text-align: center;
        }
        .gbmn-inline-table th {
          background: #DCE8D0;
          font-weight: 700;
          text-align: center;
        }
        .gbmn-inline-table tr:nth-child(even) td {
          background: #D9E3D1;
        }
        .gbmn-inline-media svg {
          display: block;
          max-width: 100%;
          height: auto;
          background: #ffffff;
          color: #333333;
        }
        .gbmn-inline-media svg text {
          fill: #333333;
          font-family: "Times New Roman", Georgia, serif;
        }
        .gbmn-inline-media svg path,
        .gbmn-inline-media svg polyline {
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .gbmn-inline-media-diagram pre {
          white-space: pre-wrap;
          background: #ffffff;
          border: 1px solid #A8C28F;
          padding: 6px;
          font-size: 8pt;
        }
        @media print {
          .no-print { display: none !important; }
          #academic-manuscript-sheet { border: none; box-shadow: none; width: 210mm; min-height: 297mm; padding: 19mm 13mm 30mm !important; }
        }
        @media (max-width: 860px) {
          #academic-manuscript-sheet {
            width: 100% !important;
            min-height: auto !important;
            padding: 24px 18px !important;
          }
          .gbmn-body-columns {
            column-count: 1;
          }
        }
      `}</style>
    </div>
  );
}
