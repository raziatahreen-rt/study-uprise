// backend/config/multerConfig.js
const multer = require('multer');

// Configure Multer to store the file in memory
// This is efficient for small files that we just want to process and not save.
const storage = multer.memoryStorage();

// Set up the Multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    },
    fileFilter: (req, file, cb) => {
        // Only accept PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('File type not supported. Only PDF is allowed.'), false);
        }
    }
});

module.exports = upload;