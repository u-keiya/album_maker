import express, { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import AppDataSource from '../../data-source';
import { Photo } from '../entities/Photo';
import { User } from '../entities/User'; // Assuming User entity is needed for user_id
import { authenticateToken } from '../middleware/authMiddleware'; // Assuming auth middleware exists
import { getBlobUrlWithSas } from '../utils/azureStorage'; // Import the SAS helper

const router: Router = express.Router();

// --- Azure Blob Storage Configuration ---
// Consider moving these to environment variables or a config file
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'photos';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.warn('AZURE_STORAGE_CONNECTION_STRING is not set. File uploads to Azure Blob Storage will fail.');
}

let containerClient: ContainerClient | null = null;
if (AZURE_STORAGE_CONNECTION_STRING) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
}

// --- Multer Configuration for file upload ---
// Configure multer for memory storage, as we'll stream to Azure
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit (adjust as needed)
  fileFilter: (req, file, cb) => {
    // Basic file type validation (extend as needed)
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// --- API Endpoints ---

/**
 * @route   POST /photos
 * @desc    Upload a new photo
 * @access  Private (Requires JWT authentication)
 */
router.post('/', authenticateToken, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'NoFileUploaded', message: 'No file was uploaded.' });
      return;
    }
    if (!containerClient) {
      console.error('Azure Blob Storage container client is not initialized. Check connection string.');
      res.status(500).json({ error: 'StorageError', message: 'Could not connect to file storage.' });
      return;
    }

    const photoRepository = AppDataSource.getRepository(Photo);
    const userRepository = AppDataSource.getRepository(User);

    // Get userId from authenticated user
    const userFromToken = req.user as { userId: string; username: string } | undefined;
    if (!userFromToken || !userFromToken.userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated or user ID missing.' });
      return;
    }
    const userId = userFromToken.userId;

    // Verify user exists
    const user = await userRepository.findOneBy({ user_id: userId });
    if (!user) {
      res.status(404).json({ error: 'UserNotFound', message: 'Authenticated user not found.' });
      return;
    }

    const originalFilename = req.file.originalname;
    const fileExtension = originalFilename.substring(originalFilename.lastIndexOf('.'));
    const blobName = `${uuidv4()}${fileExtension}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    const newPhoto = new Photo();
    newPhoto.user_id = userId;
    // newPhoto.file_path = blockBlobClient.url; // Original direct URL
    const blobUrlWithSas = containerClient ? getBlobUrlWithSas(containerClient, blobName) : blockBlobClient.url;

    const hasSasToken = blobUrlWithSas ? blobUrlWithSas.includes('sig=') : false; // 'sig=' が含まれているか確認

    if (!blobUrlWithSas || !hasSasToken) { // Check if SAS token is likely present
        console.warn(`Failed to generate SAS token for blob: ${blobName} or SAS token is missing (sig= not found). Falling back to direct URL.`);
        newPhoto.file_path = blockBlobClient.url; // Fallback
    } else {
        newPhoto.file_path = blobUrlWithSas;
    }
    newPhoto.original_filename = originalFilename;
    newPhoto.file_size = req.file.size;
    newPhoto.mime_type = req.file.mimetype;

    const savedPhoto = await photoRepository.save(newPhoto);

    res.status(201).json({
      photoId: savedPhoto.photo_id,
      filePath: savedPhoto.file_path,
      originalFilename: savedPhoto.original_filename,
      uploadedAt: savedPhoto.uploaded_at,
      fileSize: savedPhoto.file_size,
      mimeType: savedPhoto.mime_type,
    });
    return;
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    // Pass error to the error handling middleware
    next(error); // This will be caught by the main app's error handler
  }
});

/**
 * @route   DELETE /photos/:photoId
 * @desc    Delete a photo
 * @access  Private (Requires JWT authentication)
 */
router.delete('/:photoId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const photoId = req.params.photoId;
    if (!photoId) {
      res.status(400).json({ error: 'MissingParameter', message: 'Photo ID is required.' });
      return;
    }

    if (!containerClient) {
      console.error('Azure Blob Storage container client is not initialized.');
      res.status(500).json({ error: 'StorageError', message: 'Could not connect to file storage.' });
      return;
    }

    const photoRepository = AppDataSource.getRepository(Photo);

    const userFromToken = req.user as { userId: string; username: string } | undefined;
    if (!userFromToken || !userFromToken.userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated or user ID missing.' });
      return;
    }
    const userId = userFromToken.userId;

    const photo = await photoRepository.findOneBy({ photo_id: photoId, user_id: userId });

    if (!photo) {
      res.status(404).json({ error: 'NotFound', message: 'Photo not found or user does not have permission to delete it.' });
      return;
    }

    // Delete from Azure Blob Storage
    // Extract blob name from file_path (URL)
    const blobName = photo.file_path.substring(photo.file_path.lastIndexOf('/') + 1);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    try {
      await blockBlobClient.delete();
    } catch (storageError: any) {
      // Log storage error but proceed to delete DB record if storage blob was already deleted or not found
      console.warn(`Failed to delete blob ${blobName} from Azure Storage. It might have been already deleted. Error: ${storageError.message}`);
      // You might want to check for specific error codes from Azure to decide if to proceed
      // For example, if error is 'BlobNotFound', it's safe to proceed.
      if (storageError.statusCode !== 404) { // Example: re-throw if not a 'BlobNotFound' error
          throw storageError; // Or handle more gracefully
      }
    }

    // Delete from database
    await photoRepository.remove(photo);

    res.status(204).send(); // No content on successful deletion
    return;

  } catch (error: any) {
    console.error('Error deleting photo:', error);
    next(error);
  }
});

export default router;