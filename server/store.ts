import type {
  AccountAccount,
  AccountJournal,
  AccountMove,
  AccountPayment,
  AccountTax,
  DashboardResponse,
  InvoiceAnalysisResponse,
  JournalItem,
  MoveLine,
  MoveType,
  Partner,
  Product,
} from '../src/types.ts';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function daysOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class OdooAccountingStore {
  companyName: string;
  currency: string;
  accounts: AccountAccount[];
  taxes: AccountTax[];
  journals: AccountJournal[];
  partners: Partner[];
  products: Product[];
  moves: AccountMove[];
  payments: AccountPayment[];
  private seqCounters: Record<string, number>;
  private nextMoveId = 1;
  private nextLineId = 1;
  private nextPaymentId = 1;
  private nextAccountId = 1;
  private nextCheckNumber = 10042;

  constructor() {
    this.companyName = process.env.ODOO_COMPANY_NAME || 'YourCompany';
    this.currency = process.env.ODOO_DEFAULT_CURRENCY || 'USD';
    this.seqCounters = { INV: 0, RINV: 0, BILL: 0, RBILL: 0, BNK1: 0, CSH1: 0, MISC: 0 };

    // Generic Chart of Accounts ported from addons/account/data/template/account.account-generic_coa.csv
    const rawCoa: Omit<AccountAccount, 'id'>[] = [
      { code: '1010', name: 'Current Assets', account_type: 'asset_current', reconcile: false, non_trade: false },
      { code: '1013', name: 'Accounts Receivable (PoS)', account_type: 'asset_receivable', reconcile: true, non_trade: false },
      { code: '101401', name: 'Bank', account_type: 'asset_cash', reconcile: false, non_trade: false },
      { code: '101501', name: 'Cash', account_type: 'asset_cash', reconcile: false, non_trade: false },
      { code: '1101', name: 'Inventory Valuation', account_type: 'asset_current', reconcile: false, non_trade: false },
      { code: '1104', name: 'Cost of Production', account_type: 'asset_current', reconcile: false, non_trade: false },
      { code: '1105', name: 'Work in Progress', account_type: 'asset_current', reconcile: false, non_trade: false },
      { code: '1210', name: 'Accounts Receivable', account_type: 'asset_receivable', reconcile: true, non_trade: false },
      { code: '1212', name: 'Accrued Income', account_type: 'asset_current', reconcile: false, non_trade: false },
      { code: '1220', name: "Owner's Current Account", account_type: 'asset_receivable', reconcile: true, non_trade: true },
      { code: '1310', name: 'Tax Paid', account_type: 'asset_current', reconcile: false, non_trade: false },
      { code: '1320', name: 'Tax Receivable', account_type: 'asset_receivable', reconcile: true, non_trade: true },
      { code: '1410', name: 'Prepaid Expenses', account_type: 'asset_prepayments', reconcile: false, non_trade: false },
      { code: '1510', name: 'Fixed Assets', account_type: 'asset_fixed', reconcile: false, non_trade: false },
      { code: '1910', name: 'Non-current assets', account_type: 'asset_non_current', reconcile: false, non_trade: false },
      { code: '2010', name: 'Current Liabilities', account_type: 'liability_current', reconcile: false, non_trade: false },
      { code: '201100', name: 'Credit Card', account_type: 'liability_credit_card', reconcile: false, non_trade: false },
      { code: '2110', name: 'Accounts Payable', account_type: 'liability_payable', reconcile: true, non_trade: false },
      { code: '2111', name: 'Accrued Expenses', account_type: 'liability_current', reconcile: false, non_trade: false },
      { code: '2120', name: 'Deferred Revenue', account_type: 'liability_current', reconcile: false, non_trade: false },
      { code: '2300', name: 'Salary Payable', account_type: 'liability_current', reconcile: true, non_trade: false },
      { code: '2301', name: 'Employee Payroll Taxes', account_type: 'liability_current', reconcile: true, non_trade: false },
      { code: '2302', name: 'Employer Payroll Taxes', account_type: 'liability_current', reconcile: true, non_trade: false },
      { code: '2510', name: 'Tax Received', account_type: 'liability_current', reconcile: false, non_trade: false },
      { code: '2520', name: 'Tax Payable', account_type: 'liability_payable', reconcile: true, non_trade: true },
      { code: '2910', name: 'Non-current Liabilities', account_type: 'liability_non_current', reconcile: false, non_trade: false },
      { code: '3010', name: 'Capital', account_type: 'equity', reconcile: false, non_trade: false },
      { code: '3020', name: 'Dividends', account_type: 'equity', reconcile: false, non_trade: false },
      { code: '4000', name: 'Product Sales', account_type: 'income', reconcile: false, non_trade: false },
      { code: '4410', name: 'Foreign Exchange Gain', account_type: 'income', reconcile: false, non_trade: false },
      { code: '4420', name: 'Cash Difference Gain', account_type: 'income', reconcile: false, non_trade: false },
      { code: '4430', name: 'Cash Discount Gain', account_type: 'income', reconcile: false, non_trade: false },
      { code: '4500', name: 'Other Income', account_type: 'income_other', reconcile: false, non_trade: false },
      { code: '5000', name: 'Cost of Goods Sold', account_type: 'expense_direct_cost', reconcile: false, non_trade: false },
      { code: '6000', name: 'Expenses', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6110', name: 'Purchase of Equipments', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6120', name: 'Rent', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6200', name: 'Bank Fees', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6300', name: 'Salary Expenses', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6410', name: 'Foreign Exchange Loss', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6420', name: 'Cash Difference Loss', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '6430', name: 'Cash Discount Loss', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '9610', name: 'RD Expenses', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '9620', name: 'Sales Expenses', account_type: 'expense', reconcile: false, non_trade: false },
      { code: '999998', name: 'Accumulated Retained Earnings', account_type: 'equity_retained', reconcile: false, non_trade: false },
      { code: '999999', name: 'Profit or Loss Appropriation', account_type: 'equity_unaffected', reconcile: false, non_trade: false },
    ];
    this.accounts = rawCoa.map((a) => ({ ...a, id: this.nextAccountId++ }));

    // Taxes ported from addons/account/data/template/account.tax-generic_coa.csv
    this.taxes = [
      { id: 1, name: '15%', amount: 15, type_tax_use: 'sale', tax_group: 'Tax 15%', account_code: '2510' },
      { id: 2, name: '15%', amount: 15, type_tax_use: 'purchase', tax_group: 'Tax 15%', account_code: '1310' },
      { id: 3, name: '0% Exports', amount: 0, type_tax_use: 'sale', tax_group: 'Tax 0%', account_code: '2510' },
      { id: 4, name: '0% Imports', amount: 0, type_tax_use: 'purchase', tax_group: 'Tax 0%', account_code: '1310' },
    ];

    this.journals = [
      { id: 1, name: 'Customer Invoices', code: 'INV', type: 'sale', default_account_code: '4000', show_on_dashboard: true, color: 1 },
      { id: 2, name: 'Vendor Bills', code: 'BILL', type: 'purchase', default_account_code: '6000', show_on_dashboard: true, color: 2 },
      { id: 3, name: 'Bank', code: 'BNK1', type: 'bank', default_account_code: '101401', bank_account_number: 'BANK134567890', show_on_dashboard: true, color: 3 },
      { id: 4, name: 'Cash', code: 'CSH1', type: 'cash', default_account_code: '101501', show_on_dashboard: true, color: 4 },
      { id: 5, name: 'Miscellaneous Operations', code: 'MISC', type: 'general', default_account_code: '6000', show_on_dashboard: true, color: 5 },
    ];

    this.partners = [
      {
        id: 1,
        name: 'Azure Interior',
        email: 'billing@azure-interior.example.com',
        phone: '+1 870-931-0505',
        street: '4557 De Silva St',
        city: 'Fremont, CA',
        country: 'United States',
        vat: 'US123456789',
        is_customer: true,
        is_vendor: true,
        payment_term: '30 Days',
      },
      {
        id: 2,
        name: 'Deco Addict',
        email: 'accounts@decoaddict.example.com',
        phone: '+1 603-996-3829',
        street: '77 Santa Barbara Rd',
        city: 'Pleasant Hill, CA',
        country: 'United States',
        vat: 'US987654321',
        is_customer: true,
        is_vendor: false,
        payment_term: 'Immediate Payment',
      },
      {
        id: 3,
        name: 'Gemini Furniture',
        email: 'finance@geminifurniture.example.com',
        phone: '+1 941-284-4875',
        street: '3175 Bowers Ave',
        city: 'Santa Clara, CA',
        country: 'United States',
        vat: 'US456789123',
        is_customer: true,
        is_vendor: true,
        payment_term: '15 Days',
      },
      {
        id: 4,
        name: 'Ready Mat',
        email: 'ap@readymat.example.com',
        phone: '+1 555-752-9104',
        street: '1040 N Shoreline Blvd',
        city: 'Mountain View, CA',
        country: 'United States',
        vat: 'US221199887',
        is_customer: true,
        is_vendor: true,
        payment_term: 'End of Following Month',
      },
      {
        id: 5,
        name: 'Wood Corner',
        email: 'orders@woodcorner.example.com',
        phone: '+1 415-829-3300',
        street: '1839 Oakdale Ave',
        city: 'San Francisco, CA',
        country: 'United States',
        vat: 'US665544332',
        is_customer: false,
        is_vendor: true,
        payment_term: '30 Days',
      },
      {
        id: 6,
        name: 'Lumber Inc',
        email: 'invoices@lumberinc.example.com',
        phone: '+1 503-482-7712',
        street: '412 Timber Way',
        city: 'Portland, OR',
        country: 'United States',
        vat: 'US334455667',
        is_customer: false,
        is_vendor: true,
        payment_term: '15 Days',
      },
    ];

    this.products = [
      { id: 1, name: 'Customizable Desk', default_code: 'FURN_0096', list_price: 750, standard_price: 500, income_account_code: '4000', expense_account_code: '5000', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Units' },
      { id: 2, name: 'Acoustic Bloc Screens', default_code: 'FURN_6666', list_price: 295, standard_price: 180, income_account_code: '4000', expense_account_code: '5000', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Units' },
      { id: 3, name: 'Conference Chair', default_code: 'FURN_7777', list_price: 165, standard_price: 95, income_account_code: '4000', expense_account_code: '5000', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Units' },
      { id: 4, name: 'Cabinet with Doors', default_code: 'E-COM11', list_price: 140, standard_price: 85, income_account_code: '4000', expense_account_code: '5000', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Units' },
      { id: 5, name: 'Storage Box', default_code: 'E-COM08', list_price: 15.8, standard_price: 9, income_account_code: '4000', expense_account_code: '5000', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Units' },
      { id: 6, name: 'Office Design Service', default_code: 'SERV_01', list_price: 120, standard_price: 60, income_account_code: '4000', expense_account_code: '6000', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Hours' },
      { id: 7, name: 'Industrial CNC Equipment', default_code: 'EQUIP_04', list_price: 3400, standard_price: 2800, income_account_code: '4000', expense_account_code: '6110', sale_tax_id: 1, purchase_tax_id: 2, uom: 'Units' },
    ];

    this.moves = [];
    this.payments = [];

    this.seedDemoData();
  }

  private getAccountName(code: string): string {
    return this.accounts.find((a) => a.code === code)?.name || 'Unknown Account';
  }

  private nextSequence(prefix: string, dateStr: string): string {
    const year = dateStr.slice(0, 4) || new Date().getFullYear().toString();
    this.seqCounters[prefix] = (this.seqCounters[prefix] || 0) + 1;
    return `${prefix}/${year}/${String(this.seqCounters[prefix]).padStart(5, '0')}`;
  }

  private defaultJournalId(moveType: MoveType): number {
    if (moveType === 'out_invoice' || moveType === 'out_refund') return 1;
    if (moveType === 'in_invoice' || moveType === 'in_refund') return 2;
    return 5;
  }

  private sequencePrefix(moveType: MoveType, journalCode: string): string {
    if (moveType === 'out_invoice') return 'INV';
    if (moveType === 'out_refund') return 'RINV';
    if (moveType === 'in_invoice') return 'BILL';
    if (moveType === 'in_refund') return 'RBILL';
    return journalCode || 'MISC';
  }

  private computeMoveTotalsAndItems(
    moveType: MoveType,
    partnerId: number,
    rawLines: Omit<MoveLine, 'id' | 'price_subtotal' | 'price_total'>[],
    existingLines?: MoveLine[],
  ): {
    lines: MoveLine[];
    journal_items: JournalItem[];
    amount_untaxed: number;
    amount_tax: number;
    amount_total: number;
  } {
    const partnerName = this.partners.find((p) => p.id === partnerId)?.name || '';
    let amountUntaxed = 0;
    let amountTax = 0;

    const lines: MoveLine[] = rawLines.map((rl, idx) => {
      const subtotal = round2(rl.quantity * rl.price_unit * (1 - (rl.discount || 0) / 100));
      let lineTax = 0;
      for (const tid of rl.tax_ids || []) {
        const tax = this.taxes.find((t) => t.id === tid);
        if (tax) {
          lineTax += round2(subtotal * (tax.amount / 100));
        }
      }
      const total = round2(subtotal + lineTax);
      amountUntaxed = round2(amountUntaxed + subtotal);
      amountTax = round2(amountTax + lineTax);
      return {
        id: existingLines?.[idx]?.id ?? this.nextLineId++,
        product_id: rl.product_id ?? null,
        name: rl.name,
        account_code: rl.account_code || (moveType.startsWith('out') ? '4000' : '6000'),
        quantity: rl.quantity,
        price_unit: rl.price_unit,
        discount: rl.discount || 0,
        tax_ids: rl.tax_ids || [],
        price_subtotal: subtotal,
        price_total: total,
      };
    });

    const amountTotal = round2(amountUntaxed + amountTax);
    const journal_items: JournalItem[] = [];
    let itemId = 1;

    const isCustomerDoc = moveType === 'out_invoice' || moveType === 'out_refund';
    const isDebitOnReceivable = moveType === 'out_invoice' || moveType === 'in_refund';
    const counterpartyAccount = isCustomerDoc ? '1210' : '2110';

    // Line items
    const taxBucket = new Map<string, { label: string; amount: number }>();

    for (const line of lines) {
      const amt = Math.abs(line.price_subtotal);
      if (amt === 0) continue;
      if (isDebitOnReceivable) {
        journal_items.push({
          id: itemId++,
          account_code: line.account_code,
          account_name: this.getAccountName(line.account_code),
          partner_name: partnerName,
          label: line.name,
          debit: 0,
          credit: amt,
        });
      } else {
        journal_items.push({
          id: itemId++,
          account_code: line.account_code,
          account_name: this.getAccountName(line.account_code),
          partner_name: partnerName,
          label: line.name,
          debit: amt,
          credit: 0,
        });
      }

      for (const tid of line.tax_ids) {
        const tax = this.taxes.find((t) => t.id === tid);
        if (!tax || tax.amount === 0) continue;
        const tAmt = round2(line.price_subtotal * (tax.amount / 100));
        const key = `${tax.account_code}:${tax.name}`;
        const prev = taxBucket.get(key);
        taxBucket.set(key, {
          label: `${tax.tax_group} (${tax.type_tax_use === 'sale' ? 'Sales' : 'Purchase'})`,
          amount: round2((prev?.amount || 0) + tAmt),
        });
      }
    }

    // Tax items
    for (const [key, val] of taxBucket.entries()) {
      const code = key.split(':')[0];
      const amt = Math.abs(val.amount);
      if (amt === 0) continue;
      journal_items.push({
        id: itemId++,
        account_code: code,
        account_name: this.getAccountName(code),
        partner_name: partnerName,
        label: val.label,
        debit: isDebitOnReceivable ? 0 : amt,
        credit: isDebitOnReceivable ? amt : 0,
      });
    }

    // Receivable / Payable balancing item
    if (amountTotal > 0) {
      journal_items.push({
        id: itemId++,
        account_code: counterpartyAccount,
        account_name: this.getAccountName(counterpartyAccount),
        partner_name: partnerName,
        label: isCustomerDoc ? 'Customer Receivable' : 'Vendor Payable',
        debit: isDebitOnReceivable ? amountTotal : 0,
        credit: isDebitOnReceivable ? 0 : amountTotal,
      });
    }

    return {
      lines,
      journal_items,
      amount_untaxed: amountUntaxed,
      amount_tax: amountTax,
      amount_total: amountTotal,
    };
  }

  private enrichMove(move: AccountMove): AccountMove {
    const journal = this.journals.find((j) => j.id === move.journal_id);
    const partner = this.partners.find((p) => p.id === move.partner_id);
    return {
      ...move,
      journal_name: journal?.name || '',
      journal_code: journal?.code || '',
      partner_name: partner?.name || 'Unknown Partner',
    };
  }

  private seedDemoData(): void {
    // Opening capital bank balance journal entry
    const openingMove: AccountMove = {
      id: this.nextMoveId++,
      name: this.nextSequence('MISC', daysOffset(-60)),
      move_type: 'entry',
      state: 'posted',
      payment_state: 'paid',
      journal_id: 5,
      partner_id: 1,
      invoice_date: daysOffset(-60),
      invoice_date_due: daysOffset(-60),
      payment_reference: 'OPENING-BALANCE',
      payment_term: 'Immediate Payment',
      currency: this.currency,
      edi_state: 'none',
      lines: [
        {
          id: this.nextLineId++,
          product_id: null,
          name: 'Opening Bank Balance',
          account_code: '101401',
          quantity: 1,
          price_unit: 48500,
          discount: 0,
          tax_ids: [],
          price_subtotal: 48500,
          price_total: 48500,
        },
      ],
      journal_items: [
        { id: 1, account_code: '101401', account_name: 'Bank', partner_name: this.companyName, label: 'Initial Bank Capital', debit: 45000, credit: 0 },
        { id: 2, account_code: '101501', account_name: 'Cash', partner_name: this.companyName, label: 'Petty Cash Float', debit: 3500, credit: 0 },
        { id: 3, account_code: '3010', account_name: 'Capital', partner_name: this.companyName, label: 'Owner Capital', debit: 0, credit: 48500 },
      ],
      amount_untaxed: 48500,
      amount_tax: 0,
      amount_total: 48500,
      amount_residual: 0,
      narration: 'Initial opening balances for Bank and Cash journals.',
    };
    this.moves.push(openingMove);

    // Demo Customer Invoices (inspired by addons/account/demo/account_demo.py)
    const inv1 = this.createMove({
      move_type: 'out_invoice',
      partner_id: 1,
      invoice_date: daysOffset(-28),
      invoice_date_due: daysOffset(-3),
      payment_term: '30 Days',
      lines: [
        { product_id: 1, name: '[FURN_0096] Customizable Desk', account_code: '4000', quantity: 5, price_unit: 750, discount: 0, tax_ids: [1] },
        { product_id: 2, name: '[FURN_6666] Acoustic Bloc Screens', account_code: '4000', quantity: 5, price_unit: 295, discount: 0, tax_ids: [1] },
      ],
    });
    this.postMove(inv1.id);

    const inv2 = this.createMove({
      move_type: 'out_invoice',
      partner_id: 2,
      invoice_date: daysOffset(-18),
      invoice_date_due: daysOffset(-5),
      payment_term: 'Immediate Payment',
      lines: [
        { product_id: 3, name: '[FURN_7777] Conference Chair', account_code: '4000', quantity: 12, price_unit: 165, discount: 0, tax_ids: [1] },
        { product_id: 4, name: '[E-COM11] Cabinet with Doors', account_code: '4000', quantity: 4, price_unit: 140, discount: 0, tax_ids: [1] },
      ],
    });
    this.postMove(inv2.id);

    const inv3 = this.createMove({
      move_type: 'out_invoice',
      partner_id: 3,
      invoice_date: daysOffset(-12),
      invoice_date_due: daysOffset(18),
      payment_term: '30 Days',
      lines: [
        { product_id: 1, name: '[FURN_0096] Customizable Desk', account_code: '4000', quantity: 8, price_unit: 750, discount: 5, tax_ids: [1] },
        { product_id: 6, name: '[SERV_01] Office Design Service', account_code: '4000', quantity: 10, price_unit: 120, discount: 0, tax_ids: [1] },
      ],
    });
    this.postMove(inv3.id);
    // Pay inv3 in full
    this.createAndPostPayment({
      payment_type: 'inbound',
      journal_id: 3,
      partner_id: 3,
      amount: inv3.amount_total,
      date: daysOffset(-6),
      memo: inv3.name,
      payment_method: 'wire',
      move_id: inv3.id,
    });

    const inv4 = this.createMove({
      move_type: 'out_invoice',
      partner_id: 4,
      invoice_date: daysOffset(-4),
      invoice_date_due: daysOffset(26),
      payment_term: 'End of Following Month',
      lines: [
        { product_id: 2, name: '[FURN_6666] Acoustic Bloc Screens', account_code: '4000', quantity: 10, price_unit: 295, discount: 0, tax_ids: [1] },
        { product_id: 5, name: '[E-COM08] Storage Box', account_code: '4000', quantity: 40, price_unit: 15.8, discount: 0, tax_ids: [1] },
      ],
    });
    this.postMove(inv4.id);

    // Draft customer invoice
    this.createMove({
      move_type: 'out_invoice',
      partner_id: 1,
      invoice_date: daysOffset(0),
      invoice_date_due: daysOffset(30),
      payment_term: '30 Days',
      lines: [
        { product_id: 6, name: '[SERV_01] Office Design Service', account_code: '4000', quantity: 16, price_unit: 120, discount: 0, tax_ids: [1] },
      ],
    });

    // Demo Vendor Bills
    const bill1 = this.createMove({
      move_type: 'in_invoice',
      partner_id: 5,
      invoice_date: daysOffset(-22),
      invoice_date_due: daysOffset(-2),
      payment_term: '15 Days',
      lines: [
        { product_id: 7, name: '[EQUIP_04] Industrial CNC Equipment', account_code: '6110', quantity: 1, price_unit: 2800, discount: 0, tax_ids: [2] },
      ],
    });
    this.postMove(bill1.id);

    const bill2 = this.createMove({
      move_type: 'in_invoice',
      partner_id: 6,
      invoice_date: daysOffset(-14),
      invoice_date_due: daysOffset(16),
      payment_term: '30 Days',
      lines: [
        { product_id: null, name: 'Hardwood Timber Batch #408', account_code: '5000', quantity: 12, price_unit: 145, discount: 0, tax_ids: [2] },
        { product_id: null, name: 'Freight & Handling', account_code: '6000', quantity: 1, price_unit: 220, discount: 0, tax_ids: [2] },
      ],
    });
    this.postMove(bill2.id);
    this.createAndPostPayment({
      payment_type: 'outbound',
      journal_id: 3,
      partner_id: 6,
      amount: bill2.amount_total,
      date: daysOffset(-4),
      memo: bill2.name,
      payment_method: 'check_printing',
      move_id: bill2.id,
    });

    // Draft vendor bill
    this.createMove({
      move_type: 'in_invoice',
      partner_id: 5,
      invoice_date: daysOffset(-1),
      invoice_date_due: daysOffset(29),
      payment_term: '30 Days',
      lines: [
        { product_id: null, name: 'Warehouse Monthly Rent', account_code: '6120', quantity: 1, price_unit: 1850, discount: 0, tax_ids: [] },
      ],
    });
  }

  listMoves(filters?: {
    move_type?: string;
    state?: string;
    payment_state?: string;
    journal_id?: number;
    search?: string;
  }): AccountMove[] {
    let result = this.moves.map((m) => this.enrichMove(m));
    if (filters?.move_type && filters.move_type !== 'all') {
      const types = filters.move_type.split(',');
      result = result.filter((m) => types.includes(m.move_type));
    }
    if (filters?.state && filters.state !== 'all') {
      result = result.filter((m) => m.state === filters.state);
    }
    if (filters?.payment_state && filters.payment_state !== 'all') {
      if (filters.payment_state === 'overdue') {
        const today = daysOffset(0);
        result = result.filter(
          (m) =>
            m.state === 'posted' &&
            m.payment_state !== 'paid' &&
            m.payment_state !== 'reversed' &&
            m.invoice_date_due < today,
        );
      } else {
        result = result.filter((m) => m.payment_state === filters.payment_state);
      }
    }
    if (filters?.journal_id) {
      result = result.filter((m) => m.journal_id === filters.journal_id);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.partner_name || '').toLowerCase().includes(q) ||
          m.payment_reference.toLowerCase().includes(q),
      );
    }
    return result.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date) || b.id - a.id);
  }

  getMove(id: number): AccountMove | null {
    const m = this.moves.find((x) => x.id === id);
    return m ? this.enrichMove(m) : null;
  }

  createMove(payload: {
    move_type: MoveType;
    partner_id: number;
    journal_id?: number;
    invoice_date?: string;
    invoice_date_due?: string;
    payment_reference?: string;
    payment_term?: string;
    narration?: string;
    invoice_origin?: string;
    reversed_entry_id?: number | null;
    debit_origin_id?: number | null;
    lines: Omit<MoveLine, 'id' | 'price_subtotal' | 'price_total'>[];
  }): AccountMove {
    const journalId = payload.journal_id || this.defaultJournalId(payload.move_type);
    const invDate = payload.invoice_date || daysOffset(0);
    const dueDate = payload.invoice_date_due || daysOffset(30);
    const computed = this.computeMoveTotalsAndItems(payload.move_type, payload.partner_id, payload.lines || []);

    const move: AccountMove = {
      id: this.nextMoveId++,
      name: 'Draft',
      move_type: payload.move_type,
      state: 'draft',
      payment_state: 'not_paid',
      journal_id: journalId,
      partner_id: payload.partner_id,
      invoice_date: invDate,
      invoice_date_due: dueDate,
      payment_reference: payload.payment_reference || '',
      payment_term: payload.payment_term || '30 Days',
      currency: this.currency,
      invoice_origin: payload.invoice_origin,
      reversed_entry_id: payload.reversed_entry_id ?? null,
      debit_origin_id: payload.debit_origin_id ?? null,
      edi_state: 'none',
      lines: computed.lines,
      journal_items: computed.journal_items,
      amount_untaxed: computed.amount_untaxed,
      amount_tax: computed.amount_tax,
      amount_total: computed.amount_total,
      amount_residual: computed.amount_total,
      narration: payload.narration || '',
    };
    this.moves.push(move);
    return this.enrichMove(move);
  }

  updateMove(
    id: number,
    payload: Partial<{
      partner_id: number;
      journal_id: number;
      invoice_date: string;
      invoice_date_due: string;
      payment_reference: string;
      payment_term: string;
      narration: string;
      lines: Omit<MoveLine, 'id' | 'price_subtotal' | 'price_total'>[];
    }>,
  ): AccountMove | null {
    const move = this.moves.find((m) => m.id === id);
    if (!move) return null;
    if (move.state !== 'draft') {
      throw new Error('Only draft entries can be modified. Reset to draft first.');
    }
    if (payload.partner_id !== undefined) move.partner_id = payload.partner_id;
    if (payload.journal_id !== undefined) move.journal_id = payload.journal_id;
    if (payload.invoice_date !== undefined) move.invoice_date = payload.invoice_date;
    if (payload.invoice_date_due !== undefined) move.invoice_date_due = payload.invoice_date_due;
    if (payload.payment_reference !== undefined) move.payment_reference = payload.payment_reference;
    if (payload.payment_term !== undefined) move.payment_term = payload.payment_term;
    if (payload.narration !== undefined) move.narration = payload.narration;

    if (payload.lines !== undefined) {
      const computed = this.computeMoveTotalsAndItems(move.move_type, move.partner_id, payload.lines, move.lines);
      move.lines = computed.lines;
      move.journal_items = computed.journal_items;
      move.amount_untaxed = computed.amount_untaxed;
      move.amount_tax = computed.amount_tax;
      move.amount_total = computed.amount_total;
      move.amount_residual = computed.amount_total;
    }

    return this.enrichMove(move);
  }

  deleteMove(id: number): boolean {
    const idx = this.moves.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    if (this.moves[idx].state === 'posted') {
      throw new Error('Cannot delete a posted journal entry. Reset to draft or cancel first.');
    }
    this.moves.splice(idx, 1);
    return true;
  }

  postMove(id: number): AccountMove | null {
    const move = this.moves.find((m) => m.id === id);
    if (!move) return null;
    if (move.state === 'posted') return this.enrichMove(move);
    if (move.lines.length === 0) {
      throw new Error('Add at least one invoice line before confirming.');
    }
    const journal = this.journals.find((j) => j.id === move.journal_id);
    if (move.name === 'Draft' || !move.name) {
      move.name = this.nextSequence(this.sequencePrefix(move.move_type, journal?.code || 'MISC'), move.invoice_date);
    }
    if (!move.payment_reference) {
      move.payment_reference = move.name;
    }
    move.state = 'posted';
    move.edi_state = move.move_type === 'out_invoice' || move.move_type === 'out_refund' ? 'sent' : 'none';
    return this.enrichMove(move);
  }

  resetToDraft(id: number): AccountMove | null {
    const move = this.moves.find((m) => m.id === id);
    if (!move) return null;
    move.state = 'draft';
    move.payment_state = 'not_paid';
    move.amount_residual = move.amount_total;
    return this.enrichMove(move);
  }

  cancelMove(id: number): AccountMove | null {
    const move = this.moves.find((m) => m.id === id);
    if (!move) return null;
    move.state = 'cancel';
    return this.enrichMove(move);
  }

  createCreditNote(id: number, reason: string): AccountMove | null {
    const orig = this.moves.find((m) => m.id === id);
    if (!orig) return null;
    const refundType: MoveType = orig.move_type === 'in_invoice' ? 'in_refund' : 'out_refund';
    const created = this.createMove({
      move_type: refundType,
      partner_id: orig.partner_id,
      journal_id: orig.journal_id,
      invoice_date: daysOffset(0),
      invoice_date_due: daysOffset(0),
      payment_term: orig.payment_term,
      invoice_origin: orig.name,
      reversed_entry_id: orig.id,
      narration: reason ? `Reversal of ${orig.name}: ${reason}` : `Reversal of ${orig.name}`,
      lines: orig.lines.map((l) => ({
        product_id: l.product_id,
        name: l.name,
        account_code: l.account_code,
        quantity: l.quantity,
        price_unit: l.price_unit,
        discount: l.discount,
        tax_ids: [...l.tax_ids],
      })),
    });
    orig.payment_state = 'reversed';
    orig.amount_residual = 0;
    return created;
  }

  createDebitNote(id: number, reason: string): AccountMove | null {
    const orig = this.moves.find((m) => m.id === id);
    if (!orig) return null;
    const debitType: MoveType = orig.move_type === 'in_invoice' || orig.move_type === 'in_refund' ? 'in_invoice' : 'out_invoice';
    return this.createMove({
      move_type: debitType,
      partner_id: orig.partner_id,
      journal_id: orig.journal_id,
      invoice_date: daysOffset(0),
      invoice_date_due: daysOffset(15),
      payment_term: orig.payment_term,
      invoice_origin: `Debit Note for ${orig.name}`,
      debit_origin_id: orig.id,
      narration: reason ? `Debit Note for ${orig.name}: ${reason}` : `Debit Note for ${orig.name}`,
      lines: orig.lines.map((l) => ({
        product_id: l.product_id,
        name: `[Debit Adjustment] ${l.name}`,
        account_code: l.account_code,
        quantity: l.quantity,
        price_unit: round2(l.price_unit * 0.1),
        discount: 0,
        tax_ids: [...l.tax_ids],
      })),
    });
  }

  generateUblXml(id: number): string | null {
    const move = this.getMove(id);
    if (!move) return null;
    const partner = this.partners.find((p) => p.id === move.partner_id);
    const linesXml = move.lines
      .map(
        (line, idx) => `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${line.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(move.currency)}">${line.price_subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(line.name)}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(move.currency)}">${line.price_unit.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ID>${escapeXml(move.name)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(move.invoice_date)}</cbc:IssueDate>
  <cbc:DueDate>${escapeXml(move.invoice_date_due)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${move.move_type.endsWith('refund') ? '381' : '380'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(move.currency)}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(this.companyName)}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(partner?.name || 'Customer')}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(partner?.street || '')}</cbc:StreetName>
        <cbc:CityName>${escapeXml(partner?.city || '')}</cbc:CityName>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(move.currency)}">${move.amount_tax.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(move.currency)}">${move.amount_untaxed.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(move.currency)}">${move.amount_untaxed.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(move.currency)}">${move.amount_total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(move.currency)}">${move.amount_residual.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${linesXml}
</Invoice>`;
  }

  listPayments(paymentType?: string): AccountPayment[] {
    let list = this.payments.map((p) => ({
      ...p,
      journal_name: this.journals.find((j) => j.id === p.journal_id)?.name || '',
      partner_name: this.partners.find((pt) => pt.id === p.partner_id)?.name || '',
      move_name: p.move_id ? this.moves.find((m) => m.id === p.move_id)?.name || null : null,
    }));
    if (paymentType && paymentType !== 'all') {
      list = list.filter((p) => p.payment_type === paymentType);
    }
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  createAndPostPayment(payload: {
    payment_type: 'inbound' | 'outbound';
    journal_id: number;
    partner_id: number;
    amount: number;
    date?: string;
    memo?: string;
    payment_method?: 'manual' | 'check_printing' | 'sepa' | 'wire';
    move_id?: number | null;
    auto_post?: boolean;
  }): AccountPayment {
    const date = payload.date || daysOffset(0);
    const journal = this.journals.find((j) => j.id === payload.journal_id) || this.journals[2];
    const payment: AccountPayment = {
      id: this.nextPaymentId++,
      name: this.nextSequence(journal.code, date),
      payment_type: payload.payment_type,
      state: payload.auto_post === false ? 'draft' : 'posted',
      journal_id: journal.id,
      partner_id: payload.partner_id,
      amount: round2(payload.amount),
      date,
      memo: payload.memo || '',
      payment_method: payload.payment_method || 'manual',
      check_number: payload.payment_method === 'check_printing' ? String(this.nextCheckNumber++) : undefined,
      move_id: payload.move_id ?? null,
    };
    this.payments.push(payment);

    if (payment.state === 'posted') {
      this.applyPaymentAccounting(payment);
    }

    return {
      ...payment,
      journal_name: journal.name,
      partner_name: this.partners.find((p) => p.id === payment.partner_id)?.name || '',
      move_name: payment.move_id ? this.moves.find((m) => m.id === payment.move_id)?.name || null : null,
    };
  }

  postPayment(id: number): AccountPayment | null {
    const payment = this.payments.find((p) => p.id === id);
    if (!payment) return null;
    if (payment.state !== 'posted') {
      payment.state = 'posted';
      this.applyPaymentAccounting(payment);
    }
    return this.listPayments().find((p) => p.id === id) || null;
  }

  printCheck(id: number): AccountPayment | null {
    const payment = this.payments.find((p) => p.id === id);
    if (!payment) return null;
    if (!payment.check_number) {
      payment.check_number = String(this.nextCheckNumber++);
      payment.payment_method = 'check_printing';
    }
    return this.listPayments().find((p) => p.id === id) || null;
  }

  private applyPaymentAccounting(payment: AccountPayment): void {
    const journal = this.journals.find((j) => j.id === payment.journal_id) || this.journals[2];
    const partnerName = this.partners.find((p) => p.id === payment.partner_id)?.name || '';
    const isInbound = payment.payment_type === 'inbound';
    const bankAcc = journal.default_account_code;
    const counterpartyAcc = isInbound ? '1210' : '2110';

    // Reconcile linked invoice/bill if any
    if (payment.move_id) {
      const move = this.moves.find((m) => m.id === payment.move_id);
      if (move && move.state === 'posted') {
        move.amount_residual = round2(Math.max(0, move.amount_residual - payment.amount));
        move.payment_state = move.amount_residual === 0 ? 'paid' : 'partial';
      }
    }

    // Create balanced journal entry for payment
    const payMove: AccountMove = {
      id: this.nextMoveId++,
      name: payment.name,
      move_type: 'entry',
      state: 'posted',
      payment_state: 'paid',
      journal_id: journal.id,
      partner_id: payment.partner_id,
      invoice_date: payment.date,
      invoice_date_due: payment.date,
      payment_reference: payment.memo || payment.name,
      payment_term: 'Immediate Payment',
      currency: this.currency,
      edi_state: 'none',
      lines: [
        {
          id: this.nextLineId++,
          product_id: null,
          name: `${isInbound ? 'Customer Payment' : 'Vendor Payment'} ${payment.memo ? `(${payment.memo})` : ''}`,
          account_code: bankAcc,
          quantity: 1,
          price_unit: payment.amount,
          discount: 0,
          tax_ids: [],
          price_subtotal: payment.amount,
          price_total: payment.amount,
        },
      ],
      journal_items: [
        {
          id: 1,
          account_code: bankAcc,
          account_name: this.getAccountName(bankAcc),
          partner_name: partnerName,
          label: `${isInbound ? 'Customer Payment' : 'Vendor Payment'} - ${payment.memo || payment.name}`,
          debit: isInbound ? payment.amount : 0,
          credit: isInbound ? 0 : payment.amount,
        },
        {
          id: 2,
          account_code: counterpartyAcc,
          account_name: this.getAccountName(counterpartyAcc),
          partner_name: partnerName,
          label: payment.memo || payment.name,
          debit: isInbound ? 0 : payment.amount,
          credit: isInbound ? payment.amount : 0,
        },
      ],
      amount_untaxed: payment.amount,
      amount_tax: 0,
      amount_total: payment.amount,
      amount_residual: 0,
    };
    this.moves.push(payMove);
  }

  listAccountsWithBalances(): AccountAccount[] {
    const totals = new Map<string, { debit: number; credit: number }>();
    for (const move of this.moves) {
      if (move.state !== 'posted') continue;
      for (const ji of move.journal_items) {
        const prev = totals.get(ji.account_code) || { debit: 0, credit: 0 };
        prev.debit = round2(prev.debit + ji.debit);
        prev.credit = round2(prev.credit + ji.credit);
        totals.set(ji.account_code, prev);
      }
    }
    return this.accounts.map((acc) => {
      const t = totals.get(acc.code) || { debit: 0, credit: 0 };
      return {
        ...acc,
        debit: t.debit,
        credit: t.credit,
        balance: round2(t.debit - t.credit),
      };
    });
  }

  createAccount(payload: { code: string; name: string; account_type: string; reconcile?: boolean }): AccountAccount {
    if (this.accounts.some((a) => a.code === payload.code)) {
      throw new Error(`Account code ${payload.code} already exists.`);
    }
    const acc: AccountAccount = {
      id: this.nextAccountId++,
      code: payload.code.trim(),
      name: payload.name.trim(),
      account_type: payload.account_type || 'expense',
      reconcile: Boolean(payload.reconcile),
      non_trade: false,
      debit: 0,
      credit: 0,
      balance: 0,
    };
    this.accounts.push(acc);
    this.accounts.sort((a, b) => a.code.localeCompare(b.code));
    return acc;
  }

  getDashboard(): DashboardResponse {
    const today = daysOffset(0);
    const accounts = this.listAccountsWithBalances();
    const accMap = new Map(accounts.map((a) => [a.code, a]));

    const openInvoices = this.moves.filter(
      (m) => m.move_type === 'out_invoice' && m.state === 'posted' && m.payment_state !== 'paid' && m.payment_state !== 'reversed',
    );
    const overdueInvoices = openInvoices.filter((m) => m.invoice_date_due < today);
    const openBills = this.moves.filter(
      (m) => m.move_type === 'in_invoice' && m.state === 'posted' && m.payment_state !== 'paid' && m.payment_state !== 'reversed',
    );

    const receivables = round2(openInvoices.reduce((s, m) => s + m.amount_residual, 0));
    const overdueReceivables = round2(overdueInvoices.reduce((s, m) => s + m.amount_residual, 0));
    const payables = round2(openBills.reduce((s, m) => s + m.amount_residual, 0));
    const bankBal = accMap.get('101401')?.balance || 0;
    const cashBal = accMap.get('101501')?.balance || 0;
    const revenueYtd = round2(
      accounts
        .filter((a) => a.account_type.startsWith('income'))
        .reduce((s, a) => s + ((a.credit || 0) - (a.debit || 0)), 0),
    );
    const expensesYtd = round2(
      accounts
        .filter((a) => a.account_type.startsWith('expense'))
        .reduce((s, a) => s + ((a.debit || 0) - (a.credit || 0)), 0),
    );

    const journals = this.journals
      .filter((j) => j.show_on_dashboard)
      .map((journal) => {
        const jMoves = this.moves.filter((m) => m.journal_id === journal.id);
        const drafts = jMoves.filter((m) => m.state === 'draft');
        const waiting = jMoves.filter(
          (m) => m.state === 'posted' && m.payment_state !== 'paid' && m.payment_state !== 'reversed',
        );
        const late = waiting.filter((m) => m.invoice_date_due < today);
        const accBal = accMap.get(journal.default_account_code)?.balance || 0;

        let graph: { label: string; value: number; is_future?: boolean }[] = [];
        if (journal.type === 'sale' || journal.type === 'purchase') {
          graph = [
            { label: 'Due', value: round2(late.reduce((s, m) => s + m.amount_residual, 0)) },
            { label: 'This Wk', value: round2(waiting.filter((m) => m.invoice_date_due >= today && m.invoice_date_due <= daysOffset(7)).reduce((s, m) => s + m.amount_residual, 0)) },
            { label: '+2 Wks', value: round2(waiting.filter((m) => m.invoice_date_due > daysOffset(7) && m.invoice_date_due <= daysOffset(21)).reduce((s, m) => s + m.amount_residual, 0)), is_future: true },
            { label: 'Not Due', value: round2(waiting.filter((m) => m.invoice_date_due > daysOffset(21)).reduce((s, m) => s + m.amount_residual, 0)), is_future: true },
          ];
        } else if (journal.type === 'bank' || journal.type === 'cash') {
          const base = Math.max(0, accBal);
          graph = [
            { label: 'W-3', value: round2(base * 0.86) },
            { label: 'W-2', value: round2(base * 0.91) },
            { label: 'W-1', value: round2(base * 0.95) },
            { label: 'Now', value: round2(base) },
          ];
        }

        return {
          journal,
          number_draft: drafts.length,
          sum_draft: round2(drafts.reduce((s, m) => s + m.amount_total, 0)),
          number_waiting: waiting.length,
          sum_waiting: round2(waiting.reduce((s, m) => s + m.amount_residual, 0)),
          number_late: late.length,
          sum_late: round2(late.reduce((s, m) => s + m.amount_residual, 0)),
          account_balance: round2(accBal),
          graph,
        };
      });

    return {
      company: {
        name: this.companyName,
        currency: this.currency,
      },
      kpis: {
        receivables,
        overdue_receivables: overdueReceivables,
        overdue_count: overdueInvoices.length,
        payables,
        cash_balance: round2(bankBal + cashBal),
        revenue_ytd: revenueYtd,
        expenses_ytd: expensesYtd,
        net_profit: round2(revenueYtd - expensesYtd),
      },
      journals,
    };
  }

  getInvoiceAnalysis(): InvoiceAnalysisResponse {
    const postedInvoices = this.moves.filter((m) => m.state === 'posted' && (m.move_type === 'out_invoice' || m.move_type === 'out_refund'));
    const postedBills = this.moves.filter((m) => m.state === 'posted' && (m.move_type === 'in_invoice' || m.move_type === 'in_refund'));

    const sign = (t: MoveType) => (t.endsWith('refund') ? -1 : 1);
    const totalInvoiced = round2(postedInvoices.reduce((s, m) => s + sign(m.move_type) * m.amount_total, 0));
    const totalBilled = round2(postedBills.reduce((s, m) => s + sign(m.move_type) * m.amount_total, 0));
    const totalOutstanding = round2(postedInvoices.reduce((s, m) => s + m.amount_residual, 0));
    const totalCollected = round2(Math.max(0, totalInvoiced - totalOutstanding));

    const monthMap = new Map<string, { month: string; invoiced: number; billed: number }>();
    for (const m of [...postedInvoices, ...postedBills]) {
      const month = m.invoice_date.slice(0, 7);
      const entry = monthMap.get(month) || { month, invoiced: 0, billed: 0 };
      if (m.move_type.startsWith('out')) {
        entry.invoiced = round2(entry.invoiced + sign(m.move_type) * m.amount_total);
      } else {
        entry.billed = round2(entry.billed + sign(m.move_type) * m.amount_total);
      }
      monthMap.set(month, entry);
    }

    const partnerMap = new Map<string, { partner_name: string; invoiced: number; billed: number; open_balance: number }>();
    for (const m of [...postedInvoices, ...postedBills]) {
      const pName = this.partners.find((p) => p.id === m.partner_id)?.name || 'Unknown';
      const entry = partnerMap.get(pName) || { partner_name: pName, invoiced: 0, billed: 0, open_balance: 0 };
      if (m.move_type.startsWith('out')) {
        entry.invoiced = round2(entry.invoiced + sign(m.move_type) * m.amount_total);
        entry.open_balance = round2(entry.open_balance + m.amount_residual);
      } else {
        entry.billed = round2(entry.billed + sign(m.move_type) * m.amount_total);
      }
      partnerMap.set(pName, entry);
    }

    return {
      summary: {
        total_invoiced: totalInvoiced,
        total_billed: totalBilled,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        invoice_count: postedInvoices.length,
        bill_count: postedBills.length,
      },
      by_month: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      by_partner: Array.from(partnerMap.values()).sort((a, b) => b.invoiced + b.billed - (a.invoiced + a.billed)),
    };
  }
}

export const store = new OdooAccountingStore();
