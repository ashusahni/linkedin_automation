
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('ENV KEYS:', Object.keys(process.env).filter(k => k.startsWith('DB') || k.startsWith('DATA')));
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
