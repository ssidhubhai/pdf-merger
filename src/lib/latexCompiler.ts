import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';

export interface LatexElement {
  id: string;
  type: 'section' | 'subsection' | 'subsubsection' | 'paragraph' | 'equation' | 'list' | 'table' | 'frame';
  title?: string;
  content?: string;
  rawMath?: string;
  items?: string[];
  tableHeaders?: string[];
  tableRows?: string[][];
  equationNum?: number;
}

export interface ParsedLatexDoc {
  docClass: string;
  isTwoColumn: boolean;
  title: string;
  author: string;
  affiliation: string;
  date: string;
  abstractText: string;
  elements: LatexElement[];
  warnings: string[];
  errors: string[];
  packages: string[];
  lineCount: number;
}

/**
 * Extracts content inside balanced curly braces starting after a command.
 * Handles nested braces properly like \title{Non-Perturbative \textbf{Field} Coupling}
 */
export function extractBracedContent(text: string, startIndex: number): { content: string; endIndex: number } | null {
  const openBrace = text.indexOf('{', startIndex);
  if (openBrace === -1) return null;

  let depth = 1;
  let i = openBrace + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === '{' && text[i - 1] !== '\\') {
      depth++;
    } else if (text[i] === '}' && text[i - 1] !== '\\') {
      depth--;
    }
    i++;
  }

  if (depth === 0) {
    return {
      content: text.substring(openBrace + 1, i - 1),
      endIndex: i,
    };
  }
  return null;
}

/**
 * Cleans LaTeX formatting macros for display and PDF rendering
 */
export function cleanLatexText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\textbf\{([^}]+)\}/g, '$1')
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    .replace(/\\texttt\{([^}]+)\}/g, '$1')
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    .replace(/\\textsuperscript\{([^}]+)\}/g, '^$1')
    .replace(/\\textsubscript\{([^}]+)\}/g, '_$1')
    .replace(/\\textbullet\b/g, '•')
    .replace(/\\cite\{([^}]+)\}/g, '[$1]')
    .replace(/\\ref\{([^}]+)\}/g, '$1')
    .replace(/\\label\{([^}]+)\}/g, '')
    .replace(/\\today\b/g, new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
    .replace(/\\%/g, '%')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/~/g, ' ')
    .replace(/\\\\/g, '\n')
    .replace(/\\par\b/g, '\n\n')
    .replace(/\\[a-zA-Z]+\b/g, '') // remove remaining backslash commands
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses LaTeX source code into a structured document model
 */
export function parseLatexCode(code: string): ParsedLatexDoc {
  const warnings: string[] = [];
  const errors: string[] = [];
  const packages: string[] = [];
  const lines = code.split('\n');
  const lineCount = lines.length;

  // 1. Scan packages
  const packageRegex = /\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let pkgMatch;
  while ((pkgMatch = packageRegex.exec(code)) !== null) {
    const pkgs = pkgMatch[1].split(',').map((p) => p.trim());
    packages.push(...pkgs);
  }

  // 2. Document Class & Column options
  let docClass = 'article';
  let isTwoColumn = false;
  const classMatch = code.match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/);
  if (classMatch) {
    docClass = classMatch[2].trim();
    if (classMatch[1] && classMatch[1].includes('twocolumn')) {
      isTwoColumn = true;
    }
  }

  // 3. Document Metadata
  let title = '';
  const titleIdx = code.indexOf('\\title');
  if (titleIdx !== -1) {
    const extracted = extractBracedContent(code, titleIdx + 6);
    if (extracted) title = cleanLatexText(extracted.content);
  }

  let author = '';
  const authorIdx = code.indexOf('\\author');
  if (authorIdx !== -1) {
    const extracted = extractBracedContent(code, authorIdx + 7);
    if (extracted) author = cleanLatexText(extracted.content);
  }

  // Also check \namesection (Deedy CV format)
  if (!title && !author) {
    const nameMatch = code.match(/\\namesection\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/);
    if (nameMatch) {
      author = `${nameMatch[1]} ${nameMatch[2]}`;
      title = `${author} - Curriculum Vitae`;
    }
  }

  let date = '';
  const dateIdx = code.indexOf('\\date');
  if (dateIdx !== -1) {
    const extracted = extractBracedContent(code, dateIdx + 5);
    if (extracted) date = cleanLatexText(extracted.content);
  }
  if (!date || date === '\\today') {
    date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  // Abstract extraction
  let abstractText = '';
  const abstractMatch = code.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (abstractMatch) {
    abstractText = cleanLatexText(abstractMatch[1]);
  }

  // Check balanced environments
  const beginMatches = code.match(/\\begin\{([^}]+)\}/g) || [];
  const endMatches = code.match(/\\end\{([^}]+)\}/g) || [];
  if (beginMatches.length !== endMatches.length) {
    warnings.push(`Environment count imbalance: ${beginMatches.length} \\begin vs ${endMatches.length} \\end tags.`);
  }

  // Check document tags
  const hasBeginDoc = code.includes('\\begin{document}');
  const hasEndDoc = code.includes('\\end{document}');
  if (!hasBeginDoc) {
    warnings.push('Missing \\begin{document} declaration. Compiling body in permissive mode.');
  }
  if (!hasEndDoc && hasBeginDoc) {
    warnings.push('Missing \\end{document} terminator at EOF.');
  }

  // 4. Body Content Extraction
  let bodyContent = code;
  if (hasBeginDoc) {
    const docStart = code.indexOf('\\begin{document}') + 16;
    const docEnd = hasEndDoc ? code.indexOf('\\end{document}') : code.length;
    bodyContent = code.substring(docStart, docEnd);
  }

  // Remove \maketitle and abstract from body
  bodyContent = bodyContent.replace(/\\maketitle/g, '');
  if (abstractMatch) {
    bodyContent = bodyContent.replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/, '');
  }

  const elements: LatexElement[] = [];
  let equationCount = 0;

  // Split into tokens / environments
  const envRegex = /(\\section\*?\{[^}]+\}|\\subsection\*?\{[^}]+\}|\\subsubsection\*?\{[^}]+\}|\\begin\{equation\*?\}[\s\S]*?\\end\{equation\*?\}|\\begin\{itemize\}[\s\S]*?\\end\{itemize\}|\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}|\\begin\{tabular\}[\s\S]*?\\end\{tabular\}|\\begin\{frame\}[\s\S]*?\\end\{frame\}|\\\[[\s\S]*?\\\])/g;

  let lastIndex = 0;
  let match;

  while ((match = envRegex.exec(bodyContent)) !== null) {
    // Collect preceding plain paragraph text
    const prevText = bodyContent.substring(lastIndex, match.index).trim();
    if (prevText) {
      const paragraphs = prevText.split(/\n\s*\n/).map((p) => cleanLatexText(p)).filter(Boolean);
      for (const p of paragraphs) {
        if (p.length > 0) {
          elements.push({
            id: `el-${elements.length}`,
            type: 'paragraph',
            content: p,
          });
        }
      }
    }

    const matchedStr = match[0];

    // Section
    if (matchedStr.startsWith('\\section')) {
      const titleExtract = extractBracedContent(matchedStr, 8);
      const title = titleExtract ? cleanLatexText(titleExtract.content) : 'Section';
      elements.push({
        id: `el-${elements.length}`,
        type: 'section',
        title,
      });
    }
    // Subsection
    else if (matchedStr.startsWith('\\subsection')) {
      const titleExtract = extractBracedContent(matchedStr, 11);
      const title = titleExtract ? cleanLatexText(titleExtract.content) : 'Subsection';
      elements.push({
        id: `el-${elements.length}`,
        type: 'subsection',
        title,
      });
    }
    // Subsubsection
    else if (matchedStr.startsWith('\\subsubsection')) {
      const titleExtract = extractBracedContent(matchedStr, 14);
      const title = titleExtract ? cleanLatexText(titleExtract.content) : 'Subsubsection';
      elements.push({
        id: `el-${elements.length}`,
        type: 'subsubsection',
        title,
      });
    }
    // Equation
    else if (matchedStr.startsWith('\\begin{equation') || matchedStr.startsWith('\\[') || matchedStr.startsWith('$$')) {
      equationCount++;
      let rawMath = matchedStr
        .replace(/\\begin\{equation\*?\}/, '')
        .replace(/\\end\{equation\*?\}/, '')
        .replace(/^\\\[/, '')
        .replace(/\\\]$/, '')
        .trim();
      elements.push({
        id: `el-${elements.length}`,
        type: 'equation',
        rawMath,
        equationNum: equationCount,
      });
    }
    // Itemize / Enumerate
    else if (matchedStr.startsWith('\\begin{itemize') || matchedStr.startsWith('\\begin{enumerate')) {
      const listBody = matchedStr
        .replace(/\\begin\{(itemize|enumerate)\}/, '')
        .replace(/\\end\{(itemize|enumerate)\}/, '');
      const rawItems = listBody.split(/\\item\b/).map((item) => cleanLatexText(item)).filter(Boolean);
      elements.push({
        id: `el-${elements.length}`,
        type: 'list',
        items: rawItems,
      });
    }
    // Tabular
    else if (matchedStr.startsWith('\\begin{tabular')) {
      const tabBody = matchedStr
        .replace(/\\begin\{tabular\}\{[^}]+\}/, '')
        .replace(/\\end\{tabular\}/, '')
        .replace(/\\hline/g, '')
        .trim();
      const rows = tabBody.split(/\\\\/).map((row) => row.split('&').map((cell) => cleanLatexText(cell).trim()).filter(Boolean)).filter((r) => r.length > 0);
      elements.push({
        id: `el-${elements.length}`,
        type: 'table',
        tableHeaders: rows[0] || [],
        tableRows: rows.slice(1),
      });
    }
    // Frame (Beamer)
    else if (matchedStr.startsWith('\\begin{frame}')) {
      const frameTitleMatch = matchedStr.match(/\\begin\{frame\}\{([^}]+)\}/);
      const frameTitle = frameTitleMatch ? cleanLatexText(frameTitleMatch[1]) : 'Slide Frame';
      const frameBody = matchedStr
        .replace(/\\begin\{frame\}(\{[^}]+\})?/, '')
        .replace(/\\end\{frame\}/, '');
      elements.push({
        id: `el-${elements.length}`,
        type: 'frame',
        title: frameTitle,
        content: cleanLatexText(frameBody),
      });
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Trailing paragraph text
  const remainingText = bodyContent.substring(lastIndex).trim();
  if (remainingText) {
    const paragraphs = remainingText.split(/\n\s*\n/).map((p) => cleanLatexText(p)).filter(Boolean);
    for (const p of paragraphs) {
      if (p.length > 0) {
        elements.push({
          id: `el-${elements.length}`,
          type: 'paragraph',
          content: p,
        });
      }
    }
  }

  // Fallback defaults if title was omitted
  if (!title) {
    title = 'Compiled LaTeX Document';
  }
  if (!author) {
    author = 'Author';
  }

  return {
    docClass,
    isTwoColumn,
    title,
    author,
    affiliation: '',
    date,
    abstractText,
    elements,
    warnings,
    errors,
    packages,
    lineCount,
  };
}

/**
 * Word wrap helper for PDF text drawing with pdf-lib
 */
function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Generates an authentic, multi-page PDF from the parsed LaTeX document
 */
export async function compileLatexToPdf(doc: ParsedLatexDoc): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Page geometry
  const isBeamer = doc.docClass.toLowerCase().includes('beamer');
  const pageWidth = isBeamer ? 720 : 595.28;
  const pageHeight = isBeamer ? 405 : 841.89;
  const margin = isBeamer ? 36 : 54;
  const contentWidth = pageWidth - margin * 2;

  // Fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const titleFont = isBeamer ? helveticaBold : timesBold;
  const bodyFont = isBeamer ? helvetica : timesRoman;
  const boldFont = isBeamer ? helveticaBold : timesBold;
  const italicFont = timesItalic;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const ensureSpace = (requiredHeight: number) => {
    if (currentY - requiredHeight < margin + 30) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }
  };

  // --- Document Title ---
  ensureSpace(40);
  const titleLines = wrapText(doc.title, contentWidth, titleFont, isBeamer ? 18 : 16);
  for (const line of titleLines) {
    const lineWidth = titleFont.widthOfTextAtSize(line, isBeamer ? 18 : 16);
    const xPos = isBeamer ? margin : margin + (contentWidth - lineWidth) / 2;
    currentPage.drawText(line, {
      x: xPos,
      y: currentY,
      size: isBeamer ? 18 : 16,
      font: titleFont,
      color: isBeamer ? rgb(0.1, 0.15, 0.3) : rgb(0.05, 0.08, 0.15),
    });
    currentY -= (isBeamer ? 22 : 20);
  }

  // --- Author & Date ---
  if (doc.author) {
    ensureSpace(20);
    const authorLine = `${doc.author} ${doc.date ? `• ${doc.date}` : ''}`;
    const authorWidth = italicFont.widthOfTextAtSize(authorLine, 10);
    const xPos = isBeamer ? margin : margin + (contentWidth - authorWidth) / 2;
    currentPage.drawText(authorLine, {
      x: xPos,
      y: currentY,
      size: 10,
      font: italicFont,
      color: rgb(0.3, 0.35, 0.45),
    });
    currentY -= 20;
  }

  // Decorative Rule below header
  ensureSpace(15);
  currentPage.drawLine({
    start: { x: margin, y: currentY },
    end: { x: pageWidth - margin, y: currentY },
    thickness: 0.75,
    color: rgb(0.8, 0.83, 0.88),
  });
  currentY -= 15;

  // --- Abstract Box ---
  if (doc.abstractText) {
    const abstractLines = wrapText(doc.abstractText, contentWidth - 24, timesRoman, 9);
    const boxHeight = abstractLines.length * 12 + 24;
    ensureSpace(boxHeight);

    // Box background
    currentPage.drawRectangle({
      x: margin,
      y: currentY - boxHeight + 8,
      width: contentWidth,
      height: boxHeight,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 0.75,
    });

    currentPage.drawText('ABSTRACT', {
      x: margin + 12,
      y: currentY - 8,
      size: 8,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    let abstractY = currentY - 20;
    for (const line of abstractLines) {
      currentPage.drawText(line, {
        x: margin + 12,
        y: abstractY,
        size: 9,
        font: timesRoman,
        color: rgb(0.2, 0.25, 0.35),
      });
      abstractY -= 12;
    }
    currentY -= (boxHeight + 12);
  }

  // --- Body Elements ---
  for (const el of doc.elements) {
    if (el.type === 'section') {
      ensureSpace(32);
      currentY -= 10;
      currentPage.drawText(el.title || '', {
        x: margin,
        y: currentY,
        size: 12,
        font: boldFont,
        color: rgb(0.05, 0.08, 0.15),
      });
      currentY -= 5;
      currentPage.drawLine({
        start: { x: margin, y: currentY },
        end: { x: margin + Math.min(200, contentWidth), y: currentY },
        thickness: 0.5,
        color: rgb(0.65, 0.7, 0.78),
      });
      currentY -= 14;
    } else if (el.type === 'subsection') {
      ensureSpace(24);
      currentY -= 6;
      currentPage.drawText(el.title || '', {
        x: margin,
        y: currentY,
        size: 11,
        font: boldFont,
        color: rgb(0.12, 0.16, 0.25),
      });
      currentY -= 14;
    } else if (el.type === 'paragraph') {
      if (!el.content) continue;
      const lines = wrapText(el.content, contentWidth, bodyFont, 9.5);
      ensureSpace(lines.length * 13 + 8);
      for (const line of lines) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY,
          size: 9.5,
          font: bodyFont,
          color: rgb(0.15, 0.2, 0.3),
        });
        currentY -= 13;
      }
      currentY -= 6;
    } else if (el.type === 'equation') {
      const mathStr = el.rawMath || 'E = mc^2';
      ensureSpace(28);
      const mathWidth = courier.widthOfTextAtSize(mathStr, 9);
      const eqX = margin + (contentWidth - mathWidth) / 2;

      // Draw background tint
      currentPage.drawRectangle({
        x: margin + 10,
        y: currentY - 4,
        width: contentWidth - 20,
        height: 18,
        color: rgb(0.96, 0.97, 0.98),
      });

      currentPage.drawText(mathStr, {
        x: Math.max(margin + 16, eqX),
        y: currentY,
        size: 9,
        font: courier,
        color: rgb(0.1, 0.1, 0.2),
      });

      if (el.equationNum) {
        currentPage.drawText(`(${el.equationNum})`, {
          x: pageWidth - margin - 25,
          y: currentY,
          size: 8,
          font: timesRoman,
          color: rgb(0.4, 0.45, 0.55),
        });
      }
      currentY -= 24;
    } else if (el.type === 'list') {
      if (!el.items) continue;
      for (const item of el.items) {
        const lines = wrapText(item, contentWidth - 18, bodyFont, 9.5);
        ensureSpace(lines.length * 13 + 4);
        currentPage.drawText('•', {
          x: margin + 4,
          y: currentY,
          size: 10,
          font: boldFont,
          color: rgb(0.3, 0.4, 0.6),
        });
        for (let i = 0; i < lines.length; i++) {
          currentPage.drawText(lines[i], {
            x: margin + 16,
            y: currentY,
            size: 9.5,
            font: bodyFont,
            color: rgb(0.15, 0.2, 0.3),
          });
          currentY -= 13;
        }
        currentY -= 2;
      }
      currentY -= 4;
    } else if (el.type === 'table') {
      if (!el.tableHeaders) continue;
      const colCount = Math.max(el.tableHeaders.length, 1);
      const colWidth = contentWidth / colCount;
      ensureSpace(22 + (el.tableRows?.length || 0) * 16);

      // Header row
      for (let c = 0; c < el.tableHeaders.length; c++) {
        currentPage.drawText(el.tableHeaders[c], {
          x: margin + c * colWidth + 4,
          y: currentY,
          size: 9,
          font: boldFont,
          color: rgb(0.1, 0.15, 0.25),
        });
      }
      currentY -= 4;
      currentPage.drawLine({
        start: { x: margin, y: currentY },
        end: { x: pageWidth - margin, y: currentY },
        thickness: 0.5,
        color: rgb(0.7, 0.75, 0.82),
      });
      currentY -= 12;

      // Table body rows
      if (el.tableRows) {
        for (const row of el.tableRows) {
          ensureSpace(16);
          for (let c = 0; c < row.length; c++) {
            currentPage.drawText(row[c] || '', {
              x: margin + c * colWidth + 4,
              y: currentY,
              size: 8.5,
              font: bodyFont,
              color: rgb(0.2, 0.25, 0.35),
            });
          }
          currentY -= 14;
        }
      }
      currentY -= 8;
    }
  }

  // --- Page Numbering Footers on all pages ---
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const footerText = `— Page ${i + 1} of ${totalPages} —`;
    const footerWidth = courier.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: margin / 2,
      size: 8,
      font: courier,
      color: rgb(0.55, 0.6, 0.7),
    });
  }

  return await pdfDoc.save();
}
