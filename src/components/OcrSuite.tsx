import React, { useState } from 'react';
import { PdfFile } from '../types';

interface OcrSuiteProps {
  stagedFiles: PdfFile[];
  onFilesSelected: (files: FileList | File[]) => void;
  onNotify?: (msg: string) => void;
}

export default function OcrSuite({ stagedFiles, onFilesSelected, onNotify }: OcrSuiteProps) {
  const [selectedFileId, setSelectedFileId] = useState<string>(stagedFiles[0]?.id || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPages, setExtractedPages] = useState<{ pageNum: number; text: string }[]>([]);
  const [activePageNum, setActivePageNum] = useState<number>(1);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const activeFile = stagedFiles.find((f) => f.id === selectedFileId) || stagedFiles[0];

  const handleExtractText = async () => {
    if (!activeFile) return;
    setIsExtracting(true);
    setExtractedPages([]);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
        throw new Error('PDF.js reader engine not loaded yet');
      }

      const arrayBuffer = await activeFile.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: activeFile.password || undefined,
      }).promise;

      const results: { pageNum: number; text: string }[] = [];

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        results.push({
          pageNum: p,
          text: pageText || `[Page ${p}: No raw textual stream detected. May be scanned imagery.]`,
        });
      }

      setExtractedPages(results);
      setActivePageNum(1);

      if (onNotify) {
        onNotify(`Extracted text from ${pdf.numPages} pages!`);
      }
    } catch (err: any) {
      console.error('Text extraction failed:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 1500);
  };

  const handleDownloadTxt = () => {
    const fullText = extractedPages.map((p) => `--- PAGE ${p.pageNum} ---\n${p.text}`).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFile.name.replace(/\.pdf$/i, '')}-extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 text-[#d4e4fa]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[#7bd0ff] text-[22px]">document_scanner</span>
          <h2 className="font-display font-bold text-2xl text-[#d4e4fa] tracking-tight">
            PDF OCR &amp; Text Extraction
          </h2>
        </div>
        <p className="font-sans text-xs sm:text-sm text-[#c7c4d7]">
          Extract raw textual streams and index glyph structures client-side via in-memory PDF parsing.
        </p>
      </div>

      {stagedFiles.length === 0 ? (
        <div className="p-10 rounded-2xl border-2 border-dashed border-[#273647] bg-[#0d1c2d] flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#1c2b3c] flex items-center justify-center text-[#c0c1ff]">
            <span className="material-symbols-outlined text-[28px]">search</span>
          </div>
          <p className="font-display font-bold text-base text-[#d4e4fa]">No documents staged for extraction</p>
          <p className="font-sans text-xs text-[#908fa0] max-w-md">
            Drag and drop a PDF file anywhere on this screen to parse and extract text layers.
          </p>
          <label className="px-4 py-2 rounded-lg bg-[#8083ff] text-[#0d0096] font-display text-xs font-bold cursor-pointer hover:bg-[#c0c1ff] transition-all">
            Choose PDF File
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) onFilesSelected(e.target.files);
              }}
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File selector & Action */}
          <div className="lg:col-span-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-5 flex flex-col gap-4">
            <div>
              <label className="font-mono text-[10px] uppercase font-bold text-[#908fa0] block mb-1.5">
                Target Document
              </label>
              <select
                value={selectedFileId}
                onChange={(e) => {
                  setSelectedFileId(e.target.value);
                  setExtractedPages([]);
                }}
                className="w-full bg-[#122131] border border-[#273647] rounded-lg px-3 py-2 text-xs font-sans text-[#d4e4fa] focus:outline-none focus:border-[#8083ff]"
              >
                {stagedFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.totalPages} pages)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExtractText}
              disabled={isExtracting}
              className={`w-full py-2.5 rounded-lg font-display text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(128,131,255,0.25)] ${
                isExtracting
                  ? 'bg-[#8083ff]/60 text-white cursor-wait'
                  : 'bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9]'
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${isExtracting ? 'animate-spin' : ''}`}>
                {isExtracting ? 'refresh' : 'read_more'}
              </span>
              <span>{isExtracting ? 'Parsing Text Layers...' : 'Extract Text Stream'}</span>
            </button>

            {extractedPages.length > 0 && (
              <div className="pt-3 border-t border-[#1c2b3c] space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-[#908fa0] block">
                  Pages ({extractedPages.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {extractedPages.map((p) => (
                    <button
                      key={p.pageNum}
                      type="button"
                      onClick={() => setActivePageNum(p.pageNum)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        activePageNum === p.pageNum
                          ? 'bg-[#7bd0ff] text-[#00354a]'
                          : 'bg-[#122131] text-[#c7c4d7] hover:bg-[#1c2b3c]'
                      }`}
                    >
                      P.{p.pageNum}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="flex-1 py-1.5 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-xs font-display font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    Export .TXT
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text Viewport */}
          <div className="lg:col-span-8 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-5 flex flex-col justify-between min-h-[400px]">
            {extractedPages.length > 0 ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c2b3c] mb-3">
                  <span className="font-mono text-xs text-[#7bd0ff] font-bold">
                    Page {activePageNum} of {extractedPages.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(extractedPages.find((p) => p.pageNum === activePageNum)?.text || '')}
                    className="px-2.5 py-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-xs font-display flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedNotice ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedNotice ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>

                <div className="flex-1 p-4 bg-[#010f1f] border border-[#1c2b3c] rounded-lg font-mono text-xs leading-relaxed text-[#d4e4fa] overflow-y-auto whitespace-pre-wrap select-text max-h-[480px]">
                  {extractedPages.find((p) => p.pageNum === activePageNum)?.text}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#908fa0]">
                <span className="material-symbols-outlined text-[40px] text-[#1c2b3c] mb-2">text_fields</span>
                <p className="font-display font-bold text-sm text-[#d4e4fa]">No Text Extracted Yet</p>
                <p className="font-sans text-xs mt-1 max-w-sm">
                  Click "Extract Text Stream" to analyze font maps, character tables, and positional glyph records.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
