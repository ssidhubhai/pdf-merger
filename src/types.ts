export interface PdfFile {
  id: string;
  name: string;
  size: string;
  file: File;
  totalPages: number;
  fromPage: number;
  toPage: number;
  thumbnailUrl?: string; // Cache the generated page 1 thumbnail
  isRendering?: boolean;
  isEncrypted?: boolean;
  needsPassword?: boolean;
  password?: string;
}

export interface IndividualPageRef {
  id: string;
  fileId: string;
  fileName: string;
  sourcePageNum: number;
}

export interface MergeOptions {
  files: PdfFile[];
}

export type ActiveWorkspaceTab = 
  | 'merge-and-split' 
  | 'compress' 
  | 'latex-to-pdf' 
  | 'ocr-and-convert' 
  | 'settings';

export type TexEngine = 'pdflatex' | 'xelatex' | 'lualatex';

export type TemplateCategory = 
  | 'all' 
  | 'resumes' 
  | 'theses' 
  | 'presentations' 
  | 'papers';

export interface LatexTemplate {
  id: string;
  title: string;
  category: 'resumes' | 'theses' | 'presentations' | 'papers';
  categoryLabel: string;
  engine: TexEngine;
  engineLabel: string;
  description: string;
  tags: string[];
  code: string;
  author: string;
  affiliation?: string;
  date?: string;
  abstractText?: string;
  sections: { title: string; body: string }[];
  equation?: string;
  previewType: 'resume' | 'academic' | 'thesis' | 'presentation' | 'slides' | 'poster';
  pageCount: number;
}

export interface CompilerLogItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  time: string;
  message: string;
}
