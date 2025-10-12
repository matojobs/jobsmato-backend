# Forgot Password Implementation Documentation

## Overview

This document details the complete implementation of the forgot password functionality for the Jobsmato application, including both backend and frontend components. The implementation uses Google SMTP service for sending password reset emails and includes secure token-based password reset flow.

## Table of Contents

1. [Backend Implementation](#backend-implementation)
2. [Frontend Implementation](#frontend-implementation)
3. [Email Service Configuration](#email-service-configuration)
4. [Security Features](#security-features)
5. [API Endpoints](#api-endpoints)
6. [Testing](#testing)
7. [Deployment Notes](#deployment-notes)

## Backend Implementation

### 1. New Files Created

#### Email Service (`src/modules/email/email.service.ts`)
- **Purpose**: Handles email sending using Google SMTP service
- **Features**:
  - Google SMTP configuration with fallback to console logging
  - HTML email templates for password reset and welcome emails
  - Error handling and logging
  - Responsive email design

#### Email Module (`src/modules/email/email.module.ts`)
- **Purpose**: NestJS module configuration for email service
- **Exports**: EmailService for use in other modules

#### Password Reset Token Entity (`src/entities/password-reset-token.entity.ts`)
- **Purpose**: Database entity for storing password reset tokens
- **Features**:
  - Secure token storage with expiration
  - User relationship with cascade delete
  - Database indexes for performance
  - Helper methods for token validation

### 2. Modified Files

#### Auth Service (`src/modules/auth/auth.service.ts`)
**Changes Made**:
- Added imports for `PasswordResetToken`, `EmailService`, and `crypto`
- Updated constructor to inject new dependencies
- Implemented `forgotPassword()` method:
  - Generates secure random token using `crypto.randomBytes(32)`
  - Sets 1-hour expiration time
  - Invalidates existing tokens for security
  - Sends password reset email
- Implemented `resetPassword()` method:
  - Validates token (not used and not expired)
  - Hashes new password with bcrypt
  - Updates user password
  - Marks token as used
  - Invalidates all other tokens for the user
- Added welcome email sending to registration process

#### Auth Module (`src/modules/auth/auth.module.ts`)
**Changes Made**:
- Added `PasswordResetToken` to TypeORM entities
- Imported `EmailModule`
- Updated module dependencies

#### Environment Configuration (`env.example`)
**Existing Configuration** (already present):
```env
# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@jobsmato.com"
```

## Frontend Implementation

### 1. New Files Created

#### ForgotPasswordModal (`src/components/ForgotPasswordModal.tsx`)
- **Purpose**: Modal for requesting password reset
- **Features**:
  - Email validation
  - Success/error message display
  - Integration with API client
  - Responsive design with back navigation

#### ResetPasswordModal (`src/components/ResetPasswordModal.tsx`)
- **Purpose**: Modal for setting new password
- **Features**:
  - Password confirmation validation
  - Password visibility toggle
  - Token-based password reset
  - Success confirmation

#### ResetPasswordPage (`src/components/ResetPasswordPage.tsx`)
- **Purpose**: Standalone page for password reset via email link
- **Features**:
  - URL parameter token extraction
  - Modal integration
  - Error handling for invalid tokens

### 2. Modified Files

#### API Client (`src/config/api.ts`)
**Changes Made**:
- Added new endpoints to `API_CONFIG.ENDPOINTS.AUTH`:
  - `FORGOT_PASSWORD: '/auth/forgot-password'`
  - `RESET_PASSWORD: '/auth/reset-password'`
  - `CHANGE_PASSWORD: '/auth/change-password'`
- Added new methods:
  - `forgotPassword(email: string)`
  - `resetPassword(token: string, password: string)`
  - `changePassword(currentPassword: string, newPassword: string)`

#### FormInput Component (`src/components/FormInput.tsx`)
**Changes Made**:
- Added `onTogglePassword?: () => void` prop
- Updated password toggle functionality to support external control

#### LoginModal (`src/components/LoginModal.tsx`)
**Changes Made**:
- Added import for `ForgotPasswordModal`
- Added state for `showForgotPassword`
- Connected "Forget Password" button to open modal
- Added `ForgotPasswordModal` component to render tree

#### App Component (`src/App.tsx`)
**Changes Made**:
- Added import for `ResetPasswordPage`
- Added 'reset-password' to valid pages array
- Added URL parameter detection for reset password tokens
- Added 'reset-password' case to page routing switch statement

## Email Service Configuration

### Google SMTP Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Configure Environment Variables**:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="matojobs@gmail.com"
   SMTP_PASS="fntt ydop xgrc qsqu"
   SMTP_FROM="noreply@jobsmato.com"
   ```

### ✅ **Email Configuration Verified**

**Test Results** (Successfully completed):
- **SMTP Connection**: ✅ Verified successfully
- **Authentication**: ✅ App password working correctly  
- **Email Sending**: ✅ Test email sent successfully
- **Message ID**: `2036ef75-b140-efb6-cd48-4c79a411a041@jobsmato.com`
- **Test Email**: Sent to `matojobs@gmail.com`

The email service is fully functional and ready for production use.

### Email Templates

The email service includes two HTML templates:

1. **Password Reset Email**:
   - Professional design with Jobsmato branding
   - Clear call-to-action button
   - Security notice about link expiration
   - Responsive layout

2. **Welcome Email**:
   - Welcome message for new users
   - Feature highlights
   - Call-to-action to get started

## Security Features

### Token Security
- **Random Generation**: Uses `crypto.randomBytes(32)` for secure token generation
- **Expiration**: Tokens expire after 1 hour
- **Single Use**: Tokens are marked as used after password reset
- **User Isolation**: Each user's tokens are invalidated when a new one is created

### Password Security
- **Bcrypt Hashing**: Passwords are hashed with bcrypt using 12 rounds
- **Validation**: Minimum 6 characters required
- **Confirmation**: Frontend requires password confirmation

### Email Security
- **No User Enumeration**: Forgot password endpoint doesn't reveal if email exists
- **Secure Links**: Reset links include secure tokens
- **Expiration Notice**: Users are informed about link expiration

## API Endpoints

### POST /api/auth/forgot-password
**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**: 200 OK (always returns success for security)

**Behavior**:
- If email exists: Generates token, sends email
- If email doesn't exist: Returns success (no user enumeration)

### POST /api/auth/reset-password
**Request Body**:
```json
{
  "token": "secure-random-token",
  "password": "newpassword123"
}
```

**Responses**:
- 200 OK: Password reset successful
- 400 Bad Request: Invalid or expired token

### POST /api/auth/change-password
**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Headers**: `Authorization: Bearer <token>`

**Responses**:
- 200 OK: Password changed successfully
- 400 Bad Request: Current password incorrect
- 401 Unauthorized: Invalid or missing token

## Testing

### Backend Testing

1. **Test Email Configuration**:
   ```bash
   # Run the email test script
   SMTP_USER="matojobs@gmail.com" SMTP_PASS="fntt ydop xgrc qsqu" SMTP_FROM="noreply@jobsmato.com" node test-email-config.js
   ```

2. **Test Forgot Password**:
   ```bash
   curl -X POST http://localhost:5004/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

3. **Test Reset Password**:
   ```bash
   curl -X POST http://localhost:5004/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token": "your-token-here", "password": "newpassword123"}'
   ```

### Frontend Testing

1. **Test Forgot Password Flow**:
   - Click "Forget Password" in login modal
   - Enter email address
   - Check email for reset link
   - Click reset link to open reset page
   - Enter new password and confirm
   - Verify success message

2. **Test Direct Reset Link**:
   - Visit: `http://localhost:3000/reset-password?token=your-token-here`
   - Verify reset modal opens
   - Complete password reset

## Deployment Notes

### Environment Variables Required

```env
# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@jobsmato.com"

# Frontend URL (for reset links)
FRONTEND_URL="https://your-domain.com"
```

### Database Migration

The new `password_reset_tokens` table will be automatically created when the application starts (if using `synchronize: true` in development).

For production, create a migration:

```sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
```

### Production Considerations

1. **Email Service**: Ensure SMTP credentials are properly configured
2. **Rate Limiting**: Consider adding rate limiting to forgot password endpoint
3. **Token Cleanup**: Implement scheduled job to clean up expired tokens
4. **Monitoring**: Monitor email delivery success rates
5. **Frontend URL**: Ensure `FRONTEND_URL` is set correctly for production

## File Structure

```
backend/
├── src/
│   ├── entities/
│   │   └── password-reset-token.entity.ts (NEW)
│   └── modules/
│       ├── auth/
│       │   ├── auth.service.ts (MODIFIED)
│       │   └── auth.module.ts (MODIFIED)
│       └── email/ (NEW)
│           ├── email.service.ts
│           └── email.module.ts
├── test-email-config.js (NEW)
└── env.example (MODIFIED)

frontend/
├── src/
│   ├── components/
│   │   ├── ForgotPasswordModal.tsx (NEW)
│   │   ├── ResetPasswordModal.tsx (NEW)
│   │   ├── ResetPasswordPage.tsx (NEW)
│   │   ├── FormInput.tsx (MODIFIED)
│   │   └── LoginModal.tsx (MODIFIED)
│   ├── config/
│   │   └── api.ts (MODIFIED)
│   └── App.tsx (MODIFIED)
```

## Summary

The forgot password implementation provides a complete, secure, and user-friendly password reset flow:

✅ **Backend**: Secure token generation, email service, database storage
✅ **Frontend**: Modal-based UI, URL-based reset links, form validation
✅ **Security**: Token expiration, single-use tokens, password hashing
✅ **Email**: Professional HTML templates, Google SMTP integration
✅ **Documentation**: Comprehensive setup and deployment guide

The implementation follows security best practices and provides a smooth user experience for password recovery.
