import React from 'react';
import { clearAllFileBinaries } from '../lib/db';

interface SettingsSuiteProps {
  stagedFilesCount: number;
  onClearAll: () => void;
  onNotify?: (msg: string) => void;
}

export default function SettingsSuite({
  stagedFilesCount,
  onClearAll,
  onNotify,
}: SettingsSuiteProps) {
  const handlePurge = async () => {
    if (window.confirm('Clear all staged PDF binaries from local IndexedDB storage?')) {
      await clearAllFileBinaries();
      onClearAll();
      if (onNotify) {
        onNotify('Local cache and staged files cleared.');
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 text-[#d4e4fa]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[#7bd0ff] text-[22px]">tune</span>
          <h2 className="font-display font-bold text-2xl text-[#d4e4fa] tracking-tight">
            Workspace Configuration
          </h2>
        </div>
        <p className="font-sans text-xs sm:text-sm text-[#c7c4d7]">
          Manage local runtime storage, WebAssembly cache pools, and view workstation keybindings.
        </p>
      </div>

      <div className="space-y-6">
        {/* Storage Management */}
        <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-5 space-y-4">
          <h3 className="font-display font-bold text-sm text-[#d4e4fa] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8083ff] text-[18px]">database</span>
            Local IndexedDB Sandbox Storage
          </h3>
          <p className="font-sans text-xs text-[#c7c4d7]">
            All PDF byte buffers and page renders are stored directly within your browser's sandboxed IndexedDB database (`pdf_merger_db`). No files ever leave your device.
          </p>

          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#010f1f] border border-[#1c2b3c]">
            <div>
              <span className="font-mono text-xs font-bold text-[#d4e4fa]">
                Staged Documents: {stagedFilesCount}
              </span>
              <p className="font-mono text-[10px] text-[#908fa0]">Offline persistence enabled</p>
            </div>
            <button
              type="button"
              onClick={handlePurge}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-display text-xs font-bold transition-colors cursor-pointer"
            >
              Purge Local Cache
            </button>
          </div>
        </div>

        {/* Shortcuts Cheat Sheet */}
        <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl p-5 space-y-4">
          <h3 className="font-display font-bold text-sm text-[#d4e4fa] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7bd0ff] text-[18px]">keyboard</span>
            Workstation Keyboard Shortcuts
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { keys: ['⌘', 'Enter'], desc: 'Compile active LaTeX source code' },
              { keys: ['⌘', 'S'], desc: 'Save & recompile current document' },
              { keys: ['⌘', 'Z'], desc: 'Undo card adjustments and page deletions' },
              { keys: ['Drag', 'Anywhere'], desc: 'Drop files anywhere on screen to stage' },
            ].map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#010f1f] border border-[#1c2b3c]"
              >
                <span className="font-sans text-xs text-[#c7c4d7]">{s.desc}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-2 py-0.5 rounded bg-[#122131] border border-[#273647] font-mono text-xs text-[#7bd0ff] font-bold"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zero-Telemetry Security Assertion */}
        <div className="p-4 rounded-xl bg-[#010f1f] border border-[#1c2b3c] flex items-start gap-3">
          <span className="material-symbols-outlined text-[#7bd0ff] text-[20px] shrink-0 mt-0.5">
            verified_user
          </span>
          <div>
            <h4 className="font-display font-bold text-xs text-[#d4e4fa]">
              Sandboxed Client Runtime Verification
            </h4>
            <p className="font-sans text-[11px] text-[#908fa0] mt-0.5 leading-relaxed">
              PDF Studio executes entirely in-browser using WebAssembly, `pdf-lib`, and Mozilla's `pdf.js` worker. Zero network telemetry or file payloads are sent to external services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
