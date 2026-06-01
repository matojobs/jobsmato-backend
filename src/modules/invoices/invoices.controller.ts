import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  // ── Financial Dashboard ────────────────────────────────────────────────────
  @Get('dashboard')
  dashboard(@Query('year') year?: string) {
    return this.svc.dashboard(year ? +year : undefined);
  }

  // ── Billing Rules ──────────────────────────────────────────────────────────
  @Get('billing-rules')
  getBillingRules(@Query('company') company?: string) {
    return this.svc.getBillingRules(company);
  }

  @Post('billing-rules')
  createBillingRule(@Body() body: any) {
    return this.svc.createBillingRule(body);
  }

  @Patch('billing-rules/:id')
  updateBillingRule(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateBillingRule(id, body);
  }

  /** Auto-lookup rule for a company + optional profile (used at joining confirmation) */
  @Get('billing-rules/lookup')
  lookupBillingRule(
    @Query('company') company: string,
    @Query('profile') profile?: string,
  ) {
    return this.svc.getBillingRule(company, profile);
  }

  // ── Joining Confirmation (sets locking period) ─────────────────────────────
  @Patch('joining/:applicationId/confirm')
  @Roles(UserRole.ADMIN) // also callable by recruiter role — handled in recruiter module
  confirmJoining(
    @Param('applicationId', ParseIntPipe) id: number,
    @Body() body: {
      joining_date: string;
      locking_period_days: number;
      billing_amount?: number;
      billing_type?: string;
      billing_rule_id?: string;
    },
  ) {
    return this.svc.confirmJoining(id, body);
  }

  // ── Active Status Update ───────────────────────────────────────────────────
  @Patch('active-status/:applicationId')
  updateActiveStatus(
    @Param('applicationId', ParseIntPipe) id: number,
    @Body('status') status: 'active' | 'left',
  ) {
    return this.svc.updateActiveStatus(id, status);
  }

  // ── Dropout Flow ───────────────────────────────────────────────────────────
  @Post('dropout/:applicationId')
  recordDropout(
    @Param('applicationId', ParseIntPipe) id: number,
    @Body() body: { dropout_reason: string; dropout_date: string; notes?: string },
  ) {
    return this.svc.recordDropout(id, body);
  }

  @Patch('replacement-eligibility/:applicationId')
  setReplacementEligibility(
    @Param('applicationId', ParseIntPipe) id: number,
    @Body() body: { eligible: boolean; replacement_window_days?: number },
  ) {
    return this.svc.setReplacementEligibility(id, body);
  }

  @Post('replacement/link')
  linkReplacement(
    @Body() body: {
      original_application_id: number;
      new_application_id: number;
      billing_rule: 'free_replacement' | 'partial_charge' | 'full_billing_reset';
    },
  ) {
    return this.svc.linkReplacement(
      body.original_application_id,
      body.new_application_id,
      body.billing_rule,
    );
  }

  // ── Billing Criteria ──────────────────────────────────────────────────────

  /** Get all criteria for a billing rule */
  @Get('billing-rules/:ruleId/criteria')
  getCriteria(@Param('ruleId') ruleId: string) {
    return this.svc.getCriteria(ruleId);
  }

  /** Add a criterion to a billing rule */
  @Post('billing-rules/:ruleId/criteria')
  addCriteria(@Param('ruleId') ruleId: string, @Body() body: any) {
    return this.svc.addCriteria(ruleId, body);
  }

  /** Update a criterion */
  @Patch('criteria/:criteriaId')
  updateCriteria(@Param('criteriaId') id: string, @Body() body: any) {
    return this.svc.updateCriteria(id, body);
  }

  /** Delete a criterion */
  @Delete('criteria/:criteriaId')
  deleteCriteria(@Param('criteriaId') id: string) {
    return this.svc.deleteCriteria(id);
  }

  /** Get criteria checklist for a specific candidate (with auto-evaluation) */
  @Get('criteria-status/:applicationId')
  getApplicationCriteriaStatus(@Param('applicationId', ParseIntPipe) id: number) {
    return this.svc.getApplicationCriteriaStatus(id);
  }

  /** Admin manually ticks a criterion for a candidate */
  @Patch('criteria-status/:applicationId/:criteriaId')
  updateCriteriaStatus(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Param('criteriaId') criteriaId: string,
    @Body() body: { is_met: boolean; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.svc.updateCriteriaStatus(applicationId, criteriaId, { ...body, verified_by_id: user.id });
  }

  /** Manually trigger eligibility evaluation for all joined candidates */
  @Post('evaluate-eligibility')
  evaluateAllEligibility() {
    return this.svc.evaluateAllEligibility();
  }

  // ── Billing Queue ──────────────────────────────────────────────────────────
  @Get('billing-queue')
  getBillingQueue(
    @Query('company') company?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.svc.getBillingQueue({
      company_name: company,
      month: month ? +month : undefined,
      year: year ? +year : undefined,
    });
  }

  @Get('billing-candidates')
  getBillingCandidates(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('company') company?: string,
  ) {
    return this.svc.getBillingCandidates(+month, +year, company);
  }

  // ── Invoice CRUD ───────────────────────────────────────────────────────────
  @Get()
  listInvoices(
    @Query('status') status?: string,
    @Query('company') company?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.listInvoices({
      status, company_name: company,
      month: month ? +month : undefined,
      year: year ? +year : undefined,
      invoice_type: type, page: page ? +page : 1,
    });
  }

  @Get(':id')
  getInvoice(@Param('id') id: string) {
    return this.svc.getInvoice(id);
  }

  @Post()
  createInvoice(@Body() body: any, @CurrentUser() user: any) {
    return this.svc.createInvoice(body, user.id);
  }

  @Patch(':id')
  updateInvoice(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateInvoice(id, body);
  }

  @Delete(':id')
  cancelInvoice(@Param('id') id: string) {
    return this.svc.cancelInvoice(id);
  }

  // ── Credit Notes ───────────────────────────────────────────────────────────
  @Post(':id/credit-note')
  createCreditNote(
    @Param('id') id: string,
    @Body() body: { reason: string; amount: number; application_ids?: number[]; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.svc.createCreditNote(id, body, user.id);
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  @Post(':id/payments')
  addPayment(
    @Param('id') invoiceId: string,
    @Body() body: {
      amount: number; payment_date: string;
      payment_reference?: string; payment_mode?: string; notes?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.svc.addPayment(invoiceId, body, user.id);
  }

  @Delete('payments/:paymentId')
  deletePayment(@Param('paymentId') paymentId: string) {
    return this.svc.deletePayment(paymentId);
  }
}
