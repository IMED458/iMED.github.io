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

const COLORS = {
  teal: '0E8B8B',
  darkGreen: '2F6B5A',
  lightGreen: 'DCE8D0',
  stripeGreen: 'D9E3D1',
  borderGreen: 'A8C28F',
  body: '222222',
  gray: '666666',
  red: 'C62828',
};

const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1077, right: 737, bottom: 1701, left: 737, header: 420, footer: 420 };
const BODY_WIDTH = A4.width - MARGINS.left - MARGINS.right;
const COLUMN_GAP = 340;
const COLUMN_WIDTH = Math.floor((BODY_WIDTH - COLUMN_GAP) / 2);

type DocxChild = Paragraph | Table;

function text(value?: string) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function stripHtml(html?: string) {
  if (!html) return '';
  const container = document.createElement('div');
  container.innerHTML = html;
  return text(container.textContent || '');
}

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'GBMN_Manuscript';
}

function cmParagraph(options: any) {
  return new Paragraph({
    ...options,
    spacing: { before: 0, after: 120, line: 360, lineRule: LineRuleType.AUTO, ...options.spacing },
  });
}

function run(value: string, options: any = {}) {
  return new TextRun({
    text: value,
    font: 'Times New Roman',
    color: COLORS.body,
    size: 22,
    ...options,
  });
}

function heading(value: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 400, after: 200 },
    children: [
      run(value.toUpperCase(), {
        bold: true,
        size: 24,
        color: COLORS.darkGreen,
      }),
    ],
  });
}

function bodyParagraph(children: any[], firstLine = true) {
  return cmParagraph({
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
  const minor = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'if', 'in', 'into', 'on', 'or', 'of', 'the', 'to', 'with']);
  return title.split(/\s+/).map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && minor.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

function dataUrlToImage(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i);
  if (!match) return null;
  const type = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
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
  if (tag === 'sup') {
    next.superScript = true;
    next.size = 16;
    next.color = COLORS.teal;
  }
  if (tag === 'sub') {
    next.subScript = true;
    next.size = 16;
  }
  if (tag === 'br') return [run('\n', inherited)];
  if (tag === 'a') {
    const href = element.getAttribute('href');
    const children = Array.from(element.childNodes).flatMap(child => parseInlineRuns(child, { ...next, color: COLORS.teal, underline: {} }));
    return href ? [new ExternalHyperlink({ link: href, children })] : children;
  }
  return Array.from(element.childNodes).flatMap(child => parseInlineRuns(child, next));
}

function tableBorders() {
  const border = { style: BorderStyle.SINGLE, color: COLORS.borderGreen, size: 4 };
  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };
}

function docxTableFromElement(table: HTMLTableElement) {
  const rows = Array.from(table.rows);
  const columnCount = Math.max(1, ...rows.map(row => row.cells.length));
  const columnWidth = Math.floor(COLUMN_WIDTH / columnCount);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: Array(columnCount).fill(columnWidth),
    borders: tableBorders(),
    margins: { top: 80, bottom: 80, left: 90, right: 90 },
    rows: rows.map((row, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: Array.from(row.cells).map(cell => new TableCell({
        width: { size: columnWidth, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        shading: rowIndex === 0
          ? { type: ShadingType.CLEAR, fill: COLORS.lightGreen, color: 'auto' }
          : rowIndex % 2 === 0
            ? { type: ShadingType.CLEAR, fill: COLORS.stripeGreen, color: 'auto' }
            : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [run(text(cell.textContent || ''), { size: 20, bold: rowIndex === 0 })],
          }),
        ],
      })),
    })),
  });
}

async function mediaFromFigure(figure: HTMLElement): Promise<DocxChild[]> {
  const children: DocxChild[] = [];
  const caption = text(figure.querySelector('figcaption')?.textContent || '');
  const table = figure.querySelector('table');
  const img = figure.querySelector('img');

  if (caption) {
    children.push(new Paragraph({
      keepNext: true,
      spacing: { before: 180, after: 80 },
      children: [run(caption, { size: 16, bold: true, color: COLORS.body })],
    }));
  }

  if (table) {
    children.push(docxTableFromElement(table));
    children.push(new Paragraph({ spacing: { before: 0, after: 160 }, children: [run('')] }));
    return children;
  }

  if (img?.src?.startsWith('data:image/')) {
    const parsed = dataUrlToImage(img.src);
    if (parsed) {
      const dimensions = await measureImage(img.src);
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 180 },
        children: [
          new ImageRun({
            type: parsed.type,
            data: parsed.bytes,
            transformation: dimensions,
            altText: {
              title: caption || img.alt || 'Figure',
              description: caption || img.alt || 'GBMN figure',
              name: caption || img.alt || 'Figure',
            },
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

async function htmlToDocxChildren(html: string, { dropCap = false } = {}): Promise<DocxChild[]> {
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const children: DocxChild[] = [];
  let firstParagraph = true;

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = text(node.textContent || '');
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
          spacing: { before: 0, after: 120, line: 360, lineRule: LineRuleType.AUTO },
          indent: { left: 360, hanging: 180 },
          children: [run(tag === 'ol' ? '1. ' : '• ', { bold: true }), ...parseInlineRuns(li)],
        }));
      }
      firstParagraph = false;
      continue;
    }

    const runs = parseInlineRuns(element);
    if (runs.length || text(element.textContent || '')) {
      if (dropCap && firstParagraph) {
        const plain = text(element.textContent || '');
        if (plain.length > 1) {
          children.push(cmParagraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              run(plain.charAt(0), { size: 56, bold: true }),
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

function footer() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          run('Georgian Biomedical News\nISSN (Online): 2720-8796 ISSN (Print): 2720-7994\nDownloaded from gbmn.org. For personal use only. No other uses without permission.', {
            font: 'Arial',
            size: 14,
            bold: true,
            color: '000000',
          }),
        ],
      }),
    ],
  });
}

function journalHeader() {
  const logoCell = new TableCell({
    width: { size: 3800, type: WidthType.DXA },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          run('gbmn', { font: 'Arial', size: 74, bold: true, color: COLORS.teal }),
          run('  GEORGIAN\nBIOMEDICAL\nNEWS', { font: 'Arial', size: 30, bold: true, color: '000000' }),
        ],
      }),
    ],
  });

  const issueCell = new TableCell({
    width: { size: BODY_WIDTH - 3800, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [run(`VOLUME X ISSUE X. ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}`, { font: 'Arial', size: 20, bold: true, color: '000000' })],
      }),
    ],
  });

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TableBordersNone,
      rows: [new TableRow({ children: [logoCell, issueCell] })],
    }),
    new Paragraph({
      border: {
        bottom: { color: COLORS.teal, style: BorderStyle.DOUBLE, size: 8 },
      },
      spacing: { before: 0, after: 380 },
      children: [run('')],
    }),
  ];
}

const TableBordersNone = {
  top: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  bottom: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  left: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  right: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  insideHorizontal: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
  insideVertical: { style: BorderStyle.NONE, color: 'FFFFFF', size: 0 },
};

function titleBlock(manuscript: Manuscript): DocxChild[] {
  const title = manuscript.title ? toGbmnTitleCase(manuscript.title) : '[Article Title]';
  const authorRuns: any[] = [];
  manuscript.authors.forEach((author, index) => {
    if (index > 0) authorRuns.push(run(', ', { color: '777777' }));
    authorRuns.push(run(`${author.firstName} ${author.middleInitial ? `${author.middleInitial}. ` : ''}${author.lastName}`, { size: 22, color: '777777' }));
    const url = orcidUrl(author.orcidId);
    const numberRun = run(String(index + 1), { size: 16, superScript: true, color: COLORS.teal, underline: {} });
    authorRuns.push(url ? new ExternalHyperlink({ link: url, children: [numberRun] }) : numberRun);
  });

  const affiliations = manuscript.authors.map((author, index) => {
    const corresponding = author.isCorresponding ? ` — Corresponding: ${author.email}` : '';
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        run(String(index + 1), { size: 14, superScript: true, color: COLORS.teal }),
        run(` ${author.affiliation}${corresponding}`, {
          size: 20,
          color: COLORS.gray,
          italics: author.isCorresponding,
        }),
      ],
    });
  });

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 0, after: 160 },
      children: [run(title, { size: 40, bold: true, color: COLORS.teal })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: authorRuns.length ? authorRuns : [run('Author Name¹, Author Name²', { size: 22, color: '777777' })],
    }),
    ...affiliations,
  ];
}

async function abstractBlock(manuscript: Manuscript): Promise<DocxChild[]> {
  const config = ARTICLE_TYPES[manuscript.articleType];
  if (config?.abstractType === 'none') return [];

  const entries = Object.entries(manuscript.abstractContents).filter(([, value]) => stripHtml(value));
  if (!entries.length) return [];
  const abstractHtml = entries.length === 1
    ? entries[0][1]
    : entries.map(([label, value]) => `<p><strong>${label}:</strong> ${value}</p>`).join('');

  return [
    heading('ABSTRACT'),
    ...await htmlToDocxChildren(abstractHtml),
    new Paragraph({
      border: { bottom: { color: '999999', style: BorderStyle.SINGLE, size: 6 } },
      spacing: { before: 80, after: 240 },
      children: [run('')],
    }),
  ];
}

function keywordsBlock(manuscript: Manuscript): DocxChild[] {
  const keywords = stripHtml(manuscript.sections.Keywords);
  if (!keywords) return [];
  return [
    new Paragraph({
      spacing: { before: 0, after: 260 },
      children: [
        run('KEYWORDS: ', { font: 'Arial', bold: true, size: 20, color: '000000' }),
        run(keywords, { size: 20, color: COLORS.body }),
      ],
    }),
  ];
}

async function bodyBlocks(manuscript: Manuscript): Promise<DocxChild[]> {
  const config = ARTICLE_TYPES[manuscript.articleType];
  const body: DocxChild[] = [];
  const sections = (config?.requiredSections || Object.keys(manuscript.sections)).filter(section => section !== 'Keywords');
  let firstSection = true;

  for (const section of sections) {
    if (!stripHtml(manuscript.sections[section])) continue;
    body.push(heading(section));
    body.push(...await htmlToDocxChildren(manuscript.sections[section], { dropCap: firstSection }));
    firstSection = false;
  }

  if (manuscript.fundingDetails.fundingAgency) {
    body.push(heading('Funding'));
    body.push(bodyParagraph([
      run(`This work was supported by ${manuscript.fundingDetails.fundingAgency}${manuscript.fundingDetails.grantNumber ? ` [grant number ${manuscript.fundingDetails.grantNumber}]` : ''}.`),
    ], false));
  }

  if (manuscript.conflictDisclosure.hasConflict && text(manuscript.conflictDisclosure.conflictDetails)) {
    body.push(heading('Conflict of Interest Statement'));
    body.push(bodyParagraph([run(manuscript.conflictDisclosure.conflictDetails)], false));
  } else {
    body.push(heading('Conflict of Interest Statement'));
    body.push(bodyParagraph([run('The authors declare that the research was conducted in the absence of any commercial or financial relationships that could be construed as a potential conflict of interest.')], false));
  }

  if (manuscript.ethics.humanSubjectsApproved !== 'not-applicable') {
    body.push(heading('Ethics Statement'));
    body.push(bodyParagraph([
      run(manuscript.ethics.humanSubjectsApproved === 'yes'
        ? `The study was approved by ${manuscript.ethics.irbInstitution || 'the Institutional Review Board'} (${manuscript.ethics.irbApprovalNumber || 'approval number pending'}).`
        : `Ethics approval: ${manuscript.ethics.humanSubjectsApproved}.`),
    ], false));
  }

  if (manuscript.references.length) {
    body.push(heading('References'));
    manuscript.references.forEach((ref, index) => {
      const url = referenceUrl(ref);
      const citationText = `${index + 1}. ${formatAMAReference(ref).replace(/\*/g, '')}`;
      const citationRun = run(citationText, { size: 20, color: COLORS.body });
      body.push(new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 0, after: 80, line: 240, lineRule: LineRuleType.AUTO },
        indent: { hanging: 280, left: 280 },
        children: url ? [new ExternalHyperlink({ link: url, children: [citationRun] })] : [citationRun],
      }));
    });
  }

  return body.length ? body : [bodyParagraph([run('No article body has been entered yet.')], false)];
}

export async function downloadManuscriptDocx(manuscript: Manuscript) {
  const frontMatter = [
    ...journalHeader(),
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
          paragraph: { spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Times New Roman', size: 24, bold: true, color: COLORS.darkGreen },
          paragraph: { spacing: { before: 400, after: 200 }, keepNext: true },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: A4, margin: MARGINS },
          column: { count: 1, equalWidth: true },
        },
        footers: { default: footer() },
        children: frontMatter.length ? frontMatter : [new Paragraph('')],
      },
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
