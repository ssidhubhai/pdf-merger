import React, { useState, useMemo } from 'react';
import { LatexTemplate, TemplateCategory } from '../types';
import { LATEX_TEMPLATES } from '../data/templates';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplateId: string;
  onSelectTemplate: (template: LatexTemplate) => void;
}

export default function TemplateLibraryModal({
  isOpen,
  onClose,
  selectedTemplateId,
  onSelectTemplate,
}: TemplateLibraryModalProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<LatexTemplate | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string>(selectedTemplateId);

  const categories: { id: TemplateCategory; label: string }[] = [
    { id: 'all', label: 'All Templates' },
    { id: 'resumes', label: 'Resumes & CVs' },
    { id: 'theses', label: 'Theses & Dissertations' },
    { id: 'presentations', label: 'Presentations (Beamer)' },
    { id: 'papers', label: 'Academic Papers' },
  ];

  const filteredTemplates = useMemo(() => {
    return LATEX_TEMPLATES.filter((tpl) => {
      const matchesCategory = activeCategory === 'all' || tpl.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some((t) => t.toLowerCase().includes(q)) ||
        tpl.engineLabel.toLowerCase().includes(q) ||
        tpl.author.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const activeSelection = useMemo(() => {
    return LATEX_TEMPLATES.find((t) => t.id === internalSelectedId) || LATEX_TEMPLATES[0];
  }, [internalSelectedId]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectTemplate(activeSelection);
    onClose();
  };

  return (
    <div
      id="templateModalOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#010f1f]/85 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-[#0d1c2d] border border-[#273647] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#d4e4fa]">
        {/* Header Bar */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 bg-[#122131] border-b border-[#1c2b3c] flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#8083ff]/20 border border-[#8083ff]/30 flex items-center justify-center text-[#c0c1ff] shrink-0">
                <span className="material-symbols-outlined text-[22px]">dashboard_customize</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[19px] sm:text-[21px] text-[#d4e4fa] tracking-tight font-bold">
                    LaTeX Template Library
                  </h2>
                  <span className="bg-[#273647] text-[#7bd0ff] font-mono text-[10px] font-bold px-2 py-0.5 rounded">
                    18 Presets Available
                  </span>
                </div>
                <p className="font-sans text-xs text-[#c7c4d7] mt-0.5">
                  Choose a starter template pre-configured with packages, preamble macros, and layout engines.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#c7c4d7] hover:text-[#d4e4fa] flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[16px] text-[#908fa0]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, packages, classes..."
                className="w-full bg-[#010f1f] border border-[#273647] rounded-lg pl-9 pr-3 py-1.5 font-sans text-xs text-[#d4e4fa] placeholder:text-[#908fa0] focus:outline-none focus:border-[#8083ff]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#908fa0] hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 scrollbar-none">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#8083ff] text-[#0d0096] shadow-sm'
                        : 'text-[#c7c4d7] hover:bg-[#1c2b3c] hover:text-[#d4e4fa]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Templates Grid Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#010f1f]">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center text-[#908fa0] flex flex-col items-center">
              <span className="material-symbols-outlined text-[40px] mb-2 text-[#464554]">search_off</span>
              <p className="font-display font-semibold text-base text-[#d4e4fa]">No matching templates found</p>
              <p className="font-sans text-xs mt-1">Try another keyword or select "All Templates"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((tpl) => {
                const isSelected = internalSelectedId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setInternalSelectedId(tpl.id)}
                    className={`group relative bg-[#122131] rounded-lg p-3.5 flex flex-col justify-between transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-[#8083ff] shadow-[0_0_16px_rgba(128,131,255,0.25)] ring-1 ring-[#8083ff]'
                        : 'border-[#273647] hover:border-[#908fa0]'
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-[#8083ff] text-[#0d0096] px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold flex items-center gap-1 shadow-sm z-10">
                        <span className="material-symbols-outlined text-[11px]">check</span>
                        <span>Selected</span>
                      </div>
                    )}

                    {/* Miniature Paper Simulation */}
                    <div className="h-36 w-full rounded bg-white p-3 text-[#0f172a] shadow-inner mb-3 overflow-hidden flex flex-col justify-start relative select-none font-sans text-left border border-[#cbd5e1]">
                      {tpl.previewType === 'resume' ? (
                        <>
                          <div className="border-b border-[#cbd5e1] pb-1 mb-1.5">
                            <div className="font-bold text-[10px] tracking-tight text-[#020617] uppercase">
                              {tpl.author}
                            </div>
                            <div className="text-[6.5px] text-[#475569] truncate">
                              {tpl.affiliation}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-[6px]">
                            <div className="col-span-1 border-r border-[#e2e8f0] pr-1 space-y-1">
                              <div className="font-bold text-[#1e293b] uppercase text-[6.5px]">EDUCATION</div>
                              <div className="text-[#334155] leading-tight">
                                Top Univ.<br /><span className="text-[#64748b]">B.S. 2024</span>
                              </div>
                              <div className="font-bold text-[#1e293b] uppercase text-[6.5px] pt-0.5">SKILLS</div>
                              <div className="text-[#64748b]">LaTeX, C++, Rust, AI</div>
                            </div>
                            <div className="col-span-2 space-y-1 pl-0.5">
                              <div className="font-bold text-[#1e293b] uppercase text-[6.5px]">EXPERIENCE</div>
                              <div className="text-[#334155]">
                                <span className="font-semibold text-[#0f172a]">Core Systems Specialist</span>
                                <div className="text-[#475569] leading-tight mt-0.5">
                                  Architected high-throughput computational kernels with bounded latency.
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : tpl.previewType === 'slides' ? (
                        <div className="bg-[#23373b] -m-3 p-3 h-full text-white flex flex-col justify-between">
                          <div className="flex items-center justify-between border-b border-[#3b595f] pb-1">
                            <span className="text-[7px] font-bold text-[#eb811b] tracking-wider uppercase truncate">
                              {tpl.title}
                            </span>
                            <span className="text-[6px] text-[#d4e4fa] font-mono">14 / 28</span>
                          </div>
                          <div className="space-y-1 my-auto">
                            <div className="text-[9px] font-bold text-white truncate">{tpl.author}</div>
                            <div className="text-[6px] text-[#d4e4fa] leading-tight line-clamp-2">
                              {tpl.abstractText}
                            </div>
                            <div className="bg-[#142022] p-1 rounded font-mono text-[5.5px] text-[#eb811b]">
                              &gt; mpirun -n 16 ./run_simulation
                            </div>
                          </div>
                          <div className="w-full bg-[#1b2b2e] h-1 rounded-full overflow-hidden">
                            <div className="bg-[#eb811b] h-full w-1/2"></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-center border-b border-[#0f172a] pb-1 mb-1 font-serif">
                            <div className="text-[8.5px] font-bold tracking-tight text-[#020617] line-clamp-1 uppercase">
                              {tpl.title}
                            </div>
                            <div className="text-[6px] text-[#475569] italic truncate">
                              {tpl.author} · {tpl.date || '2024'}
                            </div>
                          </div>
                          <div className="space-y-1 font-serif text-[6.5px] text-[#1e293b]">
                            <div className="font-bold uppercase text-[7px] text-[#0f172a]">
                              {tpl.sections[0]?.title || '1. INTRODUCTION'}
                            </div>
                            <p className="text-[6px] text-[#475569] leading-tight line-clamp-3">
                              {tpl.sections[0]?.body || tpl.abstractText}
                            </p>
                            {tpl.equation && (
                              <div className="bg-[#f1f5f9] p-1 rounded font-mono text-[5.5px] text-center text-[#0f172a]">
                                {tpl.equation}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Metadata Header */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[9px] font-bold bg-[#1c2b3c] text-[#7bd0ff] px-1.5 py-0.5 rounded">
                          {tpl.categoryLabel}
                        </span>
                        <span className="font-mono text-[9px] font-bold bg-[#1c2b3c] text-[#ddb7ff] px-1.5 py-0.5 rounded">
                          {tpl.engineLabel}
                        </span>
                      </div>
                      <h3 className="font-display text-[13px] font-bold text-[#d4e4fa] line-clamp-1">
                        {tpl.title}
                      </h3>
                      <p className="font-sans text-[11px] text-[#c7c4d7] line-clamp-2 mt-1 leading-snug">
                        {tpl.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {tpl.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[9px] text-[#908fa0] bg-[#010f1f] px-1.5 py-0.5 rounded border border-[#1c2b3c]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2.5 mt-2.5 border-t border-[#1c2b3c] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(tpl);
                        }}
                        className="px-2 py-1 rounded text-xs text-[#c7c4d7] hover:text-[#d4e4fa] hover:bg-[#1c2b3c] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInternalSelectedId(tpl.id);
                          onSelectTemplate(tpl);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9] font-display text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">add_circle</span>
                        <span>Select</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3 sm:px-6 sm:py-4 bg-[#122131] border-t border-[#1c2b3c] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#908fa0] font-bold">
                Active Selection
              </span>
              <span className="font-display text-sm font-bold text-[#d4e4fa] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#7bd0ff]"></span>
                {activeSelection.title}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 bg-[#010f1f] px-2.5 py-1 rounded border border-[#273647]">
              <span className="material-symbols-outlined text-[14px] text-[#ddb7ff]">memory</span>
              <span className="font-mono text-[11px] text-[#c7c4d7]">Engine: {activeSelection.engineLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1c2b3c] hover:bg-[#2c3a4c] text-[#d4e4fa] font-display text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-1.5 rounded-lg bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9] font-display text-xs font-bold transition-all shadow-[0_0_16px_rgba(128,131,255,0.3)] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download_done</span>
              <span>Load Template into Editor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Preview Slide-Over Drawer if active */}
      {previewTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-[#0d1c2d] border border-[#273647] rounded-xl p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#d4e4fa]">{previewTemplate.title}</h3>
                <span className="font-mono text-xs text-[#7bd0ff]">{previewTemplate.engineLabel} · {previewTemplate.tags.join(', ')}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="w-8 h-8 rounded-lg bg-[#1c2b3c] text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div>
              <p className="text-xs text-[#c7c4d7] mb-3">{previewTemplate.description}</p>
              <div className="p-3 bg-[#010f1f] rounded border border-[#1c2b3c] font-mono text-[11px] text-[#7bd0ff] max-h-64 overflow-y-auto whitespace-pre">
                {previewTemplate.code}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2b3c]">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-3 py-1.5 rounded bg-[#1c2b3c] text-xs font-semibold"
              >
                Back to Library
              </button>
              <button
                type="button"
                onClick={() => {
                  setInternalSelectedId(previewTemplate.id);
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  onClose();
                }}
                className="px-4 py-1.5 rounded bg-[#8083ff] text-[#0d0096] text-xs font-bold font-display"
              >
                Load This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
