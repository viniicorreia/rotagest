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

// Fase 2 — financeiro
export type Vehicle = S['VehicleDto'];
export type VehicleList = S['VehicleListDto'];
export type VehicleDetail = S['VehicleDetailDto'];
export type VehicleStatus = S['VehicleStatus'];
export type CreateVehicleRequest = S['CreateVehicleDto'];
export type Category = S['CategoryDto'];
export type CategoryType = S['CategoryType'];
export type Account = S['AccountDto'];
export type AccountList = S['AccountListDto'];
export type AccountType = S['FinancialAccountType'];
export type CreateAccountRequest = S['CreateAccountDto'];
export type Statement = S['StatementDto'];
export type StatementEntry = S['StatementEntryDto'];
export type Transfer = S['TransferDto'];
export type CreateTransferRequest = S['CreateTransferDto'];
export type AdjustmentRequest = S['AdjustmentDto'];
export type Payable = S['PayableDto'];
export type PayableDetail = S['PayableDetailDto'];
export type PayableList = S['PayableListDto'];
export type PayableStatus = S['PayableStatus'];
export type CreatePayableRequest = S['CreatePayableDto'];
export type CreatePayableResult = S['CreatePayableResultDto'];
export type Receivable = S['ReceivableDto'];
export type ReceivableDetail = S['ReceivableDetailDto'];
export type ReceivableList = S['ReceivableListDto'];
export type ReceivableStatus = S['ReceivableStatus'];
export type CreateReceivableRequest = S['CreateReceivableDto'];
export type Settlement = S['SettlementDto'];
export type SettleRequest = S['SettleDto'];
export type PaymentMethod = S['PaymentMethod'];
export type EntryKind = S['EntryKind'];
export type Attachment = S['AttachmentDto'];
export type RecurrenceRule = S['RecurrenceRuleDto'];
export type ObligationSummary = S['ObligationSummaryDto'];
export type Dashboard = S['DashboardDto'];

// Fase 3 — transporte
export type Driver = S['DriverDto'];
export type CreateDriverRequest = S['CreateDriverDto'];
export type Route = S['RouteDto'];
export type CreateRouteRequest = S['CreateRouteDto'];
export type Assignment = S['AssignmentDto'];
export type CreateAssignmentRequest = S['CreateAssignmentDto'];
export type MyAssignments = S['MyAssignmentsDto'];
export type DailyLog = S['DailyLogDto'];
export type DailyLogList = S['DailyLogListDto'];
export type CreateDailyLogRequest = S['CreateDailyLogDto'];
export type UpdateDailyLogRequest = S['UpdateDailyLogDto'];
export type BillingPreview = S['BillingPreviewDto'];
export type BillingResult = S['BillingResultDto'];
export type CreateBillingRequest = S['CreateBillingDto'];
export type Allocation = S['AllocationDto'];
export type AllocationInput = S['AllocationInputDto'];
export type Contractor = S['ContractorDto'];
export type CreateContractorRequest = S['CreateContractorDto'];
export type Contract = S['ContractDto'];
export type ContractDetail = S['ContractDetailDto'];
export type CreateContractRequest = S['CreateContractDto'];
export type ContractStatusRequest = S['ContractStatusDto'];
export type Maintenance = S['MaintenanceDto'];
export type MaintenanceList = S['MaintenanceListDto'];
export type CreateMaintenanceRequest = S['CreateMaintenanceDto'];
export type Fueling = S['FuelingDto'];
export type FuelingList = S['FuelingListDto'];
export type CreateFuelingRequest = S['CreateFuelingDto'];
export type CostSummary = S['CostSummaryDto'];
export type DriverExpense = S['DriverExpenseDto'];
export type DriverExpenseList = S['DriverExpenseListDto'];
export type CreateDriverExpenseRequest = S['CreateDriverExpenseDto'];
