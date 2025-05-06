import express, { Request, Response, Router } from 'express';
import AppDataSource from '../../data-source'; // Corrected import
import { Album } from '../entities/Album';
import { AlbumPage } from '../entities/AlbumPage';
import { User } from '../entities/User'; // Assuming User entity exists and is populated by auth middleware
import { authenticateToken } from '../middleware/authMiddleware'; // Corrected path if needed, assuming it's correct now
import { EntityManager } from 'typeorm'; // Import EntityManager for transaction

const router: Router = express.Router();

// POST /albums - Create a new album
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    const { title } = req.body;
    const userId = req.user?.id; // Get user ID from authenticated request

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

export default router;