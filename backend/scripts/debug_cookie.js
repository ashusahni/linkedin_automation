
import dotenv from 'dotenv';
dotenv.config();

const cookie = process.env.LINKEDIN_SESSION_COOKIE || '';
console.log('Cookie Debug Report:');
console.log('--------------------');
console.log(`Presence: ${!!cookie}`);
console.log(`Length: ${cookie.length}`);
console.log(`Starts with "li_at=": ${cookie.startsWith('li_at=')}`);
console.log(`Has Quotes: ${cookie.startsWith('"') || cookie.startsWith("'")}`);
console.log(`First 20 chars: ${cookie.substring(0, 20)}...`);
console.log(`Last 20 chars: ...${cookie.substring(cookie.length - 20)}`);
