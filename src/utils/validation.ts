import { logger } from './logger';

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a single field against multiple rules
 */
export function validateField(value: any, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  required: (message: string = 'هذا الحقل مطلوب'): ValidationRule => ({
    validate: (value: any) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined;
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value: string) => value.length >= min,
    message: message || `يجب أن يكون ${min} أحرف على الأقل`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value: string) => value.length <= max,
    message: message || `يجب أن لا يتجاوز ${max} أحرف`,
  }),

  email: (message: string = 'البريد الإلكتروني غير صحيح'): ValidationRule => ({
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  phone: (message: string = 'رقم الهاتف غير صحيح'): ValidationRule => ({
    validate: (value: string) => /^\+222[234]\d{7}$/.test(value),
    message,
  }),

  numeric: (message: string = 'يجب أن يكون رقماً'): ValidationRule => ({
    validate: (value: any) => !isNaN(parseFloat(value)) && isFinite(value),
    message,
  }),

  positiveNumber: (message: string = 'يجب أن يكون رقماً موجباً'): ValidationRule => ({
    validate: (value: any) => {
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num) && num > 0;
    },
    message,
  }),

  nonNegativeNumber: (message: string = 'يجب أن يكون رقماً غير سالب'): ValidationRule => ({
    validate: (value: any) => {
      const num = parseFloat(value);
      return !isNaN(num) && isFinite(num) && num >= 0;
    },
    message,
  }),

  integer: (message: string = 'يجب أن يكون عدداً صحيحاً'): ValidationRule => ({
    validate: (value: any) => {
      const num = parseFloat(value);
      return !isNaN(num) && Number.isInteger(num);
    },
    message,
  }),

  url: (message: string = 'الرابط غير صحيح'): ValidationRule => ({
    validate: (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  minValue: (min: number, message?: string): ValidationRule => ({
    validate: (value: any) => parseFloat(value) >= min,
    message: message || `يجب أن يكون ${min} أو أكثر`,
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    validate: (value: any) => parseFloat(value) <= max,
    message: message || `يجب أن لا يتجاوز ${max}`,
  }),

  matches: (pattern: RegExp, message: string): ValidationRule => ({
    validate: (value: string) => pattern.test(value),
    message,
  }),

  oneOf: (options: any[], message?: string): ValidationRule => ({
    validate: (value: any) => options.includes(value),
    message: message || 'القيمة غير صالحة',
  }),

  custom: (fn: (value: any) => boolean, message: string): ValidationRule => ({
    validate: fn,
    message,
  }),
};

/**
 * Validate an entire form object
 */
export interface FormValidationSchema {
  [fieldName: string]: ValidationRule[];
}

export interface FormValidationResult {
  valid: boolean;
  errors: { [fieldName: string]: string[] };
}

export function validateForm(
  data: { [key: string]: any },
  schema: FormValidationSchema
): FormValidationResult {
  const errors: { [key: string]: string[] } = {};
  let valid = true;

  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldValue = data[fieldName];
    const fieldResult = validateField(fieldValue, rules);

    if (!fieldResult.valid) {
      errors[fieldName] = fieldResult.errors;
      valid = false;
      logger.warn('Validation', `Field '${fieldName}' validation failed`, fieldResult.errors);
    }
  }

  if (valid) {
    logger.success('Validation', 'Form validation passed');
  } else {
    logger.error('Validation', 'Form validation failed', errors);
  }

  return { valid, errors };
}

/**
 * Sanitize and parse numeric inputs
 */
export function parseNumber(value: string | number, decimals: number = 2): number {
  if (typeof value === 'number') {
    return Number(value.toFixed(decimals));
  }

  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed)) {
    return 0;
  }

  return Number(parsed.toFixed(decimals));
}

/**
 * Sanitize string inputs
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize URL inputs
 */
export function sanitizeUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Get first error message from validation result
 */
export function getFirstError(result: ValidationResult): string | null {
  return result.errors.length > 0 ? result.errors[0] : null;
}

/**
 * Get first error for a specific field from form validation
 */
export function getFirstFormError(result: FormValidationResult, fieldName: string): string | null {
  const fieldErrors = result.errors[fieldName];
  return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : null;
}
