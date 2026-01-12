// Run this in the server console to check the environment
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

console.log('=== Environment Check ===');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '***SET***' : '***NOT SET***');
console.log('SITE_PASSWORD:', process.env.SITE_PASSWORD ? '***SET***' : '***NOT SET***');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('authOptions.secret:', authOptions.secret ? '***SET***' : '***NOT SET***');
console.log('authOptions.providers:', authOptions.providers.length, 'providers');
