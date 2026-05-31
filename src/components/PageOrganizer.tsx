import React, { useEffect, useRef, useState } from 'react';
import { 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  FileText,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PdfFile, IndividualPageRef } from '../types';

interface PageOrganizerProps {
  files: PdfFile[];
  pages: IndividualPageRef[];
  onPagesChange: (newPages: IndividualPageRef[]) => void;
  onResetToDefault: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

// Memory Cache to bypass double parsing files when sorting/reordering
const pdfDocCache = new Map<string, any>();

export async function getCachedPdfDoc(fileId: string, file: File, password?: string) {
  if (pdfDocCache.has(fileId)) {
    return pdfDocCache.get(fileId);
  }
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) return null;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      password: password || undefined
    }).promise;
    pdfDocCache.set(fileId, pdf);
    return pdf;
  } catch (err) {
    console.error('Failed caching PDF document:', err);
    return null;
  }
}

export default function PageOrganizer({
  files,
  pages,
  onPagesChange,
  onResetToDefault,
  onUndo,
  canUndo = false
}: PageOrganizerProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Reorder functions
  const movePageLeft = (index: number) => {
    if (index === 0) return;
    const nextList = [...pages];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    onPagesChange(nextList);
  };

  const movePageRight = (index: number) => {
    if (index === pages.length - 1) return;
    const nextList = [...pages];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    onPagesChange(nextList);
  };

  const deletePage = (index: number) => {
    const nextList = pages.filter((_, idx) => idx !== index);
    onPagesChange(nextList);
  };

  // Drag and drop mechanics for individual page items
  const handlePageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    // Throttle list layout state updating
    const nextList = [...pages];
    const targetItem = nextList[draggedIdx];
    nextList.splice(draggedIdx, 1);
    nextList.splice(index, 0, targetItem);
    setDraggedIdx(index);
    onPagesChange(nextList);
  };

  const handlePageDragEnd = () => {
    setDraggedIdx(null);
  };

  return (
    <div id="page-organizer-workspace" className="w-full bg-slate-950/40 rounded-2xl border border-slate-900 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-indigo-500/20">
              Page-by-Page Assembly Planner
            </span>
            <span className="text-slate-500 text-xs font-semibold">&bull; {pages.length} Pages Staged</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-display">
            Custom Compiled Pages Sequence
          </h3>
          <p className="text-xs text-slate-400">
            Scroll, drag-and-drop page cards, or click arrows to reorder. Delete unwanted single pages immediately.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {canUndo && onUndo && (
            <button
              onClick={onUndo}
              className="px-3 py-1.5 border border-slate-800 rounded-lg hover:border-slate-700 bg-slate-900 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              title="Undo last organizing edit"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
              <span>Undo Last</span>
            </button>
          )}

          <button
            onClick={onResetToDefault}
            className="px-3 py-1.5 border border-slate-800 rounded-lg hover:border-slate-700 bg-slate-900/40 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Reset to raw sequential view matching uploaded file ranges"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Reset Pages</span>
          </button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-medium space-y-2 border-2 border-dashed border-slate-900 rounded-2xl">
          <FileText className="w-8 h-8 mx-auto text-slate-600 block" />
          <p className="text-xs">No pages remain. Drag range sliders or click Reset Pages to restore.</p>
        </div>
      ) : (
        /* Visual scrollable grid of single page nodes */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-2">
          <AnimatePresence initial={false}>
            {pages.map((p, index) => {
              const matchingFile = files.find(f => f.id === p.fileId);
              if (!matchingFile) return null;

              const isFirst = index === 0;
              const isLast = index === pages.length - 1;

              return (
                <motion.div
                  key={p.id}
                  layoutId={`p-card-${p.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  draggable
                  onDragStart={(e) => handlePageDragStart(e, index)}
                  onDragOver={(e) => handlePageDragOver(e, index)}
                  onDragEnd={handlePageDragEnd}
                  className={`group relative bg-slate-900/60 hover:bg-slate-900 border-2 rounded-xl p-3 flex flex-col justify-between space-y-3 shadow select-none ${
                    draggedIdx === index 
                      ? 'border-indigo-500/80 border-dashed bg-slate-950/40 opacity-40 scale-95' 
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top line with sequence index label */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Page <span className="text-indigo-400 font-extrabold">{index + 1}</span>
                    </span>

                    <button
                      onClick={() => deletePage(index)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition-colors cursor-pointer"
                      title="Delete this page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail center container */}
                  <div className="w-full h-28 bg-slate-950 rounded border border-slate-850 overflow-hidden relative flex items-center justify-center">
                    <SinglePageThumbnail
                      file={matchingFile}
                      pageNum={p.sourcePageNum}
                    />
                  </div>

                  {/* Footer details & micro-shorters */}
                  <div className="space-y-2">
                    <div className="min-w-0 text-center">
                      <p className="text-[10px] text-slate-300 truncate font-semibold px-0.5" title={p.fileName}>
                        {p.fileName}
                      </p>
                      <span className="text-[8px] font-mono text-slate-500 font-medium tracking-wide">
                        Original Page {p.sourcePageNum}
                      </span>
                    </div>

                    {/* Quick arrows layout to slide left/right */}
                    <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-900/80">
                      <button
                        disabled={isFirst}
                        onClick={() => movePageLeft(index)}
                        className="p-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Move left"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>

                      <div className="px-1 shrink-0">
                        <Menu className="w-3 h-3 text-slate-700 group-hover:text-indigo-500 transition-colors cursor-move" />
                      </div>

                      <button
                        disabled={isLast}
                        onClick={() => movePageRight(index)}
                        className="p-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Move right"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Highly performance-optimized PDF canvas viewer
interface ThumbnailProps {
  file: PdfFile;
  pageNum: number;
}

function SinglePageThumbnail({ file, pageNum }: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [err, setErr] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setErr(false);

    const renderPage = async () => {
      try {
        const pdf = await getCachedPdfDoc(file.id, file.file, file.password);
        if (!pdf || !active) return;

        const page = await pdf.getPage(pageNum);
        if (!active) return;

        // Use a lightweight layout scale to ensure performance
        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context && active) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            await page.render(renderContext).promise;
            if (active) {
              setLoaded(true);
            }
          }
        }
      } catch (err) {
        console.error('Single-page canvas render fail:', err);
        if (active) {
          setErr(true);
          setLoaded(true);
        }
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [file.id, file.file, file.password, pageNum]);

  return (
    <div className="relative flex items-center justify-center w-full h-full p-1 bg-slate-950">
      {!loaded && (
        <div className="absolute inset-x-0 flex flex-col items-center justify-center space-y-1">
          <div className="w-4 h-4 border border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full object-contain bg-white shadow-md rounded ${
          loaded && !err ? 'block opacity-100' : 'hidden opacity-0'
        } transition-opacity duration-150`}
      />
      {err && (
        <span className="text-[8px] font-mono text-rose-500 font-bold">Unreadable</span>
      )}
    </div>
  );
}
