# MongoDB Operators and Special JSON Keys Support

## Overview

Dorval now properly handles MongoDB operators (like `$if`, `$switch`, `$match`) and other special JSON keys in OpenAPI schemas, generating valid Dart code with correct `@JsonKey` annotations.

## Problem

OpenAPI schemas can contain property names with special characters that require special handling in Dart:

1. **MongoDB operators** (`$if`, `$switch`, `$match`, etc.) - contain `$` which Dart interprets as string interpolation
2. **Dart reserved keywords** (`else`, `in`, `class`, etc.) - cannot be used as identifiers
3. **Special characters** (hyphens, parentheses, etc.) - need to be converted to valid Dart identifiers

### Example Schema

```json
{
  "ComponentWatchRuleTemplateExpression": {
    "type": "object",
    "properties": {
      "$if": { "type": "object" },
      "$switch": { "type": "object" },
      "$match": { "type": "object" },
      "else": { "type": "string" },
      "in": { "type": "string" },
      "each(c)": { "type": "string" }
    }
  }
}
```

## Solution

### 1. Preserve `$` in Property Names

MongoDB operators like `$if`, `$switch` are **valid Dart identifiers** when they start with `$`. The `$` prefix makes them different from keywords.

**Implementation** (`type-mapper.ts`):
```typescript
static toDartPropertyName(name: string): string {
  // Special case: preserve names starting with $
  // These are valid Dart identifiers even if the part after $ is a keyword
  if (name.startsWith('$')) {
    return name;  // Return as-is (e.g., $if, $switch, $else)
  }

  // ... rest of conversion logic
}
```

### 2. Use Raw Strings in `@JsonKey` Annotations

When JSON keys contain `$`, we must use Dart's raw string literal syntax `r'$key'` to prevent string interpolation errors.

**Implementation** (`template-manager.ts`):
```typescript
this.handlebars.registerHelper('jsonKeyQuote', (str: string) => {
  if (!str) return "''";
  // If string contains $, use raw string literal
  if (str.includes('$')) {
    return `r'${str}'`;
  }
  // Otherwise use regular string
  return `'${str}'`;
});
```

**Template usage** (`freezed-model.hbs`):
```handlebars
{{#if jsonKey}}
@JsonKey(name: {{{jsonKeyQuote jsonKey}}})
{{/if}}
```

### 3. Always Add `@JsonKey` for `$` Properties

Even when the property name matches the JSON key, we need `@JsonKey` annotation for properties containing `$` to ensure raw string usage.

**Implementation** (`model-generator.ts` and `object.ts`):
```typescript
// Always add jsonKey if names differ OR if propName contains $
jsonKey: (dartName !== propName || propName.includes('$')) ? propName : undefined
```

## Generated Code

### Input (OpenAPI Schema)
```json
{
  "properties": {
    "$if": { "type": "object" },
    "$switch": { "type": "object" },
    "else": { "type": "string" },
    "in": { "type": "string" }
  }
}
```

### Output (Dart Code)
```dart
@freezed
abstract class ComponentWatchRuleTemplateExpression with _$ComponentWatchRuleTemplateExpression {
  const factory ComponentWatchRuleTemplateExpression({
    @JsonKey(name: r'$if')        // ✅ Raw string prevents interpolation
    Map<String, dynamic>? $if,    // ✅ $ prefix is valid identifier

    @JsonKey(name: r'$switch')    // ✅ Raw string prevents interpolation
    Map<String, dynamic>? $switch, // ✅ $ prefix is valid identifier

    @JsonKey(name: 'else')        // ✅ Regular string (no $)
    String? else_,                // ✅ Keyword escaped with _

    @JsonKey(name: 'in')          // ✅ Regular string (no $)
    String? in_,                  // ✅ Keyword escaped with _
  }) = _ComponentWatchRuleTemplateExpression;

  factory ComponentWatchRuleTemplateExpression.fromJson(Map<String, dynamic> json) =>
      _$ComponentWatchRuleTemplateExpressionFromJson(json);
}
```

## Why This Works

### Dart String Interpolation vs Raw Strings

In Dart:
- `'$if'` - Tries to interpolate variable `if` (error: `if` is a keyword)
- `r'$if'` - Raw string literal, `$` is treated as literal character ✅

### Property Names with `$`

In Dart:
- `if` - Invalid (reserved keyword)
- `$if` - Valid ($ makes it a different identifier)
- `else` - Invalid (reserved keyword)
- `$else` - Valid ($ makes it a different identifier)

## Files Modified

1. **`packages/core/src/utils/type-mapper.ts`**
   - Modified `toDartPropertyName()` to preserve `$` prefix

2. **`packages/core/src/generators/model-generator.ts`**
   - Updated `jsonKey` logic to include properties with `$`

3. **`packages/core/src/getters/object.ts`**
   - Updated `processProperty()` to include properties with `$` in `jsonKey`

4. **`packages/core/src/templates/template-manager.ts`**
   - Added `jsonKeyQuote` Handlebars helper

5. **Template Files** (all updated to use `jsonKeyQuote` helper):
   - `freezed-model.hbs`
   - `freezed-union.hbs`
   - `freezed-params-model.hbs`
   - `freezed-headers-model.hbs`

## Test Coverage

### New Test File
`packages/core/src/__tests__/generators/models-special-jsonkeys.test.ts`

Covers:
- ✅ MongoDB operators with `$` prefix
- ✅ Dart reserved keywords
- ✅ Mixed special characters
- ✅ Complex nested structures
- ✅ File naming with special characters

### Updated Tests
`packages/core/src/__tests__/utils/type-mapper.test.ts`
- ✅ `should preserve MongoDB operators starting with $`

### Test Results
```
Test Files  35 passed (35)
Tests      371 passed | 3 skipped (374)
```

## Edge Cases Handled

| Input JSON Key | Dart Property Name | `@JsonKey` Annotation | Reason |
|----------------|-------------------|---------------------|---------|
| `$if` | `$if` | `@JsonKey(name: r'$if')` | Raw string for `$` |
| `$switch` | `$switch` | `@JsonKey(name: r'$switch')` | Raw string for `$` |
| `$else` | `$else` | `@JsonKey(name: r'$else')` | Raw string for `$` |
| `else` | `else_` | `@JsonKey(name: 'else')` | Keyword escaped |
| `in` | `in_` | `@JsonKey(name: 'in')` | Keyword escaped |
| `class` | `class_` | `@JsonKey(name: 'class')` | Keyword escaped |
| `each(c)` | `eachC` | `@JsonKey(name: 'each(c)')` | Special chars converted |
| `x-api-key` | `xApiKey` | `@JsonKey(name: 'x-api-key')` | Hyphens to camelCase |

## Benefits

1. **Full MongoDB Support** - All MongoDB aggregation pipeline operators work correctly
2. **No Build Errors** - Generated code compiles without Dart analyzer errors
3. **Type Safety** - Proper Freezed/json_serializable integration
4. **Backward Compatible** - No breaking changes to existing code generation

## References

- [Dart Language Specification - String Interpolation](https://dart.dev/guides/language/language-tour#strings)
- [Dart Raw Strings](https://dart.dev/guides/language/language-tour#strings)
- [MongoDB Aggregation Pipeline Operators](https://www.mongodb.com/docs/manual/reference/operator/aggregation/)
