import express, { Request, Response, Router } from 'express';
import AppDataSource from '../../data-source'; // Corrected import
import { Album } from '../entities/Album';
import { AlbumPage } from '../entities/AlbumPage';
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

export default router;