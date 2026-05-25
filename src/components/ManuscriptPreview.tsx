/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Manuscript } from '../types';
import { ARTICLE_TYPES, formatAMAReference } from '../utils';
import { Printer, Download, BookOpen, Award } from 'lucide-react';
import { downloadManuscriptDocx } from '../docxExport';

interface ManuscriptPreviewProps {
  manuscript: Manuscript;
  onShowNotification?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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
      className={`text-slate-850 preview-rich ${dropCap ? 'preview-rich-dropcap' : ''}`}
      dangerouslySetInnerHTML={{ __html: linkReferenceCitations(html, references) }}
    />
  );
}

function RenderMediaItem({ item, index }: { item: Manuscript['figuresAndTables'][number]; index: number }) {
  const label = item.type === 'table' ? 'TABLE' : item.type === 'diagram' ? 'DIAGRAM' : 'FIGURE';
  const layoutClass = item.layout === 'one-column' ? 'gbmn-media-one-column' : 'gbmn-media-two-column';

  if (item.htmlContent) {
    return (
      <figure className={`gbmn-inline-media gbmn-inline-media-${item.type} ${layoutClass}`}>
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
      <figure className={`gbmn-inline-media gbmn-inline-media-figure ${layoutClass}`}>
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
    <figure className={`gbmn-inline-media gbmn-inline-media-table ${layoutClass}`}>
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

function issueLabel(manuscript: Manuscript) {
  return manuscript.publicationInfo?.volumeIssue?.trim()
    || `VOLUME X ISSUE X. ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}`;
}

function doiLabel(manuscript: Manuscript) {
  const doi = manuscript.publicationInfo?.doi?.trim();
  return doi ? `DOI: ${doi.replace(/^doi:/i, '')}` : '';
}

function authorAffiliations(author: Manuscript['authors'][number]) {
  return author.affiliations?.length ? author.affiliations : [author.affiliation].filter(Boolean);
}

export default function ManuscriptPreview({ manuscript, onShowNotification }: ManuscriptPreviewProps) {
  const articleConfig = ARTICLE_TYPES[manuscript.articleType];

  const handlePrint = () => {
    const sheet = document.getElementById('academic-manuscript-sheet');
    if (!sheet) {
      if (onShowNotification) onShowNotification('Print preview is not ready yet. Please try again.', 'error');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=980,height=1200');
    if (!printWindow) {
      window.print();
      if (onShowNotification) onShowNotification('Opening print dialog. Use "Save as PDF" to download.', 'success');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${stripHtml(manuscript.title || 'GBMN Manuscript')}</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 19mm 13mm 29mm 13mm; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #academic-manuscript-sheet {
              width: auto !important;
              min-height: auto !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              font-size: 11pt !important;
              line-height: 1.36 !important;
            }
            .gbmn-journal-header { margin-top: 0 !important; }
            .gbmn-body-columns {
              columns: 2 !important;
              -webkit-columns: 2 !important;
              column-count: 2 !important;
              -webkit-column-count: 2 !important;
              column-gap: 0.6cm !important;
              -webkit-column-gap: 0.6cm !important;
              column-fill: auto !important;
              display: block !important;
              width: 100% !important;
            }
            .gbmn-section-block {
              break-inside: auto !important;
              page-break-inside: auto !important;
              display: contents !important;
            }
            .gbmn-inline-media {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .gbmn-inline-media-table {
              break-inside: auto !important;
              page-break-inside: auto !important;
              display: block !important;
            }
            .gbmn-inline-table {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            .gbmn-inline-table tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .gbmn-media-one-column {
              column-span: all !important;
              -webkit-column-span: all !important;
              width: 100% !important;
            }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>${sheet.outerHTML}</body>
      </html>`);
    printWindow.document.close();

    const printNow = () => {
      printWindow.focus();
      printWindow.print();
    };

    const images = Array.from(printWindow.document.images);
    if (!images.length) {
      window.setTimeout(printNow, 250);
    } else {
      let pending = images.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) window.setTimeout(printNow, 250);
      };
      images.forEach(img => {
        if (img.complete) done();
        else {
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        }
      });
    }

    if (onShowNotification) onShowNotification('Opening clean GBMN print preview.', 'success');
  };

  const handleDownloadWord = async () => {
    try {
      await downloadManuscriptDocx(manuscript);
      if (onShowNotification) onShowNotification('Publication-ready DOCX downloaded with Word columns and GBMN formatting.', 'success');
    } catch (error) {
      console.error(error);
      if (onShowNotification) onShowNotification('DOCX export failed. Please try again after checking media files.', 'error');
    }
  };

  const abstractEntries = Object.entries(manuscript.abstractContents)
    .filter(([, value]) => stripHtml(value || ''));
  const abstractHtml = manuscript.abstractContents['text']
    || abstractEntries.map(([label, value]) => `<p><strong>${label}:</strong> ${value}</p>`).join('');

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

      {/* Toolbar — hidden at print */}
      <div className="no-print bg-white border border-slate-250 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 shadow-xs">
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
            Download DOCX
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

      {/* Word count bar — hidden at print */}
      <div className="no-print bg-white border border-slate-200 rounded-lg px-4 py-2 flex items-center justify-between font-sans text-xs text-slate-600">
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

      {/* ═══════════════════════════════════════════════
          THE JOURNAL PAGE — this is the MASTER layout.
          Print CSS maps this directly to A4 paper.
          DOCX export replicates this structure exactly.
      ═══════════════════════════════════════════════ */}
      <div id="academic-manuscript-sheet">

        {/* ── JOURNAL HEADER ── */}
        <div className="gbmn-journal-header">
          <div className="gbmn-logo-row">
            <div className="gbmn-logo-box">gbmn</div>
            <div className="gbmn-logo-text">
              <div>GEORGIAN</div>
              <div>BIOMEDICAL</div>
              <div>NEWS</div>
            </div>
          </div>
          <div className="gbmn-header-rule-row">
            <div className="gbmn-header-rules">
              <div className="gbmn-rule-line" />
              <div className="gbmn-rule-line" />
            </div>
            <div className="gbmn-volume-label">{issueLabel(manuscript)}</div>
          </div>
        </div>

        {/* ── TITLE BLOCK (single column) ── */}
        <div className="gbmn-title-block">
          <h1 className="gbmn-article-title">
            {manuscript.title ? toGbmnTitleCase(manuscript.title) : '[Article Title]'}
          </h1>

          <div className="gbmn-authors">
            {manuscript.authors.length === 0 ? (
              <span className="gbmn-authors-placeholder">Author Name¹, Author Name²…</span>
            ) : (
              manuscript.authors.map((a, i) => (
                <span key={a.id}>
                  {a.firstName} {a.middleInitial ? `${a.middleInitial}. ` : ''}{a.lastName}
                  {a.isCorresponding && (
                    <a className="gbmn-corresponding-mark" title="Email corresponding author" href={`mailto:${a.email}`}>✉</a>
                  )}
                  {orcidUrl(a.orcidId) ? (
                    <a href={orcidUrl(a.orcidId)} target="_blank" rel="noreferrer" className="gbmn-author-num">
                      {i + 1}
                    </a>
                  ) : (
                    <sup className="gbmn-author-num">{i + 1}</sup>
                  )}
                  {i < manuscript.authors.length - 1 && ', '}
                </span>
              ))
            )}
          </div>

          {manuscript.authors.length > 0 && (
            <div className="gbmn-affiliations">
              {manuscript.authors.map((a, i) => (
                <p key={a.id} className="gbmn-affiliation-line">
                  <sup className="gbmn-author-num">{i + 1}</sup>{' '}
                  {authorAffiliations(a).join('; ')}
                  {a.isCorresponding && (
                    <span className="gbmn-affiliation-corresponding"> — Corresponding: <a href={`mailto:${a.email}`}>{a.email}</a></span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── ABSTRACT (single column) ── */}
        {articleConfig?.abstractType !== 'none' && (
          <div className="gbmn-abstract-block">
            <div className="gbmn-abstract-heading-row">
              <div className="gbmn-abstract-rule-title">
                <div className="gbmn-abstract-rule" />
                <h2 className="gbmn-section-heading">ABSTRACT</h2>
                <div className="gbmn-abstract-rule" />
              </div>
              {doiLabel(manuscript) && (
                <a className="gbmn-doi-link" href={`https://doi.org/${manuscript.publicationInfo?.doi?.replace(/^doi:/i, '').trim()}`} target="_blank" rel="noreferrer">
                  {doiLabel(manuscript)}
                </a>
              )}
            </div>
            {abstractHtml ? (
              <RichContent html={abstractHtml} references={manuscript.references} />
            ) : (
              <p className="gbmn-placeholder">[Abstract not yet entered. Fill in Step 7.]</p>
            )}
          </div>
        )}

        {/* ── KEYWORDS (single column) ── */}
        {manuscript.sections['Keywords'] && (
          <div className="gbmn-keywords-block">
            <p><strong className="gbmn-keywords-label">KEYWORDS:</strong>{' '}
              <span className="gbmn-keywords-text">{manuscript.sections['Keywords']}</span>
            </p>
          </div>
        )}

        {/* ── TWO-COLUMN BODY ── */}
        <div className="gbmn-body-columns">

          {articleConfig?.requiredSections.filter(s => s !== 'Keywords').map((sectionName, sectionIndex) => (
            manuscript.sections[sectionName]?.replace(/<[^>]+>/g, '').trim() ? (
              <div key={sectionName} className="gbmn-section-block">
                <h2 className="gbmn-section-heading">{sectionName}</h2>
                <RichContent
                  html={manuscript.sections[sectionName]}
                  references={manuscript.references}
                  dropCap={sectionIndex === 0}
                />
              </div>
            ) : null
          ))}

          {/* DECLARATIONS */}
          <div className="gbmn-declarations-block">

            {manuscript.fundingDetails.fundingAgency && (
              <div className="gbmn-declaration-item">
                <strong className="gbmn-declaration-label">FUNDING: </strong>
                <span className="gbmn-declaration-text">
                  This work was supported by {manuscript.fundingDetails.fundingAgency}
                  {manuscript.fundingDetails.grantNumber && ` [grant number ${manuscript.fundingDetails.grantNumber}]`}.
                </span>
              </div>
            )}

            <div className="gbmn-declaration-item">
              <strong className="gbmn-declaration-label">CONFLICT OF INTEREST STATEMENT: </strong>
              <span className="gbmn-declaration-text gbmn-declaration-italic">
                {manuscript.conflictDisclosure.hasConflict
                  ? manuscript.conflictDisclosure.conflictDetails
                  : 'The authors declare that the research was conducted in the absence of any commercial or financial relationships that could be construed as a potential conflict of interest.'}
              </span>
            </div>

            {manuscript.ethics.humanSubjectsApproved !== 'not-applicable' && (
              <div className="gbmn-declaration-item">
                <strong className="gbmn-declaration-label">ETHICS STATEMENT: </strong>
                <span className="gbmn-declaration-text">
                  {manuscript.ethics.humanSubjectsApproved === 'yes'
                    ? `The study was approved by ${manuscript.ethics.irbInstitution || 'the Institutional Review Board'} (${manuscript.ethics.irbApprovalNumber || 'approval number pending'}).`
                    : `Ethics approval: ${manuscript.ethics.humanSubjectsApproved}.`}
                </span>
              </div>
            )}
          </div>

          {/* REFERENCES */}
          <div className="gbmn-references-block">
            <h2 className="gbmn-section-heading">REFERENCES</h2>
            {manuscript.references.length === 0 ? (
              <p className="gbmn-placeholder">[No references yet. Add in Step 11.]</p>
            ) : (
              <ol className="gbmn-references-list">
                {manuscript.references.map((ref) => (
                  <li key={ref.id}>
                    {referenceUrl(ref) ? (
                      <a href={referenceUrl(ref)} target="_blank" rel="noreferrer" className="gbmn-ref-item-link">
                        {formatAMAReference(ref)}
                      </a>
                    ) : (
                      <span>{formatAMAReference(ref)}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ── PAGE FOOTER ── */}
        <div className="gbmn-page-footer">
          <p>The Georgian Biomedical News</p>
          <p>Downloaded from gbmn.org. For personal use only. No other uses without permission.</p>
          <p>Copyright © {new Date().getFullYear()}. All rights reserved.</p>
        </div>

      </div>{/* end #academic-manuscript-sheet */}

      {/* ═══════════════════════════════════════════════
          MASTER STYLES
          Screen + Print share IDENTICAL rules.
          Only layout wrapper changes at print (@media print).
      ═══════════════════════════════════════════════ */}
      <style>{`

        /* ── COLOUR TOKENS ───────────────────────────── */
        :root {
          --gbmn-teal:        #0E8B8B;
          --gbmn-dark-green:  #2F6B5A;
          --gbmn-heading-red: #D72626;
          --gbmn-light-green: #DCE8D0;
          --gbmn-stripe-green:#D9E3D1;
          --gbmn-border-green:#A8C28F;
          --gbmn-body:        #222222;
          --gbmn-gray:        #666666;
          --gbmn-light-gray:  #777777;
        }

        /* ── FORCE COLORS THROUGH PRINT ENGINE ──────── */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

        /* ── PAGE SHELL ──────────────────────────────── */
        #academic-manuscript-sheet {
          box-sizing: border-box;
          background: #ffffff;
          color: var(--gbmn-body);
          font-family: "Times New Roman", Georgia, serif;
          font-size: 11pt;
          line-height: 1.36;
          width: 794px;          /* 210mm at 96dpi screen */
          min-height: 1123px;    /* 297mm at 96dpi screen */
          padding: 72px 49px 110px;   /* top 1.9cm | sides 1.3cm | bottom 2.9cm */
          margin: 0 auto;
          box-shadow: 0 4px 32px rgba(0,0,0,0.12);
        }

        /* ── JOURNAL HEADER ──────────────────────────── */
        .gbmn-journal-header { margin-bottom: 18px; }

        .gbmn-logo-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-bottom: 10px;
        }
        .gbmn-logo-box {
          background: #3b8790;
          color: #ffffff;
          font-family: Arial, sans-serif;
          font-size: 64pt;
          font-weight: 900;
          letter-spacing: -5px;
          line-height: 1;
          padding: 1px 12px 8px;
          border-radius: 0;
          flex-shrink: 0;
          min-width: 255px;
          text-align: center;
        }
        .gbmn-logo-text {
          font-family: Arial, sans-serif;
          font-size: 25pt;
          font-weight: 700;
          color: #000000;
          line-height: 1.05;
          padding-top: 1px;
        }
        .gbmn-header-rule-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .gbmn-header-rules { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .gbmn-rule-line { height: 3px; background: var(--gbmn-teal); }
        .gbmn-volume-label {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          font-weight: 700;
          color: #000000;
          white-space: nowrap;
          text-align: right;
          text-transform: uppercase;
        }

        /* ── TITLE BLOCK ─────────────────────────────── */
        .gbmn-title-block { margin-bottom: 16px; }
        .gbmn-article-title {
          font-family: "Times New Roman", Georgia, serif;
          font-size: 20pt;
          font-weight: 700;
          color: var(--gbmn-teal);
          text-align: center;
          line-height: 1.12;
          margin: 0 auto 8px;
          max-width: 96%;
          text-wrap: balance;
        }
        .gbmn-authors {
          font-family: "Times New Roman", Georgia, serif;
          font-size: 11pt;
          color: var(--gbmn-light-gray);
          text-align: center;
          line-height: 1.22;
          margin-bottom: 10px;
        }
        .gbmn-authors-placeholder { font-style: italic; color: #94a3b8; }
        .gbmn-corresponding-mark { color: var(--gbmn-teal); margin-left: 2px; }
        .gbmn-author-num {
          color: var(--gbmn-teal);
          font-size: 75%;
          font-weight: 600;
          vertical-align: super;
          margin-left: 1px;
          text-decoration: none;
        }
        a.gbmn-author-num:hover { text-decoration: underline; }

        .gbmn-affiliations {
          font-family: "Times New Roman", Georgia, serif;
          font-size: 10pt;
          color: var(--gbmn-gray);
          line-height: 1.2;
        }
        .gbmn-affiliation-line { margin: 0 0 2px; }
        .gbmn-affiliation-corresponding { margin-left: 6px; font-style: italic; }

        /* ── ABSTRACT ────────────────────────────────── */
        .gbmn-abstract-block { margin-bottom: 14px; }
        .gbmn-abstract-heading-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: end;
          margin: 10pt 0 8pt;
        }
        .gbmn-abstract-rule-title { min-width: 0; }
        .gbmn-abstract-rule {
          border-top: 1px solid #000000;
          height: 0;
        }
        .gbmn-abstract-heading-row .gbmn-section-heading {
          margin: 5pt 0 5pt;
        }
        .gbmn-doi-link {
          font-family: Arial, sans-serif;
          font-size: 10pt;
          font-weight: 700;
          color: #777777;
          text-decoration: underline;
          white-space: nowrap;
          margin-bottom: 5pt;
        }

        /* ── KEYWORDS ────────────────────────────────── */
        .gbmn-keywords-block {
          margin-bottom: 14px;
          font-family: Arial, sans-serif;
          font-size: 10pt;
        }
        .gbmn-keywords-label { font-weight: 700; text-transform: uppercase; }
        .gbmn-keywords-text { color: var(--gbmn-body); }

        /* ── SECTION HEADINGS ────────────────────────── */
        .gbmn-section-heading {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          font-weight: 700;
          color: var(--gbmn-heading-red);
          text-transform: uppercase;
          margin: 14pt 0 8pt;
          letter-spacing: 0;
        }

        /* ── BODY COLUMNS ────────────────────────────── */
        .gbmn-body-columns {
          column-count: 2;
          -webkit-column-count: 2;
          column-gap: 0.6cm;
          -webkit-column-gap: 0.6cm;
          column-fill: auto;
          font-size: 11pt;
          line-height: 1.36;
          text-align: justify;
        }
        .gbmn-section-block {
          break-inside: auto;
          page-break-inside: auto;
          margin-bottom: 8pt;
        }
        .gbmn-section-heading {
          break-after: avoid;
          page-break-after: avoid;
        }

        /* ── BODY TEXT ───────────────────────────────── */
        .preview-rich {
          color: var(--gbmn-body);
          font-family: "Times New Roman", Georgia, serif;
          font-size: 11pt;
          line-height: 1.36;
          text-align: justify;
        }
        .preview-rich p {
          margin: 0 0 4pt;
          text-indent: 1.27cm;
        }
        .preview-rich h3 {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.2;
          color: var(--gbmn-heading-red);
          font-weight: 700;
          text-transform: uppercase;
          margin: 9pt 0 5pt;
          break-after: avoid;
        }
        /* No indent: first paragraph of section, after media, inside abstract */
        .gbmn-abstract-block .preview-rich p,
        .preview-rich p:first-child,
        .preview-rich .gbmn-inline-media + p {
          text-indent: 0;
        }

        /* DROP CAP for first section first letter */
        .preview-rich-dropcap p:first-child::first-letter {
          float: left;
          font-size: 42pt;
          line-height: 34pt;
          font-weight: 400;
          margin: 3px 5px 0 0;
          color: #111111;
        }

        /* ── INLINE CITATION LINKS ───────────────────── */
        .gbmn-ref-link {
          color: var(--gbmn-teal);
          font-size: 75%;
          vertical-align: super;
          text-decoration: none;
          font-weight: 700;
        }

        /* ── LIST STYLES INSIDE RICH TEXT ───────────── */
        .preview-rich ul { list-style: disc; padding-left: 1.5em; margin: 4pt 0; }
        .preview-rich ol { list-style: decimal; padding-left: 1.5em; margin: 4pt 0; }
        .preview-rich strong { font-weight: bold; }
        .preview-rich em { font-style: italic; }

        /* ── FIGURES & TABLES ────────────────────────── */
        .gbmn-inline-media {
          break-inside: avoid;
          page-break-inside: avoid;
          margin: 8px 0 12px;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 8pt;
          background: #ffffff;
        }
        .gbmn-inline-media-table {
          break-inside: auto;
          page-break-inside: auto;
        }
        .gbmn-media-one-column {
          column-span: all;
          -webkit-column-span: all;
          width: 100%;
          display: block;
          clear: both;
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
          border: 1px solid var(--gbmn-border-green);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          background: #f8fafc;
          font-size: 8pt;
          margin-bottom: 4px;
        }
        .gbmn-inline-media figcaption {
          color: var(--gbmn-body);
          font-size: 8pt;
          line-height: 1.25;
          margin: 0 0 4px;
        }
        .gbmn-table-title {
          color: var(--gbmn-body);
          font-size: 8pt;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .gbmn-inline-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid var(--gbmn-border-green);
          font-size: 10pt;
          margin: 0;
          table-layout: fixed;
        }
        .gbmn-inline-table th,
        .gbmn-inline-table td {
          padding: 2px 4px;
          border: 1px solid var(--gbmn-border-green);
          text-align: center;
          line-height: 1.2;
          overflow-wrap: anywhere;
          word-break: normal;
          hyphens: auto;
          vertical-align: middle;
        }
        .gbmn-inline-table th {
          background: var(--gbmn-light-green);
          font-weight: 700;
        }
        .gbmn-inline-table tr:nth-child(even) td {
          background: var(--gbmn-stripe-green);
        }

        /* ── SVG FIGURES ─────────────────────────────── */
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
        .gbmn-inline-media-diagram pre {
          white-space: pre-wrap;
          background: #ffffff;
          border: 1px solid var(--gbmn-border-green);
          padding: 6px;
          font-size: 8pt;
        }

        /* ── DECLARATIONS ────────────────────────────── */
        .gbmn-declarations-block {
          border-top: 1px solid #cbd5e1;
          padding-top: 10pt;
          margin-top: 10pt;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 10pt;
          line-height: 1.4;
        }
        .gbmn-declaration-item { margin-bottom: 6pt; }
        .gbmn-declaration-label { text-transform: uppercase; color: #475569; font-weight: 700; }
        .gbmn-declaration-text { color: #64748b; }
        .gbmn-declaration-italic { font-style: italic; }

        /* ── REFERENCES ──────────────────────────────── */
        .gbmn-references-block {
          margin-top: 10pt;
        }
        .gbmn-references-list {
          list-style: decimal;
          padding-left: 0.3in;
          margin: 0;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 10pt;
          line-height: 1.4;
        }
        .gbmn-references-list li {
          padding-left: 0.1in;
          margin-bottom: 4pt;
          color: var(--gbmn-body);
        }
        .gbmn-ref-item-link {
          color: var(--gbmn-body);
          text-decoration: none;
        }
        .gbmn-ref-item-link:hover { color: var(--gbmn-teal); text-decoration: underline; }

        /* ── PAGE FOOTER ─────────────────────────────── */
        .gbmn-page-footer {
          border-top: 1px solid #cbd5e1;
          padding-top: 10px;
          margin-top: 14px;
          text-align: center;
          font-family: Arial, sans-serif;
          font-size: 8pt;
          color: #000000;
          line-height: 1.25;
        }
        .gbmn-placeholder { color: #94a3b8; font-style: italic; font-size: 10pt; }

        /* ═══════════════════════════════════════════════
           PRINT / PDF RULES
           The page shell becomes the A4 sheet.
           All colours are forced through -webkit-print-color-adjust.
        ═══════════════════════════════════════════════ */
        @media print {
          html,
          body {
            width: auto !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          /* Hide everything except the manuscript sheet without hiding React root */
          body * { visibility: hidden !important; }
          #academic-manuscript-sheet,
          #academic-manuscript-sheet * {
            visibility: visible !important;
          }
          #manuscript-preview-container {
            display: block !important;
            visibility: visible !important;
          }
          .no-print { display: none !important; }

          /* Remove the screen chrome from the container */
          #manuscript-preview-container {
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
            position: static !important;
          }

          /* The sheet becomes the page */
          #academic-manuscript-sheet {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: auto !important;
            font-size: 11pt !important;
            line-height: 1.36 !important;
          }

          /* Force A4 page size */
          @page {
            size: A4 portrait;
            margin: 19mm 13mm 29mm 13mm;
          }

          /* Column layout must work in print */
          .gbmn-body-columns {
            columns: 2 !important;
            -webkit-columns: 2 !important;
            column-count: 2 !important;
            -webkit-column-count: 2 !important;
            column-gap: 0.6cm !important;
            -webkit-column-gap: 0.6cm !important;
            column-fill: auto !important;
            width: 100% !important;
            display: block !important;
          }

          /* Let article sections flow across both columns; keep media blocks together */
          .gbmn-section-block {
            break-inside: auto !important;
            page-break-inside: auto !important;
            display: contents !important;
          }
          .gbmn-inline-media {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .gbmn-inline-media-table {
            break-inside: auto !important;
            page-break-inside: auto !important;
            display: block !important;
          }
          .gbmn-inline-table {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .gbmn-inline-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Force all colours — no browser stripping */
          .gbmn-article-title  { color: #0E8B8B !important; }
          .gbmn-section-heading { color: #D72626 !important; }
          .gbmn-inline-table th { background: #DCE8D0 !important; }
          .gbmn-inline-table tr:nth-child(even) td { background: #D9E3D1 !important; }
          .gbmn-inline-table th,
          .gbmn-inline-table td { border-color: #A8C28F !important; }
          .gbmn-media-one-column {
            column-span: all !important;
            -webkit-column-span: all !important;
          }
          .gbmn-rule-line { background: #0E8B8B !important; }
          .gbmn-logo-box { background: #3b8790 !important; color: #ffffff !important; }
          .gbmn-author-num,
          .gbmn-corresponding-mark { color: #0E8B8B !important; }
        }

        /* ── NARROW SCREEN (mobile) ──────────────────── */
        @media (max-width: 860px) {
          #academic-manuscript-sheet {
            width: 100% !important;
            min-height: auto !important;
            padding: 24px 18px !important;
          }
          .gbmn-body-columns { column-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}
