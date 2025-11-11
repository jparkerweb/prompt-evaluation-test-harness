import express from 'express';
import multer from 'multer';
import datasetsController from './datasets.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 // Convert MB to bytes
  },
  fileFilter: (req, file, cb) => {
    // Allow JSONL and JSON files
    const allowedTypes = [
      'application/json',
      'application/jsonl', 
      'text/plain',
      'application/octet-stream'
    ];
    
    const isValidExtension = file.originalname.toLowerCase().endsWith('.jsonl') || 
                           file.originalname.toLowerCase().endsWith('.json');
    
    if (allowedTypes.includes(file.mimetype) || isValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only JSONL and JSON files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(authMiddleware);

// Dataset routes
router.get('/stats', datasetsController.getStats);
router.get('/', datasetsController.getDatasets);
router.post('/', upload.single('file'), datasetsController.createDataset);
router.post('/blank', datasetsController.createBlankDataset);
router.get('/:id', datasetsController.getDatasetById);
router.patch('/:id/name', datasetsController.updateDatasetName);
router.delete('/:id', datasetsController.deleteDataset);
router.post('/:id/upload', upload.single('file'), datasetsController.addMessagesToDataset);
router.get('/:id/messages', datasetsController.getDatasetMessages);
router.post('/:id/messages', datasetsController.createDatasetMessage);
router.patch('/:datasetId/messages/:messageId', datasetsController.updateDatasetMessage);
router.delete('/:datasetId/messages/:messageId', datasetsController.deleteDatasetMessage);

export default router;