import express, { Request, Response, Router } from 'express';
import AppDataSource from '../../data-source'; // Corrected import
import { Album } from '../entities/Album';
import { AlbumPage } from '../entities/AlbumPage';
import { AlbumObject } from '../entities/AlbumObject'; // Add AlbumObject import
import { User } from '../entities/User'; // Assuming User entity exists and is populated by auth middleware
import { authenticateToken } from '../middleware/authMiddleware'; // Corrected path if needed, assuming it's correct now
import { EntityManager } from 'typeorm';
// Removed asyncHandler import

const router: Router = express.Router();

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

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    if (!pageId || !type || positionX === undefined || positionY === undefined || !width || !height || !contentData) {
        return res.status(400).json({ error: 'InvalidInput', message: 'Missing required object data.' });
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

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    // Validate contentData if present
    if (contentData) {
        if (typeof contentData !== 'object' || contentData === null) {
            return res.status(400).json({ error: 'InvalidInput', message: 'contentData must be an object.' });
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

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in token.' });
    }

    const albumRepository = AppDataSource.getRepository(Album);
    const pageRepository = AppDataSource.getRepository(AlbumPage);
    const objectRepository = AppDataSource.getRepository(AlbumObject);

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
                    objects,
                };
            })
        );

        // 4. Prepare and send the response
        const responseData = {
            albumId: album.album_id,
            title: album.title,
            createdAt: album.created_at,
            updatedAt: album.updated_at,
            pages: pagesWithObjects.map(page => ({
                pageId: page.page_id,
                pageNumber: page.page_number,
                objects: page.objects.map(object => ({
                    objectId: object.object_id,
                    type: object.type,
                    positionX: object.position_x,
                    positionY: object.position_y,
                    width: object.width,
                    height: object.height,
                    rotation: object.rotation,
                    zIndex: object.z_index,
                    contentData: typeof object.content_data === 'string' ? JSON.parse(object.content_data) : object.content_data,
                    createdAt: object.created_at,
                    updatedAt: object.updated_at,
                })),
            })),
        };

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('Error fetching album details:', error);
        return res.status(500).json({ error: 'ServerError', message: 'Failed to fetch album details.' });
    }
});

export default router;