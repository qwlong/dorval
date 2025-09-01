/**
 * Export all getter functions - aligned with Orval structure
 * Getters are responsible for extracting and processing data from schemas
 */

// Core getters
export * from './combine';
export * from './object';
export * from './scalar';

// Type handling
export * from './discriminators';
export * from './enum';
export * from './array';

// Request/Response handling
export * from './body';
export * from './parameters';
export * from './response';

// Operation handling
export * from './operation';
export * from './props';
export * from './route';

// Utilities
export * from './imports';