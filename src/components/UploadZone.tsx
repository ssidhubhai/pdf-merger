import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  compact?: boolean;
}

export default function UploadZone({ onFilesSelected, compact = false }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value so re-uploading the same file works
      e.target.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`w-full py-4 px-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 group flex items-center justify-center gap-3 ${
          isDragOver
            ? 'border-[#8083ff] bg-[#122131] shadow-[0_0_20px_rgba(128,131,255,0.2)]'
            : 'border-[#1c2b3c] bg-[#0d1c2d]/70 hover:border-[#8083ff]/50 hover:bg-[#122131]/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="application/pdf"
          multiple
          className="hidden"
        />
        <div className="w-8 h-8 rounded-lg bg-[#1c2b3c] flex items-center justify-center text-[#7bd0ff] group-hover:text-[#c0c1ff] transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
        </div>
        <div className="text-left">
          <span className="font-display font-semibold text-xs text-[#d4e4fa] block">
            Drop more PDF files here to append
          </span>
          <span className="font-sans text-[11px] text-[#908fa0]">or click to browse files</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
      className={`relative w-full border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 group ${
        isDragOver
          ? 'border-[#8083ff] bg-[#122131] shadow-[0_0_35px_rgba(128,131,255,0.25)] scale-[1.01]'
          : 'border-[#1c2b3c] bg-[#0d1c2d]/80 hover:border-[#8083ff]/60 hover:bg-[#122131]/60'
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/pdf"
        multiple
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div
          className={`p-4 rounded-2xl transition-all duration-300 ${
            isDragOver
              ? 'bg-[#8083ff]/25 text-[#c0c1ff] scale-110 shadow-lg'
              : 'bg-[#1c2b3c] text-[#7bd0ff] group-hover:text-[#c0c1ff] group-hover:bg-[#273647]'
          }`}
        >
          <span className="material-symbols-outlined text-[36px]">cloud_upload</span>
        </div>

        <div>
          <p className="font-display font-bold text-lg text-[#d4e4fa]">
            Drag &amp; Drop PDF Files Here
          </p>
          <p className="font-sans text-xs text-[#908fa0] mt-1">
            Drop anywhere onto the screen or click to browse from device
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#7bd0ff] font-mono bg-[#010f1f] px-3 py-1 rounded-full border border-[#1c2b3c]">
          <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
          <span>100% In-Browser &amp; Zero File Limit</span>
        </div>
      </div>
    </div>
  );
}
