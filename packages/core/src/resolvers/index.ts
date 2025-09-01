/**
 * Schema resolution module
 * Handles schema resolution, reference resolution, and type resolution
 */

export * from './schema-resolver';
export { RefResolver } from '../utils/ref-resolver'; // Re-export from utils for now

// Future: Move ref-resolver.ts here and update imports throughout the codebase