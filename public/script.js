// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const selectFilesBtn = document.getElementById('select-files-btn');
    const stagingArea = document.getElementById('staging-area');
    const pdfList = document.getElementById('pdf-list');
    const pageRangeControls = document.getElementById('page-range-controls');
    const mergeBtn = document.getElementById('merge-btn');
    const addMoreFilesBtn = document.getElementById('add-more-files-btn');
    const progressIndicator = document.getElementById('progress-indicator');
    // 🌟 NEW: Download Button Reference 🌟
    const downloadBtn = document.getElementById('download-btn');
    
    // Preview Panel Elements
    const previewPanel = document.getElementById('preview-panel');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const previewFilename = document.getElementById('preview-filename');
    const previewContent = document.getElementById('preview-content');
    const pageIndicator = document.getElementById('page-indicator');

    // --- State Management ---
    let filesState = []; // The single source of truth for our files
    let selectedFileId = null;
    let sortableInstance = null;

    // --- PDF.js Worker ---
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js`;


    // --- Core Functions ---

    /**
     * Handles new files from both drag-drop and file input.
     * @param {FileList} files - The files to process.
     */
    const handleFiles = (files) => {
        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        if (pdfFiles.length === 0) {
            alert('Please select valid PDF files.');
            return;
        }

        uploadZone.classList.add('hidden');
        stagingArea.classList.remove('hidden');
        downloadBtn.classList.add('hidden'); // 🌟 Hide Download button when new files are added 🌟

        pdfFiles.forEach(uploadFile);
    };

    /**
     * Uploads a single file to the server to get its metadata.
     * @param {File} file - The PDF file to upload.
     */
    const uploadFile = (file) => {
        const formData = new FormData();
        formData.append('pdf', file);

        // Create a temporary ID for tracking
        const tempId = `file-${Date.now()}-${Math.random()}`;
        const fileObject = {
            id: tempId,
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            fromPage: 1,
            toPage: null, // Will be set after upload
            totalPages: null,
            serverFilename: null,
            isUploading: true,
        };
        filesState.push(fileObject);
        renderUI();

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            const uploadedFile = filesState.find(f => f.id === tempId);
            if (uploadedFile) {
                uploadedFile.totalPages = data.pageCount;
                uploadedFile.toPage = data.pageCount;
                uploadedFile.serverFilename = data.filename;
                uploadedFile.isUploading = false;
            }
            renderUI();
        })
        .catch(error => {
            console.error('Upload Error:', error);
            alert(`Failed to upload ${file.name}. Please try again.`);
            // Remove the failed file from state
            filesState = filesState.filter(f => f.id !== tempId);
            renderUI();
        });
    };
    
    /**
     * Renders the entire UI based on the current filesState.
     */
    const renderUI = () => {
        pdfList.innerHTML = '';
        if (filesState.length === 0) {
            uploadZone.classList.remove('hidden');
            stagingArea.classList.add('hidden');
            selectedFileId = null;
            downloadBtn.classList.add('hidden'); // 🌟 Ensure Download button is hidden on full UI reset 🌟
        }

        filesState.forEach(file => {
            const card = document.createElement('div');
            card.className = 'pdf-card';
            card.dataset.id = file.id;
            if (file.id === selectedFileId) {
                card.classList.add('selected');
            }
            
            card.innerHTML = `
                <div class="thumbnail" data-id="${file.id}">
                    ${file.isUploading ? '<span>Uploading...</span>' : '<canvas></canvas>'}
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">${file.totalPages ? `${file.totalPages} pages` : ''} &bull; ${file.size}</div>
                </div>
                <button class="delete-btn" data-id="${file.id}">×</button>
            `;
            pdfList.appendChild(card);
            
            if (!file.isUploading && file.serverFilename) {
                 renderThumbnail(file, card.querySelector('canvas'));
            }
        });

        if (selectedFileId) {
            renderPageRangeControls();
        } else {
            pageRangeControls.classList.add('hidden');
        }

        initializeSortable();
    };

    /**
     * Renders a single PDF page thumbnail on a canvas.
     * @param {object} file - The file object from state.
     * @param {HTMLCanvasElement} canvas - The canvas to render on.
     */
    const renderThumbnail = async (file, canvas) => {
        try {
            const pdf = await pdfjsLib.getDocument(`/uploads/${file.serverFilename}`).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const context = canvas.getContext('2d');
            page.render({ canvasContext: context, viewport: viewport });
        } catch (error) {
            console.error(`Error rendering thumbnail for ${file.name}:`, error);
            canvas.parentElement.innerHTML = '<span>Preview<br>Error</span>';
        }
    };
    
    /**
     * Renders the page range input controls for the selected file.
     */
    const renderPageRangeControls = () => {
        const file = filesState.find(f => f.id === selectedFileId);
        if (!file || file.isUploading) {
            pageRangeControls.classList.add('hidden');
            return;
        }

        pageRangeControls.innerHTML = `
            <h4>Page Range for: <strong>${file.name}</strong></h4>
            <div class="page-range-inputs">
                <label for="from-page">From:</label>
                <input type="number" id="from-page" min="1" max="${file.totalPages}" value="${file.fromPage}">
                <label for="to-page">To:</label>
                <input type="number" id="to-page" min="1" max="${file.totalPages}" value="${file.toPage}">
                <span>(Total: ${file.totalPages} pages)</span>
            </div>
        `;
        pageRangeControls.classList.remove('hidden');
        
        // Add event listeners for the new inputs
        document.getElementById('from-page').addEventListener('change', handleRangeChange);
        document.getElementById('to-page').addEventListener('change', handleRangeChange);
    };

    /**
     * Initializes or updates the SortableJS instance for drag-and-drop reordering.
     */
    const initializeSortable = () => {
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        sortableInstance = new Sortable(pdfList, {
            animation: 150,
            onEnd: (evt) => {
                const element = filesState.splice(evt.oldIndex, 1)[0];
                filesState.splice(evt.newIndex, 0, element);
            }
        });
    };
    
    /**
     * Renders the full preview of a selected PDF in the side panel.
     * @param {string} fileId - The ID of the file to preview.
     */
    const showPreviewPanel = async (fileId) => {
        const file = filesState.find(f => f.id === fileId);
        if (!file || !file.serverFilename) return;

        previewFilename.textContent = file.name;
        previewContent.innerHTML = '<h4>Loading preview...</h4>';
        previewPanel.classList.add('visible');
        
        try {
            const pdf = await pdfjsLib.getDocument(`/uploads/${file.serverFilename}`).promise;
            previewContent.innerHTML = ''; // Clear loading message
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const canvas = document.createElement('canvas');
                previewContent.appendChild(canvas);
                
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport });
            }
        } catch (error) {
            console.error("Error showing preview:", error);
            previewContent.innerHTML = '<h4>Could not load preview.</h4>';
        }
    };
    
    const updatePageIndicator = () => {
        const { scrollTop, scrollHeight, clientHeight } = previewContent;
        const canvases = previewContent.querySelectorAll('canvas');
        if (canvases.length === 0) return;

        let currentPage = 1;
        let cumulativeHeight = 0;
        for (let i = 0; i < canvases.length; i++) {
            cumulativeHeight += canvases[i].offsetHeight + 16; // 1rem margin-bottom
            if (scrollTop + (clientHeight / 2) < cumulativeHeight) {
                currentPage = i + 1;
                break;
            }
        }
        pageIndicator.textContent = `Page ${currentPage} of ${canvases.length}`;
    };


    // --- Event Handlers ---
    const handleRangeChange = (e) => {
        const file = filesState.find(f => f.id === selectedFileId);
        if (!file) return;

        const fromInput = document.getElementById('from-page');
        const toInput = document.getElementById('to-page');
        let fromVal = parseInt(fromInput.value, 10);
        let toVal = parseInt(toInput.value, 10);

        // Basic validation
        if (fromVal < 1) fromVal = 1;
        if (toVal > file.totalPages) toVal = file.totalPages;
        if (fromVal > toVal) fromVal = toVal;
        
        fromInput.value = fromVal;
        toInput.value = toVal;

        file.fromPage = fromVal;
        file.toPage = toVal;
    };
    
    const handleMergeClick = () => {
        if (filesState.some(f => f.isUploading)) {
            alert('Please wait for all files to finish uploading.');
            return;
        }
        if (filesState.length < 1) {
            alert('Please add at least one PDF file.');
            return;
        }

        mergeBtn.disabled = true;
        downloadBtn.classList.add('hidden'); // 🌟 Hide Download button on new merge 🌟
        progressIndicator.classList.remove('hidden');

        const filesToMerge = filesState.map(f => ({
            filename: f.serverFilename,
            from: f.fromPage,
            to: f.toPage
        }));

        fetch('/merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ files: filesToMerge })
        })
        .then(response => {
            if (!response.ok) throw new Error('Merge failed on the server.');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            
            // 🌟 Set URL and show the permanent download button 🌟
            downloadBtn.href = url;
            downloadBtn.classList.remove('hidden');
            
            alert('PDFs successfully merged! Click "Download PDF" to save.'); 
        })
        .catch(error => {
            console.error('Merge Error:', error);
            alert('An error occurred during merging. Please check the console and try again.');
        })
        .finally(() => {
            mergeBtn.disabled = false;
            progressIndicator.classList.add('hidden');
        });
    };

    // --- Event Listeners Setup ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'));
    });
    
    uploadZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    addMoreFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    mergeBtn.addEventListener('click', handleMergeClick);
    
    // Event delegation for dynamically created elements
    stagingArea.addEventListener('click', (e) => {
        const card = e.target.closest('.pdf-card');
        if (!card) return;

        const fileId = card.dataset.id;
        
        // Handle delete button click
        if (e.target.classList.contains('delete-btn')) {
            filesState = filesState.filter(f => f.id !== fileId);
            if (selectedFileId === fileId) {
                selectedFileId = null;
            }
            renderUI();
            return;
        }
        
        // Handle card selection
        selectedFileId = fileId;
        renderUI();

        // Handle thumbnail click for preview
        if (e.target.closest('.thumbnail')) {
            showPreviewPanel(fileId);
        }
    });
    
    // Preview Panel Listeners
    closePreviewBtn.addEventListener('click', () => previewPanel.classList.remove('visible'));
    previewContent.addEventListener('scroll', updatePageIndicator);
});