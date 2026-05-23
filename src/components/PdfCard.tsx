import React, { useEffect, useRef, useState } from 'react';
import { Trash2, MoveLeft, MoveRight, Eye, Lock, RefreshCw, Scissors, CopyPlus } from 'lucide-react';
import { PdfFile } from '../types';

interface PdfCardProps {
  key?: string;
  file: PdfFile;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRangeChange: (fromPage: number, toPage: number) => void;
  isFirst: boolean;
  isLast: boolean;
  // Drag and drop support
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  // Decryption callback
  onUnlockPassword?: (id: string, pwd: string) => Promise<boolean>;
  // Split support
  onSplitAllPages?: () => void;
  onExtractSelectedRange?: () => void;
}

export default function PdfCard({
  file,
  isSelected,
  onDelete,
  onSelect,
  onMoveLeft,
  onMoveRight,
  onRangeChange,
  isFirst,
  isLast,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  onUnlockPassword,
  onSplitAllPages,
  onExtractSelectedRange,
}: PdfCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);

  // Password Input State
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let active = true;
    if (file.needsPassword) {
      setThumbnailLoaded(true);
      return;
    }

    const renderThumbnail = async () => {
      try {
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          console.warn('PDF.js not available yet');
          return;
        }

        // Set worker if not already set
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

        const arrayBuffer = await file.file.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({
          data: typedarray,
          password: file.password || undefined
        });
        const pdf = await loadingTask.promise;

        if (!active) return;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.25 });

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
            if (active) {
              setThumbnailLoaded(true);
              setErrorLoading(false);
            }
          }
        }
      } catch (err: any) {
        console.error('Error generating card thumbnail:', err);
        if (active) {
          setErrorLoading(true);
          setThumbnailLoaded(true);
        }
      }
    };

    renderThumbnail();

    return () => {
      active = false;
    };
  }, [file.file, file.needsPassword, file.password]);

  const handleFromChange = (newVal: number) => {
    if (file.needsPassword) return;
    let cleanVal = Math.max(1, Math.min(file.totalPages, newVal));
    if (cleanVal > file.toPage) {
      cleanVal = file.toPage;
    }
    onRangeChange(cleanVal, file.toPage);
  };

  const handleToChange = (newVal: number) => {
    if (file.needsPassword) return;
    let cleanVal = Math.max(1, Math.min(file.totalPages, newVal));
    if (cleanVal < file.fromPage) {
      cleanVal = file.fromPage;
    }
    onRangeChange(file.fromPage, cleanVal);
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!passwordInput.trim() || unlocking) return;

    setUnlocking(true);
    setUnlockError('');

    try {
      const success = await onUnlockPassword?.(file.id, passwordInput.trim());
      if (!success) {
        setUnlockError('Incorrect PDF password');
      }
    } catch (err) {
      setUnlockError('Verification failed');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div
      onClick={onSelect}
      draggable={!file.needsPassword}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`group relative flex flex-col w-56 rounded-xl bg-slate-900 border-2 text-slate-100 p-4 transition-all duration-300 select-none ${
        file.needsPassword ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } ${
        isDragging
          ? 'opacity-40 border-dashed border-indigo-500/50 scale-[0.98]'
          : isSelected
          ? 'border-indigo-500 shadow-lg shadow-indigo-500/10'
          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 shadow-md'
      }`}
    >
      {/* Remove / Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -top-2 -right-2 z-10 p-1.5 rounded-full bg-rose-500/95 text-white hover:bg-rose-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100 duration-200"
        title="Remove file"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Manual Arrow-swap triggers (Backup for keyboard/click users) */}
      {!file.needsPassword && (
        <div className="absolute top-2 left-2 z-10 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!isFirst && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveLeft();
              }}
              className="p-1 rounded bg-slate-800/90 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors shadow"
              title="Move left"
            >
              <MoveLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {!isLast && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveRight();
              }}
              className="p-1 rounded bg-slate-800/90 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors shadow"
              title="Move right"
            >
              <MoveRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Conditional Interface: Password Needed vs normal */}
      {file.needsPassword ? (
        /* LOCK SCREEN FOR ENCRYPTED ARCHIVES */
        <div className="flex-1 flex flex-col items-center justify-between min-h-[300px]" onClick={(e) => e.stopPropagation()}>
          <div className="w-full h-32 bg-rose-950/20 border border-rose-500/15 rounded-lg flex flex-col items-center justify-center p-3 text-center space-y-1.5 mt-2">
            <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-widest font-mono">Encrypted</span>
            <p className="text-[10px] text-slate-400 truncate w-full px-1">{file.name}</p>
          </div>

          <form onSubmit={handleUnlockSubmit} className="w-full space-y-2 mt-4">
            <div>
              <label className="text-[9px] text-slate-500 font-bold block mb-1 font-mono uppercase">Password Required</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setUnlockError('');
                }}
                placeholder="Enter password"
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none rounded-lg p-2 text-slate-100 placeholder-slate-600"
              />
            </div>

            {unlockError && (
              <span className="text-[10px] text-rose-400 font-semibold block text-center animate-shake">
                {unlockError}
              </span>
            )}

            <button
              type="submit"
              disabled={unlocking}
              className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold py-1.5 rounded-lg text-xs hover:from-rose-600 hover:to-red-700 shadow flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {unlocking ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Unlock PDF</span>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* STANDARD RENDER GRAPH WITH THUMBNAIL */
        <>
          {/* Thumbnail Area */}
          <div className="relative w-full h-40 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800/80 mb-3 group-hover:border-slate-700 transition-colors">
            {!thumbnailLoaded && (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-500 font-mono">Drawing preview</span>
              </div>
            )}

            {errorLoading && (
              <div className="text-center p-3">
                <span className="text-xs text-rose-450 font-medium">Render Restricted</span>
                <p className="text-[10px] text-slate-500 mt-1">Ready for compiler use</p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-full object-contain ${
                thumbnailLoaded && !errorLoading ? 'block' : 'hidden'
              }`}
            />

            {/* Eye Hover overlay for Preview */}
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <div className="flex items-center space-x-1.5 bg-slate-900/90 py-1 px-2.5 rounded-full text-[11px] font-medium border border-slate-700">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Preview</span>
              </div>
            </div>
          </div>

          {/* File Info */}
          <div className="mb-3 px-1">
            <h4
              className="text-sm font-semibold truncate text-slate-200 group-hover:text-white transition-colors"
              title={file.name}
            >
              {file.name}
            </h4>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1 font-mono">
              <span className="bg-slate-950/65 px-1.5 py-0.5 rounded text-[10px]">
                {file.totalPages} pages
              </span>
              <span>{file.size}</span>
            </div>
          </div>

          {/* Page Selector Inputs */}
          <div className="mt-auto pt-3 border-t border-slate-800/80 flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Scope Selection</span>
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <label className="text-[9px] text-slate-500 block mb-1">From</label>
                <input
                  type="number"
                  min={1}
                  max={file.totalPages}
                  value={file.fromPage}
                  onChange={(e) => handleFromChange(parseInt(e.target.value) || 1)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded p-1.5 text-center text-slate-200"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-slate-500 block mb-1">To</label>
                <input
                  type="number"
                  min={1}
                  max={file.totalPages}
                  value={file.toPage}
                  onChange={(e) => handleToChange(parseInt(e.target.value) || file.totalPages)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded p-1.5 text-center text-slate-200"
                />
              </div>
            </div>

            {/* Visual range bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden relative mt-1">
              <div
                className="absolute bg-gradient-to-r from-indigo-500 to-purple-500 h-full"
                style={{
                  left: `${((file.fromPage - 1) / file.totalPages) * 100}%`,
                  width: `${((file.toPage - file.fromPage + 1) / file.totalPages) * 100}%`,
                }}
              />
            </div>

            {/* Split Actions widget (Rendered only on selection) */}
            {isSelected && (
              <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-800/50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplitAllPages?.();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold text-indigo-400 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Split into single page documents"
                >
                  <Scissors className="w-3 h-3 text-indigo-500" />
                  <span>Split All</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExtractSelectedRange?.();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold text-purple-400 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Save current range as split standalone copy"
                >
                  <CopyPlus className="w-3 h-3 text-purple-500" />
                  <span>Slice Copy</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
