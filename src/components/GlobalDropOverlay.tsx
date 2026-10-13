import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalDropOverlayProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export default function GlobalDropOverlay({ onFilesSelected }: GlobalDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const watchdogTimer = useRef<NodeJS.Timeout | null>(null);

  const resetState = useCallback(() => {
    dragCounter.current = 0;
    if (watchdogTimer.current) {
      clearTimeout(watchdogTimer.current);
      watchdogTimer.current = null;
    }
    setIsDragging(false);
  }, []);

  // Check if incoming drag is genuinely external files from OS
  const isExternalFileDrag = useCallback((e: DragEvent): boolean => {
    // If user is dragging a card or UI element inside the application, ignore
    if ((window as any).__isInternalDrag) return false;
    if (!e.dataTransfer) return false;

    const types = Array.from(e.dataTransfer.types || []);
    // Only trigger for external desktop files
    return types.includes('Files');
  }, []);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();

      dragCounter.current += 1;
      setIsDragging(true);

      // Keep watchdog alive
      if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
      watchdogTimer.current = setTimeout(resetState, 800);
    };

    const handleDragOver = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }

      if (!isDragging) {
        setIsDragging(true);
      }

      // Renew watchdog timer on every active dragover tick
      if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
      watchdogTimer.current = setTimeout(resetState, 800);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();

      dragCounter.current -= 1;

      // If counter reaches 0 or mouse physically exited window viewport
      if (
        dragCounter.current <= 0 ||
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        resetState();
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      resetState();

      if (files && files.length > 0) {
        onFilesSelected(files);
      }
    };

    // Internal drag listeners so dragging cards inside the app never triggers the global overlay
    const handleDragStart = () => {
      (window as any).__isInternalDrag = true;
      resetState();
    };

    const handleDragEnd = () => {
      (window as any).__isInternalDrag = false;
      resetState();
    };

    const handleWindowBlur = () => {
      resetState();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetState();
      }
    };

    const handleMouseUp = () => {
      resetState();
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
    };
  }, [isExternalFileDrag, onFilesSelected, resetState, isDragging]);

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          key="global-drop-curtain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            if (watchdogTimer.current) clearTimeout(watchdogTimer.current);
            watchdogTimer.current = setTimeout(resetState, 800);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resetState();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = e.dataTransfer.files;
            resetState();
            if (files && files.length > 0) {
              onFilesSelected(files);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#010f1f]/80 backdrop-blur-md pointer-events-auto"
        >
          {/* Animated Drop Target Box */}
          <motion.div
            initial={{ scale: 0.92, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="relative w-full max-w-xl p-8 sm:p-12 rounded-2xl border-2 border-dashed border-[#8083ff] bg-[#0d1c2d]/95 shadow-[0_0_60px_rgba(128,131,255,0.4)] flex flex-col items-center text-center space-y-4"
          >
            {/* Quick Dismiss button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetState();
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-[#1c2b3c] hover:bg-[#273647] text-[#c7c4d7] hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
              title="Dismiss drop overlay (Esc)"
            >
              ✕
            </button>

            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-2xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] shadow-[0_0_20px_rgba(128,131,255,0.3)] animate-pulse">
              <span className="material-symbols-outlined text-[36px]">file_upload</span>
            </div>

            <div>
              <h3 className="font-display font-bold text-2xl text-[#d4e4fa] tracking-tight">
                Drop PDF Files Anywhere
              </h3>
              <p className="font-sans text-xs sm:text-sm text-[#7bd0ff] mt-1">
                Release to stage documents into the active workspace pipeline
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#010f1f] px-3.5 py-1.5 rounded-full border border-[#1c2b3c] font-mono text-[11px] text-[#c7c4d7]">
              <span className="w-2 h-2 rounded-full bg-[#7bd0ff] animate-ping"></span>
              <span>Client-side only · Zero server uploads</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
