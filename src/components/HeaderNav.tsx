import React from 'react';
import { ActiveWorkspaceTab } from '../types';

interface HeaderNavProps {
  activeTab: ActiveWorkspaceTab;
  onTabChange: (tab: ActiveWorkspaceTab) => void;
  stagedFilesCount: number;
  onQuickCompile?: () => void;
  onQuickExport?: () => void;
  isCompiling?: boolean;
}

export default function HeaderNav({
  activeTab,
  onTabChange,
  stagedFilesCount,
  onQuickCompile,
  onQuickExport,
  isCompiling,
}: HeaderNavProps) {
  const tabs: { id: ActiveWorkspaceTab; label: string; icon: string; count?: number }[] = [
    { id: 'merge-and-split', label: 'Merge & Split', icon: 'call_split', count: stagedFilesCount },
    { id: 'compress', label: 'Compress', icon: 'compress' },
    { id: 'latex-to-pdf', label: 'LaTeX to PDF', icon: 'terminal' },
    { id: 'ocr-and-convert', label: 'OCR & Convert', icon: 'document_scanner' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#051424]/90 backdrop-blur-xl border-b border-[#1c2b3c] shadow-[0_1px_8px_rgba(0,0,0,0.25)]">
      <div className="h-28 w-full px-4 sm:px-6 lg:px-8 flex flex-col justify-between max-w-[1720px] mx-auto">
        {/* Top Tier: Brand, Engine Status, Quick Actions */}
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Brand lockup */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#1c2b3c] flex items-center justify-center text-[#c0c1ff] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] border border-[#273647]">
                <span className="material-symbols-outlined text-[20px]">terminal</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[18px] tracking-tight text-[#d4e4fa] leading-tight">
                  PDF Studio
                </span>
                <span className="font-mono text-[9px] tracking-widest text-[#7bd0ff] uppercase font-bold">
                  Tool Suite v2.4
                </span>
              </div>
            </div>

            {/* Sandbox beacon */}
            <div className="hidden lg:flex items-center gap-2 bg-[#010f1f] px-3 py-1 rounded-full border border-[#1c2b3c] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
              <span className="w-2 h-2 rounded-full bg-[#7bd0ff] animate-pulse"></span>
              <span className="font-mono text-[11px] text-[#7bd0ff]">
                Sandboxed In-Memory Engine
              </span>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0d1c2d] px-3 py-1 rounded-lg border border-[#1c2b3c]">
              <span className="material-symbols-outlined text-[#7bd0ff] text-[16px]">check_circle</span>
              <span className="font-mono text-[11px] text-[#d4e4fa]">Engine Ready</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onQuickExport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] border border-[#273647] text-[#c7c4d7] hover:text-[#d4e4fa] transition-colors cursor-pointer text-xs font-semibold"
                title="Export current document"
              >
                <span className="material-symbols-outlined text-[16px]">ios_share</span>
                <span className="font-display">Export</span>
              </button>

              <button
                type="button"
                onClick={onQuickCompile}
                disabled={isCompiling}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-display text-xs font-bold transition-all shadow-[0_0_12px_rgba(128,131,255,0.25)] cursor-pointer ${
                  isCompiling
                    ? 'bg-[#8083ff]/60 text-white cursor-wait'
                    : 'bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] hover:text-[#1000a9]'
                }`}
              >
                <span className={`material-symbols-outlined text-[16px] ${isCompiling ? 'animate-spin' : ''}`}>
                  {isCompiling ? 'refresh' : 'bolt'}
                </span>
                <span>{isCompiling ? 'Building...' : 'Compile'}</span>
              </button>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#c0c1ff] text-[#1000a9] flex items-center justify-center shrink-0 font-bold font-mono text-xs shadow-sm">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>

        {/* Bottom Tier: Navigation Tabs */}
        <nav className="h-12 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none" aria-label="Tool Suite Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#8083ff] text-[#0d0096] font-semibold shadow-[0_0_12px_rgba(128,131,255,0.3)]'
                    : 'text-[#c7c4d7] hover:bg-[#1c2b3c] hover:text-[#d4e4fa]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-[#0d0096] text-[#c0c1ff]' : 'bg-[#273647] text-[#7bd0ff]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
