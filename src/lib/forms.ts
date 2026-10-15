import { z } from 'zod';
import { BRAZILIAN_STATES, isValidDocument, onlyDigits } from './documents';

/*
 * Validações de formulário para retorno imediato ao usuário. A rotagest-api
 * revalida tudo; nenhuma regra crítica depende deste arquivo.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres`)
  .max(PASSWORD_MAX, `A senha deve ter no máximo ${PASSWORD_MAX} caracteres`)
  .regex(/[A-Za-z]/, 'A senha deve conter letras')
  .regex(/\d/, 'A senha deve conter números');

export const emailSchema = z.string().trim().toLowerCase().email('E-mail inválido').max(254);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

export const companySchema = z
  .object({
    tradeName: z.string().trim().min(2, 'Informe o nome comercial').max(120),
    legalName: optionalText(160),
    personType: z.enum(['INDIVIDUAL', 'COMPANY']),
    document: z.string().trim().transform(onlyDigits),
    phone: optionalText(20),
    email: emailSchema.optional().or(z.literal('').transform(() => undefined)),
    address: optionalText(200),
    city: optionalText(100),
    state: z.enum(BRAZILIAN_STATES).optional().or(z.literal('').transform(() => undefined)),
    postalCode: optionalText(9),
  })
  .superRefine((value, ctx) => {
    if (!isValidDocument(value.personType, value.document)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['document'],
        message: value.personType === 'INDIVIDUAL' ? 'CPF inválido' : 'CNPJ inválido',
      });
    }
  });
export type CompanyInput = z.infer<typeof companySchema>;
export * from './documents';
