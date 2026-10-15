/**
 * Aliases legíveis dos tipos GERADOS a partir do contrato OpenAPI da
 * rotagest-api (src/api/schema.d.ts). Não declare DTOs à mão aqui:
 * rode `npm run api:types` quando a API mudar.
 */
import type { components } from './schema';

type S = components['schemas'];

export type Permission = S['Permission'];
export type MemberRole = S['MemberRole'];
export type TokenResponse = S['TokenResponseDto'];
export type Me = S['MeResponseDto'];
export type Company = S['CompanyDto'];
export type CurrentCompany = S['CurrentCompanyDto'];
export type CreateCompanyRequest = S['CreateCompanyDto'];
export type CreateCompanyResponse = S['CreateCompanyResponseDto'];
export type UpdateCompanyRequest = S['UpdateCompanyDto'];
export type Member = S['MemberDto'];
export type Invitation = S['InvitationDto'];
export type InviteMemberRequest = S['InviteMemberDto'];
export type InviteResult = S['InviteResultDto'];
export type InvitationPreview = S['InvitationPreviewDto'];
export type SubscriptionInfo = S['SubscriptionDto'];
export type SubscriptionStatus = S['SubscriptionStatus'];
export type AccessControl = S['AccessControlDto'];
export type ApiErrorBody = S['ApiErrorDto'];
