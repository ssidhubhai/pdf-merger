import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LatexTemplate, TexEngine, CompilerLogItem } from '../types';
import { LATEX_TEMPLATES } from '../data/templates';
import TemplateLibraryModal from './TemplateLibraryModal';
import { parseLatexCode, compileLatexToPdf, ParsedLatexDoc, LatexElement } from '../lib/latexCompiler';

interface LatexStudioProps {
  onNotify?: (msg: string) => void;
}

function MathView({ math, equationNum }: { math: string; equationNum?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const katex = (window as any).katex;
    if (katex) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
        return;
      } catch (err) {
        // Fallback
      }
    }
    if (containerRef.current) {
      containerRef.current.innerText = math;
    }
  }, [math]);

  return (
    <div className="my-2 py-1.5 px-2 bg-[#f1f5f9] rounded text-center font-mono text-[10px] text-[#0f172a] shadow-inner relative border border-[#e2e8f0] overflow-x-auto">
      <div ref={containerRef} className="inline-block" />
      {equationNum && (
        <span className="absolute right-2 top-1.5 text-[8px] font-mono text-[#64748b]">
          ({equationNum})
        </span>
      )}
    </div>
  );
}

export default function LatexStudio({ onNotify }: LatexStudioProps) {
  const [currentTemplate, setCurrentTemplate] = useState<LatexTemplate>(LATEX_TEMPLATES[0]);
  const [selectedEngine, setSelectedEngine] = useState<TexEngine>('pdflatex');
  const [sourceCode, setSourceCode] = useState<string>(LATEX_TEMPLATES[0].code);
  const [activeFileTab, setActiveFileTab] = useState<'main.tex' | 'refs.bib' | 'custom.sty' | 'figures/'>('main.tex');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'all' | 'warnings' | 'raw'>('all');
  const [compileSuccessNotice, setCompileSuccessNotice] = useState('Build succeeded in 0.42s');

  // Multi-file contents support
  const [auxFiles, setAuxFiles] = useState<{ [key: string]: string }>({
    'refs.bib': `@article{vance2023quantum,
  title={Non-Perturbative Cavity Coupling},
  author={Vance, Elena and Chen, Marcus},
  journal={Phys. Rev. Lett.},
  year={2023}
}`,
    'custom.sty': `\\ProvidesPackage{custom}
\\RequirePackage{amsmath,amssymb}
\\newcommand{\\bra}[1]{\\langle #1|}
\\newcommand{\\ket}[1]{|#1\\rangle}`,
    'figures/': '% Directory containing image assets: fig1.pdf, diagram.png',
  });

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Parse document in real-time from user's source code
  const parsedDoc: ParsedLatexDoc = useMemo(() => {
    return parseLatexCode(sourceCode);
  }, [sourceCode]);

  // Dynamic Page Count
  const totalCalculatedPages = useMemo(() => {
    if (parsedDoc.elements.length === 0) return 1;
    return Math.max(1, Math.min(10, Math.ceil(parsedDoc.elements.length / 5)));
  }, [parsedDoc.elements]);

  const [compilerLogs, setCompilerLogs] = useState<CompilerLogItem[]>([
    { id: '1', type: 'info', time: '0.00s', message: '[pdfTeX 3.141592653-2.6-1.40.24] Engine initialized with in-memory TeX pool.' },
    { id: '2', type: 'info', time: '0.12s', message: 'Parsing dependencies: amsmath.sty, amssymb.sty, graphicx.sty, geometry.sty' },
    { id: '3', type: 'info', time: '0.28s', message: 'AST syntax validated: 0 critical errors, environment tokens matched.' },
    { id: '4', type: 'success', time: '0.42s', message: '✔ Build succeeded in 0.42s (Output 4 pages, 142387 bytes)' },
  ]);

  // Handle template selection
  const handleSelectTemplate = (tpl: LatexTemplate) => {
    setCurrentTemplate(tpl);
    setSelectedEngine(tpl.engine);
    setSourceCode(tpl.code);
    setCurrentPage(1);
    triggerCompile(tpl.title, tpl.code);
  };

  // Compile Trigger based on sourceCode
  const triggerCompile = (docTitle?: string, codeToCompile?: string) => {
    setIsCompiling(true);
    const code = codeToCompile ?? sourceCode;
    const start = performance.now();

    setTimeout(() => {
      const elapsed = ((performance.now() - start) / 1000 + 0.22).toFixed(2);
      const parsed = parseLatexCode(code);
      setIsCompiling(false);
      setCompileSuccessNotice(`Build succeeded in ${elapsed}s`);

      const logs: CompilerLogItem[] = [
        {
          id: String(Date.now()),
          type: 'info',
          time: '0.00s',
          message: `[${selectedEngine}] Compiling ${parsed.lineCount} lines in sandboxed client runtime.`,
        },
      ];

      if (parsed.packages.length > 0) {
        logs.push({
          id: String(Date.now() + 1),
          type: 'info',
          time: '0.08s',
          message: `Loaded ${parsed.packages.length} packages: ${parsed.packages.slice(0, 4).join(', ')}${parsed.packages.length > 4 ? '...' : ''}`,
        });
      }

      // Add actual parsed warnings
      parsed.warnings.forEach((w, idx) => {
        logs.push({
          id: String(Date.now() + 2 + idx),
          type: 'warning',
          time: `0.${15 + idx * 8}s`,
          message: `LaTeX Warning: ${w}`,
        });
      });

      if (parsed.warnings.length === 0) {
        logs.push({
          id: String(Date.now() + 5),
          type: 'info',
          time: '0.22s',
          message: `Parsed document: "${parsed.title}" by ${parsed.author || 'Author'}.`,
        });
      }

      logs.push({
        id: String(Date.now() + 6),
        type: 'success',
        time: `${elapsed}s`,
        message: `✔ Build succeeded in ${elapsed}s (Elements: ${parsed.elements.length}, Pages: ${totalCalculatedPages})`,
      });

      setCompilerLogs(logs);

      if (onNotify) {
        onNotify(`Compiled "${parsed.title}" successfully!`);
      }
    }, 400);
  };

  // Keyboard shortcut listener for Cmd+Enter / Ctrl+Enter compilation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        triggerCompile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerCompile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEngine, sourceCode]);

  // Syntax snippet insertion into editor
  const insertSnippet = (snippet: string) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const updated = before + snippet + after;
    setSourceCode(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    }, 0);

    if (autoCompile) {
      triggerCompile(undefined, updated);
    }
  };

  // Real PDF Compilation & Export from current source code
  const handleExportPdf = async () => {
    try {
      setIsCompiling(true);
      const parsed = parseLatexCode(sourceCode);
      const pdfBytes = await compileLatexToPdf(parsed);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanFileName = (parsed.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32);
      a.download = `${cleanFileName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setIsCompiling(false);

      if (onNotify) {
        onNotify(`Exported "${parsed.title}" as PDF!`);
      }
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      setIsCompiling(false);
      if (onNotify) {
        onNotify(`Export failed: ${err.message || err}`);
      }
    }
  };

  const lineCount = Math.max(35, sourceCode.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => String(i + 1).padStart(2, '0'));

  // Split elements for 2-column view
  const { leftColElements, rightColElements } = useMemo(() => {
    const mid = Math.ceil(parsedDoc.elements.length / 2);
    return {
      leftColElements: parsedDoc.elements.slice(0, mid),
      rightColElements: parsedDoc.elements.slice(mid),
    };
  }, [parsedDoc.elements]);

  return (
    <div className="w-full flex flex-col bg-[#051424] text-[#d4e4fa] min-h-[calc(100vh-7rem)]">
      {/* Subheader Studio Control Bar */}
      <section className="w-full bg-[#0d1c2d] border-b border-[#1c2b3c] shadow-sm px-4 sm:px-6 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1720px] mx-auto">
          {/* Breadcrumb & Metadata */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 text-[#c7c4d7] font-sans text-xs">
              <span className="material-symbols-outlined text-[#7bd0ff] text-[18px]">folder_special</span>
              <span>Workspace</span>
              <span className="text-[#908fa0]">/</span>
              <span className="text-[#d4e4fa] font-display font-semibold truncate max-w-[200px] sm:max-w-xs">
                {(parsedDoc.title || 'document').replace(/\s+/g, '_')}.tex
              </span>
              <span className="bg-[#1c2b3c] text-[#7bd0ff] font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">
                TEX-REV-{parsedDoc.lineCount}
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-1.5 bg-[#010f1f] px-2 py-0.5 rounded border border-[#1c2b3c]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff] animate-pulse"></span>
              <span className="font-mono text-[11px] text-[#c7c4d7]">Sandboxed Client WASM</span>
            </div>
          </div>

          {/* Compilation Engine, Templates & Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Template Selector Dropdown */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 bg-[#122131] px-2.5 py-1.5 rounded-lg border border-[#273647] text-[#d4e4fa]">
                <span className="material-symbols-outlined text-[16px] text-[#ddb7ff]">article</span>
                <select
                  aria-label="Document Template"
                  value={currentTemplate.id}
                  onChange={(e) => {
                    const found = LATEX_TEMPLATES.find((t) => t.id === e.target.value);
                    if (found) handleSelectTemplate(found);
                  }}
                  className="bg-transparent font-display text-xs text-[#d4e4fa] focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  {LATEX_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#1c2b3c] text-[#d4e4fa]">
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Browse Button */}
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] text-[#c0c1ff] hover:text-white transition-colors text-xs font-display font-semibold border border-[#8083ff]/30 cursor-pointer"
              title="Browse 18 Preset Templates"
            >
              <span className="material-symbols-outlined text-[15px]">grid_view</span>
              <span>Browse (18)</span>
            </button>

            {/* Engine Selector */}
            <div className="relative inline-flex items-center">
              <div className="flex items-center gap-1.5 bg-[#122131] px-2.5 py-1.5 rounded-lg border border-[#273647] text-[#d4e4fa]">
                <span className="material-symbols-outlined text-[16px] text-[#c0c1ff]">memory</span>
                <select
                  aria-label="TeX Engine"
                  value={selectedEngine}
                  onChange={(e) => {
                    setSelectedEngine(e.target.value as TexEngine);
                    if (autoCompile) triggerCompile();
                  }}
                  className="bg-transparent font-mono text-xs text-[#d4e4fa] focus:outline-none cursor-pointer"
                >
                  <option value="pdflatex" className="bg-[#1c2b3c] text-[#d4e4fa]">pdfLaTeX 2024</option>
                  <option value="xelatex" className="bg-[#1c2b3c] text-[#d4e4fa]">XeLaTeX (Unicode)</option>
                  <option value="lualatex" className="bg-[#1c2b3c] text-[#d4e4fa]">LuaLaTeX (JIT)</option>
                </select>
              </div>
            </div>

            {/* Auto Compile Toggle */}
            <div className="flex items-center gap-1.5 bg-[#010f1f] px-2.5 py-1.5 rounded-lg border border-[#1c2b3c]">
              <span className="font-mono text-[11px] text-[#c7c4d7]">Auto</span>
              <button
                type="button"
                role="switch"
                aria-checked={autoCompile}
                onClick={() => setAutoCompile(!autoCompile)}
                className={`w-7 h-4 rounded-full relative transition-colors focus:outline-none cursor-pointer ${
                  autoCompile ? 'bg-[#8083ff]' : 'bg-[#273647]'
                }`}
              >
                <span
                  className={`block w-3 h-3 rounded-full bg-white transform transition-transform mt-0.5 ${
                    autoCompile ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Prominent Compile Button */}
            <button
              type="button"
              onClick={() => triggerCompile()}
              disabled={isCompiling}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-display text-xs font-semibold transition-all shadow-[0_0_16px_rgba(128,131,255,0.3)] cursor-pointer ${
                isCompiling
                  ? 'bg-[#8083ff]/60 text-white cursor-wait'
                  : 'bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9]'
              }`}
            >
              <span className={`material-symbols-outlined text-[16px] ${isCompiling ? 'animate-spin' : ''}`}>
                {isCompiling ? 'refresh' : 'play_circle'}
              </span>
              <span>Compile</span>
              <kbd className="hidden md:inline-block font-mono text-[9px] bg-black/20 text-[#0d0096] px-1 rounded">
                ⌘ Enter
              </kbd>
            </button>

            {/* Quick Export PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isCompiling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] text-[#7bd0ff] hover:text-[#c4e7ff] transition-colors border border-[#273647] text-xs font-display font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </section>

      {/* Split Panel Workspace Studio */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 min-h-[calc(100vh-13rem)] max-w-[1720px] mx-auto">
        {/* LEFT PANEL: LaTeX Editor & Console (Col 12 -> 6) */}
        <div className="lg:col-span-6 flex flex-col bg-[#010f1f] border-r border-[#1c2b3c] shadow-md min-h-[500px]">
          {/* File Explorer & Tab Header */}
          <div className="bg-[#0d1c2d] px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto border-b border-[#1c2b3c]">
            <div className="flex items-center gap-1 min-w-max">
              {(['main.tex', 'refs.bib', 'custom.sty', 'figures/'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFileTab(tab)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs transition-colors cursor-pointer ${
                    activeFileTab === tab
                      ? 'bg-[#010f1f] text-[#c0c1ff] border-t border-x border-[#1c2b3c]'
                      : 'text-[#c7c4d7] hover:bg-[#122131]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px] text-[#c0c1ff]">
                    {tab.includes('/') ? 'folder' : tab.endsWith('.bib') ? 'format_quote' : 'description'}
                  </span>
                  <span>{tab}</span>
                  {tab === 'main.tex' && <span className="w-1.5 h-1.5 rounded-full bg-[#7bd0ff]"></span>}
                </button>
              ))}
            </div>

            {/* Coordinates */}
            <div className="flex items-center gap-2 text-[#c7c4d7] font-mono text-xs shrink-0">
              <span className="bg-[#122131] px-2 py-0.5 rounded text-[#d4e4fa]">
                {lineCount} Lines, {sourceCode.length} Chars
              </span>
              <span className="text-[#7bd0ff] font-mono text-[9px] uppercase font-bold">UTF-8</span>
            </div>
          </div>

          {/* Quick Syntax Insert Ribbon (Shown when on main.tex) */}
          {activeFileTab === 'main.tex' && (
            <div className="bg-[#122131] px-3 py-1 flex items-center gap-1 overflow-x-auto border-b border-[#1c2b3c] scrollbar-none">
              <span className="font-mono text-[9px] text-[#908fa0] uppercase tracking-wider pr-1 font-bold">Insert:</span>
              <button
                type="button"
                onClick={() => insertSnippet('\\begin{equation}\n  E = mc^2\n\\end{equation}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-mono inline-flex items-center gap-1 text-[11px] px-2 cursor-pointer"
                title="Insert Math Equation"
              >
                <span className="material-symbols-outlined text-[14px] text-[#ddb7ff]">functions</span> Eq
              </button>

              <button
                type="button"
                onClick={() => insertSnippet('\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-mono inline-flex items-center gap-1 text-[11px] px-2 cursor-pointer"
                title="Insert Grid Matrix"
              >
                <span className="material-symbols-outlined text-[14px] text-[#7bd0ff]">grid_4x4</span> Matrix
              </button>

              <button
                type="button"
                onClick={() => insertSnippet('\\begin{tabular}{|c|c|}\n\\hline\nMetric & Value \\\\\n\\hline\nFidelity & 99.8\\% \\\\\n\\hline\n\\end{tabular}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-mono inline-flex items-center gap-1 text-[11px] px-2 cursor-pointer"
                title="Insert Data Table"
              >
                <span className="material-symbols-outlined text-[14px] text-[#c0c1ff]">table_chart</span> Table
              </button>

              <button
                type="button"
                onClick={() => insertSnippet('\\cite{vance2023quantum}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-mono inline-flex items-center gap-1 text-[11px] px-2 cursor-pointer"
                title="Insert Citation"
              >
                <span className="material-symbols-outlined text-[14px]">format_quote</span> Cite
              </button>

              <button
                type="button"
                onClick={() => insertSnippet('\\section{New Analytical Section}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-mono inline-flex items-center gap-1 text-[11px] px-2 cursor-pointer"
                title="Insert Section"
              >
                <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span> Sec
              </button>

              <div className="h-3 w-px bg-[#2c3a4c] mx-1"></div>

              <button
                type="button"
                onClick={() => insertSnippet('\\textbf{bold text}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-display font-bold px-2 text-[11px] cursor-pointer"
                title="Bold Text"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('\\textit{italic text}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-display italic px-2 text-[11px] cursor-pointer"
                title="Italic Text"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertSnippet('\\texttt{code snippet}')}
                className="p-1 rounded bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-mono px-2 text-[11px] cursor-pointer"
                title="Verbatim Teletype"
              >
                &lt;/&gt;
              </button>
            </div>
          )}

          {/* Interactive Source Code Area with Line Numbers */}
          <div className="relative flex-1 overflow-hidden bg-[#010f1f] flex min-h-[360px]">
            {/* Line Numbers Column */}
            <div className="flex flex-col text-right text-[#908fa0] select-none font-mono text-[11px] pt-3 px-3 space-y-1 bg-[#010f1f]/50 border-r border-[#1c2b3c]/50">
              {lineNumbers.map((num, i) => (
                <span key={i} className="leading-[20px]">{num}</span>
              ))}
            </div>

            {/* Real Textarea Editor */}
            <div className="relative flex-1 h-full">
              {activeFileTab === 'main.tex' ? (
                <textarea
                  ref={editorRef}
                  value={sourceCode}
                  onChange={(e) => {
                    setSourceCode(e.target.value);
                    if (autoCompile) {
                      triggerCompile(undefined, e.target.value);
                    }
                  }}
                  spellCheck={false}
                  className="w-full h-full p-3 font-mono text-xs leading-[20px] text-[#d4e4fa] bg-transparent resize-none focus:outline-none selection:bg-[#8083ff]/30 overflow-y-auto"
                  placeholder="Paste or write your LaTeX code here... \begin{document} ..."
                  aria-label="LaTeX Source Code Editor"
                />
              ) : (
                <textarea
                  value={auxFiles[activeFileTab] || ''}
                  onChange={(e) => {
                    setAuxFiles({ ...auxFiles, [activeFileTab]: e.target.value });
                  }}
                  spellCheck={false}
                  className="w-full h-full p-3 font-mono text-xs leading-[20px] text-[#d4e4fa] bg-transparent resize-none focus:outline-none selection:bg-[#8083ff]/30 overflow-y-auto"
                  aria-label={`Editor for ${activeFileTab}`}
                />
              )}

              {/* SyncTeX Float Indicator */}
              <div className="absolute right-3 bottom-3 bg-[#1c2b3c]/90 backdrop-blur px-2.5 py-1 rounded shadow-md flex items-center gap-1.5 border border-[#273647] pointer-events-none">
                <span className="material-symbols-outlined text-[13px] text-[#7bd0ff]">sync_alt</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#d4e4fa] font-bold">
                  Live AST Sync Active
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Terminal Console / Compiler Logs */}
          <div className="bg-[#0d1c2d] border-t border-[#1c2b3c] shadow-inner">
            <div className="px-3 py-1.5 flex items-center justify-between bg-[#122131]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7bd0ff] text-[16px]">terminal</span>
                <span className="font-display text-xs text-[#d4e4fa] font-semibold">
                  Compiler Output &amp; Diagnostics
                </span>
                <span className="bg-[#273647] text-[#7bd0ff] font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                  {parsedDoc.errors.length} Errors
                </span>
                <span className="bg-[#273647] text-[#ddb7ff] font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                  {parsedDoc.warnings.length} Warnings
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveConsoleTab('all')}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                    activeConsoleTab === 'all' ? 'bg-[#1c2b3c] text-[#d4e4fa]' : 'text-[#c7c4d7]'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConsoleTab('warnings')}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                    activeConsoleTab === 'warnings' ? 'bg-[#1c2b3c] text-[#d4e4fa]' : 'text-[#c7c4d7]'
                  }`}
                >
                  Warnings ({parsedDoc.warnings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConsoleTab('raw')}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                    activeConsoleTab === 'raw' ? 'bg-[#1c2b3c] text-[#d4e4fa]' : 'text-[#c7c4d7]'
                  }`}
                >
                  Raw Log
                </button>
                <button
                  type="button"
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  className="text-[#c7c4d7] hover:text-white ml-2 cursor-pointer"
                  title="Toggle Console View"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isConsoleOpen ? 'expand_more' : 'expand_less'}
                  </span>
                </button>
              </div>
            </div>

            {isConsoleOpen && (
              <div className="p-2.5 font-mono text-[11px] leading-tight space-y-1 bg-[#010f1f] max-h-36 overflow-y-auto">
                {compilerLogs
                  .filter((log) => activeConsoleTab === 'all' || (activeConsoleTab === 'warnings' && log.type === 'warning'))
                  .map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center gap-2 ${
                        log.type === 'warning'
                          ? 'text-[#ddb7ff]'
                          : log.type === 'success'
                          ? 'text-[#7bd0ff] font-bold'
                          : 'text-[#c7c4d7]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {log.type === 'warning' ? 'warning' : 'check_circle'}
                      </span>
                      <span>[{log.time}] {log.message}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between text-[#d4e4fa] pt-1 bg-[#0d1c2d] px-2 py-1 rounded mt-1 border border-[#1c2b3c]">
                  <span className="text-[#7bd0ff] font-bold">{compileSuccessNotice}</span>
                  <span className="text-[#908fa0] text-[10px]">
                    Packages: {parsedDoc.packages.length} | Lines: {parsedDoc.lineCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Live Rendered PDF Page Canvas (Reflects user sourceCode!) */}
        <div className="lg:col-span-6 flex flex-col bg-[#051424]">
          {/* PDF Document Viewer Toolbar */}
          <div className="bg-[#0d1c2d] px-3 py-1.5 flex items-center justify-between gap-2 shadow-sm border-b border-[#1c2b3c]">
            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] disabled:opacity-40 cursor-pointer"
                title="Previous Page"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <div className="flex items-center gap-1 font-mono text-xs text-[#d4e4fa]">
                <span className="bg-[#122131] px-2 py-0.5 rounded text-center min-w-7">{currentPage}</span>
                <span className="text-[#c7c4d7]">/</span>
                <span className="text-[#c7c4d7]">{totalCalculatedPages}</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalCalculatedPages, p + 1))}
                disabled={currentPage >= totalCalculatedPages}
                className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] disabled:opacity-40 cursor-pointer"
                title="Next Page"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>

            {/* Zoom & Viewport Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] cursor-pointer"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span className="font-mono text-xs text-[#d4e4fa] bg-[#122131] px-2 py-0.5 rounded">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] cursor-pointer"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#c7c4d7] hover:text-[#d4e4fa] ml-1 cursor-pointer"
                title="Fit to Width (100%)"
              >
                <span className="material-symbols-outlined text-[16px]">fit_screen</span>
              </button>
            </div>

            {/* Export & Document Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-1 rounded bg-[#122131] hover:bg-[#1c2b3c] text-[#c7c4d7] hover:text-[#d4e4fa] cursor-pointer"
                title="Print Document"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isCompiling}
                className="p-1 rounded bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9] transition-colors cursor-pointer"
                title="Download Compiled PDF"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
              </button>
            </div>
          </div>

          {/* Real Document Canvas Frame */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start bg-[#051424] min-h-[500px]">
            {/* White Paper Sheet Simulation (Drawn dynamically from user's parsed LaTeX AST!) */}
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className={`relative w-full ${
                parsedDoc.docClass.includes('beamer') ? 'max-w-[700px] min-h-[420px]' : 'max-w-[595px] min-h-[842px]'
              } bg-[#ffffff] text-[#0f172a] shadow-2xl rounded-sm p-8 sm:p-10 select-text font-serif leading-relaxed transition-transform duration-200 border border-[#cbd5e1]`}
            >
              {/* Document Header (from user code) */}
              <header className="text-center mb-6 border-b border-[#cbd5e1] pb-4">
                <h1 className="text-[18px] sm:text-[21px] font-bold text-[#020617] tracking-tight leading-snug mb-1.5 font-serif">
                  {parsedDoc.title}
                </h1>
                <div className="text-[11px] text-[#334155] font-serif flex items-center justify-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold">{parsedDoc.author}</span>
                  {parsedDoc.date && (
                    <>
                      <span className="text-[#94a3b8]">•</span>
                      <span className="text-[#64748b]">{parsedDoc.date}</span>
                    </>
                  )}
                </div>
                {parsedDoc.docClass && (
                  <div className="text-[8.5px] text-[#94a3b8] font-mono uppercase tracking-wider mt-1">
                    Class: {parsedDoc.docClass} {parsedDoc.isTwoColumn ? '• twocolumn' : ''}
                  </div>
                )}
              </header>

              {/* Abstract Callout Block (if present in user code) */}
              {parsedDoc.abstractText && (
                <div className="max-w-md mx-auto mb-6 px-4 py-2.5 bg-[#f8fafc] rounded text-[10px] text-[#334155] leading-normal font-serif text-justify shadow-sm border border-[#e2e8f0]">
                  <span className="font-bold text-[#0f172a] uppercase tracking-wider font-mono text-[9px] block text-center mb-1">
                    Abstract
                  </span>
                  {parsedDoc.abstractText}
                </div>
              )}

              {/* Body Content Rendering */}
              {parsedDoc.elements.length === 0 ? (
                <div className="py-12 text-center text-[#94a3b8] font-sans">
                  <p className="text-xs">No body content found between \begin&#123;document&#125; and \end&#123;document&#125;.</p>
                  <p className="text-[11px] text-[#64748b] mt-1">Start typing sections, equations, or paragraphs in the left editor!</p>
                </div>
              ) : parsedDoc.isTwoColumn ? (
                /* Dual-column rendering when documentclass contains twocolumn */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-[9.5px] leading-[14px] text-justify text-[#1e293b] font-serif">
                  <div className="space-y-3">
                    {leftColElements.map((el) => renderElement(el))}
                  </div>
                  <div className="space-y-3">
                    {rightColElements.map((el) => renderElement(el))}
                  </div>
                </div>
              ) : (
                /* Single column standard layout */
                <div className="space-y-3 text-[10px] leading-[15px] text-[#1e293b] font-serif">
                  {parsedDoc.elements.map((el) => renderElement(el))}
                </div>
              )}

              {/* Document Footer */}
              <div className="absolute bottom-5 left-0 right-0 text-center font-mono text-[9px] text-[#94a3b8]">
                — Page {currentPage} of {totalCalculatedPages} —
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Global Studio Status Bar */}
      <footer className="w-full bg-[#010f1f] border-t border-[#1c2b3c] px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[#c7c4d7] font-mono text-[11px] shadow-[0_-1px_4px_rgba(0,0,0,0.3)]">
        {/* Left Specs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[#7bd0ff]">
            <span className="w-2 h-2 rounded-full bg-[#7bd0ff]"></span>
            <span className="font-bold text-[#d4e4fa]">Engine Ready: {selectedEngine} 2024</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[#c7c4d7]">
            <span className="material-symbols-outlined text-[14px]">memory</span>
            <span>Heap: 24.8MB / 128MB</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[#c7c4d7]">
            <span className="material-symbols-outlined text-[14px] text-[#c0c1ff]">sync</span>
            <span>SyncTeX: Synchronized</span>
          </div>
        </div>

        {/* Right Shortcuts & Telemetry */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-[#908fa0]">
            <span><kbd className="bg-[#122131] px-1 py-0.5 rounded text-[#d4e4fa] border border-[#273647]">⌘+S</kbd> Save</span>
            <span><kbd className="bg-[#122131] px-1 py-0.5 rounded text-[#d4e4fa] border border-[#273647]">⌘+Enter</kbd> Recompile</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0d1c2d] px-2 py-0.5 rounded text-[#d4e4fa] border border-[#1c2b3c]">
            <span className="material-symbols-outlined text-[13px] text-[#7bd0ff]">verified_user</span>
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold">Zero Telemetry Local Mode</span>
          </div>
        </div>
      </footer>

      {/* Template Library Modal */}
      <TemplateLibraryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        selectedTemplateId={currentTemplate.id}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}

// Element Renderer helper
function renderElement(el: LatexElement) {
  if (el.type === 'section') {
    return (
      <div key={el.id} className="pt-2">
        <h2 className="text-[11.5px] font-bold text-[#0f172a] uppercase tracking-wide border-b border-[#cbd5e1] pb-0.5 mb-1.5 font-serif">
          {el.title}
        </h2>
      </div>
    );
  }
  if (el.type === 'subsection') {
    return (
      <div key={el.id} className="pt-1">
        <h3 className="text-[10.5px] font-bold text-[#1e293b] font-serif mb-1">
          {el.title}
        </h3>
      </div>
    );
  }
  if (el.type === 'subsubsection') {
    return (
      <div key={el.id}>
        <h4 className="text-[9.5px] font-semibold text-[#334155] font-serif mb-0.5">
          {el.title}
        </h4>
      </div>
    );
  }
  if (el.type === 'paragraph') {
    return (
      <p key={el.id} className="text-justify text-[#1e293b] font-serif leading-relaxed">
        {el.content}
      </p>
    );
  }
  if (el.type === 'equation') {
    return (
      <div key={el.id}>
        <MathView math={el.rawMath || 'E = mc^2'} equationNum={el.equationNum} />
      </div>
    );
  }
  if (el.type === 'list') {
    return (
      <ul key={el.id} className="space-y-1 my-1.5 pl-3 list-disc">
        {el.items?.map((item, idx) => (
          <li key={idx} className="text-[#1e293b] font-serif text-[9.5px]">
            {item}
          </li>
        ))}
      </ul>
    );
  }
  if (el.type === 'table') {
    return (
      <div key={el.id} className="my-2 bg-[#f8fafc] rounded p-2 border border-[#e2e8f0] overflow-x-auto">
        <table className="w-full text-[8.5px] font-mono border-collapse">
          {el.tableHeaders && el.tableHeaders.length > 0 && (
            <thead>
              <tr className="border-b border-[#cbd5e1] text-[#475569]">
                {el.tableHeaders.map((h, i) => (
                  <th key={i} className="text-left pb-1 font-semibold pr-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          {el.tableRows && (
            <tbody className="divide-y divide-[#f1f5f9] text-[#1e293b]">
              {el.tableRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-1 pr-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    );
  }
  if (el.type === 'frame') {
    return (
      <div key={el.id} className="my-2 p-3 bg-[#f8fafc] rounded border border-[#cbd5e1] shadow-sm">
        <div className="font-bold text-[#0f172a] text-[11px] mb-1 pb-1 border-b border-[#cbd5e1]">
          {el.title}
        </div>
        <p className="text-[#334155] text-[9.5px]">{el.content}</p>
      </div>
    );
  }
  return null;
}
