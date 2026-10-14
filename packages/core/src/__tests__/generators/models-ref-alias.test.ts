import { describe, it, expect } from 'vitest';
import { generateModels } from '../../generators/models';

const specWith = (schemas: Record<string, any>, openapi = '3.1.0') => ({
  openapi,
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
  components: { schemas }
}) as any;

const generate = (spec: any) => generateModels(spec, {
  input: spec,
  output: { target: './test', mode: 'split', client: 'dio' }
} as any);

const fileAt = (files: { path: string; content: string }[], name: string) =>
  files.find(f => f.path === `models/${name}.f.dart`)?.content;

// The bug this guards against is an import of a file nobody wrote, which only
// surfaces later as a build_runner failure
function expectEveryImportResolves(files: { path: string; content: string }[]) {
  const paths = new Set(files.map(f => f.path));
  for (const file of files) {
    for (const match of file.content.matchAll(/^(?:import|export) '([a-z0-9_]+\.f\.dart)';$/gm)) {
      expect(paths.has(`models/${match[1]}`), `${file.path} -> ${match[1]}`).toBe(true);
    }
  }
}

describe('a schema whose body is a $ref', () => {
  const base = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] };

  it('should emit a typedef for an alias carrying sibling keywords', async () => {
    // OpenAPI 3.1 allows keywords next to $ref, and nestjs-zod emits `{ id, $ref }`
    // when a DTO is aliased under a second name
    const spec = specWith({
      OpenShiftResponseDto: base,
      OpenShiftResponseDtoV2: { id: 'OpenShiftResponseDtoV2', $ref: '#/components/schemas/OpenShiftResponseDto' }
    });
    const files = await generate(spec);

    const alias = files.find(f => f.path === 'models/open_shift_response_dto_v2.f.dart');
    expect(alias!.content).toContain('typedef OpenShiftResponseDtoV2 = OpenShiftResponseDto;');
    expect(alias!.content).toContain("import 'open_shift_response_dto.f.dart';");
    // The re-export is load-bearing: freezed writes its output as a `part of`
    // the referring model and resolves the typedef to the underlying class
    // there, so that class has to be in the referring file's scope
    expect(alias!.content).toContain("export 'open_shift_response_dto.f.dart';");
  });

  it('should emit a typedef for a bare $ref alias too', async () => {
    const spec = specWith({
      TimeOffRequestResponseDto: base,
      ManagersRequestsTimeOffRequestItemDto: { $ref: '#/components/schemas/TimeOffRequestResponseDto' }
    });
    const files = await generate(spec);

    const alias = files.find(f => f.path === 'models/managers_requests_time_off_request_item_dto.f.dart');
    expect(alias!.content).toContain(
      'typedef ManagersRequestsTimeOffRequestItemDto = TimeOffRequestResponseDto;'
    );
  });

  it('should leave referring models with an import that resolves', async () => {
    const spec = specWith({
      OpenShiftResponseDto: base,
      OpenShiftResponseDtoV2: { id: 'OpenShiftResponseDtoV2', $ref: '#/components/schemas/OpenShiftResponseDto' },
      ShiftResponseDto: {
        type: 'object',
        properties: {
          openShiftResponses: { type: 'array', items: { $ref: '#/components/schemas/OpenShiftResponseDtoV2' } }
        }
      }
    });
    const files = await generate(spec);

    // The referring model names the alias, so a file has to carry that name
    const referrer = files.find(f => f.path === 'models/shift_response_dto.f.dart');
    expect(referrer!.content).toContain("import 'open_shift_response_dto_v2.f.dart';");
    expect(referrer!.content).toContain('List<OpenShiftResponseDtoV2>?');

    expectEveryImportResolves(files);

    expect(files.find(f => f.path === 'models/index.dart')!.content)
      .toContain("export 'open_shift_response_dto_v2.f.dart';");
  });

  it('should keep every line of a multi-line description a doc comment', async () => {
    const spec = specWith({
      Base: base,
      AliasA: { $ref: '#/components/schemas/Base', description: 'line one\nline two' }
    });
    const files = await generate(spec);

    expect(fileAt(files, 'alias_a')).toContain('/// line one\n/// line two\ntypedef AliasA = Base;');
  });

  it('should give an alias of a schema that allows anything a file to import', async () => {
    const spec = specWith({
      Empty: {},
      AliasEmpty: { $ref: '#/components/schemas/Empty' },
      Holder: {
        type: 'object',
        properties: {
          direct: { $ref: '#/components/schemas/Empty' },
          aliased: { $ref: '#/components/schemas/AliasEmpty' }
        }
      }
    });
    const files = await generate(spec);

    expect(fileAt(files, 'empty')).toContain('typedef Empty = dynamic;');
    expect(fileAt(files, 'alias_empty')).toContain('typedef AliasEmpty = Empty;');
    expectEveryImportResolves(files);
  });

  it('should treat a $ref carrying only constraints as an alias', async () => {
    const spec = specWith({
      Base: base,
      Constrained: { $ref: '#/components/schemas/Base', nullable: true, minProperties: 1 },
      Holder: { type: 'object', properties: { c: { $ref: '#/components/schemas/Constrained' } } }
    });
    const files = await generate(spec);

    expect(fileAt(files, 'constrained')).toContain('typedef Constrained = Base;');
    expectEveryImportResolves(files);
  });

  it('should extend the target when a 3.1 $ref carries properties of its own', async () => {
    // 3.1 applies keywords beside $ref along with the target - an allOf of the two
    const spec = specWith({
      Base: base,
      Narrowed: { $ref: '#/components/schemas/Base', type: 'object', properties: { extra: { type: 'string' } } },
      Holder: { type: 'object', properties: { n: { $ref: '#/components/schemas/Narrowed' } } }
    });
    const files = await generate(spec);

    const narrowed = fileAt(files, 'narrowed');
    expect(narrowed).toContain('class Narrowed');
    expect(narrowed).toContain('required String id');
    expect(narrowed).toContain('String? extra');
    expectEveryImportResolves(files);
  });

  it('should alias a 3.0 $ref whatever sits beside it', async () => {
    // 3.0 ignores keywords beside $ref, so these are just second names
    const spec = specWith({
      Base: base,
      NullableBase: { $ref: '#/components/schemas/Base', nullable: true },
      Ignored: { $ref: '#/components/schemas/Base', properties: { extra: { type: 'string' } } },
      Holder: {
        type: 'object',
        properties: {
          a: { $ref: '#/components/schemas/NullableBase' },
          b: { $ref: '#/components/schemas/Ignored' }
        }
      }
    }, '3.0.3');
    const files = await generate(spec);

    expect(fileAt(files, 'nullable_base')).toContain('typedef NullableBase = Base;');
    expect(fileAt(files, 'ignored')).toContain('typedef Ignored = Base;');
    expectEveryImportResolves(files);
  });
});
