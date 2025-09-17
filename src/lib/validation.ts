// Email validation utilities
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email providers to block
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
  'temp-mail.org', 'throwaway.email', 'maildrop.cc', 'fakeinbox.com',
  'getnada.com', 'sharklasers.com', 'yopmail.com', 'getairmail.com'
];

// Common weak passwords to block
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', '1234567890', 'iloveyou', 'monkey'
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PasswordStrength {
  score: number; // 0-5
  feedback: string;
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    common: boolean;
  };
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();
  
  if (!normalizedEmail) {
    errors.push('Email is required');
    return { isValid: false, errors, warnings };
  }
  
  // Basic format validation
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.push('Please enter a valid email address');
    return { isValid: false, errors, warnings };
  }
  
  // Extract domain
  const domain = normalizedEmail.split('@')[1];
  
  // Check for disposable email
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    errors.push('Disposable email addresses are not allowed');
  }
  
  // Check for common typos in popular domains
  const popularDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const similarDomains: { [key: string]: string } = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com'
  };
  
  if (similarDomains[domain]) {
    warnings.push(`Did you mean ${similarDomains[domain]}?`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors, warnings };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Avoid repeating the same character multiple times');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getPasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    common: !COMMON_PASSWORDS.includes(password.toLowerCase())
  };
  
  let score = 0;
  let feedback = '';
  
  // Calculate score based on requirements
  Object.values(requirements).forEach(met => {
    if (met) score++;
  });
  
  // Adjust score based on length
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;
  
  // Generate feedback
  if (score <= 2) {
    feedback = 'Very weak - Add more character types';
  } else if (score <= 3) {
    feedback = 'Weak - Consider adding more variety';
  } else if (score <= 4) {
    feedback = 'Fair - Almost there!';
  } else if (score <= 5) {
    feedback = 'Good - Nice and secure';
  } else {
    feedback = 'Excellent - Very strong password';
  }
  
  return {
    score: Math.min(score, 5),
    feedback,
    requirements
  };
}

// Rate limiting utility
class RateLimit {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;
  
  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier);
    
    if (!attempts) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - attempts.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if under limit
    if (attempts.count >= this.maxAttempts) {
      return false;
    }
    
    // Increment count
    attempts.count++;
    attempts.lastAttempt = now;
    return true;
  }
  
  getRemainingTime(identifier: string): number {
    const attempts = this.attempts.get(identifier);
    if (!attempts || attempts.count < this.maxAttempts) return 0;
    
    const remaining = this.windowMs - (Date.now() - attempts.lastAttempt);
    return Math.max(0, remaining);
  }
}

export const authRateLimit = new RateLimit(5, 15 * 60 * 1000); // 5 attempts per 15 minutes