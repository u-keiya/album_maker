import 'dotenv/config'; // Load environment variables
import express, { Request, Response } from 'express';
import cors from 'cors'; // Import cors
import authRouter from './routes/auth'; // Import the auth router
import albumsRouter from './routes/albums'; // Import the albums router
import AppDataSource from '../data-source'; // Add the missing import

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the auth router
app.use('/auth', authRouter);
app.use('/albums', albumsRouter); // Mount the albums router

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
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