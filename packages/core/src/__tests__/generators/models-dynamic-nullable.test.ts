/**
 * `dynamic` already admits null. Appending `?` to it produces `dynamic?`,
 * which the Dart analyzer reports as `unnecessary_question_mark`.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { generateDartCode } from '../../index';
import { generateModels } from '../../generators/models';
import { TypeMapper } from '../../utils/type-mapper';

const spec = {
  openapi: '3.1.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
  components: {
    schemas: {
      TimeEntry: {
        type: 'object',
        required: ['clockIn'],
        properties: {
          clockIn: { type: 'string', format: 'date-time' },
          // `not: {}` is the never type - the field may not be present at all
          clockOut: { not: {}, description: 'Must be empty for worker-created entries' },
          // 3.1 spells a null-only field this way
          publishedShift: { type: 'null', default: null },
          // no type at all - dorval falls back to dynamic
          payload: {},
          // nullable, but the element type stays a real type
          tags: { type: 'array', items: { type: 'string' } },
          note: { type: 'string' }
        }
      },
      Combined: {
        allOf: [
          { type: 'object', properties: { extra: {} } },
          { type: 'object', properties: { label: { type: 'string' } } }
        ]
      }
    }
  }
} as any;

const endpointSpec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/search': {
      get: {
        operationId: 'search',
        parameters: [
          { name: 'filter', in: 'query', required: false, schema: {} },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
          { name: 'x-any', in: 'header', required: false, schema: {} },
          { name: 'x-trace-id', in: 'header', required: false, schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'OK' } }
      }
    }
  }
};

async function generateEndpointFile(fileName: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dorval-dynamic-'));
  try {
    const specPath = path.join(dir, 'spec.json');
    await fs.writeFile(specPath, JSON.stringify(endpointSpec));
    const files = await generateDartCode({
      input: specPath,
      output: { target: dir, mode: 'split', client: 'dio' }
    } as any);

    const file = files.find(f => f.path.endsWith(fileName));
    expect(file, `${fileName} in ${files.map(f => f.path).join(', ')}`).toBeDefined();
    return file!.content;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function generate(name: string): Promise<string> {
  const files = await generateModels(spec, {
    input: spec,
    output: { target: './test', mode: 'split', client: 'dio' }
  } as any);

  const file = files.find(f => f.path === `models/${name}.f.dart`);
  expect(file).toBeDefined();
  return file!.content;
}

describe('dynamic nullability', () => {
  it('leaves dynamic alone', () => {
    expect(TypeMapper.toNullable('dynamic')).toBe('dynamic');
  });

  it('does not double up an existing ?', () => {
    expect(TypeMapper.toNullable('String?')).toBe('String?');
  });

  it('still makes real types nullable', () => {
    expect(TypeMapper.toNullable('String')).toBe('String?');
    expect(TypeMapper.toNullable('List<dynamic>')).toBe('List<dynamic>?');
  });

  it('emits no dynamic? for a never, a null or an untyped property', async () => {
    const content = await generate('time_entry');

    expect(content).not.toContain('dynamic?');
    expect(content).toContain('dynamic clockOut');
    expect(content).toContain('dynamic publishedShift');
    expect(content).toContain('dynamic payload');
  });

  it('keeps ? on optional properties that have a real type', async () => {
    const content = await generate('time_entry');

    expect(content).toContain('String? note');
    expect(content).toContain('List<String>? tags');
  });

  it('emits no dynamic? for an untyped property inside allOf', async () => {
    const content = await generate('combined');

    expect(content).not.toContain('dynamic?');
    expect(content).toContain('dynamic extra');
    expect(content).toContain('String? label');
  });

  it('emits no dynamic? for an untyped optional query parameter', async () => {
    const content = await generateEndpointFile('search_params.f.dart');

    expect(content).not.toContain('dynamic?');
    expect(content).toContain('dynamic filter');
    expect(content).toContain('int? limit');
  });

  it('emits no dynamic? for an untyped optional header', async () => {
    const content = await generateEndpointFile('search_headers.f.dart');

    expect(content).not.toContain('dynamic?');
    expect(content).toContain('dynamic xAny');
    expect(content).toContain('String? xTraceId');
  });
});
