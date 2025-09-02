import { describe, it, expect, beforeEach } from 'vitest';
import { generateDartCode } from '../../index';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// Get __dirname that works in both CJS and ESM
let __dirname: string;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  // ESM
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} else {
  // CJS - use the global __dirname
  __dirname = (global as any).__dirname || path.dirname((global as any).__filename || '') || process.cwd();
}

describe('OneOf Specifications', () => {
  const specsDir = path.join(__dirname, '../../../tests/specifications');
  const outputDir = path.join(__dirname, '../../../tests/generated');

  beforeEach(async () => {
    await fs.ensureDir(outputDir);
    await fs.emptyDir(outputDir);
  });

  it('should handle simple oneOf', async () => {
    const spec = path.join(specsDir, 'one-of.yaml');
    const output = path.join(outputDir, 'one-of');
    
    const files = await generateDartCode({
      input: spec,
      output: {
        target: output,
        mode: 'split',
        client: 'dio'
      }
    });

    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
    
    // Check Pet model generates correctly
    const petFile = files.find(f => f.path.includes('pet.'));
    expect(petFile).toBeDefined();
    
    // Pet should be a union of Dog and Cat
    // In Dart/Freezed, this would be implemented as a sealed class with factory constructors
    expect(petFile?.content).toContain('Pet');
  });

  it('should handle oneOf with primitives', async () => {
    const spec = path.join(specsDir, 'one-of-primitive.yaml');
    const output = path.join(outputDir, 'one-of-primitive');
    
    const files = await generateDartCode({
      input: spec,
      output: {
        target: output,
        mode: 'split',
        client: 'dio'
      }
    });

    expect(files).toBeDefined();
    
    // Check Pets model
    const petsFile = files.find(f => f.path.includes('pets.'));
    expect(petsFile).toBeDefined();
    
    // petId should be nullable and handle oneOf
    expect(petsFile?.content).toContain('petId');
  });

  it('should handle nullable oneOf patterns', async () => {
    const spec = path.join(specsDir, 'null-type.yaml');
    const output = path.join(outputDir, 'null-type');
    
    const files = await generateDartCode({
      input: spec,
      output: {
        target: output,
        mode: 'split',
        client: 'dio'
      }
    });

    expect(files).toBeDefined();
    
    // Check NullableObject model
    const nullableFile = files.find(f => f.path.includes('nullable_object.'));
    expect(nullableFile).toBeDefined();
    
    // Properties should be nullable - at least one should use nullable syntax
    expect(nullableFile?.content).toContain('?');
    
    // Check that nullable types are properly handled
    expect(nullableFile?.content).toMatch(/String\?|int\?|bool\?|dynamic/);
    
    // The file should have the NullableObject class
    expect(nullableFile?.content).toContain('class NullableObject');
  });

  it('should handle nested oneOf', async () => {
    const spec = path.join(specsDir, 'one-of-nested.yaml');
    const output = path.join(outputDir, 'one-of-nested');
    
    const files = await generateDartCode({
      input: spec,
      output: {
        target: output,
        mode: 'split',
        client: 'dio'
      }
    });

    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
  });

  it('should handle required fields in oneOf', async () => {
    const spec = path.join(specsDir, 'one-of-required.yaml');
    const output = path.join(outputDir, 'one-of-required');
    
    const files = await generateDartCode({
      input: spec,
      output: {
        target: output,
        mode: 'split',
        client: 'dio'
      }
    });

    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
  });

  it('should handle allOf with oneOf combination', async () => {
    const spec = path.join(specsDir, 'all-of-one-of.yaml');
    const output = path.join(outputDir, 'all-of-one-of');
    
    const files = await generateDartCode({
      input: spec,
      output: {
        target: output,
        mode: 'split',
        client: 'dio'
      }
    });

    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
  });
});