import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  SectionType,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { Manuscript } from './types';
import { ARTICLE_TYPES, formatAMAReference } from './utils';

// ─────────────────────────────────────────────────────────
// DESIGN TOKENS — must match ManuscriptPreview.tsx exactly
// ─────────────────────────────────────────────────────────
const COLORS = {
  teal:        '0E8B8B',   // --gbmn-teal
  darkGreen:   '2F6B5A',   // --gbmn-dark-green
  headingRed:  'D72626',   // --gbmn-heading-red
  lightGreen:  'DCE8D0',   // --gbmn-light-green
  stripeGreen: 'D9E3D1',   // --gbmn-stripe-green
  borderGreen: 'A8C28F',   // --gbmn-border-green
  body:        '222222',   // --gbmn-body
  gray:        '666666',   // --gbmn-gray
  lightGray:   '777777',   // --gbmn-light-gray
  black:       '000000',
  logoTeal:    '3b8790',
};

// ─────────────────────────────────────────────────────────
// PAGE GEOMETRY (A4, all values in DXA: 1440 DXA = 1 inch)
// Top: 1.9cm → ~1077 DXA
// Bottom: 2.9cm → ~1644 DXA
// Left/Right: 1.3cm → ~737 DXA
// ─────────────────────────────────────────────────────────
const A4         = { width: 11906, height: 16838 };
const MARGINS    = { top: 1077, right: 737, bottom: 1644, left: 737, header: 420, footer: 420 };
const BODY_WIDTH = A4.width - MARGINS.left - MARGINS.right;  // ≈10432
const COLUMN_GAP = 340;   // 0.6cm
const COLUMN_WIDTH = Math.floor((BODY_WIDTH - COLUMN_GAP) / 2);  // ≈5046

type DocxChild = Paragraph | Table;

// ─── Helpers ──────────────────────────────────────────────

function textContent(value?: string) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(html?: string) {
  if (!html) return '';
  const container = document.createElement('div');
  container.innerHTML = html;
  return textContent(container.textContent || '');
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'GBMN_Manuscript';
}

/** Base paragraph with GBMN line-spacing */
function baseParagraph(options: any) {
  return new Paragraph({
    ...options,
    spacing: {
      before: 0,
      after: 80,    // 4pt after each paragraph
      line: 326,    // ~1.36 line-height in DXA
      lineRule: LineRuleType.AUTO,
      ...options.spacing,
    },
  });
}

/** Standard body text run */
function run(value: string, options: any = {}) {
  return new TextRun({
    text: value,
    font: 'Times New Roman',
    color: COLORS.body,
    size: 22,          // 11pt = 22 half-points
    ...options,
  });
}

/** Section heading paragraph */
function heading(value: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 280, after: 160, line: 326, lineRule: LineRuleType.AUTO },
    children: [
      run(value.toUpperCase(), {
        font: 'Arial',
        bold: true,
        size: 24,
        color: COLORS.headingRed,
      }),
    ],
  });
}

/** Justified body paragraph, optionally with first-line indent */
function bodyParagraph(children: any[], firstLine = true) {
  return baseParagraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: firstLine ? { firstLine: 720 } : undefined,
    children: children.length ? children : [run('')],
  });
}

function referenceUrl(ref: Manuscript['references'][number]) {
  if (ref.doi) return `https://doi.org/${ref.doi.replace(/^doi:/i, '').trim()}`;
  return ref.url || undefined;
}

function orcidUrl(orcidId?: string) {
  if (!orcidId) return undefined;
  const clean = orcidId.replace(/^https?:\/\/orcid\.org\//, '').trim();
  return `https://orcid.org/${clean}`;
}

function toGbmnTitleCase(title: string) {
  const minor = new Set(['a','an','and','as','at','by','for','from','if','in','into','on','or','of','the','to','with']);
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

function doiText(manuscript: Manuscript) {
  const doi = manuscript.publicationInfo?.doi?.trim();
  return doi ? `DOI: ${doi.replace(/^doi:/i, '')}` : '';
}

function dataUrlToImage(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i);
  if (!match) return null;
  const type = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { type: type as 'png' | 'jpg' | 'gif' | 'bmp', bytes };
}

function measureImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 300;
      const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0.65;
      resolve({ width: maxWidth, height: Math.max(90, Math.round(maxWidth * ratio)) });
    };
    img.onerror = () => resolve({ width: 300, height: 190 });
    img.src = src;
  });
}

// ─── Inline run parser (bold / italic / sup / sub / links) ─

function parseInlineRuns(node: Node, inherited: any = {}): any[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent || '';
    return value ? [run(value, inherited)] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const next = { ...inherited };
  if (tag === 'strong' || tag === 'b') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italics = true;
  if (tag === 'sup') { next.superScript = true; next.size = 16; next.color = COLORS.teal; }
  if (tag === 'sub') { next.subScript = true; next.size = 16; }
  if (tag === 'br') return [run('\n', inherited)];
  if (tag === 'a') {
    const href = element.getAttribute('href');
    const children = Array.from(element.childNodes).flatMap(c => parseInlineRuns(c, { ...next, color: COLORS.teal, underline: {} }));
    return href ? [new ExternalHyperlink({ link: href, children })] : children;
  }
  return Array.from(element.childNodes).flatMap(c => parseInlineRuns(c, next));
}

// ─── Table borders ─────────────────────────────────────────

function tableBorders() {
  const border = { style: BorderStyle.SINGLE, color: COLORS.borderGreen, size: 4 };
  return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
}

const TableBordersNone = {
  top:              { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  bottom:           { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  left:             { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  right:            { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  insideHorizontal: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  insideVertical:   { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
};

// ─── Build a DOCX table from an HTMLTableElement ────────────

function docxTableFromElement(table: HTMLTableElement, availableWidth = COLUMN_WIDTH) {
  const rows = Array.from(table.rows);
  const columnCount = Math.max(1, ...rows.map(row => row.cells.length));
  const columnWidth = Math.floor(availableWidth / columnCount);
  const totalWidth = columnWidth * columnCount;

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: Array(columnCount).fill(columnWidth),
    borders: tableBorders(),
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    rows: rows.map((row, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: Array.from(row.cells).map(cell => new TableCell({
        width: { size: columnWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        shading: rowIndex === 0
          ? { type: ShadingType.CLEAR, fill: COLORS.lightGreen, color: 'auto' }
          : rowIndex % 2 === 0
            ? { type: ShadingType.CLEAR, fill: COLORS.stripeGreen, color: 'auto' }
            : { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 220, lineRule: LineRuleType.AUTO },
            children: [run(textContent(cell.textContent || ''), { size: 18, bold: rowIndex === 0 })],
          }),
        ],
      })),
    })),
  });
}

// ─── Extract figure/image blocks ────────────────────────────

async function mediaFromFigure(figure: HTMLElement): Promise<DocxChild[]> {
  const children: DocxChild[] = [];
  const caption = textContent(figure.querySelector('figcaption')?.textContent || '');
  const tableEl = figure.querySelector('table');
  const img = figure.querySelector('img');
  const availableWidth = figure.classList.contains('gbmn-media-one-column') ? BODY_WIDTH : COLUMN_WIDTH;

  if (caption) {
    children.push(new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 60, line: 220, lineRule: LineRuleType.AUTO },
      children: [run(caption, { font: 'Times New Roman', size: 16, bold: false, color: COLORS.body })],
    }));
  }

  if (tableEl) {
    children.push(docxTableFromElement(tableEl, availableWidth));
    children.push(new Paragraph({ spacing: { before: 0, after: 100 }, children: [run('')] }));
    return children;
  }

  if (img?.src?.startsWith('data:image/')) {
    const parsed = dataUrlToImage(img.src);
    if (parsed) {
      const dimensions = await measureImage(img.src);
      const scale = Math.min(1, availableWidth / Math.max(1, dimensions.width * 15));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new ImageRun({
            type: parsed.type,
            data: parsed.bytes,
            transformation: {
              width: Math.round(dimensions.width * scale),
              height: Math.round(dimensions.height * scale),
            },
            altText: { title: caption || img.alt || 'Figure', description: caption || '', name: caption || 'Figure' },
          }),
        ],
      }));
    }
    return children;
  }

  const fallback = stripHtml(figure.innerHTML);
  if (fallback) children.push(bodyParagraph([run(fallback)], false));
  return children;
}

// ─── Convert HTML section content → DOCX paragraphs ─────────

async function htmlToDocxChildren(html: string, { dropCap = false } = {}): Promise<DocxChild[]> {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const children: DocxChild[] = [];
  let firstParagraph = true;

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = textContent(node.textContent || '');
      if (value) {
        children.push(bodyParagraph([run(value)], firstParagraph));
        firstParagraph = false;
      }
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (element.classList.contains('gbmn-inline-media') || tag === 'figure') {
      children.push(...await mediaFromFigure(element));
      firstParagraph = true;
      continue;
    }
    if (tag === 'table') {
      children.push(docxTableFromElement(element as HTMLTableElement));
      firstParagraph = true;
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      for (const li of Array.from(element.querySelectorAll(':scope > li'))) {
        children.push(new Paragraph({
          spacing: { before: 0, after: 80, line: 326, lineRule: LineRuleType.AUTO },
          indent: { left: 360, hanging: 180 },
          children: [run(tag === 'ol' ? '1. ' : '• ', { bold: true }), ...parseInlineRuns(li)],
        }));
      }
      firstParagraph = false;
      continue;
    }
    if (tag === 'h3') {
      children.push(new Paragraph({
        keepNext: true,
        spacing: { before: 180, after: 100, line: 260, lineRule: LineRuleType.AUTO },
        children: [run(textContent(element.textContent || '').toUpperCase(), { font: 'Arial', size: 22, bold: true, color: COLORS.headingRed })],
      }));
      firstParagraph = true;
      continue;
    }

    const runs = parseInlineRuns(element);
    if (runs.length || textContent(element.textContent || '')) {
      if (dropCap && firstParagraph) {
        const plain = textContent(element.textContent || '');
        if (plain.length > 1) {
          children.push(baseParagraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              run(plain.charAt(0), { size: 64, bold: false }),   // drop cap ~32pt
              run(plain.slice(1)),
            ],
          }));
        } else {
          children.push(bodyParagraph(runs, false));
        }
      } else {
        children.push(bodyParagraph(runs, firstParagraph));
      }
      firstParagraph = false;
    }
  }

  return children;
}

// ─── Footer ─────────────────────────────────────────────────

function footer() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [run('Georgian Biomedical News', { font: 'Arial', size: 14, bold: true, color: COLORS.black })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [run('ISSN (Online): 2720-8796  ISSN (Print): 2720-7994', { font: 'Arial', size: 14, color: COLORS.black })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [run('Downloaded from gbmn.org. For personal use only. No other uses without permission.', { font: 'Arial', size: 14, color: COLORS.black })],
      }),
    ],
  });
}

// ─── Journal header (logo + rule) ──────────────────────────

function journalHeader(manuscript: Manuscript): DocxChild[] {
  const logoCell = new TableCell({
    width: { size: 4200, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          // "gbmn" logo text in teal
          run('gbmn', { font: 'Arial', size: 86, bold: true, color: COLORS.logoTeal }),
          run('  GEORGIAN', { font: 'Arial', size: 30, bold: true, color: COLORS.black }),
        ],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [run('BIOMEDICAL', { font: 'Arial', size: 30, bold: true, color: COLORS.black })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [run('NEWS', { font: 'Arial', size: 30, bold: true, color: COLORS.black })],
      }),
    ],
  });

  const issueCell = new TableCell({
    width: { size: BODY_WIDTH - 4200, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [run(
          issueLabel(manuscript),
          { font: 'Arial', size: 20, bold: true, color: COLORS.black }
        )],
      }),
    ],
  });

  return [
    new Table({
      width: { size: BODY_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [4200, BODY_WIDTH - 4200],
      borders: TableBordersNone,
      rows: [new TableRow({ children: [logoCell, issueCell] })],
    }),
    // Double teal rule beneath header
    new Paragraph({
      border: { bottom: { color: COLORS.teal, style: BorderStyle.DOUBLE, size: 8 } },
      spacing: { before: 0, after: 240 },
      children: [run('')],
    }),
  ];
}

// ─── Title / author / affiliation block ─────────────────────

function titleBlock(manuscript: Manuscript): DocxChild[] {
  const title = manuscript.title ? toGbmnTitleCase(manuscript.title) : '[Article Title]';

  const authorRuns: any[] = [];
  manuscript.authors.forEach((author, index) => {
    if (index > 0) authorRuns.push(run(', ', { color: COLORS.lightGray }));
    authorRuns.push(run(
      `${author.firstName}${author.middleInitial ? ' ' + author.middleInitial + '.' : ''} ${author.lastName}`,
      { size: 22, color: COLORS.lightGray }
    ));
    if (author.isCorresponding) {
      authorRuns.push(run('✉', { color: COLORS.teal, size: 18 }));
    }
    const url = orcidUrl(author.orcidId);
    const numRun = run(String(index + 1), { size: 16, superScript: true, color: COLORS.teal });
    authorRuns.push(url ? new ExternalHyperlink({ link: url, children: [numRun] }) : numRun);
  });

  const affiliations = manuscript.authors.map((author, index) => {
    const corresponding = author.isCorresponding ? ` — Corresponding: ${author.email}` : '';
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60, line: 260, lineRule: LineRuleType.AUTO },
      children: [
        run(String(index + 1), { size: 14, superScript: true, color: COLORS.teal }),
        run(` ${(author.affiliations?.length ? author.affiliations : [author.affiliation]).filter(Boolean).join('; ')}${corresponding}`, { size: 18, color: COLORS.gray, italics: author.isCorresponding }),
      ],
    });
  });

  return [
    // Article title — teal, bold, 18pt, centred
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 0, after: 140, line: 270, lineRule: LineRuleType.AUTO },
      children: [run(title, { size: 40, bold: true, color: COLORS.teal })],
    }),
    // Authors — light gray, normal weight
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120, line: 260, lineRule: LineRuleType.AUTO },
      children: authorRuns.length
        ? authorRuns
        : [run('Author Name¹, Author Name²…', { size: 22, color: COLORS.lightGray })],
    }),
    // Affiliations
    ...affiliations,
  ];
}

// ─── Abstract block ──────────────────────────────────────────

async function abstractBlock(manuscript: Manuscript): Promise<DocxChild[]> {
  const config = ARTICLE_TYPES[manuscript.articleType];
  if (config?.abstractType === 'none') return [];

  const entries = Object.entries(manuscript.abstractContents).filter(([, v]) => stripHtml(v));
  if (!entries.length) return [];

  const abstractHtml = entries.length === 1
    ? entries[0][1]
    : entries.map(([label, value]) => `<p><strong>${label}:</strong> ${value}</p>`).join('');

  return [
    new Paragraph({
      border: { top: { color: '000000', style: BorderStyle.SINGLE, size: 6 }, bottom: { color: '000000', style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 160, after: 120, line: 260, lineRule: LineRuleType.AUTO },
      children: [
        run('ABSTRACT', { font: 'Arial', bold: true, size: 24, color: COLORS.headingRed }),
        ...(doiText(manuscript) ? [run('     '), run(doiText(manuscript), { font: 'Arial', bold: true, size: 20, color: COLORS.gray, underline: {} })] : [])
      ],
    }),
    ...await htmlToDocxChildren(abstractHtml),
    // Separator rule
    new Paragraph({
      border: { bottom: { color: '999999', style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 60, after: 160 },
      children: [run('')],
    }),
  ];
}

// ─── Keywords ────────────────────────────────────────────────

function keywordsBlock(manuscript: Manuscript): DocxChild[] {
  const keywords = stripHtml(manuscript.sections.Keywords);
  if (!keywords) return [];
  return [
    new Paragraph({
      spacing: { before: 0, after: 160, line: 260, lineRule: LineRuleType.AUTO },
      children: [
        run('KEYWORDS: ', { font: 'Arial', bold: true, size: 20, color: COLORS.black }),
        run(keywords, { size: 20, color: COLORS.body }),
      ],
    }),
  ];
}

// ─── Body sections ───────────────────────────────────────────

async function bodyBlocks(manuscript: Manuscript): Promise<DocxChild[]> {
  const config = ARTICLE_TYPES[manuscript.articleType];
  const body: DocxChild[] = [];
  const sections = (config?.requiredSections || Object.keys(manuscript.sections)).filter(s => s !== 'Keywords');
  let firstSection = true;

  for (const section of sections) {
    if (!stripHtml(manuscript.sections[section])) continue;
    body.push(heading(section));
    body.push(...await htmlToDocxChildren(manuscript.sections[section], { dropCap: firstSection }));
    firstSection = false;
  }

  // Declarations
  const declSeparator = new Paragraph({
    border: { top: { color: 'cbd5e1', style: BorderStyle.SINGLE, size: 4 } },
    spacing: { before: 160, after: 60 },
    children: [run('')],
  });
  body.push(declSeparator);

  if (manuscript.fundingDetails.fundingAgency) {
    body.push(bodyParagraph([
      run('FUNDING: ', { font: 'Arial', bold: true, size: 20, color: '475569' }),
      run(`This work was supported by ${manuscript.fundingDetails.fundingAgency}${manuscript.fundingDetails.grantNumber ? ` [grant number ${manuscript.fundingDetails.grantNumber}]` : ''}.`, { size: 20, color: '64748b' }),
    ], false));
  }

  const conflictText = manuscript.conflictDisclosure.hasConflict
    ? manuscript.conflictDisclosure.conflictDetails
    : 'The authors declare that the research was conducted in the absence of any commercial or financial relationships that could be construed as a potential conflict of interest.';
  body.push(bodyParagraph([
    run('CONFLICT OF INTEREST STATEMENT: ', { font: 'Arial', bold: true, size: 20, color: '475569' }),
    run(conflictText, { size: 20, color: '64748b', italics: true }),
  ], false));

  if (manuscript.ethics.humanSubjectsApproved !== 'not-applicable') {
    const ethicsText = manuscript.ethics.humanSubjectsApproved === 'yes'
      ? `The study was approved by ${manuscript.ethics.irbInstitution || 'the Institutional Review Board'} (${manuscript.ethics.irbApprovalNumber || 'approval number pending'}).`
      : `Ethics approval: ${manuscript.ethics.humanSubjectsApproved}.`;
    body.push(bodyParagraph([
      run('ETHICS STATEMENT: ', { font: 'Arial', bold: true, size: 20, color: '475569' }),
      run(ethicsText, { size: 20, color: '64748b' }),
    ], false));
  }

  // References
  if (manuscript.references.length) {
    body.push(heading('REFERENCES'));
    manuscript.references.forEach((ref, index) => {
      const url = referenceUrl(ref);
      const citationText = `${index + 1}. ${formatAMAReference(ref).replace(/\*/g, '')}`;
      const citRun = run(citationText, { size: 20, color: COLORS.body });
      body.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 60, line: 240, lineRule: LineRuleType.AUTO },
        indent: { hanging: 280, left: 280 },
        children: url ? [new ExternalHyperlink({ link: url, children: [citRun] })] : [citRun],
      }));
    });
  }

  return body.length ? body : [bodyParagraph([run('No article body has been entered yet.')], false)];
}

// ─── MAIN EXPORT ─────────────────────────────────────────────

export async function downloadManuscriptDocx(manuscript: Manuscript) {
  const frontMatter: DocxChild[] = [
    ...journalHeader(manuscript),
    ...titleBlock(manuscript),
    ...await abstractBlock(manuscript),
    ...keywordsBlock(manuscript),
  ];
  const body = await bodyBlocks(manuscript);

  const doc = new Document({
    title: manuscript.title || 'GBMN Manuscript',
    creator: 'Georgian Biomedical News',
    description: 'GBMN publication-ready manuscript export',
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 22, color: COLORS.body },
          paragraph: { spacing: { after: 80, line: 326, lineRule: LineRuleType.AUTO } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Arial', size: 24, bold: true, color: COLORS.headingRed },
          paragraph: { spacing: { before: 280, after: 160 }, keepNext: true },
        },
      ],
    },
    sections: [
      // Section 1: single-column front matter
      {
        properties: {
          page: { size: A4, margin: MARGINS },
          column: { count: 1, equalWidth: true },
        },
        footers: { default: footer() },
        children: frontMatter.length ? frontMatter : [new Paragraph('')],
      },
      // Section 2: two-column body (continuous from section 1)
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: { size: A4, margin: MARGINS },
          column: { count: 2, space: COLUMN_GAP, equalWidth: true },
        },
        footers: { default: footer() },
        children: body,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `${sanitizeFileName(`GBMN_Manuscript_${manuscript.id || 'Draft'}`)}.docx`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
