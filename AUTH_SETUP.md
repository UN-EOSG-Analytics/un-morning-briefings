# Authentication System Setup

## Overview
The application now has a secure login system with email/password authentication.

## Features Implemented

### 1. Login Page (`/login`)
- Email and password input fields
- Client-side validation (email format, required fields)
- Error handling and display
- Loading state during login
- Stores JWT token in localStorage
- Redirects to home page after successful login

### 2. Authentication API (`/api/auth/login`)
- POST endpoint for login
- Validates email format
- Queries users from database
- Verifies password using bcrypt
- Generates JWT token with 7-day expiration
- Returns token and user info

### 3. Password Hashing (`src/lib/auth.ts`)
- Uses bcryptjs with salt rounds (10)
- Functions for hashing and verifying passwords
- JWT token generation with user payload (id, email, name, role)
- Token verification and extraction utilities

### 4. Database Schema
- Users table in `pu_morning_briefings` schema
- Fields: id, email, password_hash, name, role, created_at, updated_at
- Email index for fast lookups
- Role-based access (user, admin)

### 5. Middleware (Temporarily Disabled)
- Middleware file exists but is temporarily disabled
- Edge Runtime doesn't support bcryptjs/jsonwebtoken
- Authentication currently happens at API route level
- Will be re-enabled with Edge-compatible solution

## Test Account
- **Email**: test@un.org
- **Password**: testpassword
- **Role**: admin

## Usage

### Login Flow
1. Navigate to `http://localhost:3000/login`
2. Enter credentials (test@un.org / testpassword)
3. Click "Sign In"
4. Token is stored in localStorage
5. Redirected to home page

### Creating New Users
Use the Python script to create new users:

```bash
python scripts/create_user.py <email> <password> --name "Full Name" --role "admin"
```

Example:
```bash
python scripts/create_user.py john@un.org password123 --name "John Doe" --role "user"
```

### Setting Up Database
Run this script to create the users table:

```bash
python scripts/setup_users_table.py
```

## Environment Variables Required

Add to `.env`:
```
JWT_SECRET=un-morning-briefings-secure-jwt-secret-key-2025-change-in-production
```

## Security Notes

1. **JWT Secret**: Change the JWT_SECRET in production to a strong, random string
2. **Password Hashing**: Uses bcrypt with 10 salt rounds (industry standard)
3. **Token Expiration**: Tokens expire after 7 days
4. **HTTPS**: Always use HTTPS in production for secure token transmission
5. **Token Storage**: Consider using httpOnly cookies instead of localStorage for production

## Next Steps

1. **Logout Functionality**: Add logout button to clear token and redirect to login
2. **Protected Routes**: Add authentication checks to pages that require login
3. **API Route Protection**: Update API routes to verify JWT token in headers
4. **Session Management**: Implement token refresh mechanism
5. **Role-Based Access**: Use user.role for feature access control
6. **Password Reset**: Add forgot password/reset password flow
7. **Email Verification**: Add email verification for new accounts
8. **Edge Middleware**: Implement Edge-compatible authentication middleware

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx              # Login page UI
│   └── api/
│       └── auth/
│           └── login/
│               └── route.ts       # Login API endpoint
├── lib/
│   └── auth.ts                   # Auth utilities (hashing, JWT)
└── middleware.ts                 # Middleware (temporarily disabled)

scripts/
├── setup_users_table.py          # Create users table
└── create_user.py                # Create user accounts

sql/
└── init.sql                      # Database schema including users table
```

## Troubleshooting

### Login fails with "Invalid credentials"
- Check email is correct (case-insensitive)
- Verify password matches the one used during user creation
- Check database connection in `.env`

### "Module not found" errors
- Run `npm install` to install bcryptjs and jsonwebtoken
- Run `uv sync` or `pip install bcrypt psycopg2-binary python-dotenv` for Python packages

### Token not persisting
- Check browser localStorage (DevTools → Application → localStorage)
- Ensure JWT_SECRET is set in `.env`
- Check for console errors in browser

### Middleware errors
- Middleware is currently disabled due to Edge Runtime limitations
- Authentication happens at API route level
- Routes are accessible without authentication for now
