import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  FileDown, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MergedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  pdfBlob: Blob | null;
  filename: string;
}

export default function MergedPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  pdfBlob,
  filename
}: MergedPreviewModalProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'single'>('single');
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (!isOpen || !pdfBlob) {
      setPdfDoc(null);
      setTotalPages(0);
      setErrorMsg('');
      return;
    }

    let active = true;
    setLoading(true);
    setPdfDoc(null);
    setErrorMsg('');
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('PDF render engine is currently initializing. Please try again in a moment.');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

        const arrayBuffer = await pdfBlob.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;

        if (active) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading merged PDF preview:', err);
        if (active) {
          setErrorMsg(err?.message || 'Failed to render PDF preview.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      active = false;
    };
  }, [isOpen, pdfBlob]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-slate-950/90 backdrop-blur-sm overflow-hidden font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="bg-slate-900 border border-slate-800 rounded-none md:rounded-2xl w-full h-full max-w-6xl flex flex-col shadow-2xl overflow-hidden"
          id="preview-modal-panel"
        >
          {/* Header Action Row */}
          <div className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 rounded-xl shadow-md">
                <Eye className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-100 font-display truncate pr-4" title={filename}>
                  {filename}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Merge Preview &bull; {totalPages} Total Pages &bull; {pdfBlob ? (pdfBlob.size / 1024 / 1024).toFixed(2) : '0'} MB
                </p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Zoom Controls (only shown for single page mode for better layout consistency) */}
              {layoutMode === 'single' && (
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setZoomScale(p => Math.max(0.4, p - 0.15))}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-400 px-2 select-none">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(p => Math.min(2.0, p + 0.15))}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* View Layout Switcher toggles between single scroll and matrix grid */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setLayoutMode('single')}
                  className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded transition-all cursor-pointer ${
                    layoutMode === 'single'
                      ? 'bg-indigo-600/25 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Book View
                </button>
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded transition-all cursor-pointer ${
                    layoutMode === 'grid'
                      ? 'bg-indigo-600/25 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Grid View
                </button>
              </div>

              {/* Download CTA Link */}
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  download={filename}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-1.5 px-4 rounded-lg flex items-center gap-1.5 text-xs shadow-md transition-all align-middle cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span className="hidden md:inline">Download</span>
                </a>
              )}

              {/* Close Overlay Trigger */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Exit Preview"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Main Scroller Content Area */}
          <div className="flex-1 bg-slate-950 overflow-y-auto p-6 flex flex-col items-center">
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Generating preview segment matrices</h4>
                  <p className="text-xs text-slate-500 font-mono">Drawing vectorized page buffers locally...</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/15 rounded-2xl p-8 max-w-md text-center space-y-3 my-12">
                <div className="text-rose-400 font-bold font-display">Preview Generation Interrupted</div>
                <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-250 border border-slate-800"
                >
                  Download directly instead
                </button>
              </div>
            )}

            {/* Rendered Document Elements */}
            {!loading && !errorMsg && pdfDoc && (
              <>
                {layoutMode === 'single' ? (
                  /* Single Page Navigator layout styling */
                  <div className="w-full max-w-3xl flex flex-col items-center space-y-6">
                    {/* Floating mini navigation */}
                    <div className="flex items-center justify-between w-full bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 px-4 py-2.5 rounded-xl shadow-lg">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="p-1 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 disabled:opacity-30 disabled:hover:bg-slate-950 rounded-lg text-xs font-bold text-slate-350 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4.5 h-4.5" />
                        <span>Prev</span>
                      </button>

                      <span className="text-xs font-mono font-bold text-slate-300">
                        Page {currentPage} of <span className="text-indigo-400">{totalPages}</span>
                      </span>

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="p-1 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800/80 disabled:opacity-30 disabled:hover:bg-slate-950 rounded-lg text-xs font-bold text-slate-350 flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {/* Unified single page viewport canvas rendering frame */}
                    <div className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl flex justify-center items-center overflow-auto max-w-full">
                      <CanvasPageItem 
                        pdfDoc={pdfDoc}
                        pageNumber={currentPage}
                        zoom={zoomScale}
                      />
                    </div>
                  </div>
                ) : (
                  /* Matrix Thumbnail Grid mode */
                  <div className="w-full space-y-8">
                    <div className="text-center space-y-1 max-w-md mx-auto mb-4">
                      <h4 className="text-sm font-semibold text-slate-300">Staged Sheet Assembler Matrix</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Scroll to see every page inside your output document blueprint. Click any page card to jump to single reader mode.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {Array.from({ length: totalPages }, (_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <div
                            key={`grid-prev-page-${pageNum}`}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              setLayoutMode('single');
                            }}
                            className="group bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 flex flex-col items-center space-y-2.5 transition-all text-center cursor-pointer select-none"
                          >
                            <span className="text-[10px] font-mono font-extrabold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              Page {pageNum}
                            </span>
                            <div className="w-full bg-slate-950 p-1.5 rounded flex items-center justify-center max-h-48 overflow-hidden min-h-[140px]">
                              <CanvasPageItem
                                pdfDoc={pdfDoc}
                                pageNumber={pageNum}
                                zoom={0.3}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Bottom notification banner */}
          <div className="border-t border-slate-800/60 bg-slate-950 py-3.5 px-6 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Instant Sandbox Assembly View Completed
            </span>
            <span>Local RAM Processing &bull; Safe & Private</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Compact helper to render actual Canvas page elements safely with loading status caches
interface CanvasPageItemProps {
  pdfDoc: any;
  pageNumber: number;
  zoom: number;
}

function CanvasPageItem({ pdfDoc, pageNumber, zoom }: CanvasPageItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setDone(false);

    const draw = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        
        // Handle high density displays gracefully
        const viewport = page.getViewport({ scale: zoom });
        
        if (!active) return;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderCtx = {
              canvasContext: ctx,
              viewport: viewport
            };

            await page.render(renderCtx).promise;
            if (active) {
              setDone(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed drawing canvas render for merged document page:', err);
      }
    };

    draw();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber, zoom]);

  return (
    <div className="relative flex justify-center items-center">
      {!done && (
        <div className="absolute inset-x-0 w-28 h-36 bg-slate-950/75 animate-pulse rounded border border-slate-800/40 flex items-center justify-center">
          <span className="text-[9px] font-mono text-slate-600">Drawing...</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full height-auto select-none rounded shadow-lg bg-white border border-slate-700/30 ${
          done ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-150`}
      />
    </div>
  );
}
