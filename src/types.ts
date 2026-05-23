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

export interface MergeOptions {
  files: PdfFile[];
}
