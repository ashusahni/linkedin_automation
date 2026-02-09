/**
 * Validation Utilities
 * 
 * Common validation functions used across the application.
 */

import { ValidationError } from './errors.js';

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate LinkedIn URL
 */
export function validateLinkedInUrl(url) {
  if (!url) return false;
  const linkedInRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
  return linkedInRegex.test(url);
}

/**
 * Validate required fields in an object
 */
export function validateRequired(data, fields) {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      missing[0]
    );
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page, limit, maxLimit = 1000) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  
  if (pageNum < 1) {
    throw new ValidationError('Page must be greater than 0', 'page');
  }
  
  if (limitNum < 1) {
    throw new ValidationError('Limit must be greater than 0', 'limit');
  }
  
  if (limitNum > maxLimit) {
    throw new ValidationError(`Limit cannot exceed ${maxLimit}`, 'limit');
  }
  
  return { page: pageNum, limit: limitNum };
}

/**
 * Sanitize string input
 */
export function sanitizeString(str, maxLength = null) {
  if (typeof str !== 'string') return '';
  let sanitized = str.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid) {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate integer ID
 */
export function validateId(id) {
  const numId = parseInt(id, 10);
  return !isNaN(numId) && numId > 0;
}
