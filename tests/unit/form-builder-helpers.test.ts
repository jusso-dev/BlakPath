import { describe, expect, it } from 'vitest';
import { makeEmptyField, slugifyKey, uniqueKey } from '@/lib/forms/builder-helpers';
import { FORM_FIELD_TYPES, FormFieldsArraySchema } from '@/lib/forms/fields';

describe('slugifyKey', () => {
  it('lowercases and turns spaces into underscores', () => {
    expect(slugifyKey('First Name')).toBe('first_name');
  });

  it('collapses punctuation and repeated separators into single underscores', () => {
    expect(slugifyKey('Email  --  address!!')).toBe('email_address');
  });

  it('trims leading digits and underscores so the key starts with a letter', () => {
    expect(slugifyKey('123 Main street')).toBe('main_street');
    expect(slugifyKey('__weird')).toBe('weird');
  });

  it('trims trailing underscores', () => {
    expect(slugifyKey('trailing?')).toBe('trailing');
  });

  it('falls back to "field" when nothing usable remains', () => {
    expect(slugifyKey('')).toBe('field');
    expect(slugifyKey('123')).toBe('field');
    expect(slugifyKey('!!!')).toBe('field');
  });

  it('produces keys that satisfy the field key regex', () => {
    const keyRegex = /^[a-z][a-z0-9_]{0,40}$/;
    for (const label of ['First Name', '123 Main', 'A very '.repeat(20)]) {
      expect(slugifyKey(label)).toMatch(keyRegex);
    }
  });
});

describe('uniqueKey', () => {
  it('returns the base when it is free', () => {
    expect(uniqueKey('name', new Set())).toBe('name');
  });

  it('appends _2, _3 on collision', () => {
    const taken = new Set(['name']);
    expect(uniqueKey('name', taken)).toBe('name_2');
    taken.add('name_2');
    expect(uniqueKey('name', taken)).toBe('name_3');
  });
});

describe('makeEmptyField', () => {
  it('produces a schema-valid single-element array for every field type', () => {
    for (const type of FORM_FIELD_TYPES) {
      const field = makeEmptyField(type, new Set());
      const result = FormFieldsArraySchema.safeParse([field]);
      expect(result.success, `type ${type} should be valid`).toBe(true);
    }
  });

  it('gives select/multiselect a starting option', () => {
    for (const type of ['select', 'multiselect'] as const) {
      const field = makeEmptyField(type, new Set());
      expect(field.type).toBe(type);
      if (field.type === 'select' || field.type === 'multiselect') {
        expect(field.options).toEqual(['Option 1']);
      }
    }
  });

  it('mints unique keys against the taken set', () => {
    const first = makeEmptyField('text', new Set());
    const second = makeEmptyField('text', new Set([first.key]));
    expect(second.key).not.toBe(first.key);
  });
});
