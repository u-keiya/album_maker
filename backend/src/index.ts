import 'dotenv/config'; // Load environment variables
import express, { Request, Response } from 'express';
import authRouter from './routes/auth'; // Import the auth router

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the auth router
app.use('/auth', authRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});