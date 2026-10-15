import { describe, expect, it } from 'vitest';
import { companySchema, formatDocument, isValidCnpj, isValidCpf, passwordSchema } from './forms';

describe('validações de formulário', () => {
  it('CPF/CNPJ', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
  });
  it('senha e empresa', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    const parsed = companySchema.parse({ tradeName: 'Transportes', personType: 'COMPANY', document: '11.222.333/0001-81', email: '' });
    expect(parsed.document).toBe('11222333000181');
  });
});
