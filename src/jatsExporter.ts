/**
 * JATS XML 1.3 Exporter — PMC-compliant package generator
 * Browser-compatible (no Node.js). Uses JSZip for ZIP creation.
 *
 * Reference: JATS (Z39.96) Journal Publishing DTD v1.3
 * https://jats.nlm.nih.gov/publishing/1.3/
 */

import JSZip from 'jszip';
import type { Manuscript } from './types';

// ─── Journal constants ────────────────────────────────────────────────────────
const J = {
  id: 'gbmn',
  nlmTa: 'Georgian Biomed News',
  title: 'Georgian Biomedical News',
  abbrev: 'Georgian Biomed News',
  issnPrint: '2720-7994',
  issnOnline: '2720-8796',
  publisher: 'Georgian Biomedical News Editorial Office',
  publisherLoc: 'Tbilisi, Georgia',
  doiPrefix: '10.52340',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
} as const;

// ─── Article-type mapping ─────────────────────────────────────────────────────
const TYPE_MAP: Record<string, string> = {
  'original-research': 'research-article',
  'review-article': 'review-article',
  'systematic-review': 'review-article',
  'meta-analysis': 'research-article',
  'clinical-cases': 'case-report',
  'case-report': 'case-report',
  'editorial': 'editorial',
  'letter': 'letter',
  'letter-to-editor': 'letter',
  'brief-report': 'brief-report',
  'commentary': 'editorial',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Escape a string for use inside XML text or attribute values. */
function x(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Strip HTML tags; convert block-level closers to newlines; decode entities. */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert HTML content to one or more JATS <p> elements (indented 6 spaces). */
function toParagraphs(html: string, indent = '      '): string {
  const plain = stripHtml(html);
  if (!plain) return `${indent}<p/>`;
  const paras = plain.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean);
  return paras.length
    ? paras.map(p => `${indent}<p>${x(p)}</p>`).join('\n')
    : `${indent}<p/>`;
}

/** Parse "Vol 4 Issue 2" / "4(2)" / "VOLUME 4 ISSUE 2. APR-JUN 2026" etc. */
function parseVI(vi: string): { volume: string; issue: string } {
  if (!vi) return { volume: '0', issue: '0' };
  let m = vi.match(/vol(?:ume)?\s+(\d+)[.,\s;-]+(?:issue|iss\.?)\s+(\d+)/i);
  if (m) return { volume: m[1], issue: m[2] };
  m = vi.match(/(\d+)\s*\((\d+)\)/);
  if (m) return { volume: m[1], issue: m[2] };
  const nums = vi.match(/\d+/g);
  if (nums && nums.length >= 2) return { volume: nums[0], issue: nums[1] };
  if (nums) return { volume: nums[0], issue: '0' };
  return { volume: '0', issue: '0' };
}

function isoToDateParts(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return {
    day: String(d.getUTCDate()).padStart(2, '0'),
    month: String(d.getUTCMonth() + 1).padStart(2, '0'),
    year: String(d.getUTCFullYear()),
  };
}

// ─── Main XML generator ───────────────────────────────────────────────────────

export function generateJatsXml(m: Manuscript): string {
  const articleType = TYPE_MAP[m.articleType] || 'research-article';
  const { volume, issue } = parseVI(m.publicationInfo?.volumeIssue || '');
  const doi = m.publicationInfo?.doi?.trim()
    ? m.publicationInfo.doi.replace(/^doi:/i, '').trim()
    : `${J.doiPrefix}/GBMN.${m.id}`;
  const pd = isoToDateParts(m.submittedAt);
  const year = pd.year;

  // Collect unique affiliations (key = first affiliation string)
  const affMap = new Map<string, { id: string; label: string; institution: string; city: string; country: string }>();
  m.authors.forEach(a => {
    const label = (a.affiliations?.[0] || a.affiliation || a.institution || '').trim();
    const key = label || a.institution || 'Unknown';
    if (!affMap.has(key)) {
      const n = affMap.size + 1;
      affMap.set(key, {
        id: `aff${n}`,
        label: String(n),
        institution: label || a.institution || '',
        city: a.city || '',
        country: a.country || 'Georgia',
      });
    }
  });
  const affs = Array.from(affMap.values());

  const getAffId = (a: typeof m.authors[0]) => {
    const key = (a.affiliations?.[0] || a.affiliation || a.institution || '').trim() || a.institution || '';
    return affMap.get(key)?.id ?? (affs[0]?.id ?? 'aff1');
  };

  const corrAuthor = m.authors.find(a => a.isCorresponding) ?? m.authors[0];

  // Keywords
  const kwds = (m.sections?.['Keywords'] || '')
    .split(/[;,]/).map(k => k.trim()).filter(Boolean);

  // Body sections in PMC-preferred order
  const SEC_ORDER = [
    'Introduction', 'Background', 'Materials and Methods', 'Methods',
    'Case Presentation', 'Clinical Reasoning', 'Results',
    'Discussion', 'Conclusions', 'Acknowledgments',
  ];
  const bodySecs: { title: string; html: string }[] = [];
  const seen = new Set<string>();
  SEC_ORDER.forEach(title => {
    const html = m.sections?.[title];
    if (html && stripHtml(html).trim()) { bodySecs.push({ title, html }); seen.add(title); }
  });
  Object.entries(m.sections || {}).forEach(([title, html]) => {
    if (title === 'Keywords' || seen.has(title)) return;
    if (html && stripHtml(html).trim()) bodySecs.push({ title, html });
  });

  // Abstract
  const abstractHtml = m.abstractContents?.['text'] || '';

  const lines: string[] = [];
  const w = (s: string) => lines.push(s);

  // ── XML header ──────────────────────────────────────────────────────────────
  w(`<?xml version="1.0" encoding="UTF-8"?>`);
  w(`<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.3 20210610//EN"`);
  w(`  "https://jats.nlm.nih.gov/publishing/1.3/JATS-journalpublishing1-3.dtd">`);
  w(`<article article-type="${articleType}" xml:lang="en"`);
  w(`  xmlns:xlink="http://www.w3.org/1999/xlink"`);
  w(`  xmlns:mml="http://www.w3.org/1998/Math/MathML">`);

  // ── <front> ─────────────────────────────────────────────────────────────────
  w(`  <front>`);

  // journal-meta
  w(`    <journal-meta>`);
  w(`      <journal-id journal-id-type="publisher-id">${J.id}</journal-id>`);
  w(`      <journal-id journal-id-type="nlm-ta">${J.nlmTa}</journal-id>`);
  w(`      <journal-title-group>`);
  w(`        <journal-title>${J.title}</journal-title>`);
  w(`        <abbrev-journal-title abbrev-type="publisher">${J.abbrev}</abbrev-journal-title>`);
  w(`      </journal-title-group>`);
  w(`      <issn pub-type="ppub">${J.issnPrint}</issn>`);
  w(`      <issn pub-type="epub">${J.issnOnline}</issn>`);
  w(`      <publisher>`);
  w(`        <publisher-name>${J.publisher}</publisher-name>`);
  w(`        <publisher-loc>${J.publisherLoc}</publisher-loc>`);
  w(`      </publisher>`);
  w(`    </journal-meta>`);

  // article-meta
  w(`    <article-meta>`);
  w(`      <article-id pub-id-type="doi">${x(doi)}</article-id>`);
  w(`      <article-id pub-id-type="publisher-id">${x(m.id)}</article-id>`);

  // categories
  w(`      <article-categories>`);
  w(`        <subj-group subj-group-type="heading">`);
  w(`          <subject>${x(m.specialty || 'Medicine')}</subject>`);
  w(`        </subj-group>`);
  w(`      </article-categories>`);

  // title-group
  w(`      <title-group>`);
  w(`        <article-title>${x(m.title || '')}</article-title>`);
  if (m.runningTitle) w(`        <alt-title alt-title-type="running-head">${x(m.runningTitle)}</alt-title>`);
  w(`      </title-group>`);

  // contrib-group
  w(`      <contrib-group>`);
  m.authors.forEach(a => {
    const corr = a.isCorresponding ? ` corresp="yes"` : '';
    w(`        <contrib contrib-type="author"${corr}>`);
    w(`          <name>`);
    w(`            <surname>${x(a.lastName)}</surname>`);
    w(`            <given-names>${x(a.firstName)}</given-names>`);
    w(`          </name>`);
    if (a.orcidId) {
      const orcUrl = a.orcidId.startsWith('http') ? a.orcidId : `https://orcid.org/${a.orcidId.replace(/^https?:\/\/orcid\.org\//i, '')}`;
      w(`          <contrib-id contrib-id-type="orcid" authenticated="false">${x(orcUrl)}</contrib-id>`);
    }
    w(`          <xref ref-type="aff" rid="${getAffId(a)}"/>`);
    if (a.isCorresponding) w(`          <xref ref-type="corresp" rid="cor1">*</xref>`);
    w(`        </contrib>`);
  });
  w(`      </contrib-group>`);

  // affiliations
  affs.forEach(aff => {
    w(`      <aff id="${aff.id}">`);
    w(`        <label>${aff.label}</label>`);
    w(`        <institution>${x(aff.institution)}</institution>`);
    const loc = [aff.city, aff.country].filter(Boolean).join(', ');
    if (loc) w(`        <addr-line>${x(loc)}</addr-line>`);
    w(`      </aff>`);
  });

  // author-notes / corresp
  if (corrAuthor?.email) {
    w(`      <author-notes>`);
    w(`        <corresp id="cor1">`);
    w(`          <label>*</label>`);
    w(`          Corresponding author: <email>${x(corrAuthor.email)}</email>`);
    w(`        </corresp>`);
    w(`      </author-notes>`);
  }

  // pub-date
  w(`      <pub-date date-type="pub" publication-format="electronic">`);
  w(`        <day>${pd.day}</day>`);
  w(`        <month>${pd.month}</month>`);
  w(`        <year>${pd.year}</year>`);
  w(`      </pub-date>`);

  w(`      <volume>${x(volume)}</volume>`);
  w(`      <issue>${x(issue)}</issue>`);
  w(`      <elocation-id>${x(m.id)}</elocation-id>`);

  // permissions
  w(`      <permissions>`);
  w(`        <copyright-statement>&#x00A9; ${year} The Authors. Published by ${J.publisher}.</copyright-statement>`);
  w(`        <copyright-year>${year}</copyright-year>`);
  w(`        <license license-type="open-access" xlink:href="${J.licenseUrl}">`);
  w(`          <license-p>This is an open-access article distributed under the terms of the Creative Commons Attribution 4.0 International License (<ext-link ext-link-type="uri" xlink:href="${J.licenseUrl}">CC BY 4.0</ext-link>), which permits unrestricted use, distribution, and reproduction in any medium, provided the original work is properly cited.</license-p>`);
  w(`        </license>`);
  w(`      </permissions>`);

  // abstract
  if (stripHtml(abstractHtml)) {
    w(`      <abstract>`);
    w(`        <title>Abstract</title>`);
    w(toParagraphs(abstractHtml, '        '));
    w(`      </abstract>`);
  }

  // keywords
  if (kwds.length) {
    w(`      <kwd-group kwd-group-type="author-supplied">`);
    w(`        <title>Keywords</title>`);
    kwds.forEach(kw => w(`        <kwd>${x(kw)}</kwd>`));
    w(`      </kwd-group>`);
  }

  // history
  w(`      <history>`);
  w(`        <date date-type="received">`);
  w(`          <day>${pd.day}</day>`);
  w(`          <month>${pd.month}</month>`);
  w(`          <year>${pd.year}</year>`);
  w(`        </date>`);
  w(`      </history>`);

  w(`    </article-meta>`);
  w(`  </front>`);

  // ── <body> ──────────────────────────────────────────────────────────────────
  w(`  <body>`);
  bodySecs.forEach((sec, idx) => {
    w(`    <sec id="sec${idx + 1}">`);
    w(`      <title>${x(sec.title)}</title>`);
    w(toParagraphs(sec.html, '      '));
    w(`    </sec>`);
  });
  w(`  </body>`);

  // ── <back> ──────────────────────────────────────────────────────────────────
  w(`  <back>`);

  // references
  if (m.references?.length) {
    w(`    <ref-list>`);
    w(`      <title>References</title>`);
    m.references.forEach((ref, idx) => {
      w(`      <ref id="ref${idx + 1}">`);
      w(`        <label>${idx + 1}</label>`);
      const pt = ref.doi ? 'journal' : ref.url ? 'webpage' : 'journal';
      w(`        <mixed-citation publication-type="${pt}">`);
      const parts: string[] = [];
      if (ref.authors) parts.push(x(ref.authors));
      if (ref.title) parts.push(x(ref.title));
      if (ref.journal) parts.push(`<source>${x(ref.journal)}</source>`);
      if (ref.year) parts.push(`<year>${x(String(ref.year))}</year>`);
      if (ref.volume) parts.push(`<volume>${x(String(ref.volume))}</volume>`);
      if (ref.issue) parts.push(`<issue>${x(String(ref.issue))}</issue>`);
      if (ref.pages) {
        const [fp, lp] = (ref.pages || '').split(/[-–]/);
        if (fp) parts.push(`<fpage>${x(fp.trim())}</fpage>`);
        if (lp) parts.push(`<lpage>${x(lp.trim())}</lpage>`);
      }
      if (ref.doi) {
        const cleanDoi = ref.doi.replace(/^doi:/i, '').trim();
        parts.push(`<pub-id pub-id-type="doi">${x(cleanDoi)}</pub-id>`);
      }
      w(`          ${parts.join('. ')}`);
      w(`        </mixed-citation>`);
      w(`      </ref>`);
    });
    w(`    </ref-list>`);
  }

  // fn-group (declarations)
  w(`    <fn-group>`);

  const conflictText = m.conflictDisclosure?.hasConflict
    ? (m.conflictDisclosure.conflictDetails || 'The authors declare a conflict of interest.')
    : 'The authors declare no conflict of interest.';
  w(`      <fn fn-type="conflict">`);
  w(`        <p>${x(conflictText)}</p>`);
  w(`      </fn>`);

  if (m.fundingDetails?.fundingAgency) {
    const ft = `This work was supported by ${m.fundingDetails.fundingAgency}${m.fundingDetails.grantNumber ? ` (grant number: ${m.fundingDetails.grantNumber})` : ''}.`;
    w(`      <fn fn-type="financial-disclosure">`);
    w(`        <p>${x(ft)}</p>`);
    w(`      </fn>`);
  } else {
    w(`      <fn fn-type="financial-disclosure">`);
    w(`        <p>No specific funding was received for this work.</p>`);
    w(`      </fn>`);
  }

  if (m.ethics?.humanSubjectsApproved === 'yes') {
    const et = `The study was approved by ${x(m.ethics.irbInstitution || 'the Institutional Review Board')} (approval number: ${x(m.ethics.irbApprovalNumber || 'not specified')}).${m.ethics.informedConsentObtained === 'yes' ? ' Informed consent was obtained from all participants.' : ''}`;
    w(`      <fn fn-type="ethics-statement">`);
    w(`        <p>${et}</p>`);
    w(`      </fn>`);
  }

  w(`    </fn-group>`);
  w(`  </back>`);
  w(`</article>`);

  return lines.join('\n');
}

// ─── Package builder ─────────────────────────────────────────────────────────

export interface JatsPackage {
  xml: string;
  zipBlob: Blob;
  xmlFilename: string;
  zipFilename: string;
}

/** Generate a PMC-ready JATS XML + ZIP package entirely in the browser. */
export async function generateJatsPackage(manuscript: Manuscript): Promise<JatsPackage> {
  const { volume, issue } = parseVI(manuscript.publicationInfo?.volumeIssue || '');
  const xml = generateJatsXml(manuscript);
  const xmlFilename = `gbmn-${volume}-${issue}-${manuscript.id}.xml`;
  const zipFilename = `gbmn-${volume}-${issue}-${manuscript.id}.zip`;

  const zip = new JSZip();
  zip.file(xmlFilename, xml);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });

  return { xml, zipBlob, xmlFilename, zipFilename };
}
