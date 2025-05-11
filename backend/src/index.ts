import 'dotenv/config'; // Load environment variables
import express, { Request, Response, NextFunction } from 'express'; // Added NextFunction
import cors from 'cors'; // Import cors
import authRouter from './routes/auth'; // Import the auth router
import albumsRouter from './routes/albums'; // Import the albums router
import photosRouter from './routes/photos'; // Import the photos router
import stickersRouter from './routes/stickers'; // Import the stickers router
import AppDataSource from '../data-source'; // Add the missing import
import multer from 'multer'; // Import multer for error handling

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the auth router
app.use('/auth', authRouter);
app.use('/albums', albumsRouter); // Mount the albums router
app.use('/photos', photosRouter); // Mount the photos router
app.use('/stickers', stickersRouter); // Mount the stickers router

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

// Generic Error Handling Middleware (should be placed after all other app.use() and routes)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err.stack || err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'FileUploadError',
      message: `File upload error: ${err.message}`,
      field: err.field,
    });
  } else if (err.message && err.message.includes('Invalid file type')) { // Specific error from photos route
    return res.status(400).json({ error: 'InvalidFileType', message: err.message });
  } else if (res.headersSent) { // If headers already sent, delegate to default Express error handler
    return next(err);
  }

  // Default to 500 server error
  res.status(500).json({
    error: 'ServerError',
    message: 'An unexpected internal server error occurred.',
    // Optionally include error details in development
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});


// Initialize DataSource before starting the server
AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err: any) => { // Add type 'any' to the catch parameter
    console.error("Error during Data Source initialization:", err);
  });