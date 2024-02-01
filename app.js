import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT;

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error("La clé secrète JWT n'est pas définie dans le fichier .env");
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
