import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
  private readonly sensitiveFields = [
    'password',
    'Password',
    'PASSWORD',
    'passwd',
    'pwd',
    'hashedPassword',
    'hashed_password',
    'passwordHash',
    'password_hash',
    'oldPassword',
    'old_password',
    'newPassword',
    'new_password',
    'confirmPassword',
    'confirm_password',
  ];

  // Fields that are allowed in responses (legitimate tokens, etc.)
  private readonly allowedFields = [
    'accessToken',
    'refreshToken',
    'token', // Only if it's a legitimate auth token response
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.sanitize(data)),
    );
  }

  /**
   * Recursively sanitize data by removing sensitive fields
   */
  private sanitize(data: any): any {
    // Handle null/undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    // Handle Date objects
    if (data instanceof Date) {
      return data;
    }

    // Handle primitive types
    if (typeof data !== 'object') {
      return data;
    }

    // Handle objects
    const sanitized: any = {};

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        // Check if key is sensitive
        if (this.isSensitiveField(key)) {
          // Skip sensitive fields - don't include them in response
          continue;
        }

        // Recursively sanitize nested objects/arrays
        sanitized[key] = this.sanitize(data[key]);
      }
    }

    return sanitized;
  }

  /**
   * Check if a field name is sensitive (password-related only)
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Allow legitimate tokens in responses
    if (this.allowedFields.includes(fieldName)) {
      return false;
    }
    
    // Direct match for password fields
    if (this.sensitiveFields.includes(fieldName) || 
        this.sensitiveFields.includes(lowerFieldName)) {
      return true;
    }

    // Pattern matching for password variations
    const passwordPatterns = [
      /^password$/i,
      /^passwd$/i,
      /^pwd$/i,
      /^.*password$/i, // ends with password (e.g., userPassword, oldPassword)
      /^password.*$/i, // starts with password (e.g., passwordHash)
      /^hashed[_-]?password$/i,
      /^password[_-]?hash$/i,
      /^.*[_-]?password[_-]?.*$/i, // contains password with underscores/hyphens
    ];

    return passwordPatterns.some((pattern) => pattern.test(fieldName));
  }
}

