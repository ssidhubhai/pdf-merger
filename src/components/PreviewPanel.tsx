import { useEffect, useState, useRef } from 'react';
import { X, FileText, ChevronRight, Hash, EyeOff } from 'lucide-react';
import { PdfFile } from '../types';

interface PreviewPanelProps {
  file: PdfFile | null;
  onClose: () => void;
  onRangeChange: (fromPage: number, toPage: number) => void;
}

export default function PreviewPanel({ file, onClose, onRangeChange }: PreviewPanelProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [visiblePages, setVisiblePages] = useState<number[]>([]);

  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setErrorMsg('');
      return;
    }

    let active = true;
    setLoading(true);
    setPdfDoc(null);
    setErrorMsg('');

    const loadPdfForPreview = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('PDF viewer engine not loaded');
        }

        const arrayBuffer = await file.file.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({
          data: typedarray,
          password: file.password || undefined
        });
        const pdf = await loadingTask.promise;

        if (active) {
          setPdfDoc(pdf);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF for detailed preview:', err);
        if (active) {
          setErrorMsg('Failed to load this PDF preview. You can still merge this file.');
          setLoading(false);
        }
      }
    };

    loadPdfForPreview();

    return () => {
      active = false;
    };
  }, [file]);

  if (!file) return null;

  return (
    <aside
      className="fixed top-0 right-0 h-screen w-full sm:w-[480px] md:w-[540px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 transform translate-x-0"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate" title={file.name}>
              {file.name}
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {file.totalPages} Pages &bull; {file.size}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Adjust Ranges Panel (Staged) */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-400" />
            Set Range for Merge
          </span>
          <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            Page {file.fromPage} to {file.toPage} Selected
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Combine From</label>
            <input
              type="number"
              min={1}
              max={file.totalPages}
              value={file.fromPage}
              onChange={(e) => {
                let val = parseInt(e.target.value) || 1;
                let cleanVal = Math.max(1, Math.min(file.totalPages, val));
                if (cleanVal > file.toPage) cleanVal = file.toPage;
                onRangeChange(cleanVal, file.toPage);
              }}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none rounded-lg p-2 text-center text-slate-200"
            />
          </div>
          <div className="flex items-center pt-4 text-slate-600">
            <ChevronRight className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-medium block mb-1">Combine To</label>
            <input
              type="number"
              min={1}
              max={file.totalPages}
              value={file.toPage}
              onChange={(e) => {
                let val = parseInt(e.target.value) || file.totalPages;
                let cleanVal = Math.max(1, Math.min(file.totalPages, val));
                if (cleanVal < file.fromPage) cleanVal = file.fromPage;
                onRangeChange(file.fromPage, cleanVal);
              }}
              className="w-full text-xs font-mono bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none rounded-lg p-2 text-center text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Pages Preview Carousel/Scroller */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950/20 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-400">Loading page blueprints...</p>
          </div>
        )}

        {errorMsg && (
          <div className="flex flex-col items-center justify-center p-8 text-center h-64">
            <EyeOff className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-400">{errorMsg}</p>
          </div>
        )}

        {pdfDoc && (
          <div className="space-y-6">
            {Array.from({ length: file.totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const isSelected = pageNumber >= file.fromPage && pageNumber <= file.toPage;
              return (
                <PreviewPage
                  key={`${file.id}-page-${pageNumber}`}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNumber}
                  isSelected={isSelected}
                  onIncludeToggle={() => {
                    if (isSelected) {
                      // Shrink range from current state
                      if (pageNumber === file.fromPage && pageNumber < file.toPage) {
                        onRangeChange(pageNumber + 1, file.toPage);
                      } else if (pageNumber === file.toPage && pageNumber > file.fromPage) {
                        onRangeChange(file.fromPage, pageNumber - 1);
                      } else {
                        // Reset range to single clicked page
                        onRangeChange(pageNumber, pageNumber);
                      }
                    } else {
                      // Expand range to include this page
                      if (pageNumber < file.fromPage) {
                        onRangeChange(pageNumber, file.toPage);
                      } else if (pageNumber > file.toPage) {
                        onRangeChange(file.fromPage, pageNumber);
                      }
                    }
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// Sub-component for individual pages implementation
interface PreviewPageProps {
  key?: string;
  pdfDoc: any;
  pageNumber: number;
  isSelected: boolean;
  onIncludeToggle: () => void;
}

function PreviewPage({ pdfDoc, pageNumber, isSelected, onIncludeToggle }: PreviewPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.8 });

        if (!active) return;

        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            await page.render(renderContext).promise;
            if (active) setRendered(true);
          }
        }
      } catch (err) {
        console.error(`Error rendering page preview ${pageNumber}:`, err);
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      onClick={onIncludeToggle}
      className={`mx-auto max-w-sm rounded-lg overflow-hidden border transition-all duration-300 relative cursor-pointer group ${
        isSelected
          ? 'border-indigo-500 bg-indigo-950/10 ring-1 ring-indigo-500/20'
          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
      }`}
    >
      <div className="p-2 border-b border-slate-800/80 bg-slate-950 flex justify-between items-center px-3.5">
        <span className="text-xs font-mono font-bold text-slate-400">
          Page {pageNumber}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            isSelected
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-400/20'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {isSelected ? 'Staged' : 'Omitted'}
        </span>
      </div>
      <div className="p-3 bg-slate-950/20 flex justify-center items-center">
        {!rendered && (
          <div className="w-full h-48 bg-slate-950/50 animate-pulse rounded flex items-center justify-center">
            <span className="text-[10px] text-slate-600 font-mono">Rendering blueprint...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full max-w-xs object-contain cursor-pointer shadow-md rounded border border-slate-800/20 transition-transform group-hover:scale-[1.01] ${
            rendered ? 'block' : 'hidden'
          }`}
        />
      </div>
    </div>
  );
}
