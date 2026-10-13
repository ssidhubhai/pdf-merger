import { LatexTemplate } from '../types';

export const LATEX_TEMPLATES: LatexTemplate[] = [
  {
    id: 'quantum-electrodynamics',
    title: 'Academic Paper (Dual-Col Cavity QED)',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX 2024',
    description: 'Non-perturbative dynamic field coupling in cavity QED with Lagrangian densities and second-order polariton dispersion.',
    tags: ['Dual-Column', 'AMS-TeX', 'SyncTeX Active'],
    author: 'Dr. Elena Vance, Marcus Chen',
    affiliation: 'Department of Applied Physics, Institute for Advanced Studies, Zurich',
    date: 'October 24, 2024',
    abstractText: 'We formulate a rigorous quantum framework for localized field operators operating near resonant boundaries. Using variational resolvent analysis, we compute second-order polariton dispersion with zero spatial drift.',
    sections: [
      {
        title: '1. Theoretical Foundation',
        body: 'Quantum electrodynamics within highly confined micro-resonators reveals nontrivial vacuum-polariton hybridizations. Historically, perturbation methods struggle with strong boundary gradients. Here, we cast the interaction directly in terms of boundary-adapted gauge invariant modes.'
      },
      {
        title: '2. Numerical Resolvent',
        body: 'Transition probabilities derive from the coupled Jaynes-Cummings Hamiltonian adapted to non-Hermitian boundary losses. Diagonalizing the composite density matrix yields an eigen-spectrum bounded by the photon-emitter overlap integral.'
      }
    ],
    equation: '\\mathcal{L} = \\bar{\\psi}(i\\gamma^\\mu D_\\mu - m)\\psi - \\frac{1}{4}F_{\\mu\\nu}F^{\\mu\\nu}',
    previewType: 'academic',
    pageCount: 4,
    code: `\\documentclass[10pt, twocolumn]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath, amssymb, amsfonts}
\\usepackage{graphicx, microtype, hyperref}
\\usepackage[margin=0.75in]{geometry}

% Document Metadata Configuration
\\title{Non-Perturbative Dynamic Field Coupling in Cavity QED}
\\author{Dr. Elena Vance \\textsuperscript{1,2} \\and Marcus Chen \\textsuperscript{1}}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
We formulate a rigorous quantum framework for localized field operators
operating near resonant boundaries. Using variational resolvent analysis,
we compute second-order polariton dispersion with zero spatial drift.
\\end{abstract}

\\section{Theoretical Foundation & Lagrangian}
The Lagrangian density \\(\\mathcal{L}\\) governing interacting states is:

\\begin{equation} % Synced cursor anchor
\\mathcal{L} = \\bar{\\psi} (i \\gamma^\\mu D_\\mu - m) \\psi - \\frac{1}{4} F_{\\mu\\nu} F^{\\mu\\nu}
\\end{equation}

Where \\(D_\\mu = \\partial_\\mu - ieA_\\mu\\) denotes covariant differentiation.
Extending this to high-intensity pulsed laser modes \\cite{vance2023quantum}:

\\begin{equation}
\\hat{H}_{\\text{int}} = \\hbar g_0 (\\hat{a}^\\dagger \\hat{\\sigma}_- + \\hat{a} \\hat{\\sigma}_+)
\\end{equation}

\\section{Numerical Convergence & Spectrum}
As summarized in Figure~\\ref{fig:polariton_dispersion}, convergence is monotonic.
\\end{document}`
  },
  {
    id: 'modern-deedy-cv',
    title: 'Modern Deedy CV / Resume',
    category: 'resumes',
    categoryLabel: 'CV / RESUME',
    engine: 'xelatex',
    engineLabel: 'XeLaTeX (Unicode)',
    description: 'Clean dual-column tech resume with OpenType fonts, ATS-compliant structure, and compact skill bars.',
    tags: ['Single-page', 'ATS Friendly', 'Fontspec'],
    author: 'Alexander D. Reid',
    affiliation: 'reid@cs.stanford.edu · github.com/adreid · (650) 555-0198',
    date: '2024',
    abstractText: 'Core systems engineer specialized in accelerated kernel development, low-latency distributed runtimes, and compiler optimizations.',
    sections: [
      {
        title: 'EXPERIENCE',
        body: 'Core Systems Intern at OpenAI: Optimized tensor memory kernels reducing latency by 18%. Engineered concurrent CUDA scheduler handling 10k requests/sec.'
      },
      {
        title: 'EDUCATION',
        body: 'Stanford University: B.S. in Computer Science, Systems & AI Track. GPA: 3.94 / 4.00.'
      }
    ],
    previewType: 'resume',
    pageCount: 1,
    code: `\\documentclass[letterpaper]{deedy-resume-openfont}
\\usepackage{fontspec}
\\usepackage[hidelinks]{hyperref}

\\begin{document}
\\namesection{Alexander D.}{Reid}{reid@cs.stanford.edu | github.com/adreid | (650) 555-0198}

\\begin{minipage}[t]{0.33\\textwidth}
\\section{Education}
\\subsection{Stanford University}
\\descript{B.S. in Computer Science}
\\location{Class of 2024 | GPA 3.94}
\\sectionsep

\\section{Skills}
\\subsection{Languages}
Rust \\textbullet{} C++20 \\textbullet{} Python \\textbullet{} CUDA \\\\
TypeScript \\textbullet{} Go \\textbullet{} x86 ASM
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.65\\textwidth}
\\section{Experience}
\\runsubsection{OpenAI} \\descript{| Core Systems Intern}
\\location{June 2023 – Sept 2023 | San Francisco, CA}
\\begin{itemize}
\\item Optimized tensor memory kernels, reducing decode latency by 18\\%.
\\item Engineered fault-tolerant pipeline orchestration in Rust and C++.
\\end{itemize}
\\end{minipage}
\\end{document}`
  },
  {
    id: 'harvard-classic-cv',
    title: 'Harvard Classic Academic CV',
    category: 'resumes',
    categoryLabel: 'CV / RESUME',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Formal academic vitae with biblatex publication groupings, fellowship timeline, and clean serif typography.',
    tags: ['Multi-page', 'BibLaTeX', 'Formal Serif'],
    author: 'Elizabeth C. Monroe, Ph.D.',
    affiliation: 'Curriculum Vitae · Department of History, Harvard University',
    date: 'September 2024',
    abstractText: 'Assistant Professor specializing in early modern European legal institutions, print culture, and archival epistemology.',
    sections: [
      {
        title: 'ACADEMIC APPOINTMENTS',
        body: '2022–Present: Assistant Professor of Modern European History, Harvard University. 2020–2022: Postdoctoral Research Fellow, Max Planck Institute.'
      },
      {
        title: 'PUBLICATIONS & MONOGRAPHS',
        body: 'Monroe, E. (2023). Sovereignty in the Age of Print. Harvard University Press. 342 pp. Refereed monograph awarded the Leo Gershoy Prize.'
      }
    ],
    previewType: 'resume',
    pageCount: 3,
    code: `\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{charter}
\\usepackage[hidelinks]{hyperref}

\\begin{document}
\\begin{center}
{\\Large \\textbf{ELIZABETH C. MONROE, Ph.D.}}\\\\
\\vspace{4pt}
{\\small Curriculum Vitae \\textbullet{} Department of History, Harvard University}\\\\
{\\small emonroe@fas.harvard.edu \\textbullet{} scholarship.harvard.edu/monroe}
\\end{center}

\\section*{Academic Appointments}
\\begin{itemize}
\\item \\textbf{Assistant Professor of History}, Harvard University, 2022--Present
\\item \\textbf{Junior Research Fellow}, Trinity College, Cambridge, 2020--2022
\\end{itemize}

\\section*{Publications}
\\subsection*{Monographs}
\\item \\textbf{Monroe, Elizabeth C.} \\textit{Sovereignty in the Age of Print: Juridical Formations 1550--1680}. Harvard University Press, 2023.
\\end{document}`
  },
  {
    id: 'university-thesis',
    title: 'Standard University Master/PhD Thesis',
    category: 'theses',
    categoryLabel: 'THESIS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX / LuaTeX',
    description: 'Multi-chapter monograph architecture, frontmatter/backmatter division, signature page, and 1.5in bound margins.',
    tags: ['Book Class', 'Chapter TOC', 'Hyperref'],
    author: 'Julian Thorne, M.Sc.',
    affiliation: 'A Dissertation Submitted for the Degree of Doctor of Philosophy, Oxford',
    date: 'Trinity Term 2024',
    abstractText: 'We rigorously derive the second-order quantization tensor across stratified non-Hermitian interfaces and validate coupling states.',
    sections: [
      {
        title: 'Chapter 3: Boundary Resolvent Operators',
        body: 'We derive boundary conditions for non-Hermitian parity-time symmetric dielectric slabs, establishing invariant energy modes.'
      },
      {
        title: 'Chapter 4: Experimental Waveguide Validation',
        body: 'Lithographically patterned silicon-on-insulator waveguides confirm sub-picosecond stabilization across cryogenic temperatures.'
      }
    ],
    previewType: 'thesis',
    pageCount: 142,
    code: `\\documentclass[12pt,twoside,openright]{book}
\\usepackage[a4paper,inner=1.5in,outer=1in,top=1in,bottom=1in]{geometry}
\\usepackage{amsmath, amsthm, amssymb}
\\usepackage{setspace}
\\doublespacing

\\title{Non-Linear Optics in Quantum Regimes}
\\author{Julian Thorne}

\\begin{document}
\\frontmatter
\\maketitle
\\tableofcontents

\\mainmatter
\\chapter{Boundary Resolvent Operators}
We rigorously derive the second-order quantization tensor across stratified non-Hermitian interfaces...
\\end{document}`
  },
  {
    id: 'mit-doctoral-dissertation',
    title: 'MIT Style Doctoral Dissertation',
    category: 'theses',
    categoryLabel: 'THESIS',
    engine: 'xelatex',
    engineLabel: 'XeLaTeX',
    description: 'Authentic MIT archival format with formal signature endorsements, nomenclature tables, and dual-sided layout.',
    tags: ['MIT Specifications', 'Nomenclature', 'Signature Blocks'],
    author: 'Maya Lin',
    affiliation: 'Department of Electrical Engineering & CS, Massachusetts Institute of Technology',
    date: 'May 2024',
    abstractText: 'Topological protection in photonic lattices and non-Hermitian Hamiltonian eigenvalue trajectories under ambient perturbations.',
    sections: [
      {
        title: 'Signature Endorsement',
        body: 'Certified by Prof. Robert K. Lang, Thesis Supervisor. Accepted by Prof. Leslie A. Kolodziejski, Chair of Committee on Graduate Students.'
      },
      {
        title: '1. Topological Invariants',
        body: 'Chern numbers computed via Berry curvature flux integration confirm robust edge state transport impervious to structural backscattering.'
      }
    ],
    previewType: 'thesis',
    pageCount: 168,
    code: `\\documentclass[11pt,twoside]{mitthesis}
\\usepackage{lmodern}
\\usepackage{amsmath, amssymb}

\\title{Topological Protection in Photonic Lattices}
\\author{Maya Lin}
\\department{Department of Electrical Engineering and Computer Science}
\\degree{Doctor of Philosophy in Electrical Engineering}
\\degreemonth{May} \\degreeyear{2024}

\\begin{document}
\\maketitle
\\begin{abstract}
Topological protection guarantees non-dissipative unidirectional wave transport...
\\end{abstract}
\\end{document}`
  },
  {
    id: 'metropolis-beamer',
    title: 'Metropolis Clean Beamer Slides',
    category: 'presentations',
    categoryLabel: 'PRESENTATION',
    engine: 'pdflatex',
    engineLabel: 'Beamer / pdfLaTeX',
    description: 'Modern minimalist 16:9 presentation theme featuring high-contrast blocks, code listings, and progress tracks.',
    tags: ['16:9 Widescreen', 'Syntax Highlighting', 'Progress Meter'],
    author: 'Dr. Arthur Pendelton',
    affiliation: 'Scalable Variational Algorithms · HPC Summit 2024',
    date: 'Slide 14 / 28',
    abstractText: 'Accelerated tensor engines with distributed MPI backends yielding 98.4% linear scaling across 16k GPU cores.',
    sections: [
      {
        title: 'Distributed MPI Orchestration',
        body: 'All-to-all communication bottlenecks mitigated via hierarchical NVLink ring topologies with asynchronous double-buffered memory swaps.'
      }
    ],
    previewType: 'slides',
    pageCount: 28,
    code: `\\documentclass[aspectratio=169]{beamer}
\\usetheme{metropolis}
\\usepackage{appendixnumberbeamer}
\\usepackage{booktabs}

\\title{Scalable Variational Algorithms}
\\subtitle{Accelerated Tensor Engines with Distributed MPI}
\\date{\\today}
\\author{Arthur Pendelton, Ph.D.}
\\institute{High Performance Computing Laboratory}

\\begin{document}
\\maketitle

\\begin{frame}{Algorithmic Overview}
\\begin{block}{Core Objective}
Maximize compute density while saturating interconnect fabric.
\\end{block}
\\end{frame}
\\end{document}`
  },
  {
    id: 'academic-conf-presentation',
    title: 'Academic Conference Presentation',
    category: 'presentations',
    categoryLabel: 'PRESENTATION',
    engine: 'pdflatex',
    engineLabel: 'Beamer',
    description: 'Standard Beamer presentation suite featuring split headers, theorem blocks, and formal lecture styling.',
    tags: ['Theorem Blocks', 'Split Navigation', '4:3 / 16:9'],
    author: 'Prof. Kieran Zhao',
    affiliation: 'IEEE Quantum Conf 2024 · Cambridge / Madrid',
    date: 'October 2024',
    abstractText: 'Theorem 1.1: Every unitary transformation on boundary states maintains positive spectral gap under zero dissipative flux.',
    sections: [
      {
        title: 'Theorem 1.1 (Hamiltonian Resolvent)',
        body: 'Let H be a self-adjoint operator on Hilbert space H. The resolvent R(z) is uniformly bounded on all open half-planes.'
      }
    ],
    previewType: 'slides',
    pageCount: 32,
    code: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{whale}

\\title[Hamiltonian Resolvents]{Unitary Boundary States in Open Quantum Systems}
\\author{Kieran Zhao}
\\institute{IEEE Quantum Conference 2024}

\\begin{document}
\\frame{\\titlepage}

\\begin{frame}{Theorem 1.1: Hamiltonian Resolvent}
\\begin{theorem}
Every unitary transformation on boundary states maintains positive spectral gap under zero dissipative flux.
\\end{theorem}
\\end{frame}
\\end{document}`
  },
  {
    id: 'nature-article',
    title: 'Nature Dual-Column Research Article',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Standard prestigious journal formatting with compact typography, bold lead paragraph, and structured bibliography.',
    tags: ['Double-Column', 'Compact Typography', 'Nature Style'],
    author: 'Sarah Jenkins, Liam Rossi, et al.',
    affiliation: 'Biophysics Research Cluster, Cambridge University',
    date: '2024',
    abstractText: 'Cryo-EM structural resolution reveals allosteric gating mechanisms in pentameric ligand-gated ion channels at 1.8 angstroms.',
    sections: [
      {
        title: 'Main Findings',
        body: 'Cryogenic single-particle reconstructions confirm asymmetrical conformational transitions during rapid desensitization.'
      }
    ],
    previewType: 'academic',
    pageCount: 6,
    code: `\\documentclass[10pt,twocolumn]{article}
\\usepackage[margin=0.65in]{geometry}
\\usepackage{amsmath,graphicx}

\\title{\\textbf{Allosteric gating mechanisms in pentameric ion channels at 1.8 \\AA}}
\\author{Sarah Jenkins, Liam Rossi, et al.}

\\begin{document}
\\maketitle
Cryo-EM structural resolution reveals allosteric gating mechanisms...
\\end{document}`
  },
  {
    id: 'ieee-transactions',
    title: 'IEEE Transactions Manuscript',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Two-column IEEE Transactions standard layout with biography boxes, formal table designs, and IEEE reference style.',
    tags: ['IEEEtran', 'Author Biographies', 'Peer-Reviewed'],
    author: 'David Chen, Fellow, IEEE',
    affiliation: 'School of Computer Engineering, Nanyang Technological University',
    date: 'Vol. 42, No. 3',
    abstractText: 'Sub-nanosecond hardware packet scheduling for ultra-dense data centers using reconfigurable optical cross-connects.',
    sections: [
      {
        title: 'I. Introduction',
        body: 'Modern cloud fabrics demand bounded tail latencies under severe burst contention without dropping mission-critical telemetry.'
      }
    ],
    previewType: 'academic',
    pageCount: 12,
    code: `\\documentclass[journal]{IEEEtran}
\\usepackage{cite,amsmath,amssymb,graphicx}

\\title{Sub-Nanosecond Hardware Packet Scheduling for Cloud Fabrics}
\\author{David Chen, \\IEEEmembership{Fellow, IEEE}}

\\begin{document}
\\maketitle
\\begin{abstract}
Sub-nanosecond hardware packet scheduling for ultra-dense data centers...
\\end{abstract}
\\end{document}`
  },
  {
    id: 'minimalist-tech-one-pager',
    title: 'Minimalist Engineering Brief',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'lualatex',
    engineLabel: 'LuaLaTeX',
    description: 'High-density one-page technical memo with key metrics callouts, architecture diagram placeholders, and executive summary.',
    tags: ['One-Pager', 'Executive Memo', 'Clean Grid'],
    author: 'Platform Architecture Team',
    affiliation: 'Global Infrastructure Engineering',
    date: 'Q4 2024',
    abstractText: 'Migrating storage engine clusters to NVMe-oF reduced tail latency p99.9 from 42ms to 1.8ms at scale.',
    sections: [
      {
        title: 'Key Milestones',
        body: 'Cluster cutover executed with zero downtime. CPU utilization dropped by 34% across storage nodes.'
      }
    ],
    previewType: 'academic',
    pageCount: 1,
    code: `\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{tcolorbox}

\\title{\\textbf{Infrastructure Architecture Brief: NVMe-oF Migration}}
\\date{\\today}

\\begin{document}
\\maketitle
\\begin{tcolorbox}[colback=slate-100,colframe=slate-800]
\\textbf{Outcome Summary:} 95% latency reduction achieved across primary data tiers.
\\end{tcolorbox}
\\end{document}`
  },
  {
    id: 'ams-math-monograph',
    title: 'AMS Mathematical Pure Monograph',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Strict American Mathematical Society formatting with amsthm environments, commutative diagrams, and lemma matrices.',
    tags: ['AMS-LaTeX', 'Theorems & Proofs', 'Pure Math'],
    author: 'Prof. Grigori Belov',
    affiliation: 'Department of Pure Mathematics, Steklov Institute',
    date: '2024',
    abstractText: 'Homological invariants of derived categories on singular Calabi-Yau threefolds under birational transformations.',
    sections: [
      {
        title: 'Lemma 2.4 (Spectral Degeneration)',
        body: 'The Hodge-de Rham spectral sequence degenerates at the first page for smooth projective varieties over fields of characteristic zero.'
      }
    ],
    previewType: 'academic',
    pageCount: 22,
    code: `\\documentclass{amsart}
\\usepackage{amsmath,amssymb,amsthm}

\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{lemma}[theorem]{Lemma}

\\title{Homological Invariants on Derived Categories}
\\author{Grigori Belov}

\\begin{document}
\\maketitle
\\begin{theorem}
The Hodge-de Rham spectral sequence degenerates at the first page...
\\end{theorem}
\\end{document}`
  },
  {
    id: 'physics-lab-notebook',
    title: 'High-Energy Physics Lab Notebook',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Tabular lab reporting with experimental run dates, detector calibration telemetry, and error quantification margins.',
    tags: ['Lab Report', 'Data Tables', 'SI Units'],
    author: 'Dr. Clara Oswald',
    affiliation: 'Cryogenic Detector Group, CERN',
    date: 'Run 42A - October 2024',
    abstractText: 'Superconducting nanowire single-photon detector (SNSPD) efficiency calibrated at 0.85 K under 1550 nm illumination.',
    sections: [
      {
        title: 'Detector Calibration',
        body: 'Dark count rate measured at 0.12 Hz with system detection efficiency of 98.2 ± 0.4% at critical bias current.'
      }
    ],
    previewType: 'academic',
    pageCount: 8,
    code: `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{siunitx,booktabs}

\\title{Cryogenic Detector Telemetry Log - Run 42A}
\\author{Clara Oswald}

\\begin{document}
\\maketitle
Detection efficiency: \\SI{98.2 \\pm 0.4}{\\percent} at \\SI{0.85}{\\kelvin}.
\\end{document}`
  },
  {
    id: 'modern-book-architecture',
    title: 'Modern Technical Monograph / Book',
    category: 'theses',
    categoryLabel: 'THESIS',
    engine: 'lualatex',
    engineLabel: 'LuaLaTeX',
    description: 'Professional publisher-ready book template with dedicated parts, chapters, epigraphs, and custom margin notes.',
    tags: ['Book Publishing', 'Custom Headers', 'Margin Notes'],
    author: 'Marcus Vance & Cynthia Stone',
    affiliation: 'Advanced Computing Series, Cambridge Press',
    date: 'First Edition 2024',
    abstractText: 'Comprehensive foundations of distributed consensus, Byzantine fault tolerance, and verifiable state machines.',
    sections: [
      {
        title: 'Part I: Foundations of Consensus',
        body: 'Distributed consensus guarantees state equivalence across asynchronous partitions subject to FLP impossibility bounds.'
      }
    ],
    previewType: 'thesis',
    pageCount: 380,
    code: `\\documentclass[11pt,twoside]{book}
\\usepackage{geometry,microtype,fancyhdr}

\\title{Foundations of Distributed Consensus}
\\author{Marcus Vance \\and Cynthia Stone}

\\begin{document}
\\frontmatter
\\maketitle
\\mainmatter
\\part{Foundations of Consensus}
\\chapter{State Equivalence and Partitions}
\\end{document}`
  },
  {
    id: 'grant-proposal-summary',
    title: 'NSF/ERC Grant Proposal Summary',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Strict compliance grant application with broader impacts section, milestone timeline gantt chart, and budget tables.',
    tags: ['Grant Proposal', 'Budget Tables', 'Timeline Matrix'],
    author: 'Principal Investigator: Dr. Evelyn Reed',
    affiliation: 'Center for Quantum Computing & Quantum Materials',
    date: 'Fiscal Year 2025',
    abstractText: 'Project QuantumEdge: Scalable Fault-Tolerant Surface Codes with Silicon Spin Qubits. Requested: $2,450,000.',
    sections: [
      {
        title: 'Intellectual Merit',
        body: 'Demonstrating two-qubit exchange gates above 99.9% fidelity in isotopically purified 28Si substrate.'
      }
    ],
    previewType: 'academic',
    pageCount: 15,
    code: `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{tabularx,booktabs}

\\title{\\textbf{NSF Proposal: Scalable Fault-Tolerant Surface Codes}}
\\author{Dr. Evelyn Reed (PI)}

\\begin{document}
\\maketitle
\\section{Project Summary}
\\subsection{Intellectual Merit}
Demonstrating two-qubit exchange gates above 99.9\\% fidelity...
\\end{document}`
  },
  {
    id: 'technical-whitepaper',
    title: 'Cryptographic Protocol Whitepaper',
    category: 'papers',
    categoryLabel: 'ACADEMIC PAPERS',
    engine: 'xelatex',
    engineLabel: 'XeLaTeX',
    description: 'Modern cryptographic whitepaper style with security parameter tables, formal definitions, and protocol diagrams.',
    tags: ['Zero-Knowledge', 'Formal Proofs', 'Whitepaper'],
    author: 'Veritas Zero Knowledge Group',
    affiliation: 'Protocol Engineering Laboratory, Zug',
    date: 'Version 2.1 - 2024',
    abstractText: 'Succinct non-interactive zero-knowledge arguments of knowledge (zk-SNARKs) with sub-second proof generation.',
    sections: [
      {
        title: 'Security Definitions',
        body: 'We define computational soundness against polynomial-time adversaries with non-negligible advantage under the discrete log assumption.'
      }
    ],
    previewType: 'academic',
    pageCount: 18,
    code: `\\documentclass[10pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb,amsthm}

\\title{\\textbf{Veritas: Sub-Second zk-SNARK Protocol Architecture}}
\\author{Veritas Protocol Team}

\\begin{document}
\\maketitle
\\begin{abstract}
Succinct non-interactive zero-knowledge arguments of knowledge...
\\end{abstract}
\\end{document}`
  },
  {
    id: 'formal-cover-letter',
    title: 'Executive & Academic Cover Letter',
    category: 'resumes',
    categoryLabel: 'CV / RESUME',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Polished formal letterhead with recipient address block, signature placeholder, and balanced single-page layout.',
    tags: ['Single-Page', 'Letterhead', 'Formal Serif'],
    author: 'Dr. Harrison Wells',
    affiliation: 'Institute for Applied Mathematics, Princeton, NJ',
    date: 'November 12, 2024',
    abstractText: 'Application for Tenured Associate Professor of Mathematics, Search Committee Chair.',
    sections: [
      {
        title: 'Letter Body',
        body: 'Dear Members of the Search Committee: I write to enthusiastically submit my application for the position of Associate Professor of Mathematics at your institution...'
      }
    ],
    previewType: 'resume',
    pageCount: 1,
    code: `\\documentclass[11pt]{letter}
\\usepackage[margin=1in]{geometry}
\\usepackage{charter}

\\address{Dr. Harrison Wells \\\\ Princeton, NJ 08544}
\\signature{Harrison Wells, Ph.D.}

\\begin{document}
\\begin{letter}{Faculty Search Committee \\\\ Department of Mathematics}
\\opening{Dear Members of the Committee,}
I write to enthusiastically submit my application...
\\closing{Sincerely,}
\\end{letter}
\\end{document}`
  },
  {
    id: 'algorithmic-lecture-slides',
    title: 'Algorithmic Complexity Lecture Deck',
    category: 'presentations',
    categoryLabel: 'PRESENTATION',
    engine: 'pdflatex',
    engineLabel: 'Beamer',
    description: 'High-contrast Beamer slides designed for computer science instruction with clean algorithm boxes and complexity charts.',
    tags: ['Computer Science', 'Pseudocode', 'Algorithms'],
    author: 'Prof. Donald Knuth Tribute Deck',
    affiliation: 'CS 261: Advanced Data Structures & Algorithms',
    date: 'Lecture 8: Fibonacci Heaps',
    abstractText: 'Amortized time analysis: insert O(1), decrease-key O(1), delete-min O(log n). Potential function method.',
    sections: [
      {
        title: 'Amortized Complexity',
        body: 'Using the potential function Phi = trees + 2 * marked nodes, every decrease-key operation discharges constant amortized cost.'
      }
    ],
    previewType: 'slides',
    pageCount: 36,
    code: `\\documentclass[aspectratio=169]{beamer}
\\usetheme{Boadilla}

\\title{Lecture 8: Fibonacci Heaps}
\\subtitle{Amortized Efficiency via Potential Functions}
\\author{CS 261 Teaching Staff}

\\begin{document}
\\frame{\\titlepage}
\\begin{frame}{Amortized Bounds}
Insert: $O(1)$ \\\\
Decrease-Key: $O(1)$ amortized \\\\
Delete-Min: $O(\\log n)$
\\end{frame}
\\end{document}`
  },
  {
    id: 'conference-poster-a0',
    title: 'Scientific Conference Poster (A0/A1)',
    category: 'presentations',
    categoryLabel: 'PRESENTATION',
    engine: 'pdflatex',
    engineLabel: 'pdfLaTeX',
    description: 'Large-format conference poster layout with 3 balanced content columns, hero headline banner, and sponsor emblems.',
    tags: ['A0 Large Format', 'Poster Grid', 'High-Res Data'],
    author: 'Elena Rostova, et al.',
    affiliation: 'European Synchrotron Radiation Facility (ESRF)',
    date: 'ICX Conference 2024',
    abstractText: 'Coherent X-ray ptychography at 5 nanometer 3D spatial resolution for integrated circuit fault diagnostics.',
    sections: [
      {
        title: '1. Methodology',
        body: 'Ptychographic phase retrieval achieved with iterative Douglas-Rachford solvers running across GPU clusters.'
      }
    ],
    previewType: 'poster',
    pageCount: 1,
    code: `\\documentclass[final]{beamer}
\\usepackage[scale=1.24]{beamerposter}
\\usepackage{multicol}

\\title{Coherent X-Ray Ptychography at 5 nm Resolution}
\\author{Elena Rostova, et al.}

\\begin{document}
\\begin{frame}
\\begin{multicols}{3}
\\section{Methodology}
Ptychographic phase retrieval...
\\end{multicols}
\\end{frame}
\\end{document}`
  }
];
