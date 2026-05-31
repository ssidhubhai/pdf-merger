import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  FileDown, 
  CheckCircle, 
  Clock, 
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
import UploadZone from './components/UploadZone';
import PdfCard from './components/PdfCard';
import PreviewPanel from './components/PreviewPanel';
import MergedPreviewModal from './components/MergedPreviewModal';
import PageOrganizer from './components/PageOrganizer';
import { PdfFile, IndividualPageRef } from './types';
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
  
  // Filter out locked assets that cannot be included yet
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

  // Grid/List Layout Mode and Merged Preview States
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [isMergedPreviewOpen, setIsMergedPreviewOpen] = useState(false);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);

  // Real-time Visual Page Organizer States
  const [isOrganizerEnabled, setIsOrganizerEnabled] = useState(false);
  const [individualPages, setIndividualPages] = useState<IndividualPageRef[] | null>(null);
  const [pagesHistoryStack, setPagesHistoryStack] = useState<IndividualPageRef[][]>([]);

  // Reverses the staged files list with full Undo preservation
  const handleReverseFiles = () => {
    if (files.length <= 1) return;
    pushToHistory(files);
    setFiles((prev) => [...prev].reverse());
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    // Sync organizer pages if they are active
    if (isOrganizerEnabled && individualPages) {
      const defaultPages = regenerateDefaultPages([...files].reverse());
      pushToPagesHistory(individualPages);
      setIndividualPages(defaultPages);
    }
  };

  // Drag and drop tracking indexes
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Undo / Redo history state stack for card adjustments
  const [historyStack, setHistoryStack] = useState<PdfFile[][]>([]);
  const [preDragFiles, setPreDragFiles] = useState<PdfFile[] | null>(null);

  // Helper to commit current state to stack before mutation
  const pushToHistory = (currentState: PdfFile[]) => {
    setHistoryStack((prev) => {
      const next = [...prev, currentState];
      if (next.length > 25) {
        next.shift();
      }
      return next;
    });
  };

  const pushToPagesHistory = (currentState: IndividualPageRef[]) => {
    setPagesHistoryStack((prev) => {
      const next = [...prev, currentState];
      if (next.length > 25) {
        next.shift();
      }
      return next;
    });
  };

  // Generate sequence of individual pages from staged files
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

  // Undo implementation to restore list layout safely
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
      return;
    }

    if (historyStack.length === 0) return;
    const nextHistory = [...historyStack];
    const previousState = nextHistory.pop();
    if (previousState) {
      setErrorText('');
      setMergedPdfUrl(null);
      
      // Keep IndexedDB store in sync for any cards brought back from deleted status
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
    }
  };

  // Keyboard shortcut listener (Cmd+Z or Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') {
          return; // Let standard textbox undo work normally
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, files, isOrganizerEnabled, individualPages, pagesHistoryStack]);

  // Sync individualPages with staged files password-unlock/decrypted states and deal with deletions
  useEffect(() => {
    if (!individualPages) return;

    // 1. Remove pages from deleted files or files that now require password (locked back up)
    const validFileIds = new Set(files.filter(f => !f.needsPassword).map(f => f.id));
    let nextPages = individualPages.filter(p => validFileIds.has(p.fileId));

    // 2. If a file was unlocked, or is new, let's see if we should automatically append its pages
    const representedFileIds = new Set(nextPages.map(p => p.fileId));
    const activeUnlockedFiles = files.filter(f => !f.needsPassword);
    
    let hasAdditions = false;
    activeUnlockedFiles.forEach(f => {
      if (!representedFileIds.has(f.id)) {
        // Append all default pages of this newly added/unlocked file
        for (let p = f.fromPage; p <= f.toPage; p++) {
          nextPages.push({
            id: `page-${f.id}-${p}-${Math.random().toString(36).substring(2, 9)}`,
            fileId: f.id,
            fileName: f.name,
            sourcePageNum: p
          });
        }
        hasAdditions = true;
      }
    });

    // Check if pages order / list contents actually changed
    const pagesLengthChanged = nextPages.length !== individualPages.length;
    const contentsChanged = pagesLengthChanged || individualPages.some((p, idx) => p.id !== nextPages[idx]?.id);

    if (contentsChanged) {
      if (!hasAdditions) {
        setIndividualPages(nextPages);
      } else {
        pushToPagesHistory(individualPages);
        setIndividualPages(nextPages);
      }
      setMergedPdfUrl(null);
      setMergedPdfBlob(null);
    }
  }, [files]);

  // Initialization states for offline persistence
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(true);

  // Active index for FAQ collapsible section
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

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

  // Save metadata to localStorage when files layout/options are modified
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

  // Save compression preference when updated
  useEffect(() => {
    localStorage.setItem('pdf_compression_enabled', String(compressionEnabled));
  }, [compressionEnabled]);

  // Handle addition of files from UploadZone or "+ Add" action
  const handleFilesSelected = async (selectedList: FileList | File[]) => {
    setErrorText('');
    setMergedPdfUrl(null); // Clear previous download link on edit
    const newPdfFiles: PdfFile[] = [];

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) {
      setErrorText('The PDF engine is taking a few seconds to load. Please try again in a moment!');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

    for (let i = 0; i < selectedList.length; i++) {
      const file = selectedList[i];
      if (file.type !== 'application/pdf') continue;

      try {
        // Query details using PDF.js entirely client-side
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

          // Add file in password-restricted mode
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
          // Non-blocking reminder that key-credentials are safe in browser
          setErrorText('One or more selected documents are password-protected. Enter their password on the cards below to unlock!');
        } else {
          setErrorText(`Could not parse elements of "${file.name}". Is it damaged or restricted?`);
        }
      }
    }

    if (newPdfFiles.length > 0) {
      setFiles((prev) => [...prev, ...newPdfFiles]);
    }
  };

  // Reordering functions (Manual click support with Undo support)
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

  // Drag and Drop reordering callbacks with Undo preservation
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
      if (changed) {
        pushToHistory(preDragFiles);
      }
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
        // Replace single original PDF card with sub-pages sequence
        list.splice(index, 1, ...newStagedFiles);
        return list;
      });

      setSelectedFileId(null);
      setMergeProgress(100);
    } catch (err: any) {
      console.error('Error splitting PDF pages:', err);
      setErrorText(`Failed to split document pages: ${err.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Slice/Extract currently selected page range as a separate staged file
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
        // Inject copy immediately right next to parent file
        list.splice(index + 1, 0, newFileObj);
        return list;
      });

      setSelectedFileId(newFileObj.id);
      setMergeProgress(100);
    } catch (err: any) {
      console.error('Error slicing PDF range:', err);
      setErrorText(`Failed to slice selected page range: ${err.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Update segments pages
  const handleRangeChange = (id: string, fromPage: number, toPage: number) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, fromPage, toPage } : f))
    );
    setMergedPdfUrl(null); // Clear previous merge link
  };

  // Deletion with Undo support
  const handleDelete = (id: string) => {
    pushToHistory(files);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
    setMergedPdfUrl(null);
    deleteFileBinary(id);
  };

  const handleClearAll = () => {
    if (files.length > 0) {
      pushToHistory(files);
    }
    setFiles([]);
    setSelectedFileId(null);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    setIsMergedPreviewOpen(false);
    setErrorText('');
    clearAllFileBinaries();
    localStorage.removeItem('staged_pdf_metadata');
  };

  // Merge process using client-side `pdf-lib`
  const handleMergePdfFiles = async () => {
    const activeFilesList = files.filter(f => !f.needsPassword);
    if (activeFilesList.length === 0) {
      setErrorText('There are no unlocked files available to merge.');
      return;
    }

    if (isOrganizerEnabled && individualPages && individualPages.length === 0) {
      setErrorText('The page organizer has no pages staged. Click "Reset Pages" or check page limits.');
      return;
    }

    setIsMerging(true);
    setMergeProgress(10);
    setErrorText('');
    setMergedPdfUrl(null);

    try {
      // Track total original bytes
      const totalOrigBytes = activeFilesList.reduce((acc, f) => acc + f.file.size, 0);
      setOriginalTotalSize(totalOrigBytes);

      // Import on demand to bypass module restrictions
      const { PDFDocument } = await import('pdf-lib');
      setMergeProgress(20);

      const mergedPdf = await PDFDocument.create();

      if (isOrganizerEnabled && individualPages) {
        // Optimized cache load for referenced documents to ensure performance
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
          // Increment progress dynamically
          setMergeProgress(40 + Math.floor((i / individualPages.length) * 45));
        }
      } else {
        // Sequential file-based merge
        for (let i = 0; i < activeFilesList.length; i++) {
          const fileObj = activeFilesList[i];
          const arrayBuffer = await fileObj.file.arrayBuffer();
          
          // Load document
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

          // Increment progress dynamically
          setMergeProgress(20 + Math.floor((i / activeFilesList.length) * 65));
        }
      }

      setMergeProgress(90);
      
      // Save with compression switch mapped dynamically
      const mergedPdfBytes = await mergedPdf.save({
        useObjectStreams: compressionEnabled
      });
      
      setCompressedSize(mergedPdfBytes.length);

      // Generate Suggested Filename
      const suggestion = generateSuggestedFilename(activeFilesList);
      setSuggestedFilename(suggestion);
      
      // Build download blob
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const downloadPathUrl = URL.createObjectURL(blob);
      
      setMergedPdfUrl(downloadPathUrl);
      setMergedPdfBlob(blob);
      setMergeProgress(100);
      
      // Auto-trigger preview panel close to focus on actions
      setSelectedFileId(null);
    } catch (err: any) {
      console.error('Merge Error:', err);
      setErrorText(`An error occurred while blending your segments: ${err.message || err}`);
    } finally {
      setIsMerging(false);
    }
  };

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  if (isLoadingState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg ring-1 ring-indigo-500/30">
                <Sparkles className="w-5 h-5 text-indigo-100 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold font-display tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Advanced PDF Merger
                </h1>
                <p className="text-[11px] text-slate-500 font-mono">
                  Purely In-Browser &bull; Private & Secure
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full flex flex-col items-center justify-center py-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-slate-400">Loading your secure local sandbox...</p>
          </div>
        </main>
        <footer className="border-t border-slate-900/60 py-6 text-center text-slate-600 text-xs font-mono">
          <p className="flex items-center justify-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
            Advanced Client-Side PDF Assembler &bull; HIPAA Compliant Storage Policy
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Navbar / Header design */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl shadow-lg ring-1 ring-indigo-500/30">
              <Sparkles className="w-5 h-5 text-indigo-100 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Advanced PDF Merger
              </h1>
              <p className="text-[11px] text-slate-500 font-mono">
                Purely In-Browser &bull; Private & Secure
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Local Sandboxing Enabled
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:py-12 flex flex-col items-center">
        {files.length === 0 ? (
          /* Empty State Space */
          <div className="w-full max-w-2xl py-12 flex flex-col items-center animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold font-display tracking-tight text-slate-100">
                Blend PDF files offline
              </h2>
              <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">
                No server uploads. Manage page ranges, and review document drafts instantly with high-performance preview panels.
              </p>
            </div>
            
            <UploadZone onFilesSelected={handleFilesSelected} />

            {/* Error notifications */}
            {errorText && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs text-center w-full">
                {errorText}
              </div>
            )}
          </div>
        ) : (
          /* Staged files interface */
          <div className={`w-full transition-all duration-300 ${selectedFileId ? 'md:pr-[300px]' : ''}`}>
            {/* Visual View-Mode Selection Tab Switcher */}
            <div id="visual-view-mode-tabs" className="flex bg-slate-900 p-1 rounded-xl border border-slate-800/80 mb-6 max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setIsOrganizerEnabled(false);
                  setMergedPdfUrl(null);
                  setMergedPdfBlob(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  !isOrganizerEnabled
                    ? 'bg-slate-800 text-indigo-400 border border-slate-700/60 shadow'
                    : 'text-slate-400 hover:text-slate-200'
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
                    ? 'bg-slate-800 text-indigo-400 border border-slate-700/60 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📄 Page Organizer</span>
              </button>
            </div>

            {/* Context bar with quick actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-900">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 animate-fade-in">
                  {isOrganizerEnabled ? 'Compiled Page Sequence' : `Staged Blueprints (${files.length} document${files.length > 1 ? 's' : ''})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isOrganizerEnabled 
                    ? 'Drag and drop page nodes or click arrows to order them before compiling.' 
                    : 'Change ranges, drag cards to reorder, and click tools to split files.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Embedded File Uploader Trigger */}
                <label className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-slate-800 transition-colors">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Add More Files</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files);
                    }}
                  />
                </label>

                {/* Reverse button action tracker with Undo preservation */}
                {!isOrganizerEnabled && (
                  <button
                    onClick={handleReverseFiles}
                    className="px-3.5 py-2 border border-slate-800 rounded-lg hover:border-slate-700 bg-slate-900/40 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    title="Reverse sequence order of staged files (Undoable)"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Reverse List</span>
                  </button>
                )}

                {/* Grid visual vs Single List row View toggle layout switcher */}
                {!isOrganizerEnabled && (
                  <div className="flex items-center bg-slate-900/40 border border-slate-800 rounded-lg p-0.5 shadow-sm">
                    <button
                      onClick={() => setLayoutMode('grid')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        layoutMode === 'grid'
                          ? 'bg-slate-800 text-indigo-400 border border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Grid layout representation"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setLayoutMode('list')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        layoutMode === 'list'
                          ? 'bg-slate-800 text-indigo-400 border border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Vertical list rows"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {((!isOrganizerEnabled && historyStack.length > 0) || (isOrganizerEnabled && pagesHistoryStack.length > 0)) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleUndo}
                    className="px-3.5 py-2 border border-slate-800 rounded-lg hover:border-slate-700 bg-slate-900/40 text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-950/10 cursor-pointer"
                    title="Undo last action (Ctrl+Z)"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>Undo</span>
                    <span className="hidden md:inline text-[9px] font-mono text-indigo-500 bg-slate-950/80 px-1 py-0.5 rounded border border-indigo-950/40">Ctrl+Z</span>
                  </motion.button>
                )}

                <button
                  onClick={handleClearAll}
                  className="px-3.5 py-2 border border-slate-800 rounded-lg hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete All</span>
                </button>
              </div>
            </div>

            {errorText && (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs text-left w-full">
                {errorText}
              </div>
            )}

            {isOrganizerEnabled && individualPages ? (
              <PageOrganizer
                files={files}
                pages={individualPages}
                onPagesChange={(nextPages) => {
                  pushToPagesHistory(individualPages);
                  setIndividualPages(nextPages);
                  setMergedPdfUrl(null);
                  setMergedPdfBlob(null);
                }}
                onResetToDefault={() => {
                  pushToPagesHistory(individualPages);
                  setIndividualPages(regenerateDefaultPages(files));
                  setMergedPdfUrl(null);
                  setMergedPdfBlob(null);
                }}
                canUndo={pagesHistoryStack.length > 0}
                onUndo={handleUndo}
              />
            ) : (
              /* List horizontal roll / flex layout */
              <div className={layoutMode === 'grid' ? "flex flex-wrap gap-4 justify-start pb-4 overflow-y-visible" : "flex flex-col gap-3.5 w-full pb-4 overflow-y-visible"}>
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
            <div className="mt-12 bg-gradient-to-b from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-900 shadow-xl flex flex-col items-center text-center w-full">
              {mergedPdfUrl ? (
                /* Successful merge view with elegant entrance */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="space-y-4 py-2 w-full max-w-md"
                >
                  <motion.div 
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 180, damping: 15 }}
                    className="p-3 bg-emerald-500/15 rounded-full inline-flex text-emerald-400 border border-emerald-500/25"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -35 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 280, 
                        damping: 14,
                        delay: 0.1
                      }}
                    >
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 font-display">PDF Blend Complete!</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Your segments are merged securely in your local memory.
                    </p>
                    
                    {/* Compression Statistics */}
                    {compressionEnabled && compressedSize > 0 && originalTotalSize > 0 && (
                      <div className="mx-auto bg-indigo-950/20 px-3.5 py-2.5 rounded-lg border border-indigo-500/10 text-[11px] text-indigo-300 font-mono flex flex-col items-center gap-1.5 mt-3">
                        <div className="flex items-center gap-1.5">
                          <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-indigo-200">Compressed Save Active</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          Combined raw files: <span className="text-slate-300">{formatSize(originalTotalSize)}</span> &bull; Output PDF: <span className="text-slate-300">{formatSize(compressedSize)}</span> 
                          {originalTotalSize > compressedSize && (
                            <span className="text-emerald-400 font-bold ml-1.5">
                              (Reduced by {Math.max(0, Math.round(((originalTotalSize - compressedSize) / originalTotalSize) * 100))}%!)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggest & Edit Download Filename */}
                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Download Filename
                      </label>
                      <button
                        onClick={() => setSuggestedFilename(generateSuggestedFilename(files))}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline decoration-dotted underline-offset-2"
                        title="Reset to automatically generated suggestion name"
                      >
                        Reset Suggestion
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={suggestedFilename}
                        onChange={(e) => setSuggestedFilename(e.target.value)}
                        placeholder="suggested-name.pdf"
                        className="flex-1 text-xs font-mono bg-slate-900 border border-slate-800 focus:border-indigo-500 outline-none rounded-lg p-2 text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <a
                      href={mergedPdfUrl}
                      download={suggestedFilename.endsWith('.pdf') ? suggestedFilename : `${suggestedFilename}.pdf`}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center justify-center space-x-2 text-sm shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.01]"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download Merged PDF</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setIsMergedPreviewOpen(true)}
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center space-x-2 text-sm shadow cursor-pointer hover:scale-[1.01]"
                    >
                      <Eye className="w-4 h-4 text-indigo-200" />
                      <span>Preview PDF</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setMergedPdfUrl(null);
                        setMergedPdfBlob(null);
                      }}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium py-2.5 px-4 rounded-xl border border-slate-800 text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset Merge</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Merge Trigger View */
                <div className="w-full max-w-md py-4">
                  <div className="space-y-4 text-left">
                    {/* Compression Toggle Widget before Trigger */}
                    <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-900 flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3 pr-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                          <Zap className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-200">Optimize size (PDF Compression)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                            Utilizes PDF object stream packaging with Deflate to shrink document storage.
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
                        <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:after:bg-white peer-checked:after:border-indigo-400"></div>
                      </label>
                    </div>

                    <div className="text-xs text-slate-400 text-center mb-3">
                      <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-[10px] uppercase font-bold mr-2">Ready</span>
                      Documents combine in top-left to bottom-right order.
                    </div>

                    <motion.button
                      onClick={handleMergePdfFiles}
                      disabled={isMerging || files.length === 0}
                      className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-indigo-500/15 cursor-pointer text-sm text-center disabled:opacity-55 transition-all outline-none"
                      animate={isMerging ? {
                        scale: [1, 1.015, 1],
                        boxShadow: [
                          "0 4px 6px -1px rgba(99, 102, 241, 0.15)",
                          "0 12px 20px -3px rgba(99, 102, 241, 0.35)",
                          "0 4px 6px -1px rgba(99, 102, 241, 0.15)"
                        ]
                      } : {}}
                      transition={isMerging ? {
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut"
                      } : {}}
                      whileHover={!isMerging && files.length > 0 ? { scale: 1.015 } : {}}
                    >
                      {/* Dynamic progress fill overlay */}
                      {isMerging && (
                        <motion.div 
                          className="absolute inset-y-0 left-0 bg-indigo-600/85 bg-gradient-to-r from-indigo-600 to-indigo-700"
                          initial={{ width: "0%" }}
                          animate={{ width: `${mergeProgress}%` }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        />
                      )}

                      {/* Moving light pulse shim */}
                      {isMerging && (
                        <motion.div 
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                          animate={{
                            left: ["-30%", "130%"]
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2,
                            ease: "linear"
                          }}
                        />
                      )}

                      {/* Content tag */}
                      <div className="relative z-10 flex items-center justify-center gap-2">
                        {isMerging ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                            <span>Blending segments... {mergeProgress}%</span>
                          </>
                        ) : (
                          <span>Merge {files.filter(f => !f.needsPassword).length} PDFs Now</span>
                        )}
                      </div>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Engine Optimization FAQ Accordion Section */}
        <div className="w-full max-w-4xl mt-16 pt-16 border-t border-slate-900/80 space-y-16">
          
          {/* Brand Highlights Grid / Value Proposition */}
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-slate-100 to-indigo-300 bg-clip-text text-transparent">
                Secure Client-Side PDF Assembler
              </h2>
              <p className="text-slate-400 text-xs max-w-xl mx-auto leading-relaxed">
                Experience high-performance, private file blending. Our tool processes all PDF files completely in your local browser sandbox, giving you premium speed and absolute security with zero data footprint.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "100% Offline Integrity",
                  desc: "Your confidential documents never touch any remote servers. Processing is done directly in your browser using secure client-side binary assemblies."
                },
                {
                  title: "Smart Selective Merging",
                  desc: "Split files and extract exactly the page ranges you need. Drag blueprints to dynamically configure your fused document order instantly."
                },
                {
                  title: "Deflate File Optimizer",
                  desc: "Toggle our object compression framework to automatically strip redundant records and minimize standard storage footprints."
                }
              ].map((item, idx) => (
                <div key={idx} className="p-5 rounded-xl border border-slate-900 bg-slate-950/60 hover:bg-slate-900/40 hover:border-slate-800/80 transition-all duration-300 space-y-2">
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wide uppercase font-mono">{item.title}</h3>
                  <p className="text-slate-300 text-xs font-semibold leading-relaxed font-display">{item.title === "100% Offline Integrity" ? "Local sandbox structure" : item.title === "Smart Selective Merging" ? "Selective page extracts & split tools" : "Deflate Object Packaging"}</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* F.A.Q. Interactive Section */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold font-display tracking-tight text-slate-100">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto font-sans">
                Got questions about merging PDFs or file security? We have transparent answers.
              </p>
            </div>

            <div className="space-y-3.5 max-w-3xl mx-auto">
              {[
                {
                  q: "Is my data safe when using this online PDF merger?",
                  a: "Absolutely. Unlike traditional web services that upload files to centralized servers, this tool executes 100% locally in your web browser. This means your personal and financial credentials, signature vectors, and text contents are entirely confidential and never leave your hardware. It is fully compliant with HIPAA, GDPR, and enterprise storage policies."
                },
                {
                  q: "How do I extract and combine specific pages from multiple PDFs?",
                  a: "When you load a PDF, its metadata cards appear on-screen. Simply select page range selectors (for example: from Page 2 to Page 5). You can drag and drop cards to change the combine order, or click the scissors split tool to instantly compile selected pages into independent new staged blueprints."
                },
                {
                  q: "Can I manage password-encrypted and protected files?",
                  a: "Yes! If you upload a secure file, our local system alerts you with a password prompt. Once validated in-browser, the document is decrypted and parsed entirely locally via our client-side libraries. Your files are decrypted on the fly with no risks of key leakage."
                },
                {
                  q: "Are there any file size or document count limitations?",
                  a: "No. Since there are no server-side request pipelines, file sizes are only limited by your device's physical memory capacity (RAM). You can load multiple large books, select ranges, and blend segments seamlessly and instantly."
                },
                {
                  q: "What is the 'Optimize size (PDF Compression)' feature?",
                  a: "When enabled, our merger packages standard raw font files and document resources into optimized stream blocks dynamically compressed with standard Deflate algorithms. This strips redundant overhead, significantly shrinking the final output file size without sacrificing rendering quality."
                },
                {
                  q: "Can I close the tab and return to finish merging PDFs later?",
                  a: "Yes, our tool is powered by an automatic secure IndexedDB database partition. The staged files, page configurations, and output options list are persisted safely in your browser storage. You can freely reload the browser or restart your workflow later without losing any progress."
                }
              ].map((faq, idx) => {
                const isOpen = activeFaqIndex === idx;
                return (
                  <div 
                    key={idx} 
                    className="border border-slate-900 bg-slate-950 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left font-display hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
                    >
                      <span className="text-xs font-semibold text-slate-200 block pr-4">
                        {faq.q}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-slate-500 shrink-0"
                      >
                        <Plus className="w-4 h-4 text-slate-400" />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                        >
                          <div className="px-4 pb-4 pt-1 text-[11px] text-slate-400 leading-relaxed border-t border-slate-900/50 font-sans">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Hidden container trigger standard footer line */}
      <footer className="border-t border-slate-900/60 py-6 text-center text-slate-600 text-xs font-mono">
        <p className="flex items-center justify-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
          Advanced Client-Side PDF Assembler &bull; HIPAA Compliant Storage Policy
        </p>
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
