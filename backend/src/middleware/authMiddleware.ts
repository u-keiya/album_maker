import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; // Assuming JWT is used

// Extend Express Request type to include 'user'
declare global {
    namespace Express {
        interface Request {
            user?: { userId: string; username: string }; // Corrected payload structure
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication token is missing.' });
        return;
    }

    // Replace 'YOUR_SECRET_KEY' with your actual secret key
    const secret = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

    jwt.verify(token, secret, (err: any, user: any) => {
        if (err) {
            console.error("JWT Verification Error:", err);
            res.status(403).json({ error: 'Forbidden', message: 'Invalid or expired token.' });
            return;
        }
        // Ensure the 'user' object from jwt.verify matches the expected structure
        // The 'user' object here is the decoded payload
        if (user && typeof user === 'object' && 'userId' in user && 'username' in user) {
             req.user = user as { userId: string; username: string }; // Corrected type assertion
        } else {
             // Handle unexpected payload structure
             console.error("JWT payload structure mismatch:", user);
             res.status(403).json({ error: 'Forbidden', message: 'Invalid token payload.' });
             return;
        }
        next(); // pass the execution off to whatever request the client intended
    });
};