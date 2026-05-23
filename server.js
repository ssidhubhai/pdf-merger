// server.js

const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors'); // Included but typically not needed for same-origin localhost development

const app = express();
const PORT = 3000;

// Define the uploads directory path
const uploadsDir = path.join(__dirname, 'uploads');

// --- Middlewares ---
app.use(express.json());

// 1. Serve frontend files (index.html, script.js, style.css)
app.use(express.static('public')); 

// 2. 🌟 CRITICAL FIX: Serve uploaded PDF files 🌟
// This maps the URL path '/uploads' to the physical 'uploadsDir'
app.use('/uploads', express.static(uploadsDir)); 


// --- File Storage Configuration (Multer) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the uploads directory exists before saving
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create a unique filename to avoid conflicts
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed!'), false);
        }
        cb(null, true);
    }
});


// --- API Endpoints ---

// Endpoint to handle file uploads and get page count
app.post('/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    try {
        const pdfBytes = await fs.readFile(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        res.json({
            filename: req.file.filename,
            pageCount: pdfDoc.getPageCount()
        });
    } catch (error) {
        console.error('Error processing PDF:', error);
        // Clean up the partially uploaded file if processing fails
        await fs.unlink(req.file.path).catch(console.error); 
        res.status(500).send('Error processing PDF file.');
    }
});

// Endpoint to merge the PDFs
app.post('/merge', async (req, res) => {
    const { files } = req.body; // Expects an array of {filename, from, to}

    if (!files || files.length === 0) {
        return res.status(400).send('No files to merge.');
    }

    // Keep track of files used in the merge to potentially clean them up later
    const filesToClean = files.map(f => path.join(uploadsDir, f.filename));

    try {
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const filePath = path.join(uploadsDir, file.filename);
            
            // Check if file exists before trying to read
            try {
                await fs.access(filePath);
            } catch (e) {
                console.warn(`File not found: ${file.filename}. It might have been cleaned up or failed upload.`);
                continue; 
            }
            
            const pdfBytes = await fs.readFile(filePath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            
            // Validate page ranges
            const fromPage = parseInt(file.from, 10);
            const toPage = parseInt(file.to, 10);
            const totalPages = pdfDoc.getPageCount();

            if (isNaN(fromPage) || isNaN(toPage) || fromPage < 1 || toPage > totalPages || fromPage > toPage) {
                console.warn(`Invalid page range for ${file.filename}: ${fromPage}-${toPage}. Skipping.`);
                continue; 
            }

            // Get the desired pages (0-indexed)
            const pagesToCopy = Array.from({ length: toPage - fromPage + 1 }, (_, i) => fromPage - 1 + i);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pagesToCopy);
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        if (mergedPdf.getPageCount() === 0) {
             return res.status(400).send('No valid pages were merged. Check file availability and page ranges.');
        }

        const mergedPdfBytes = await mergedPdf.save();
        const mergedFilename = `merged-${Date.now()}.pdf`;
        const mergedFilePath = path.join(uploadsDir, mergedFilename);
        
        await fs.writeFile(mergedFilePath, mergedPdfBytes);

        res.download(mergedFilePath, 'merged-document.pdf', async (err) => {
            if (err) {
                console.error("Error sending file:", err);
            }
            // Clean up the merged file after download is initiated
            await fs.unlink(mergedFilePath).catch(console.error);
            
            // Optional: Clean up the source files immediately after a successful merge
            // for (const filePath of filesToClean) {
            //     await fs.unlink(filePath).catch(err => console.error(`Failed to cleanup source file ${filePath}:`, err));
            // }
        });

    } catch (error) {
        console.error('Error merging PDFs:', error);
        res.status(500).send('Error merging PDFs.');
    }
});


// --- Security & Privacy: File Cleanup ---
const sixtyMinutes = 60 * 60 * 1000;
const cleanupInterval = 10 * 60 * 1000; // Run every 10 minutes

const cleanupOldFiles = async () => {
    console.log("Running cleanup task for old files...");
    try {
        const files = await fs.readdir(uploadsDir);
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.stat(filePath);
            if (Date.now() - stats.mtime.getTime() > sixtyMinutes) {
                await fs.unlink(filePath);
                console.log(`Deleted old file: ${file}`);
            }
        }
    } catch (error) {
        // Only log error if directory read/access failed, not for individual file errors
        if (error.code !== 'ENOENT') { 
            console.error("Error during file cleanup:", error);
        }
    }
};

setInterval(cleanupOldFiles, cleanupInterval);


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`✅ PDF Merger server running on http://localhost:${PORT}`);
    // Create uploads directory if it doesn't exist
    fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);
});