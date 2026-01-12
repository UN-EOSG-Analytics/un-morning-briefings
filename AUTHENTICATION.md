# Authentication Setup

This application uses NextAuth.js for authentication with a single shared password.

## Configuration

1. **Set Environment Variables**

   Copy `.env.example` to `.env.local` and configure:

   ```bash
   # Generate a secure secret (run in terminal):
   # openssl rand -base64 32
   NEXTAUTH_SECRET=your-generated-secret-here
   
   # Set your application URL
   NEXTAUTH_URL=http://localhost:3000
   
   # Set the site password (change this!)
   SITE_PASSWORD=your-secure-password-here
   ```

2. **Password Protection**

   - All routes are protected except `/login` and `/api/auth/*`
   - Users must enter the correct password to access the application
   - Sessions last for 30 days
   - The logout button is in the user dropdown menu (top right)

## How It Works

- **Login**: Users visit `/login` and enter the shared password
- **Session**: NextAuth creates a JWT-based session upon successful login
- **Route Protection**: 
  - All page routes are protected via Next.js middleware
  - All API routes check for valid sessions before processing requests
  - Only `/login`, `/api/auth/*`, and static assets are publicly accessible
- **Logout**: Click the user icon in the navbar and select "Logout"

## Security Notes

- Change `SITE_PASSWORD` from the default before deploying
- Use a strong, random value for `NEXTAUTH_SECRET`
- Keep `.env.local` out of version control (already in `.gitignore`)
- Consider using environment-specific passwords for dev/staging/prod

## Accessing the App

1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000
3. You'll be redirected to `/login`
4. Enter the password set in `SITE_PASSWORD`
5. Access granted!
