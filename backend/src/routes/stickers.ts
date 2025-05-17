import express, { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } // Assuming you have this middleware
from '../middleware/authMiddleware';
import dataSource from '../../data-source'; // Corrected import
import { Sticker } from '../entities/Sticker';
import { User } from '../entities/User'; // Assuming User entity for admin check
import { getBlobUrlWithSas } from '../utils/azureStorage'; // Import the SAS helper
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // For ContainerClient

const router = express.Router();

// --- Azure Blob Storage Configuration (similar to photos.ts and albums.ts) ---
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
// Assuming stickers are in a different container, or adjust if they are in the same 'photos' container
const AZURE_STICKER_CONTAINER_NAME = process.env.AZURE_STICKER_CONTAINER_NAME || 'stickers';

let stickerContainerClient: ContainerClient | null = null;
if (AZURE_STORAGE_CONNECTION_STRING) {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    stickerContainerClient = blobServiceClient.getContainerClient(AZURE_STICKER_CONTAINER_NAME);
    console.log(`stickers.ts: Successfully connected to Azure Blob Storage container: ${AZURE_STICKER_CONTAINER_NAME}`);
  } catch (error) {
    console.error(`stickers.ts: Failed to connect to Azure Blob Storage for stickers: ${error}`);
  }
} else {
  console.warn('stickers.ts: AZURE_STORAGE_CONNECTION_STRING is not set. SAS token generation for sticker image URLs will fallback or fail.');
}

// Middleware to check for admin privileges (placeholder)
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // In a real application, you would check the user's role from req.user
  // For now, let's assume a simple check or a specific admin user ID
  // const user = await dataSource.getRepository(User).findOneBy({ user_id: (req as any).user.userId });
  // if (user && user.isAdmin) { // Assuming an isAdmin property on User entity
  //   next();
  // } else {
  //   res.status(403).json({ error: 'Forbidden', message: 'Administrator access required.' });
  // }
  // For now, allow all authenticated users for POST/PUT/DELETE for easier testing.
  // Implement proper admin check later.
  next();
};

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /stickers - Get all stickers
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const stickerRepository = dataSource.getRepository(Sticker);
    const stickersFromDb = await stickerRepository.find();

    const stickersWithSas = stickersFromDb.map(sticker => {
      let imageUrlWithSas = sticker.file_path; // Default to original path
      if (stickerContainerClient && sticker.file_path) {
        try {
          // Extract blob name from the file_path URL
          const urlParts = new URL(sticker.file_path);
          const pathParts = urlParts.pathname.split('/');
          const blobName = pathParts.pop(); // Get last part of path (blob name)
          const containerNameFromUrl = pathParts.pop(); // Get container name from URL

          if (blobName && containerNameFromUrl === stickerContainerClient.containerName) {
            const sasUrl = getBlobUrlWithSas(stickerContainerClient, blobName);
            if (sasUrl) {
              imageUrlWithSas = sasUrl;
            } else {
              console.warn(`Failed to generate SAS URL for sticker ${sticker.sticker_id}, blob ${blobName}`);
            }
          } else if (blobName) {
            console.warn(`Sticker ${sticker.sticker_id} blob ${blobName} is in container ${containerNameFromUrl}, but expected ${stickerContainerClient.containerName}. SAS not applied or applied to wrong container client.`);
            // If stickers can be in different containers and you have multiple clients, you'd need more logic here.
            // For now, we assume one sticker container.
          }
        } catch (e) {
          console.warn(`Could not parse sticker file_path or generate SAS for sticker ${sticker.sticker_id}: ${sticker.file_path}`, e);
          // imageUrlWithSas remains the original sticker.file_path
        }
      }
      return {
        ...sticker,
        // Ensure the property name matches what the frontend expects (e.g., imageUrl or file_path)
        // Frontend's Sticker interface uses 'id' and 'imageUrl'.
        // Backend's Sticker entity uses 'sticker_id' and 'file_path'.
        // The frontend mapping `sticker.file_path || sticker.imageUrl` handles this.
        // So, we update file_path here, and frontend mapping will pick it up.
        file_path: imageUrlWithSas, // This will be mapped to imageUrl by frontend
      };
    });

    res.status(200).json(stickersWithSas);
  } catch (error) {
    console.error('Error fetching stickers:', error);
    res.status(500).json({ error: 'ServerError', message: 'Failed to fetch stickers.' });
  }
});

// GET /stickers/:stickerId - Get a specific sticker
router.get(
  '/:stickerId',
  authenticateToken,
  [param('stickerId').isUUID().withMessage('Invalid sticker ID format.')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const stickerRepository = dataSource.getRepository(Sticker);
      const stickerFromDb = await stickerRepository.findOneBy({ sticker_id: req.params.stickerId });
      if (!stickerFromDb) {
        return res.status(404).json({ error: 'NotFound', message: 'Sticker not found.' });
      }

      let imageUrlWithSas = stickerFromDb.file_path;
      if (stickerContainerClient && stickerFromDb.file_path) {
        try {
          const urlParts = new URL(stickerFromDb.file_path);
          const pathParts = urlParts.pathname.split('/');
          const blobName = pathParts.pop();
          const containerNameFromUrl = pathParts.pop();

          if (blobName && containerNameFromUrl === stickerContainerClient.containerName) {
            const sasUrl = getBlobUrlWithSas(stickerContainerClient, blobName);
            if (sasUrl) {
              imageUrlWithSas = sasUrl;
            } else {
              console.warn(`Failed to generate SAS URL for single sticker ${stickerFromDb.sticker_id}, blob ${blobName}`);
            }
          } else if (blobName) {
             console.warn(`Single sticker ${stickerFromDb.sticker_id} blob ${blobName} is in container ${containerNameFromUrl}, but expected ${stickerContainerClient.containerName}. SAS not applied.`);
          }
        } catch (e) {
          console.warn(`Could not parse sticker file_path or generate SAS for single sticker ${stickerFromDb.sticker_id}: ${stickerFromDb.file_path}`, e);
        }
      }

      res.status(200).json({
        ...stickerFromDb,
        file_path: imageUrlWithSas, // Return with potentially SAS-enhanced URL
      });
    } catch (error) {
      console.error('Error fetching sticker:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to fetch sticker.' });
    }
  }
);

// POST /stickers - Create a new sticker (Admin only)
router.post(
  '/',
  authenticateToken,
  isAdmin, // Apply admin check middleware
  [
    body('name').isString().notEmpty().withMessage('Sticker name is required.').isLength({ max: 100 }).withMessage('Sticker name cannot exceed 100 characters.'),
    body('file_path').isURL().withMessage('Valid file_path URL is required.'),
    body('category').optional().isString().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters.'),
    body('thumbnail_path').optional().isURL().withMessage('Valid thumbnail_path URL is required.'),
    body('tags').optional().isArray().withMessage('Tags must be an array of strings.'),
    body('tags.*').optional().isString().withMessage('Each tag must be a string.')
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { name, file_path, category, thumbnail_path, tags } = req.body;
      const stickerRepository = dataSource.getRepository(Sticker);
      
      const newSticker = stickerRepository.create({
        name,
        file_path,
        category,
        thumbnail_path,
        tags,
      });
      await stickerRepository.save(newSticker);
      res.status(201).json(newSticker);
    } catch (error: any) { // Added type assertion for error
      console.error('Error creating sticker:', error);
      if (error && error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Conflict', message: 'Sticker with this name or file path might already exist.' });
      }
      res.status(500).json({ error: 'ServerError', message: 'Failed to create sticker.' });
    }
  }
);

// PUT /stickers/:stickerId - Update a sticker (Admin only)
router.put(
  '/:stickerId',
  authenticateToken,
  isAdmin, // Apply admin check middleware
  [
    param('stickerId').isUUID().withMessage('Invalid sticker ID format.'),
    body('name').optional().isString().notEmpty().withMessage('Sticker name cannot be empty.').isLength({ max: 100 }).withMessage('Sticker name cannot exceed 100 characters.'),
    body('file_path').optional().isURL().withMessage('Valid file_path URL is required.'),
    body('category').optional().isString().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters.'),
    body('thumbnail_path').optional().isURL().withMessage('Valid thumbnail_path URL is required.'),
    body('tags').optional().isArray().withMessage('Tags must be an array of strings.'),
    body('tags.*').optional().isString().withMessage('Each tag must be a string.')
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const stickerRepository = dataSource.getRepository(Sticker);
      const sticker = await stickerRepository.findOneBy({ sticker_id: req.params.stickerId });

      if (!sticker) {
        return res.status(404).json({ error: 'NotFound', message: 'Sticker not found.' });
      }

      const { name, file_path, category, thumbnail_path, tags } = req.body;
      
      if (name !== undefined) sticker.name = name;
      if (file_path !== undefined) sticker.file_path = file_path;
      if (category !== undefined) sticker.category = category;
      if (thumbnail_path !== undefined) sticker.thumbnail_path = thumbnail_path;
      if (tags !== undefined) sticker.tags = tags;

      await stickerRepository.save(sticker);
      res.status(200).json(sticker);
    } catch (error) {
      console.error('Error updating sticker:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to update sticker.' });
    }
  }
);

// DELETE /stickers/:stickerId - Delete a sticker (Admin only)
router.delete(
  '/:stickerId',
  authenticateToken,
  isAdmin, // Apply admin check middleware
  [param('stickerId').isUUID().withMessage('Invalid sticker ID format.')],
  validate,
  async (req: Request, res: Response) => {
    try {
      const stickerRepository = dataSource.getRepository(Sticker);
      const deleteResult = await stickerRepository.delete(req.params.stickerId);

      if (deleteResult.affected === 0) {
        return res.status(404).json({ error: 'NotFound', message: 'Sticker not found.' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting sticker:', error);
      res.status(500).json({ error: 'ServerError', message: 'Failed to delete sticker.' });
    }
  }
);

export default router;