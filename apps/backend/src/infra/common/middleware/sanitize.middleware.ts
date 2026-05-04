import type { Request, Response, NextFunction } from 'express';

function sanitizeRecursive(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeRecursive);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Remove keys that start with $ (MongoDB operators)
        if (key.startsWith('$')) {
          continue;
        }
        sanitized[key] = sanitizeRecursive(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

function sanitizeInPlace(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const keysToDelete: string[] = [];
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Mark keys starting with $ for deletion
      if (key.startsWith('$')) {
        keysToDelete.push(key);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively sanitize nested objects
        sanitizeInPlace(obj[key]);
      }
    }
  }

  // Delete marked keys
  for (const key of keysToDelete) {
    delete obj[key];
  }
}

export function mongoSanitizeMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize in place to avoid read-only property issues
      if (req.query) {
        sanitizeInPlace(req.query);
      }
      if (req.body) {
        sanitizeInPlace(req.body);
      }
      if (req.params) {
        sanitizeInPlace(req.params);
      }
    } catch (err) {
      // If sanitization fails, continue anyway
      console.warn('Sanitization warning:', err);
    }
    next();
  };
}