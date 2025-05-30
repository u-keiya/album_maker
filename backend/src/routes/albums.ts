import express, { Request, Response, Router } from 'express';
import AppDataSource from '../../data-source'; // Corrected import
import { Album } from '../entities/Album';
import { AlbumPage } from '../entities/AlbumPage';
import { AlbumObject } from '../entities/AlbumObject'; // Add AlbumObject import
import { User } from '../entities/User'; // Assuming User entity exists and is populated by auth middleware
import { authenticateToken } from '../middleware/authMiddleware'; // Corrected path if needed, assuming it's correct now
import { EntityManager } from 'typeorm';
import { getBlobUrlWithSas } from '../utils/azureStorage'; // Import the SAS helper
import { validate as isUUID } from 'uuid';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { Readable } from 'stream';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'; // For ContainerClient
import { Sticker } from '../entities/Sticker';
import { Photo } from '../entities/Photo'; // To fetch photo details for SAS
// Removed asyncHandler import

const router: Router = express.Router();

// --- Azure Blob Storage Configuration (similar to photos.ts) ---
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'photos'; // Assuming photos and stickers are in the same container or adjust as needed

let containerClient: ContainerClient | null = null;
if (AZURE_STORAGE_CONNECTION_STRING) {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    console.log(`albums.ts: Successfully connected to Azure Blob Storage container: ${AZURE_STORAGE_CONTAINER_NAME}`);
  } catch (error) {
    console.error(`albums.ts: Failed to connect to Azure Blob Storage: ${error}`);
  }
} else {
  console.warn('albums.ts: AZURE_STORAGE_CONNECTION_STRING is not set. SAS token generation for image URLs will fallback or fail.');
}

// POST /albums - Create a new album
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    const { title } = req.body;
    const userId = req.user?.userId; // Corrected property name from token payload

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    const albumRepository = AppDataSource.getRepository(Album);
    const pageRepository = AppDataSource.getRepository(AlbumPage);
    const userRepository = AppDataSource.getRepository(User);

    try {
        // Find the user
        const user = await userRepository.findOneBy({ user_id: userId }); // Corrected property name
        if (!user) {
            return res.status(404).json({ error: 'UserNotFound', message: 'User not found.' });
        }

        // Create new album
        const newAlbum = new Album();
        newAlbum.title = title || '新しいアルバム'; // Use default title if not provided
        newAlbum.user = user;

        // Create initial page
        const initialPage = new AlbumPage();
        initialPage.page_number = 1; // Corrected property name
        initialPage.album = newAlbum; // Associate page with the new album

        // Save album and page within a transaction (optional but recommended)
        await AppDataSource.transaction(async (transactionalEntityManager: EntityManager) => { // Added type for parameter
            await transactionalEntityManager.save(newAlbum);
            initialPage.album = newAlbum; // Ensure association is set before saving page
            await transactionalEntityManager.save(initialPage);
        });


        // Prepare response data
        const responseData = {
            albumId: newAlbum.album_id, // Corrected property name (use after save)
            title: newAlbum.title,
            createdAt: newAlbum.created_at,
            updatedAt: newAlbum.updated_at,
            pages: [
                {
                    pageId: initialPage.page_id, // Corrected property name (use after save)
                    pageNumber: initialPage.page_number,
                },
            ],
        };

        return res.status(201).json(responseData);

    } catch (error) {
        console.error('Error creating album:', error);
        // Basic error handling, consider more specific checks
        if (error instanceof Error && error.message.includes('maxLength')) { // Example check
             return res.status(400).json({ error: 'InvalidInput', message: 'Title is too long.' });
        }
        return res.status(500).json({ error: 'ServerError', message: 'Failed to create album.' });
    }
});
// GET /albums - Get all albums for the logged-in user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    const userId = req.user?.userId; // Corrected property name from token payload

    if (!userId) {
        // This should technically not happen if authenticateToken works correctly
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found.' });
    }

    const albumRepository = AppDataSource.getRepository(Album);

    try {
        const albums = await albumRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' }, // Optional: order by creation date
        });

        // Format the response according to the API specification
        const responseData = albums.map(album => ({
            albumId: album.album_id,
            title: album.title,
            // thumbnailUrl: album.thumbnailUrl, // Add if thumbnail logic is implemented
            createdAt: album.created_at,
            updatedAt: album.updated_at,
        }));

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error fetching albums:', error);
        return res.status(500).json({ error: 'ServerError', message: 'Failed to fetch albums.' });
    }
});
// DELETE /albums/:albumId - Delete an album
router.delete('/:albumId', authenticateToken, async (req: Request, res: Response) => {
    const { albumId } = req.params;
    const userId = req.user?.userId; // Corrected property name from token payload

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found.' });
    }

    const albumRepository = AppDataSource.getRepository(Album);

    try {
        // Find the album first to check ownership
        const album = await albumRepository.findOne({
            where: { album_id: albumId },
            // Optionally load the user relation if needed, but user_id is directly available
            // relations: ['user'],
        });

        // Check if album exists
        if (!album) {
            return res.status(404).json({ error: 'NotFound', message: 'Album not found.' });
        }

        // Check if the authenticated user owns the album
        if (album.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this album.' });
        }

        // Delete the album (cascading should handle related entities like pages/objects)
        await albumRepository.remove(album);

        // Send success response
        return res.status(204).send(); // No Content

    } catch (error) {
        console.error('Error deleting album:', error);
        return res.status(500).json({ error: 'ServerError', message: 'Failed to delete album.' });
    }
});

// POST /albums/:albumId/pages - Add a new page to an album
router.post('/:albumId/pages', authenticateToken, async (req: Request, res: Response) => {
    const { albumId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    const albumRepository = AppDataSource.getRepository(Album);
    const pageRepository = AppDataSource.getRepository(AlbumPage);

    try {
        // Find the album
        const album = await albumRepository.findOne({
            where: { album_id: albumId },
            relations: ['pages'], // Load existing pages to determine next page number
        });

        if (!album) {
            return res.status(404).json({ error: 'NotFound', message: 'Album not found.' });
        }

        // Check if the authenticated user owns the album
        if (album.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to add pages to this album.' });
        }

        // Determine the next page number
        let nextPageNumber = 1;
        if (album.pages && album.pages.length > 0) {
            const maxPageNumber = Math.max(...album.pages.map(p => p.page_number));
            nextPageNumber = maxPageNumber + 1;
        }

        // Create new page
        const newPage = new AlbumPage();
        newPage.album = album; // Associate with the found album
        newPage.page_number = nextPageNumber;

        // Save the new page
        await pageRepository.save(newPage);

        // Prepare response data
        const responseData = {
            pageId: newPage.page_id,
            pageNumber: newPage.page_number,
        };

        return res.status(201).json(responseData);

    } catch (error) {
        console.error('Error adding page to album:', error);
        return res.status(500).json({ error: 'ServerError', message: 'Failed to add page to album.' });
    }
});

// POST /albums/:albumId/objects - Add an object to a page in an album
router.post('/:albumId/objects', authenticateToken, async (req: Request, res: Response) => {
    const { albumId } = req.params;
    const { pageId, type, positionX, positionY, width, height, rotation, zIndex, contentData } = req.body;
    const userId = req.user?.userId;

// アルバムダウンロード
router.get('/:albumId/download', authenticateToken, async (req: Request, res: Response) => {
  const { albumId } = req.params;
  const userId = (req as any).user.userId;

  // Validate albumId
  if (!isUUID(albumId)) {
    return res.status(400).json({ error: 'InvalidInput', message: 'Invalid album ID format.' });
  }

  try {
    const albumRepository = AppDataSource.getRepository(Album);
    const album = await albumRepository.findOne({ where: { album_id: albumId, user: { user_id: userId } }, relations: ['pages', 'pages.albumObjects', 'pages.albumObjects.photo'] });

    if (!album) {
      return res.status(404).json({ error: 'NotFound', message: 'Album not found or access denied.' });
    }

    // PDF生成処理 (ダミー)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(`Album Title: ${album.title}`, {
      x: 50,
      y: height - 4 * 50,
      size: 30,
      font: font,
      color: rgb(0, 0.53, 0.71),
    });

    // 各ページのオブジェクトを描画 (簡略版)
    const sortedPages: AlbumPage[] = album.pages.sort((a: AlbumPage, b: AlbumPage) => a.page_number - b.page_number);
    for (const albumPage of sortedPages) {
        page.drawText(`Page ${albumPage.page_number}`, {
            x: 50,
            y: height - 4 * 50 - (albumPage.page_number * 50), // 仮のオフセット
            size: 20,
            font: font,
            color: rgb(0,0,0)
        });

        if ((albumPage as any).albumObjects) {
          for (const obj of (albumPage as any).albumObjects) {
            let contentData;
            try {
                contentData = typeof obj.content_data === 'string' ? JSON.parse(obj.content_data) : obj.content_data;
            } catch (e) {
                console.error(`Error parsing content_data for object ${obj.object_id} in PDF generation:`, e);
                continue; // Skip this object if content_data is invalid
            }

            if (obj.type === 'photo' && contentData.photoId && containerClient) {
              try {
                const photoRepository = AppDataSource.getRepository(Photo);
                const photoEntity = await photoRepository.findOneBy({ photo_id: contentData.photoId });
                if (photoEntity && photoEntity.file_path) {
                  const blobName = photoEntity.file_path.substring(photoEntity.file_path.lastIndexOf('/') + 1);
                  const blobClient = containerClient.getBlobClient(blobName);
                  const downloadBlockBlobResponse = await blobClient.downloadToBuffer();
                  let imageBytes = downloadBlockBlobResponse;
                  let image;
                  if (photoEntity.mime_type === 'image/png') {
                    image = await pdfDoc.embedPng(imageBytes);
                  } else if (photoEntity.mime_type === 'image/jpeg' || photoEntity.mime_type === 'image/jpg') {
                    image = await pdfDoc.embedJpg(imageBytes);
                  } else {
                    console.warn(`Unsupported image type ${photoEntity.mime_type} for photo ${photoEntity.photo_id} in PDF generation.`);
                    continue;
                  }
                  const { width: imgWidth, height: imgHeight } = image.scale(1);
                  page.drawImage(image, {
                    x: obj.position_x,
                    y: height - obj.position_y - obj.height, // pdf-libのY座標は左下からなので調整
                    width: obj.width,
                    height: obj.height,
                    rotate: degrees(obj.rotation || 0),
                  });
                }
              } catch (e) {
                console.error(`Error embedding photo ${contentData.photoId} in PDF:`, e);
              }
            } else if (obj.type === 'sticker' && contentData.stickerId && containerClient) {
              try {
                const stickerRepository = AppDataSource.getRepository(Sticker); // Stickerエンティティをインポートする必要あり
                const stickerEntity = await stickerRepository.findOneBy({ sticker_id: contentData.stickerId });
                if (stickerEntity && stickerEntity.file_path) {
                  // file_pathが完全なURLか、blob名のみかによって処理を調整
                  let blobName = stickerEntity.file_path;
                  if (stickerEntity.file_path.includes('/')) {
                     blobName = stickerEntity.file_path.substring(stickerEntity.file_path.lastIndexOf('/') + 1);
                  }
                  const blobClient = containerClient.getBlobClient(blobName);
                  const downloadBlockBlobResponse = await blobClient.downloadToBuffer();
                  let imageBytes = downloadBlockBlobResponse;
                  // ステッカーはPNG形式を想定（必要に応じてMIMEタイプをStickerエンティティに追加）
                  const image = await pdfDoc.embedPng(imageBytes);
                  const { width: imgWidth, height: imgHeight } = image.scale(1);
                  page.drawImage(image, {
                    x: obj.position_x,
                    y: height - obj.position_y - obj.height,
                    width: obj.width,
                    height: obj.height,
                    rotate: degrees(obj.rotation || 0),
                  });
                }
              } catch (e) {
                console.error(`Error embedding sticker ${contentData.stickerId} in PDF:`, e);
              }
            } else if (obj.type === 'text' && contentData.text) {
              try {
                const textFont = await pdfDoc.embedFont(contentData.font || StandardFonts.Helvetica);
                let textColor = rgb(0, 0, 0); // Default black
                if (contentData.color) {
                  // Assuming color is hex #RRGGBB
                  const r = parseInt(contentData.color.slice(1, 3), 16) / 255;
                  const g = parseInt(contentData.color.slice(3, 5), 16) / 255;
                  const b = parseInt(contentData.color.slice(5, 7), 16) / 255;
                  textColor = rgb(r, g, b);
                }
                // pdf-lib doesn't directly support 'bold' in drawText options for standard fonts in a simple way.
                // For bold, a bold version of the font would typically be embedded (e.g., Helvetica-Bold).
                // Here, we'll use the regular font. If bold is critical, font embedding strategy needs to be enhanced.

                page.drawText(contentData.text, {
                  x: obj.position_x,
                  y: height - obj.position_y - obj.height, // Adjust Y for text baseline if needed
                  font: textFont,
                  size: contentData.size || 12,
                  color: textColor,
                  // lineHeight, rotate, etc. can be added if needed and supported
                });
              } catch (e) {
                console.error(`Error drawing text object ${obj.object_id} in PDF:`, e);
              }
            } else if (obj.type === 'drawing' && contentData.pathData) {
              try {
                let pathColor = rgb(0, 0, 0); // Default black
                if (contentData.color) {
                  const r = parseInt(contentData.color.slice(1, 3), 16) / 255;
                  const g = parseInt(contentData.color.slice(3, 5), 16) / 255;
                  const b = parseInt(contentData.color.slice(5, 7), 16) / 255;
                  pathColor = rgb(r, g, b);
                }
                // drawSvgPath positions relative to the current page origin (bottom-left).
                // The pathData itself might have its own coordinate system.
                // For simplicity, we assume pathData is defined relative to the object's (0,0)
                // and we translate the page's coordinate system temporarily.
                // However, pdf-lib's drawSvgPath takes x, y options for positioning the path.
                page.drawSvgPath(contentData.pathData, {
                  x: obj.position_x,
                  y: height - obj.position_y - obj.height, // Adjust Y to match top-left origin of objects
                  borderColor: pathColor, // Use borderColor for the path stroke
                  borderWidth: contentData.thickness || 1,
                  // color: pathColor, // 'color' is for fill, 'borderColor' for stroke
                });
              } catch (e) {
                console.error(`Error drawing drawing object ${obj.object_id} in PDF:`, e);
              }
            }
          }
        }
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="album_${albumId}.pdf"`);
    
    const stream = new Readable();
    stream.push(pdfBytes);
    stream.push(null); // ストリームの終了
    stream.pipe(res);

  } catch (error) {
    console.error('Error generating PDF for album download:', error);
    res.status(500).json({ error: 'ServerError', message: 'Failed to generate PDF for album.' });
  }
});
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    if (!pageId || !type || positionX === undefined || positionY === undefined || !width || !height || !contentData) {
        return res.status(400).json({ error: 'InvalidInput', message: 'Missing required object data.' });
    }

    // Validate photoId if type is 'photo'
    if (type === 'photo') {
        if (!contentData.photoId) {
            return res.status(400).json({ error: 'InvalidInput', message: 'Missing photoId in contentData for photo type.' });
        }
        const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidV4Regex.test(contentData.photoId)) {
            return res.status(400).json({ error: 'InvalidInput', message: `Invalid photoId format: ${contentData.photoId}. Must be a valid UUID.` });
        }
    }

    const albumRepository = AppDataSource.getRepository(Album);
    const pageRepository = AppDataSource.getRepository(AlbumPage);
    const objectRepository = AppDataSource.getRepository(AlbumObject);

    try {
        // 1. Find the album and verify ownership
        const album = await albumRepository.findOne({ where: { album_id: albumId, user_id: userId } });
        if (!album) {
            return res.status(404).json({ error: 'NotFound', message: 'Album not found or user does not have access.' });
        }

        // 2. Find the page within that album
        const page = await pageRepository.findOne({ where: { page_id: pageId, album_id: albumId } });
        if (!page) {
            return res.status(404).json({ error: 'NotFound', message: 'Page not found in the specified album.' });
        }

        // 3. Create and save the new object
        const newObject = new AlbumObject();
        newObject.page = page;
        newObject.type = type;
        newObject.position_x = positionX;
        newObject.position_y = positionY;
        newObject.width = width;
        newObject.height = height;
        newObject.rotation = rotation || 0;
        newObject.z_index = zIndex || 0;
        newObject.content_data = contentData;
        // newObject.page_id = pageId; // page relation will handle this

        await objectRepository.save(newObject);

        // 4. Prepare and send response
        const responseObject = {
            objectId: newObject.object_id,
            pageId: newObject.page.page_id, // Access via relation
            type: newObject.type,
            positionX: newObject.position_x,
            positionY: newObject.position_y,
            width: newObject.width,
            height: newObject.height,
            rotation: newObject.rotation,
            zIndex: newObject.z_index,
            contentData: newObject.content_data,
            createdAt: newObject.created_at,
            updatedAt: newObject.updated_at,
        };

        return res.status(201).json(responseObject);

    } catch (error) {
        console.error('Error adding object to page:', error);
        // Add more specific error handling based on potential issues
        if (error instanceof Error && error.message.includes('violates check constraint')) { // Example for type validation
            return res.status(400).json({ error: 'InvalidInput', message: 'Invalid object type or content data.' });
        }
        return res.status(500).json({ error: 'ServerError', message: 'Failed to add object to page.' });
    }
});

// PUT /albums/:albumId/objects/:objectId - Update an object on a page
router.put('/:albumId/objects/:objectId', authenticateToken, async (req: Request, res: Response) => {
    const { albumId, objectId } = req.params;
    const { positionX, positionY, width, height, rotation, zIndex, contentData } = req.body;
    const userId = req.user?.userId;

    // General UUID format regex (allows for different versions)
    const generalUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!generalUuidRegex.test(albumId)) {
        console.error(`[ObjectUpdate] Invalid albumId format in path: ${albumId}`);
        return res.status(400).json({ error: 'InvalidInput', message: 'Invalid album ID format.' });
    }
    if (!generalUuidRegex.test(objectId)) {
        console.error(`[ObjectUpdate] Invalid objectId format in path: ${objectId}`);
        return res.status(400).json({ error: 'InvalidInput', message: 'Invalid object ID format.' });
    }

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    // Validate contentData if present
    if (contentData) {
        if (typeof contentData !== 'object' || contentData === null) {
            return res.status(400).json({ error: 'InvalidInput', message: 'contentData must be an object.' });
        }

        // Fetch the existing object to check its type for photoId validation
        const tempObjectRepository = AppDataSource.getRepository(AlbumObject);
        const existingObjectType = await tempObjectRepository.findOne({ where: { object_id: objectId }, select: ['type'] });

        if (existingObjectType?.type === 'photo' && contentData.photoId) {
            const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidV4Regex.test(contentData.photoId)) {
                return res.status(400).json({ error: 'InvalidInput', message: `Invalid photoId format in contentData: ${contentData.photoId}. Must be a valid UUID.` });
            }
        }


        // Additional validation for cropInfo if type is 'photo'
        // This assumes the 'type' of the object is not changing or is known.
        // For a more robust solution, you might need to fetch the object's type first
        // or require 'type' to be part of the update request if contentData is being updated.

        // Assuming we can access the existing object's type or it's part of the request
        // For now, let's assume if cropInfo is present, it should be validated.
        if (contentData.cropInfo) {
            const { shape, path, x, y, width: cropWidth, height: cropHeight } = contentData.cropInfo;
            if (!shape || !['rectangle', 'circle', 'freehand'].includes(shape)) {
                return res.status(400).json({ error: 'InvalidInput', message: "Invalid cropInfo: shape must be 'rectangle', 'circle', or 'freehand'." });
            }
            if (shape === 'freehand' && (typeof path !== 'string' || !path.trim())) {
                return res.status(400).json({ error: 'InvalidInput', message: 'Invalid cropInfo: path is required for freehand shape.' });
            }
            if (shape !== 'freehand') {
                if (typeof x !== 'number' || typeof y !== 'number' || typeof cropWidth !== 'number' || typeof cropHeight !== 'number') {
                    return res.status(400).json({ error: 'InvalidInput', message: 'Invalid cropInfo: x, y, width, and height must be numbers for rectangle/circle shape.' });
                }
                if (cropWidth <= 0 || cropHeight <= 0) {
                    return res.status(400).json({ error: 'InvalidInput', message: 'Invalid cropInfo: width and height must be positive numbers.' });
                }
            }
        }
    }


    const albumRepository = AppDataSource.getRepository(Album);
    const objectRepository = AppDataSource.getRepository(AlbumObject);

    try {
        // 1. Find the album to verify ownership (indirectly, by checking if object exists within user's album context)
        // A more direct way is to join through AlbumPage to Album to User.
        // For simplicity here, we'll find the object and then check its album's user.
        const existingObject = await objectRepository.findOne({
            where: { object_id: objectId },
            relations: ['page', 'page.album'], // Load related entities to check ownership
        });

        if (!existingObject) {
            return res.status(404).json({ error: 'NotFound', message: 'Object not found.' });
        }

        // Check if the album exists and belongs to the user
        if (!existingObject.page || !existingObject.page.album) {
             return res.status(404).json({ error: 'NotFound', message: 'Associated page or album not found for the object.' });
        }
        if (existingObject.page.album.album_id !== albumId) {
            return res.status(400).json({ error: 'InvalidInput', message: 'Object does not belong to the specified album.' });
        }
        if (existingObject.page.album.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to modify this object.' });
        }


        // 2. Update object properties if provided
        if (positionX !== undefined) existingObject.position_x = positionX;
        if (positionY !== undefined) existingObject.position_y = positionY;
        if (width !== undefined) existingObject.width = width;
        if (height !== undefined) existingObject.height = height;
        if (rotation !== undefined) existingObject.rotation = rotation;
        if (zIndex !== undefined) existingObject.z_index = zIndex;
        if (contentData !== undefined) {
            // Ensure content_data is stored as a string if it's an object
            if (typeof contentData === 'object' && contentData !== null) {
                existingObject.content_data = JSON.stringify(contentData);
            } else if (typeof contentData === 'string') {
                // If it's already a string, ensure it's valid JSON
                try {
                    JSON.parse(contentData); // Validate
                    existingObject.content_data = contentData; // Assign if valid
                } catch (e) {
                    return res.status(400).json({ error: 'InvalidInput', message: 'contentData, if a string, must be valid JSON.' });
                }
            } else if (contentData !== undefined) { // Allow undefined, but not other types like null (unless stringified)
                return res.status(400).json({ error: 'InvalidInput', message: 'contentData must be an object or a valid JSON string.' });
            }
        }

        // Touch the updated_at timestamp
        existingObject.updated_at = new Date();

        await objectRepository.save(existingObject);

        // 3. Prepare and send response
        const responseObject = {
            objectId: existingObject.object_id,
            pageId: existingObject.page.page_id,
            type: existingObject.type,
            positionX: existingObject.position_x,
            positionY: existingObject.position_y,
            width: existingObject.width,
            height: existingObject.height,
            rotation: existingObject.rotation,
            zIndex: existingObject.z_index,
            contentData: typeof existingObject.content_data === 'string' ? JSON.parse(existingObject.content_data) : existingObject.content_data,
            createdAt: existingObject.created_at,
            updatedAt: existingObject.updated_at,
        };

        return res.status(200).json(responseObject);

    } catch (error) {
        console.error('Error updating object:', error);
        if (error instanceof Error && error.message.includes('violates check constraint')) {
            return res.status(400).json({ error: 'InvalidInput', message: 'Invalid object type or content data for update.' });
        }
        return res.status(500).json({ error: 'ServerError', message: 'Failed to update object.' });
    }
});

// DELETE /albums/:albumId/objects/:objectId - Delete an object from a page
router.delete('/:albumId/objects/:objectId', authenticateToken, async (req: Request, res: Response) => {
    const { albumId, objectId } = req.params;
    const userId = req.user?.userId;

    // General UUID format regex (allows for different versions)
    const generalUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!generalUuidRegex.test(albumId)) {
        console.error(`[ObjectDelete] Invalid albumId format in path: ${albumId}`);
        return res.status(400).json({ error: 'InvalidInput', message: 'Invalid album ID format.' });
    }
    if (!generalUuidRegex.test(objectId)) {
        console.error(`[ObjectDelete] Invalid objectId format in path: ${objectId}`);
        return res.status(400).json({ error: 'InvalidInput', message: 'Invalid object ID format.' });
    }

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    const objectRepository = AppDataSource.getRepository(AlbumObject);

    try {
        // 1. Find the object and verify ownership (similar to PUT)
        const existingObject = await objectRepository.findOne({
            where: { object_id: objectId },
            relations: ['page', 'page.album'],
        });

        if (!existingObject) {
            return res.status(404).json({ error: 'NotFound', message: 'Object not found.' });
        }

        if (!existingObject.page || !existingObject.page.album) {
            return res.status(404).json({ error: 'NotFound', message: 'Associated page or album not found for the object.' });
        }
        if (existingObject.page.album.album_id !== albumId) {
            return res.status(400).json({ error: 'InvalidInput', message: 'Object does not belong to the specified album.' });
        }
        if (existingObject.page.album.user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this object.' });
        }

        // 2. Delete the object
        await objectRepository.remove(existingObject);

        // 3. Send success response
        return res.status(204).send(); // No Content

    } catch (error) {
        console.error('Error deleting object:', error);
        return res.status(500).json({ error: 'ServerError', message: 'Failed to delete object.' });
    }
});

// GET /albums/:albumId - Get a specific album with its pages and objects
router.get('/:albumId', authenticateToken, async (req: Request, res: Response) => {
    const { albumId } = req.params;
    const userId = req.user?.userId;

    // General UUID format regex (allows for different versions)
    const generalUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!generalUuidRegex.test(albumId)) {
        console.error(`[AlbumGet] Invalid albumId format in path: ${albumId}`);
        return res.status(400).json({ error: 'InvalidInput', message: 'Invalid album ID format.' });
    }

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    const albumRepository = AppDataSource.getRepository(Album);
    const pageRepository = AppDataSource.getRepository(AlbumPage);
    const objectRepository = AppDataSource.getRepository(AlbumObject);
    const photoRepository = AppDataSource.getRepository(Photo); // For fetching photo details

    try {
        // 1. Find the album and verify ownership
        const album = await albumRepository.findOne({
            where: { album_id: albumId, user_id: userId },
        });

        if (!album) {
            return res.status(404).json({ error: 'NotFound', message: 'Album not found or user does not have access.' });
        }

        // 2. Fetch the pages for the album
        const pages = await pageRepository.find({
            where: { album_id: albumId },
            order: { page_number: 'ASC' },
        });

        // 3. Fetch the objects for each page
        const pagesWithObjects = await Promise.all(
            pages.map(async (page) => {
                const objects = await objectRepository.find({
                    where: { page_id: page.page_id },
                });

                return {
                    ...page,
                    objects, // These are raw objects from DB
                };
            })
        );

        // 4. Prepare and send the response, generating SAS URLs for photo/sticker objects
        const responseData = {
            albumId: album.album_id,
            title: album.title,
            createdAt: album.created_at,
            updatedAt: album.updated_at,
            pages: await Promise.all(pagesWithObjects.map(async (page) => ({
                pageId: page.page_id,
                pageNumber: page.page_number,
                objects: await Promise.all(page.objects.map(async (object) => {
                    let parsedContentData;
                    try {
                        parsedContentData = typeof object.content_data === 'string'
                            ? JSON.parse(object.content_data)
                            : object.content_data;
                    } catch (e) {
                        console.error(`Error parsing content_data for object ${object.object_id} on page ${page.page_id}:`, object.content_data, e);
                        // Return a default or error state for this object if parsing fails
                        return {
                            objectId: object.object_id,
                            type: object.type,
                            positionX: object.position_x,
                            positionY: object.position_y,
                            width: object.width,
                            height: object.height,
                            rotation: object.rotation,
                            zIndex: object.z_index,
                            contentData: { error: "Failed to parse content_data" },
                            createdAt: object.created_at,
                            updatedAt: object.updated_at,
                        };
                    }

                    if (containerClient && parsedContentData) {
                        if (object.type === 'photo' && parsedContentData.photoId) {
                            try {
                                const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                                if (!parsedContentData.photoId || !uuidV4Regex.test(parsedContentData.photoId)) {
                                    console.warn(`[AlbumGet] Invalid photoId format: ${parsedContentData.photoId} for object ${object.object_id}. Skipping SAS URL generation.`);
                                } else {
                                    const photoEntity = await photoRepository.findOneBy({ photo_id: parsedContentData.photoId });
                                    if (photoEntity && photoEntity.file_path) {
                                        const blobName = photoEntity.file_path.substring(photoEntity.file_path.lastIndexOf('/') + 1);
                                        const sasUrl = getBlobUrlWithSas(containerClient, blobName);
                                        if (sasUrl) {
                                            parsedContentData.url = sasUrl;
                                        } else {
                                            console.warn(`[AlbumGet] Failed to get SAS URL for photo ${parsedContentData.photoId}, blob ${blobName}. Object ID: ${object.object_id}`);
                                        }
                                    } else if (photoEntity) {
                                        console.warn(`[AlbumGet] Photo entity found for photoId ${parsedContentData.photoId} but file_path is missing. Object ID: ${object.object_id}`);
                                    } else {
                                        console.warn(`[AlbumGet] Photo entity not found for photoId ${parsedContentData.photoId}. Object ID: ${object.object_id}`);
                                    }
                                }
                            } catch (e) {
                                console.error(`[AlbumGet] Error processing photo object ${object.object_id} with photoId ${parsedContentData.photoId}:`, e);
                            }
                        } else if (object.type === 'sticker' && parsedContentData.stickerId && parsedContentData.imageUrl) {
                            if (typeof parsedContentData.imageUrl !== 'string') {
                                 console.warn(`[AlbumGet] Sticker ${parsedContentData.stickerId} imageUrl is not a string: ${parsedContentData.imageUrl}. Object ID: ${object.object_id}`);
                            } else {
                                try {
                                    const urlParts = new URL(parsedContentData.imageUrl);
                                    const pathParts = urlParts.pathname.split('/');
                                    const blobNameFromStickerUrl = pathParts.pop();
                                    const containerNameFromStickerUrl = pathParts.pop();

                                    if (blobNameFromStickerUrl && containerNameFromStickerUrl && containerClient.containerName === containerNameFromStickerUrl) {
                                        const sasUrl = getBlobUrlWithSas(containerClient, blobNameFromStickerUrl);
                                        if (sasUrl) {
                                            parsedContentData.imageUrl = sasUrl;
                                        } else {
                                            console.warn(`[AlbumGet] Failed to get SAS URL for sticker ${parsedContentData.stickerId}, blob ${blobNameFromStickerUrl}. Object ID: ${object.object_id}`);
                                        }
                                    } else if (blobNameFromStickerUrl && containerClient.containerName !== containerNameFromStickerUrl) {
                                        console.warn(`[AlbumGet] Sticker ${parsedContentData.stickerId} blob ${blobNameFromStickerUrl} is in a different container (${containerNameFromStickerUrl}) than configured (${containerClient.containerName}). SAS not applied. Object ID: ${object.object_id}`);
                                    } else {
                                         console.warn(`[AlbumGet] Could not determine blobName or containerName for sticker ${parsedContentData.stickerId} from imageUrl: ${parsedContentData.imageUrl}. Object ID: ${object.object_id}`);
                                    }
                                } catch (e) {
                                    console.warn(`[AlbumGet] Error processing sticker object ${object.object_id} with stickerId ${parsedContentData.stickerId} and imageUrl ${parsedContentData.imageUrl}:`, e);
                                }
                            }
                        }
                    }

                    return {
                        objectId: object.object_id,
                        type: object.type,
                        positionX: object.position_x,
                        positionY: object.position_y,
                        width: object.width,
                        height: object.height,
                        rotation: object.rotation,
                        zIndex: object.z_index,
                        contentData: parsedContentData, // Use the potentially modified contentData
                        createdAt: object.created_at,
                        updatedAt: object.updated_at,
                    };
                })),
            }))),
        };

        return res.status(200).json(responseData);

    } catch (error: any) {
        console.error('Error fetching album details:', error.message, error.stack);
        if (error.detail) console.error('Error detail:', error.detail);
        return res.status(500).json({ error: 'ServerError', message: 'Failed to fetch album details.', details: error.message });
    }
});

export default router;