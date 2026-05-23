import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export default function UploadZone({ onFilesSelected }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileInput}
      className={`relative w-full border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 group ${
        isDragOver
          ? 'border-indigo-400 bg-slate-800/60 shadow-lg shadow-indigo-500/10'
          : 'border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/30'
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
        <div className={`p-4 rounded-full transition-all duration-300 ${
          isDragOver 
            ? 'bg-indigo-500/20 text-indigo-300 scale-110' 
            : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:bg-slate-700'
        }`}>
          <UploadCloud className="w-10 h-10" />
        </div>
        <div>
          <p className="text-lg font-medium text-slate-200">
            Drag & Drop Files Here
          </p>
          <p className="text-sm text-slate-400 mt-1">
            or click to browse from your device
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <span>Accepts multiple PDF documents</span>
        </div>
      </div>
    </div>
  );
}
