import React, { useEffect, useState, useRef } from 'react';

interface GlobalDropOverlayProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export default function GlobalDropOverlay({ onFilesSelected }: GlobalDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFilesSelected]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-6 bg-[#010f1f]/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl p-10 rounded-2xl border-2 border-dashed border-[#8083ff] bg-[#0d1c2d]/90 shadow-[0_0_50px_rgba(128,131,255,0.35)] flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#8083ff]/20 border border-[#8083ff]/40 flex items-center justify-center text-[#c0c1ff] animate-bounce">
          <span className="material-symbols-outlined text-[36px]">file_upload</span>
        </div>
        <div>
          <h3 className="font-display font-bold text-2xl text-[#d4e4fa] tracking-tight">
            Drop PDF Files Anywhere
          </h3>
          <p className="font-sans text-sm text-[#7bd0ff] mt-1">
            Release to stage documents into the active workspace pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#010f1f] px-4 py-1.5 rounded-full border border-[#1c2b3c] font-mono text-xs text-[#c7c4d7]">
          <span className="w-2 h-2 rounded-full bg-[#7bd0ff] animate-ping"></span>
          <span>Client-side only · Zero server uploads</span>
        </div>
      </div>
    </div>
  );
}
