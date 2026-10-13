import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  FileDown, 
  CheckCircle, 
  RefreshCw, 
  FileCheck2,
  Minimize2,
  Zap,
  Undo2,
  ArrowUpDown,
  Grid,
  List,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HeaderNav from './components/HeaderNav';
import GlobalDropOverlay from './components/GlobalDropOverlay';
import LatexStudio from './components/LatexStudio';
import CompressSuite from './components/CompressSuite';
import OcrSuite from './components/OcrSuite';
import SettingsSuite from './components/SettingsSuite';
import UploadZone from './components/UploadZone';
import PdfCard from './components/PdfCard';
import PreviewPanel from './components/PreviewPanel';
import MergedPreviewModal from './components/MergedPreviewModal';
import PageOrganizer from './components/PageOrganizer';
import { PdfFile, IndividualPageRef, ActiveWorkspaceTab } from './types';
import { 
  storeFileBinary, 
  getFileBinary, 
  deleteFileBinary, 
  clearAllFileBinaries 
} from './lib/db';

// Helper to clean file names for suggestion
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
};

const generateSuggestedFilename = (stagedFiles: PdfFile[]): string => {
  if (stagedFiles.length === 0) return 'merged-document.pdf';
  
  const activeFiles = stagedFiles.filter(f => !f.needsPassword);
  if (activeFiles.length === 0) return 'merged-document.pdf';

  const cleanNames = activeFiles.map(f => {
    const baseName = f.name.replace(/\.pdf$/i, '').trim();
    return sanitizeFilename(baseName);
  });
  
  let suggested = 'merged-document';
  if (cleanNames.length === 1) {
    suggested = `Merged-${cleanNames[0]}`;
  } else if (cleanNames.length === 2) {
    suggested = `Merged-${cleanNames[0]}-${cleanNames[1]}`;
  } else {
    suggested = `Merged-${cleanNames[0]}-and-${cleanNames.length - 1}-others`;
  }
  
  if (suggested.length > 50) {
    suggested = suggested.substring(0, 47) + '...';
  }
  
  return `${suggested}.pdf`;
};

// Utility to format bytes beautifully
const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function App() {
  // Navigation State (defaults to merge-and-split per user preference)
  const [activeTab, setActiveTab] = useState<ActiveWorkspaceTab>('merge-and-split');

  // Staged PDF State
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string>('');
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [suggestedFilename, setSuggestedFilename] = useState('');
  const [originalTotalSize, setOriginalTotalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);

  // Layout & Organizer States
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [isMergedPreviewOpen, setIsMergedPreviewOpen] = useState(false);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);
  const [isOrganizerEnabled, setIsOrganizerEnabled] = useState(false);
  const [individualPages, setIndividualPages] = useState<IndividualPageRef[] | null>(null);
  const [pagesHistoryStack, setPagesHistoryStack] = useState<IndividualPageRef[][]>([]);

  // Drag-and-drop index tracking & history stack for undo
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [historyStack, setHistoryStack] = useState<PdfFile[][]>([]);
  const [preDragFiles, setPreDragFiles] = useState<PdfFile[] | null>(null);

  // Persistence & Initialization States
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const pushToHistory = (currentState: PdfFile[]) => {
    setHistoryStack((prev) => {
      const next = [...prev, currentState];
      if (next.length > 25) next.shift();
      return next;
    });
  };

  const pushToPagesHistory = (currentState: IndividualPageRef[]) => {
    setPagesHistoryStack((prev) => {
      const next = [...prev, currentState];
      if (next.length > 25) next.shift();
      return next;
    });
  };

  const regenerateDefaultPages = (currentFiles: PdfFile[]): IndividualPageRef[] => {
    const defaultPages: IndividualPageRef[] = [];
    currentFiles.filter(f => !f.needsPassword).forEach(f => {
      for (let p = f.fromPage; p <= f.toPage; p++) {
        defaultPages.push({
          id: `page-${f.id}-${p}-${Math.random().toString(36).substring(2, 9)}`,
          fileId: f.id,
          fileName: f.name,
          sourcePageNum: p
        });
      }
    });
    return defaultPages;
  };

  const handleReverseFiles = () => {
    if (files.length <= 1) return;
    pushToHistory(files);
    setFiles((prev) => [...prev].reverse());
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    if (isOrganizerEnabled && individualPages) {
      const defaultPages = regenerateDefaultPages([...files].reverse());
      pushToPagesHistory(individualPages);
      setIndividualPages(defaultPages);
    }
    showNotification('Reversed file order');
  };

  const handleUndo = async () => {
    if (isOrganizerEnabled && individualPages) {
      if (pagesHistoryStack.length === 0) return;
      const nextHistory = [...pagesHistoryStack];
      const previousState = nextHistory.pop();
      if (previousState) {
        setIndividualPages(previousState);
        setPagesHistoryStack(nextHistory);
        setMergedPdfUrl(null);
        setMergedPdfBlob(null);
      }
      showNotification('Undid previous action');
      return;
    }

    if (historyStack.length === 0) return;
    const nextHistory = [...historyStack];
    const previousState = nextHistory.pop();
    if (previousState) {
      setErrorText('');
      setMergedPdfUrl(null);
      try {
        for (const f of previousState) {
          const alreadyInIndexedDB = files.some(current => current.id === f.id);
          if (!alreadyInIndexedDB) {
            await storeFileBinary(f.id, f.file);
          }
        }
      } catch (err) {
        console.error('Failed to sync IndexedDB binaries upon undo action:', err);
      }

      setFiles(previousState);
      setHistoryStack(nextHistory);
      showNotification('Undid previous action');
    }
  };

  // Keyboard shortcut listener (Cmd+Z or Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, files, isOrganizerEnabled, individualPages, pagesHistoryStack]);

  // Restore state on mount from IndexedDB and localStorage
  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedMeta = localStorage.getItem('staged_pdf_metadata');
        const savedCompression = localStorage.getItem('pdf_compression_enabled');
        
        if (savedCompression !== null) {
          setCompressionEnabled(savedCompression === 'true');
        }

        if (savedMeta) {
          const parsedMeta = JSON.parse(savedMeta) as any[];
          const recoveredFiles: PdfFile[] = [];
          
          for (const meta of parsedMeta) {
            const binary = await getFileBinary(meta.id);
            if (binary) {
              recoveredFiles.push({
                ...meta,
                file: binary
              });
            }
          }
          
          if (recoveredFiles.length > 0) {
            setFiles(recoveredFiles);
          }
        }
      } catch (err) {
        console.error('Failed to restore offline state:', err);
      } finally {
        setIsInitialized(true);
        setIsLoadingState(false);
      }
    };
    
    restoreState();
  }, []);

  // Save metadata to localStorage when files layout is modified
  useEffect(() => {
    if (!isInitialized) return;
    
    if (files.length === 0) {
      localStorage.removeItem('staged_pdf_metadata');
      return;
    }
    
    const metadata = files.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      totalPages: f.totalPages,
      fromPage: f.fromPage,
      toPage: f.toPage,
      isEncrypted: f.isEncrypted,
      needsPassword: f.needsPassword,
      password: f.password,
    }));
    
    localStorage.setItem('staged_pdf_metadata', JSON.stringify(metadata));
  }, [files, isInitialized]);

  // Handle addition of files from UploadZone or GlobalDrop
  const handleFilesSelected = async (selectedList: FileList | File[]) => {
    setErrorText('');
    setMergedPdfUrl(null);
    const newPdfFiles: PdfFile[] = [];

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      setErrorText('PDF engine is loading. Please try again in a moment!');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    for (let i = 0; i < selectedList.length; i++) {
      const file = selectedList[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const totalPages = pdf.numPages;

        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await storeFileBinary(fileId, file);

        newPdfFiles.push({
          id: fileId,
          name: file.name,
          size: formatSize(file.size),
          file,
          totalPages,
          fromPage: 1,
          toPage: totalPages,
        });
      } catch (err: any) {
        console.error(`Error loading pdf header for ${file.name}:`, err);
        if (err && err.name === 'PasswordException') {
          const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await storeFileBinary(fileId, file);

          newPdfFiles.push({
            id: fileId,
            name: file.name,
            size: formatSize(file.size),
            file,
            totalPages: 0,
            fromPage: 0,
            toPage: 0,
            isEncrypted: true,
            needsPassword: true,
            password: '',
          });
          setErrorText('One or more selected documents are password-protected. Unlock them on their cards below.');
        } else {
          setErrorText(`Could not parse "${file.name}". Is the document corrupted?`);
        }
      }
    }

    if (newPdfFiles.length > 0) {
      pushToHistory(files);
      setFiles((prev) => [...prev, ...newPdfFiles]);
      showNotification(`Added ${newPdfFiles.length} document${newPdfFiles.length > 1 ? 's' : ''}`);
    }
  };

  // Reordering functions
  const moveLeft = (index: number) => {
    if (index === 0) return;
    pushToHistory(files);
    setFiles((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
    setMergedPdfUrl(null);
  };

  const moveRight = (index: number) => {
    if (index === files.length - 1) return;
    pushToHistory(files);
    setFiles((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
    setMergedPdfUrl(null);
  };

  const handleDragStart = (index: number) => {
    setPreDragFiles(files);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setFiles((prev) => {
      const list = [...prev];
      const draggedItem = list[draggedIndex];
      list.splice(draggedIndex, 1);
      list.splice(index, 0, draggedItem);
      return list;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setMergedPdfUrl(null);
    if (preDragFiles) {
      const changed = files.length !== preDragFiles.length || files.some((f, idx) => f.id !== preDragFiles[idx]?.id);
      if (changed) pushToHistory(preDragFiles);
      setPreDragFiles(null);
    }
  };

  // Password Unlock Handler
  const handleUnlockPassword = async (id: string, pwd: string): Promise<boolean> => {
    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return false;

    const fileObj = files.find(f => f.id === id);
    if (!fileObj) return false;

    try {
      const arrayBuffer = await fileObj.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: pwd
      }).promise;

      const totalPages = pdf.numPages;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                totalPages,
                fromPage: 1,
                toPage: totalPages,
                needsPassword: false,
                password: pwd,
              }
            : f
        )
      );

      setErrorText('');
      setMergedPdfUrl(null);
      showNotification(`Unlocked ${fileObj.name}`);
      return true;
    } catch (err: any) {
      console.error(`Decryption check failed for file ${fileObj.name}:`, err);
      return false;
    }
  };

  // Split document into single pages
  const handleSplitAllPages = async (id: string) => {
    const fileObj = files.find(f => f.id === id);
    if (!fileObj) return;

    if (fileObj.needsPassword) {
      setErrorText('Unlock the document password on its element card first.');
      return;
    }

    if (fileObj.totalPages <= 1) {
      setErrorText('File only has a single page. Split requires 2+ pages.');
      return;
    }

    pushToHistory(files);
    setIsMerging(true);
    setMergeProgress(10);
    setErrorText('');
    setMergedPdfUrl(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await fileObj.file.arrayBuffer();
      const originalDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        password: fileObj.password || undefined,
      } as any);

      const newStagedFiles: PdfFile[] = [];
      const baseName = fileObj.name.replace(/\.pdf$/i, '');

      for (let i = 0; i < fileObj.totalPages; i++) {
        setMergeProgress(10 + Math.floor((i / fileObj.totalPages) * 80));

        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(originalDoc, [i]);
        subDoc.addPage(copiedPage);
        const subDocBytes = await subDoc.save();

        const pageNum = i + 1;
        const subFile = new File(
          [subDocBytes],
          `${baseName}_Page_${pageNum}.pdf`,
          { type: 'application/pdf' }
        );
        const subFileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await storeFileBinary(subFileId, subFile);

        newStagedFiles.push({
          id: subFileId,
          name: subFile.name,
          size: formatSize(subFile.size),
          file: subFile,
          totalPages: 1,
          fromPage: 1,
          toPage: 1,
        });
      }

      setFiles((prev) => {
        const index = prev.findIndex(f => f.id === id);
        if (index === -1) return prev;
        const list = [...prev];
        list.splice(index, 1, ...newStagedFiles);
        return list;
      });

      setSelectedFileId(null);
      setMergeProgress(100);
      showNotification(`Split into ${newStagedFiles.length} single-page documents!`);
    } catch (err: any) {
      console.error('Error splitting PDF pages:', err);
      setErrorText(`Failed to split document pages: ${err.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Slice selected range as separate file
  const handleExtractSelectedRange = async (id: string) => {
    const fileObj = files.find(f => f.id === id);
    if (!fileObj) return;

    if (fileObj.needsPassword) {
      setErrorText('Unlock the document password on its element card first.');
      return;
    }

    pushToHistory(files);
    setIsMerging(true);
    setMergeProgress(20);
    setErrorText('');
    setMergedPdfUrl(null);

    try {
      const { PDFDocument } = await import('pdf-lib');
      const arrayBuffer = await fileObj.file.arrayBuffer();
      const originalDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
        password: fileObj.password || undefined,
      } as any);

      const pagesToCopy: number[] = [];
      for (let p = fileObj.fromPage; p <= fileObj.toPage; p++) {
        pagesToCopy.push(p - 1);
      }

      const subDoc = await PDFDocument.create();
      const copiedPages = await subDoc.copyPages(originalDoc, pagesToCopy);
      copiedPages.forEach(p => subDoc.addPage(p));
      const subDocBytes = await subDoc.save();

      const baseName = fileObj.name.replace(/\.pdf$/i, '');
      const subName = `${baseName}_Pages_${fileObj.fromPage}-${fileObj.toPage}.pdf`;
      const subFile = new File([subDocBytes], subName, { type: 'application/pdf' });
      const newFileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await storeFileBinary(newFileId, subFile);

      const newFileObj: PdfFile = {
        id: newFileId,
        name: subFile.name,
        size: formatSize(subFile.size),
        file: subFile,
        totalPages: pagesToCopy.length,
        fromPage: 1,
        toPage: pagesToCopy.length,
      };

      setFiles((prev) => {
        const index = prev.findIndex(f => f.id === id);
        if (index === -1) return prev;
        const list = [...prev];
        list.splice(index + 1, 0, newFileObj);
        return list;
      });

      setSelectedFileId(newFileObj.id);
      setMergeProgress(100);
      showNotification(`Extracted pages ${fileObj.fromPage}-${fileObj.toPage}`);
    } catch (err: any) {
      console.error('Error slicing PDF range:', err);
      setErrorText(`Failed to slice selected page range: ${err.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handleRangeChange = (id: string, fromPage: number, toPage: number) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, fromPage, toPage } : f))
    );
    setMergedPdfUrl(null);
  };

  const handleDelete = (id: string) => {
    pushToHistory(files);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFileId === id) setSelectedFileId(null);
    setMergedPdfUrl(null);
    deleteFileBinary(id);
    showNotification('Removed document');
  };

  const handleClearAll = () => {
    if (files.length > 0) pushToHistory(files);
    setFiles([]);
    setSelectedFileId(null);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    setIsMergedPreviewOpen(false);
    setErrorText('');
    clearAllFileBinaries();
    localStorage.removeItem('staged_pdf_metadata');
    showNotification('Cleared all staged documents');
  };

  // Merge process using client-side pdf-lib
  const handleMergePdfFiles = async () => {
    const activeFilesList = files.filter(f => !f.needsPassword);
    if (activeFilesList.length === 0) {
      setErrorText('There are no unlocked files available to merge.');
      return;
    }

    if (isOrganizerEnabled && individualPages && individualPages.length === 0) {
      setErrorText('The page organizer has no pages staged.');
      return;
    }

    setIsMerging(true);
    setMergeProgress(10);
    setErrorText('');
    setMergedPdfUrl(null);

    try {
      const totalOrigBytes = activeFilesList.reduce((acc, f) => acc + f.file.size, 0);
      setOriginalTotalSize(totalOrigBytes);

      const { PDFDocument } = await import('pdf-lib');
      setMergeProgress(20);

      const mergedPdf = await PDFDocument.create();

      if (isOrganizerEnabled && individualPages) {
        const referencedFileIds = Array.from(new Set(individualPages.map(p => p.fileId))) as string[];
        const loadedPdfDocs = new Map<string, any>();
        setMergeProgress(25);

        for (const fId of referencedFileIds) {
          const fileObj = activeFilesList.find(f => f.id === fId);
          if (fileObj) {
            const arrayBuffer = await fileObj.file.arrayBuffer();
            const doc = await PDFDocument.load(arrayBuffer, {
              ignoreEncryption: true,
              password: fileObj.password || undefined
            } as any);
            loadedPdfDocs.set(fId, doc);
          }
        }

        setMergeProgress(40);

        for (let i = 0; i < individualPages.length; i++) {
          const pageRef = individualPages[i];
          const docObj = loadedPdfDocs.get(pageRef.fileId);
          if (docObj) {
            const copiedPages = await mergedPdf.copyPages(docObj, [pageRef.sourcePageNum - 1]);
            mergedPdf.addPage(copiedPages[0]);
          }
          setMergeProgress(40 + Math.floor((i / individualPages.length) * 45));
        }
      } else {
        for (let i = 0; i < activeFilesList.length; i++) {
          const fileObj = activeFilesList[i];
          const arrayBuffer = await fileObj.file.arrayBuffer();
          const originalDoc = await PDFDocument.load(arrayBuffer, {
            ignoreEncryption: true,
            password: fileObj.password || undefined
          } as any);
          
          const pagesToCopy: number[] = [];
          for (let page = fileObj.fromPage; page <= fileObj.toPage; page++) {
            pagesToCopy.push(page - 1);
          }

          const copiedPages = await mergedPdf.copyPages(originalDoc, pagesToCopy);
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          setMergeProgress(20 + Math.floor((i / activeFilesList.length) * 65));
        }
      }

      setMergeProgress(90);

      const mergedPdfBytes = await mergedPdf.save({
        useObjectStreams: compressionEnabled
      });
      
      setCompressedSize(mergedPdfBytes.length);

      const suggestion = generateSuggestedFilename(activeFilesList);
      setSuggestedFilename(suggestion);

      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      setMergedPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);

      setMergeProgress(100);
      setSelectedFileId(null);
      showNotification('PDF documents successfully merged!');
    } catch (err: any) {
      console.error('Merge Error:', err);
      setErrorText(`An error occurred while merging: ${err.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  if (isLoadingState) {
    return (
      <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col justify-between font-sans">
        <div className="flex-1 w-full flex flex-col items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-2 border-[#8083ff] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-[#c7c4d7]">Initializing Obsidian local runtime...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col justify-between font-sans selection:bg-[#8083ff] selection:text-[#0d0096]">
      {/* Global Drag-and-Drop anywhere listener (Fixes user issue) */}
      <GlobalDropOverlay onFilesSelected={handleFilesSelected} />

      {/* Top Navigation Bar with Suite Tabs */}
      <HeaderNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stagedFilesCount={files.length}
        isCompiling={isMerging}
        onQuickCompile={() => {
          if (activeTab === 'latex-to-pdf') {
            showNotification('Compiling LaTeX document...');
          } else {
            handleMergePdfFiles();
          }
        }}
        onQuickExport={() => {
          if (mergedPdfUrl) {
            window.open(mergedPdfUrl);
          } else if (files.length > 0) {
            handleMergePdfFiles();
          } else {
            showNotification('No document output to export yet');
          }
        }}
      />

      {/* Main Workspace Frame */}
      <div className="pt-28 flex-1 flex flex-col">
        {/* Toast feedback banner */}
        {toastMessage && (
          <div className="fixed top-32 right-6 z-50 bg-[#122131] border border-[#8083ff] text-[#c0c1ff] shadow-xl rounded-lg px-4 py-2 text-xs font-mono flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[16px] text-[#7bd0ff]">info</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: Merge & Split (Default) */}
        {activeTab === 'merge-and-split' && (
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            {files.length === 0 ? (
              /* Empty State Drop Zone */
              <div className="w-full max-w-2xl py-12 flex flex-col items-center animate-fade-in">
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[#d4e4fa]">
                    Blend &amp; Organize PDF Files Offline
                  </h2>
                  <p className="text-[#908fa0] mt-2 text-xs sm:text-sm max-w-md mx-auto">
                    Zero server uploads. Manage page ranges, reorder files, and preview document drafts instantly in local memory.
                  </p>
                </div>
                
                <UploadZone onFilesSelected={handleFilesSelected} />

                {errorText && (
                  <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs text-center w-full">
                    {errorText}
                  </div>
                )}
              </div>
            ) : (
              /* Staged files workspace */
              <div className={`w-full transition-all duration-300 ${selectedFileId ? 'md:pr-[320px]' : ''}`}>
                {/* View Switcher: Document Cards vs Page Organizer */}
                <div className="flex bg-[#0d1c2d] p-1 rounded-xl border border-[#1c2b3c] mb-6 max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOrganizerEnabled(false);
                      setMergedPdfUrl(null);
                      setMergedPdfBlob(null);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      !isOrganizerEnabled
                        ? 'bg-[#1c2b3c] text-[#c0c1ff] shadow'
                        : 'text-[#c7c4d7] hover:text-[#d4e4fa]'
                    }`}
                  >
                    <span>🗂️ Document Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorText('');
                      setMergedPdfUrl(null);
                      setMergedPdfBlob(null);
                      if (!individualPages) {
                        setIndividualPages(regenerateDefaultPages(files));
                      }
                      setIsOrganizerEnabled(true);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      isOrganizerEnabled
                        ? 'bg-[#1c2b3c] text-[#c0c1ff] shadow'
                        : 'text-[#c7c4d7] hover:text-[#d4e4fa]'
                    }`}
                  >
                    <span>📄 Page Organizer</span>
                  </button>
                </div>

                {/* Context bar with quick actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[#1c2b3c]">
                  <div>
                    <h3 className="text-sm font-semibold text-[#d4e4fa] font-display">
                      {isOrganizerEnabled
                        ? 'Compiled Page Sequence'
                        : `Staged Documents (${files.length} file${files.length > 1 ? 's' : ''})`}
                    </h3>
                    <p className="text-xs text-[#908fa0] mt-0.5">
                      {isOrganizerEnabled
                        ? 'Drag and drop individual pages to reorder before compiling.'
                        : 'Drag cards to reorder, adjust page boundaries, or split documents.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Add More Files Picker Button */}
                    <label className="flex items-center space-x-1.5 bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-[#273647] transition-colors">
                      <Plus className="w-4 h-4 text-[#7bd0ff]" />
                      <span>Add More Files</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) handleFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>

                    {/* Layout mode switcher */}
                    {!isOrganizerEnabled && (
                      <div className="flex bg-[#0d1c2d] p-0.5 rounded-lg border border-[#1c2b3c]">
                        <button
                          type="button"
                          onClick={() => setLayoutMode('grid')}
                          className={`p-1.5 rounded ${layoutMode === 'grid' ? 'bg-[#1c2b3c] text-[#7bd0ff]' : 'text-[#908fa0]'}`}
                          title="Grid View"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLayoutMode('list')}
                          className={`p-1.5 rounded ${layoutMode === 'list' ? 'bg-[#1c2b3c] text-[#7bd0ff]' : 'text-[#908fa0]'}`}
                          title="List View"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Reverse Order */}
                    <button
                      type="button"
                      onClick={handleReverseFiles}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0d1c2d] hover:bg-[#1c2b3c] text-[#c7c4d7] hover:text-[#d4e4fa] border border-[#1c2b3c] text-xs font-mono flex items-center gap-1 cursor-pointer"
                      title="Reverse files order"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#7bd0ff]" />
                      <span>Reverse</span>
                    </button>

                    {/* Undo Action */}
                    {(historyStack.length > 0 || (isOrganizerEnabled && pagesHistoryStack.length > 0)) && (
                      <button
                        type="button"
                        onClick={handleUndo}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0d1c2d] hover:bg-[#1c2b3c] text-[#7bd0ff] border border-[#1c2b3c] text-xs font-mono flex items-center gap-1 cursor-pointer"
                        title="Undo last change (Cmd+Z)"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Undo (⌘Z)</span>
                      </button>
                    )}

                    {/* Clear all */}
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-mono flex items-center gap-1 cursor-pointer"
                      title="Remove all files"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                </div>

                {/* In-place compact drop zone strip (solves user's issue directly in view!) */}
                <div className="mb-6">
                  <UploadZone compact={true} onFilesSelected={handleFilesSelected} />
                </div>

                {/* Error Banner */}
                {errorText && (
                  <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs text-center">
                    {errorText}
                  </div>
                )}

                {/* Staged Cards or Page Organizer Grid */}
                {isOrganizerEnabled ? (
                  <PageOrganizer
                    files={files}
                    pages={individualPages || []}
                    onPagesChange={(nextPages) => {
                      if (individualPages) pushToPagesHistory(individualPages);
                      setIndividualPages(nextPages);
                      setMergedPdfUrl(null);
                      setMergedPdfBlob(null);
                    }}
                    onResetToDefault={() => {
                      if (individualPages) pushToPagesHistory(individualPages);
                      setIndividualPages(regenerateDefaultPages(files));
                      setMergedPdfUrl(null);
                      setMergedPdfBlob(null);
                    }}
                  />
                ) : (
                  <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3'}>
                    {files.map((file, index) => (
                      <PdfCard
                        key={file.id}
                        file={file}
                        layout={layoutMode}
                        isSelected={selectedFileId === file.id}
                        onSelect={() => setSelectedFileId(file.id)}
                        onDelete={() => handleDelete(file.id)}
                        onMoveLeft={() => moveLeft(index)}
                        onMoveRight={() => moveRight(index)}
                        onRangeChange={(from, to) => handleRangeChange(file.id, from, to)}
                        isFirst={index === 0}
                        isLast={index === files.length - 1}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedIndex === index}
                        onUnlockPassword={handleUnlockPassword}
                        onSplitAllPages={() => handleSplitAllPages(file.id)}
                        onExtractSelectedRange={() => handleExtractSelectedRange(file.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Final Actions Container */}
                <div className="mt-12 bg-[#0d1c2d] p-6 rounded-2xl border border-[#1c2b3c] shadow-xl flex flex-col items-center text-center w-full">
                  {mergedPdfUrl ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="space-y-4 py-2 w-full max-w-md"
                    >
                      <div className="p-3 bg-emerald-500/15 rounded-full inline-flex text-emerald-400 border border-emerald-500/25">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#d4e4fa] font-display">
                          PDF Fusion Complete!
                        </h3>
                        <p className="text-[#908fa0] text-xs mt-1">
                          Your document segments have been compiled securely in local memory.
                        </p>
                        
                        {compressionEnabled && compressedSize > 0 && originalTotalSize > 0 && (
                          <div className="mx-auto bg-[#010f1f] px-3.5 py-2.5 rounded-lg border border-[#1c2b3c] text-[11px] text-[#7bd0ff] font-mono flex flex-col items-center gap-1 mt-3">
                            <div className="flex items-center gap-1.5">
                              <Minimize2 className="w-3.5 h-3.5 text-[#7bd0ff]" />
                              <span className="font-semibold text-[#d4e4fa]">Deflate Stream Optimization Active</span>
                            </div>
                            <div className="text-[#908fa0] text-[10px]">
                              Combined raw size: <span className="text-[#d4e4fa]">{formatSize(originalTotalSize)}</span> → Output PDF: <span className="text-[#d4e4fa]">{formatSize(compressedSize)}</span> 
                              {originalTotalSize > compressedSize && (
                                <span className="text-emerald-400 font-bold ml-1.5">
                                  ({Math.max(0, Math.round(((originalTotalSize - compressedSize) / originalTotalSize) * 100))}% reduction)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Filename editor */}
                      <div className="bg-[#010f1f] border border-[#1c2b3c] p-3.5 rounded-xl text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-[#908fa0] font-bold block">
                            Output Filename
                          </label>
                          <button
                            type="button"
                            onClick={() => setSuggestedFilename(generateSuggestedFilename(files))}
                            className="text-[10px] text-[#7bd0ff] hover:text-[#c4e7ff] font-semibold cursor-pointer underline decoration-dotted"
                          >
                            Reset Suggestion
                          </button>
                        </div>
                        <input
                          type="text"
                          value={suggestedFilename}
                          onChange={(e) => setSuggestedFilename(e.target.value)}
                          placeholder="merged-document.pdf"
                          className="w-full text-xs font-mono bg-[#122131] border border-[#273647] focus:border-[#8083ff] outline-none rounded-lg p-2 text-[#d4e4fa]"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <a
                          href={mergedPdfUrl}
                          download={suggestedFilename.endsWith('.pdf') ? suggestedFilename : `${suggestedFilename}.pdf`}
                          className="w-full sm:w-auto bg-[#7bd0ff] hover:bg-[#c4e7ff] text-[#00354a] font-display font-bold py-2.5 px-5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-md transition-all hover:scale-[1.01]"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Download Merged PDF</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => setIsMergedPreviewOpen(true)}
                          className="w-full sm:w-auto bg-[#8083ff] hover:bg-[#c0c1ff] text-[#0d0096] font-display font-bold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow cursor-pointer hover:scale-[1.01]"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Preview PDF</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setMergedPdfUrl(null);
                            setMergedPdfBlob(null);
                          }}
                          className="w-full sm:w-auto bg-[#122131] hover:bg-[#1c2b3c] text-[#c7c4d7] font-medium py-2.5 px-4 rounded-xl border border-[#273647] text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#908fa0]" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* Merge Trigger View */
                    <div className="w-full max-w-md py-4">
                      <div className="space-y-4 text-left">
                        {/* Compression Toggle */}
                        <div className="bg-[#010f1f] rounded-xl p-3.5 border border-[#1c2b3c] flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3 pr-2">
                            <div className="p-2 bg-[#8083ff]/15 text-[#c0c1ff] rounded-lg shrink-0">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-[#d4e4fa]">Optimize size (PDF Deflate)</h4>
                              <p className="text-[10px] text-[#908fa0] mt-0.5 leading-relaxed">
                                Packages document stream objects to minimize output file footprint.
                              </p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={compressionEnabled}
                              onChange={(e) => setCompressionEnabled(e.target.checked)}
                              className="sr-only peer"
                              disabled={isMerging}
                            />
                            <div className="w-9 h-5 bg-[#1c2b3c] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#908fa0] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8083ff] peer-checked:after:bg-white"></div>
                          </label>
                        </div>

                        <div className="text-xs text-[#908fa0] text-center mb-3 font-mono">
                          <span className="text-[#7bd0ff] bg-[#7bd0ff]/10 px-2 py-0.5 rounded border border-[#7bd0ff]/20 text-[10px] uppercase font-bold mr-2">Ready</span>
                          Combining {files.filter(f => !f.needsPassword).length} active documents in sequential order
                        </div>

                        <button
                          type="button"
                          onClick={handleMergePdfFiles}
                          disabled={isMerging || files.length === 0}
                          className={`relative w-full overflow-hidden font-display font-bold py-3 px-8 rounded-xl shadow-lg cursor-pointer text-sm text-center disabled:opacity-50 transition-all outline-none ${
                            isMerging
                              ? 'bg-[#8083ff]/60 text-white cursor-wait'
                              : 'bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9] shadow-[0_0_20px_rgba(128,131,255,0.3)]'
                          }`}
                        >
                          {isMerging && (
                            <div 
                              className="absolute inset-y-0 left-0 bg-[#494bd6]/60 transition-all duration-200"
                              style={{ width: `${mergeProgress}%` }}
                            />
                          )}

                          <div className="relative z-10 flex items-center justify-center gap-2">
                            {isMerging ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Merging PDF Segments... {mergeProgress}%</span>
                              </>
                            ) : (
                              <span>Merge {files.filter(f => !f.needsPassword).length} PDFs Now</span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Value Proposition & FAQ Section */}
            <div className="w-full max-w-4xl mt-16 pt-12 border-t border-[#1c2b3c] space-y-12">
              <div className="text-center space-y-1.5">
                <h3 className="text-xl font-bold font-display text-[#d4e4fa]">
                  Client-Side Sandboxed PDF Assembler
                </h3>
                <p className="text-xs text-[#908fa0] max-w-lg mx-auto">
                  Processes and merges all PDF files completely in your local browser sandbox, giving you absolute confidentiality with zero data telemetry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    title: "100% Offline Integrity",
                    desc: "Confidential files never touch any external server. All processing runs locally via client-side WebAssembly."
                  },
                  {
                    title: "Selective Page Slicing",
                    desc: "Extract custom page ranges and rearrange individual pages visually using our interactive page matrix."
                  },
                  {
                    title: "Deflate Stream Optimizer",
                    desc: "Rebuilds PDF object tables using Deflate compression to optimize total storage size."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#1c2b3c] bg-[#0d1c2d] space-y-1.5">
                    <span className="font-mono text-[10px] text-[#7bd0ff] font-bold uppercase">{item.title}</span>
                    <p className="text-xs text-[#c7c4d7] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* FAQ Accordion */}
              <div className="space-y-3 max-w-3xl mx-auto">
                <h4 className="font-display font-bold text-sm text-[#d4e4fa] text-center mb-4">
                  Frequently Asked Questions
                </h4>
                {[
                  {
                    q: "Is it safe to merge sensitive files in this application?",
                    a: "Yes. All PDF operations run 100% inside your browser session using WebAssembly and pdf-lib. No files or byte records leave your computer."
                  },
                  {
                    q: "How does drag-and-drop file addition work?",
                    a: "You can drag and drop PDF files anywhere onto the window at any time. When you drop files, they are automatically parsed and added to your staged document list."
                  },
                  {
                    q: "Can I manage password-protected PDF files?",
                    a: "Yes. If an encrypted PDF is detected, you will be prompted for its password right on its card to decrypt it locally."
                  },
                  {
                    q: "Will my documents persist if I refresh the browser?",
                    a: "Yes. Staged files are saved in sandboxed IndexedDB storage so you can safely resume your work after reloading."
                  }
                ].map((faq, idx) => {
                  const isOpen = activeFaqIndex === idx;
                  return (
                    <div key={idx} className="border border-[#1c2b3c] bg-[#0d1c2d] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-3.5 text-left font-display hover:bg-[#122131] transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-[#d4e4fa]">{faq.q}</span>
                        <Plus className={`w-4 h-4 text-[#7bd0ff] transition-transform ${isOpen ? 'rotate-45' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 text-[11px] text-[#c7c4d7] leading-relaxed border-t border-[#1c2b3c]/60">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {/* TAB 2: LaTeX to PDF Studio */}
        {activeTab === 'latex-to-pdf' && (
          <LatexStudio onNotify={showNotification} />
        )}

        {/* TAB 3: Compress Suite */}
        {activeTab === 'compress' && (
          <CompressSuite stagedFiles={files} onFilesSelected={handleFilesSelected} onNotify={showNotification} />
        )}

        {/* TAB 4: OCR & Convert Suite */}
        {activeTab === 'ocr-and-convert' && (
          <OcrSuite stagedFiles={files} onFilesSelected={handleFilesSelected} onNotify={showNotification} />
        )}

        {/* TAB 5: Settings Suite */}
        {activeTab === 'settings' && (
          <SettingsSuite stagedFilesCount={files.length} onClearAll={handleClearAll} onNotify={showNotification} />
        )}
      </div>

      {/* Global Studio Footer */}
      <footer className="w-full bg-[#010f1f] border-t border-[#1c2b3c] py-4 px-6 text-[#908fa0] text-xs font-mono shadow-[0_-1px_4px_rgba(0,0,0,0.3)]">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#d4e4fa] font-bold">PDF Studio Engine</span>
            <span>·</span>
            <span className="text-[#7bd0ff]">Local Client Runtime</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#c7c4d7]">
            <span>Engine: TeX Live WASM &amp; pdf-lib</span>
            <span>Zero Remote Telemetry</span>
          </div>
        </div>
      </footer>

      {/* Slide-out Preview Panel */}
      <PreviewPanel
        file={selectedFile}
        onClose={() => setSelectedFileId(null)}
        onRangeChange={(from, to) => {
          if (selectedFileId) {
            handleRangeChange(selectedFileId, from, to);
          }
        }}
      />

      {/* Merged PDF Preview Modal Overlay */}
      <MergedPreviewModal
        isOpen={isMergedPreviewOpen}
        onClose={() => setIsMergedPreviewOpen(false)}
        pdfUrl={mergedPdfUrl}
        pdfBlob={mergedPdfBlob}
        filename={suggestedFilename || 'merged-document.pdf'}
      />
    </div>
  );
}
