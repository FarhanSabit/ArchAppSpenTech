import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './server/store.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      runtime: 'nodejs',
      company: store.companyName,
      currency: store.currency,
    });
  });

  // Dashboard (Journal Kanban + KPIs)
  app.get('/api/dashboard', (_req, res) => {
    res.json(store.getDashboard());
  });

  // Reference master data
  app.get('/api/accounts', (_req, res) => {
    res.json(store.listAccountsWithBalances());
  });

  app.post('/api/accounts', (req, res) => {
    try {
      const { code, name, account_type, reconcile } = req.body || {};
      if (!code || !name) {
        return res.status(400).json({ error: 'Account code and name are required.' });
      }
      const created = store.createAccount({ code, name, account_type, reconcile });
      return res.status(201).json(created);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create account' });
    }
  });

  app.get('/api/taxes', (_req, res) => {
    res.json(store.taxes);
  });

  app.get('/api/journals', (_req, res) => {
    res.json(store.journals);
  });

  app.get('/api/partners', (_req, res) => {
    res.json(store.partners);
  });

  app.get('/api/products', (_req, res) => {
    res.json(store.products);
  });

  // Account Moves (Invoices, Credit Notes, Vendor Bills, Refunds, Journal Entries)
  app.get('/api/moves', (req, res) => {
    const move_type = typeof req.query.move_type === 'string' ? req.query.move_type : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const payment_state = typeof req.query.payment_state === 'string' ? req.query.payment_state : undefined;
    const journal_id = req.query.journal_id ? Number(req.query.journal_id) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json(store.listMoves({ move_type, state, payment_state, journal_id, search }));
  });

  app.get('/api/moves/:id', (req, res) => {
    const move = store.getMove(Number(req.params.id));
    if (!move) return res.status(404).json({ error: 'Move not found' });
    return res.json(move);
  });

  app.post('/api/moves', (req, res) => {
    try {
      const body = req.body || {};
      if (!body.move_type || !body.partner_id) {
        return res.status(400).json({ error: 'move_type and partner_id are required.' });
      }
      const created = store.createMove(body);
      return res.status(201).json(created);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create move' });
    }
  });

  app.put('/api/moves/:id', (req, res) => {
    try {
      const updated = store.updateMove(Number(req.params.id), req.body || {});
      if (!updated) return res.status(404).json({ error: 'Move not found' });
      return res.json(updated);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update move' });
    }
  });

  app.delete('/api/moves/:id', (req, res) => {
    try {
      const deleted = store.deleteMove(Number(req.params.id));
      if (!deleted) return res.status(404).json({ error: 'Move not found' });
      return res.json({ deleted: true });
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete move' });
    }
  });

  app.post('/api/moves/:id/post', (req, res) => {
    try {
      const posted = store.postMove(Number(req.params.id));
      if (!posted) return res.status(404).json({ error: 'Move not found' });
      return res.json(posted);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to post move' });
    }
  });

  app.post('/api/moves/:id/draft', (req, res) => {
    const draft = store.resetToDraft(Number(req.params.id));
    if (!draft) return res.status(404).json({ error: 'Move not found' });
    return res.json(draft);
  });

  app.post('/api/moves/:id/cancel', (req, res) => {
    const cancelled = store.cancelMove(Number(req.params.id));
    if (!cancelled) return res.status(404).json({ error: 'Move not found' });
    return res.json(cancelled);
  });

  app.post('/api/moves/:id/credit-note', (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
    const refund = store.createCreditNote(Number(req.params.id), reason);
    if (!refund) return res.status(404).json({ error: 'Original move not found' });
    return res.status(201).json(refund);
  });

  app.post('/api/moves/:id/debit-note', (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
    const debit = store.createDebitNote(Number(req.params.id), reason);
    if (!debit) return res.status(404).json({ error: 'Original move not found' });
    return res.status(201).json(debit);
  });

  app.get('/api/moves/:id/ubl', (req, res) => {
    const move = store.getMove(Number(req.params.id));
    const xml = store.generateUblXml(Number(req.params.id));
    if (!move || !xml) return res.status(404).json({ error: 'Move not found' });
    const safeName = move.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_ubl_21.xml"`);
    return res.send(xml);
  });

  // Payments & Check Printing
  app.get('/api/payments', (req, res) => {
    const payment_type = typeof req.query.payment_type === 'string' ? req.query.payment_type : undefined;
    res.json(store.listPayments(payment_type));
  });

  app.post('/api/payments', (req, res) => {
    try {
      const body = req.body || {};
      if (!body.payment_type || !body.partner_id || !body.amount) {
        return res.status(400).json({ error: 'payment_type, partner_id, and amount are required.' });
      }
      const created = store.createAndPostPayment({
        payment_type: body.payment_type,
        journal_id: Number(body.journal_id) || 3,
        partner_id: Number(body.partner_id),
        amount: Number(body.amount),
        date: body.date,
        memo: body.memo,
        payment_method: body.payment_method,
        move_id: body.move_id ? Number(body.move_id) : null,
        auto_post: body.auto_post !== false,
      });
      return res.status(201).json(created);
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create payment' });
    }
  });

  app.post('/api/payments/:id/post', (req, res) => {
    const posted = store.postPayment(Number(req.params.id));
    if (!posted) return res.status(404).json({ error: 'Payment not found' });
    return res.json(posted);
  });

  app.post('/api/payments/:id/print-check', (req, res) => {
    const updated = store.printCheck(Number(req.params.id));
    if (!updated) return res.status(404).json({ error: 'Payment not found' });
    return res.json(updated);
  });

  // Reporting
  app.get('/api/reports/invoice-analysis', (_req, res) => {
    res.json(store.getInvoiceAnalysis());
  });

  // Customer Portal API (ported from addons/account/controllers/portal.py)
  app.get('/api/portal/invoices', (req, res) => {
    const filterby = typeof req.query.filterby === 'string' ? req.query.filterby : 'all';
    const sortby = typeof req.query.sortby === 'string' ? req.query.sortby : 'date';
    const today = new Date().toISOString().slice(0, 10);

    const allPosted = store.listMoves({ state: 'posted' }).filter((m) => m.move_type !== 'entry');
    const overdueList = allPosted.filter(
      (m) =>
        m.move_type === 'out_invoice' &&
        m.payment_state !== 'paid' &&
        m.payment_state !== 'in_payment' &&
        m.payment_state !== 'reversed' &&
        m.invoice_date_due < today,
    );
    const outList = allPosted.filter((m) => m.move_type === 'out_invoice' || m.move_type === 'out_refund');
    const inList = allPosted.filter((m) => m.move_type === 'in_invoice' || m.move_type === 'in_refund');

    let filtered = allPosted;
    if (filterby === 'overdue_invoices') filtered = overdueList;
    else if (filterby === 'invoices') filtered = outList;
    else if (filterby === 'bills') filtered = inList;

    const sorted = [...filtered].sort((a, b) => {
      if (sortby === 'duedate') return b.invoice_date_due.localeCompare(a.invoice_date_due);
      if (sortby === 'name') return b.name.localeCompare(a.name);
      if (sortby === 'state') return a.payment_state.localeCompare(b.payment_state);
      return b.invoice_date.localeCompare(a.invoice_date);
    });

    res.json({
      invoices: sorted,
      overdue_invoice_count: overdueList.length,
      counts: {
        all: allPosted.length,
        overdue_invoices: overdueList.length,
        invoices: outList.length,
        bills: inList.length,
      },
    });
  });

  // Legacy Odoo RPC endpoints stubbed cleanly with 501
  app.all(['/web/dataset/call_kw', '/jsonrpc', '/xmlrpc/2/common', '/xmlrpc/2/object'], (_req, res) => {
    res.status(501).json({
      error: 'Not yet migrated',
      detail: 'Legacy Odoo XML-RPC/JSON-RPC endpoints are stubbed; use the REST /api/* endpoints.',
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Odoo Invoicing & Accounting server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
