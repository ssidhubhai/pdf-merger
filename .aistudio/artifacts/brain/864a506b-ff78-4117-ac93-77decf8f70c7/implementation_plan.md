# PDF Studio — Obsidian Workspace Suite

A high-precision, developer-grade document engineering workstation that unites client-side PDF merging, selective page reorganizing, global drag-and-drop file staging, and a full-featured LaTeX-to-PDF split studio with interactive template libraries.

> [!IMPORTANT]
> **User Review & Confirmed Decisions from Phase 1**
> - **Workspace Suite Structure**: Comprehensive multi-tab suite uniting **Merge & Split**, **Compress**, **LaTeX to PDF**, **OCR & Convert**, and **Settings** under a cohesive top navigation bar.
> - **Global Drag & Drop Fix**: Implemented an always-active window and workspace drag-and-drop listener so users can drop new PDF files anywhere at any time without having to use the native file selector button.
> - **Launch Screen**: Defaults directly to the **Merge & Split** workspace so users can immediately drop and arrange documents, with seamless switching to the **LaTeX to PDF** studio and other tools.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an all-in-one local document workstation. Users can combine, split, reorder, compress, and inspect PDF documents, as well as author LaTeX documents with live syntax insertion, multi-engine selection (pdfLaTeX, XeLaTeX, LuaLaTeX), instant compilation simulation with diagnostics, and a searchable 18-preset template browser.
- **Target Audience / Persona**: Engineers, academic researchers, graduate students, and document professionals requiring precise, distraction-free document manipulation without cloud telemetry or data leakage.
- **Key Value**: 100% private, client-side processing using WebAssembly and in-browser PDF engines (`pdf-lib`, `pdfjs-dist`). Resolves the friction of file staging by supporting global drop surfaces and instant keyboard shortcuts (`⌘+Enter`, `⌘+Z`).

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Continuous File Staging (Merge & Split)**:
   - User drags and drops PDF files onto the canvas.
   - Files appear as interactive document cards displaying page counts, size, and page range sliders.
   - Users can drag additional files at any point onto the workspace, reorder cards via drag handles or arrow controls, slice page ranges, or toggle the Visual Page Organizer matrix.
   - Clicking **Merge PDFs** streams progress and yields a download link along with a live PDF preview modal.
2. **LaTeX Studio & Template Browsing**:
   - Switching to the **LaTeX to PDF** tab opens a dual-pane IDE: source editor with line numbers, quick syntax insertion ribbon (`Eq`, `Matrix`, `Table`, `Cite`, `Sec`), and diagnostics console on the left; rendered document canvas on the right.
   - Clicking **Browse** or the template picker opens the **LaTeX Template Library** modal featuring 18 presets (Deedy Resume, Harvard Academic CV, University Master/PhD Thesis, MIT Style Dissertation, Metropolis Beamer Slides, Academic Conference Presentation, etc.) filterable by category and search query.
   - Clicking **Load Template into Editor** populates the editor and updates the live rendered sheet.
3. **Tools & Optimizations**:
   - **Compress**: Deflate stream optimization and real-time before/after byte savings calculation.
   - **OCR & Convert**: Searchable text layer extraction and image export utilities.

#### Visual Identity & Theme (Obsidian Workspace)
- **Palette**:
  - `background`: Deep obsidian canvas (`#051424`)
  - `surface-container-low`: `#0d1c2d`
  - `surface-container`: `#122131`
  - `surface-container-high`: `#1c2b3c`
  - `surface-container-highest`: `#273647`
  - `primary`: Electric Indigo (`#c0c1ff` / `#8083ff`)
  - `secondary`: Cyber Blue (`#7bd0ff` / `#00a6e0`)
  - `tertiary`: Cosmic Violet (`#ddb7ff` / `#b76dff`)
  - `on-surface`: High-contrast ice blue (`#d4e4fa`)
  - `document-canvas`: Pure optical white (`#ffffff`) for authentic paper contrast
- **Typography**:
  - Display & Headlines: `Space Grotesk` with tight tracking (`-0.01em` to `-0.025em`)
  - Body & Controls: `Inter` for crisp, ergonomic readability
  - Technical & Code: `JetBrains Mono` with `tabular-nums` for line numbers, page coordinates, and metrics
- **Layout Rhythm**:
  - Top bar following the strict 3-zone contract (Wordmark brand on left, 5 primary navigation tabs in center, actions & profile on right)
  - Subheader studio control bar for document metadata, engine selector, auto-compile toggle, and primary actions
  - Full 1440px desktop baseline with fluid responsive collapse for tablets and mobile

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Global Drag-and-Drop Surface**
  - *Chosen Approach*: Implement a global document-level dragover/drop listener combined with visible ambient drop indicators. When files are dragged anywhere over the window, an overlay highlights the drop zone without obscuring current files.
  - *Why*: Directly solves the user's reported problem where dragging and dropping was disabled after the initial upload batch.
  - *Alternatives Considered*: Sticky top drop strip only (rejected as less intuitive than allowing drag anywhere).

- **Decision 2: Modular Tab Architecture with Shared Staged State**
  - *Chosen Approach*: Encapsulate the application into distinct suite modules (`Merge & Split`, `Compress`, `LaTeX to PDF`, `OCR & Convert`, `Settings`) while keeping staged files in central state so files imported in one tab are readily accessible in others.
  - *Why*: Allows the user to move between merging multiple PDFs, converting LaTeX documents into compiled PDFs, and optimizing files without re-uploading.

- **Decision 3: Authentic In-Memory TeX Compilation & Real Document Sheet**
  - *Chosen Approach*: Pair editable LaTeX source code with pre-rendered SVG/HTML vector sheets corresponding to each template, combined with dynamic syntax updates, instant compile latency feedback, and downloadable PDF outputs via `pdf-lib`.
  - *Why*: Delivers an immediate, zero-lag client-side compilation experience without requiring a heavyweight 500MB remote server compiler.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Bar                              │
│  [PDF Studio]   [Merge & Split] [Compress] [LaTeX to PDF] [OCR] [Set]  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴────────────────────────┐
          ▼                                                  ▼
┌───────────────────────────────────┐      ┌─────────────────────────────┐
│      Merge & Split Suite          │      │     LaTeX to PDF Studio     │
│ ┌───────────────────────────────┐ │      │ ┌────────────┐┌───────────┐ │
│ │ Global Drag & Drop Handler    │ │      │ │ TeX Source ││ Rendered  │ │
│ └───────────────────────────────┘ │      │ │ Editor &   ││ Document  │ │
│ ┌───────────────────────────────┐ │      │ │ Diagnostics││ Canvas    │ │
│ │ Staged PDF Cards & Reordering │ │      │ └────────────┘└───────────┘ │
│ └───────────────────────────────┘ │      │ ┌─────────────────────────┐ │
│ ┌───────────────────────────────┐ │      │ │ Template Library Modal  │ │
│ │ Visual Page Organizer Matrix  │ │      │ │ (18 Filterable Presets) │ │
│ └───────────────────────────────┘ │      │ └─────────────────────────┘ │
│ ┌───────────────────────────────┐ │      └─────────────────────────────┘
│ │ Client-side pdf-lib Merger    │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

#### State & Data Models
- `PdfFile`: File identity, metadata, page range boundaries (`fromPage`, `toPage`), decryption state, and IndexedDB binary reference.
- `LatexTemplate`: Template ID, title, subtitle, engine compatibility, category (`resumes`, `theses`, `presentations`, `papers`), TeX preamble, default body code, and vector sheet layout.
- `ActiveWorkspaceTab`: `'merge-and-split' | 'compress' | 'latex-to-pdf' | 'ocr-and-convert' | 'settings'`.
- `GlobalDragState`: `isDraggingFiles` boolean powering the non-intrusive backdrop drop target.
