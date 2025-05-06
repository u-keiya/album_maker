import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import AppDataSource from '../../data-source'; // Use default import
import { User } from '../entities/User';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

// --- Validation Rules ---
const registerValidationRules = [
  body('username')
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

// --- Validation Rules for Login ---
const loginValidationRules = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// --- Error Handling Middleware for Validation ---
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
     res.status(400).json({ // Send response
      error: 'InvalidInput',
      message: 'Input validation failed.',
      details: errors.array(),
    });
     return; // Stop execution after sending response
  }
  next();
};


// --- Registration Route (POST /register) ---
// Corrected async handler return type
router.post('/register', registerValidationRules, validate, async (req: Request, res: Response): Promise<void> => { // Explicitly return Promise<void>
  const { username, password } = req.body;

  try {
    // 1. Check if username already exists
    const existingUser = await userRepository.findOneBy({ username });
    if (existingUser) {
      // Send response and stop execution
      res.status(409).json({
        error: 'UsernameExists',
        message: 'Specified username is already in use.',
      });
      return;
    }

    // 2. Hash the password
    const saltRounds = 10; // Recommended salt rounds
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Create and save the new user
    const newUser = userRepository.create({
      username,
      password_hash: passwordHash,
    });
    await userRepository.save(newUser);

    // 4. Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresInString = process.env.JWT_EXPIRES_IN || '3600s';
    const expiresInSeconds = parseInt(jwtExpiresInString, 10);
    const jwtExpiresInValue = !isNaN(expiresInSeconds) ? expiresInSeconds : 3600;

    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables.');
      // Send response and stop execution
      res.status(500).json({
        error: 'ServerError',
        message: 'Server configuration error.',
      });
      return;
    }

    const tokenPayload = {
      userId: newUser.user_id,
      username: newUser.username,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiresInValue });

    // 5. Send success response
    res.status(201).json({
      token,
      userId: newUser.user_id,
      username: newUser.username,
    });
    // No return needed here, function implicitly returns void

  } catch (error) {
    console.error('Registration error:', error);
    // Send error response
    res.status(500).json({
      error: 'ServerError',
      message: 'An internal server error occurred during registration.',
    });
    // No return needed here
  }
});


// --- Login Route (POST /login) ---
router.post('/login', loginValidationRules, validate, async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  try {
    // 1. Find user by username
    const user = await userRepository.findOneBy({ username });
    if (!user) {
      res.status(401).json({
        error: 'AuthenticationFailed',
        message: 'Invalid username or password.',
      });
      return;
    }

    // 2. Compare provided password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'AuthenticationFailed',
        message: 'Invalid username or password.',
      });
      return;
    }

    // 3. Generate JWT (similar to registration)
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresInString = process.env.JWT_EXPIRES_IN || '3600s';
    const expiresInSeconds = parseInt(jwtExpiresInString, 10);
    const jwtExpiresInValue = !isNaN(expiresInSeconds) ? expiresInSeconds : 3600;

    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables.');
      res.status(500).json({
        error: 'ServerError',
        message: 'Server configuration error.',
      });
      return;
    }

    const tokenPayload = {
      userId: user.user_id,
      username: user.username,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpiresInValue });

    // 4. Return success response with token and user info
    res.status(200).json({
      token,
      userId: user.user_id,
      username: user.username,
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'ServerError',
      message: 'An internal server error occurred during login.',
    });
  }
});

export default router;