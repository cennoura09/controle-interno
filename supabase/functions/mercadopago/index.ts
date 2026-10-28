// ============================================================================
// Edge Function `mercadopago` — gateway do Financeiro.
// ----------------------------------------------------------------------------
// 1. Webhook (POST do Mercado Pago): cada pagamento aprovado vira lançamento
//    de receita (+ a taxa do MP como despesa); estornado/cancelado é removido.
//    O pagamento é sempre relido na API do MP, então o corpo do aviso não é
//    confiável por si só. Com MP_WEBHOOK_SECRET definido, a assinatura
//    (x-signature) também é conferida.
// 2. App (POST { op: "status" | "sync" } com token do Supabase Auth):
//    status da conexão e sincronização manual (últimos 90 dias + assinaturas).
//
// Segredos: MP_ACCESS_TOKEN (obrigatório), MP_WEBHOOK_SECRET (recomendado).
// ============================================================================

import postgres from "npm:postgres@3.4.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 3, prepare: false });
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MP_API = "https://api.mercadopago.com";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mercadopago`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const token = () => Deno.env.get("MP_ACCESS_TOKEN")?.trim() || "";

async function mp<T>(path: string): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) {
    // A mensagem do MP ajuda a diagnosticar (nunca contém a credencial).
    const detail = await res.json().then((b) => b?.message ?? b?.error ?? "").catch(() => "");
    throw new Error(`Mercado Pago respondeu ${res.status} em ${path.split("?")[0]}${detail ? `: ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

/** Id da conta embutido no Access Token (APP_USR-<app>-<data>-<hash>-<user_id>). */
function accountIdFromToken(): number | null {
  const last = token().split("-").pop() ?? "";
  return /^\d+$/.test(last) ? Number(last) : null;
}

// ---------------------------------------------------------------------------
// Pagamentos → lançamentos
// ---------------------------------------------------------------------------

interface MpPayment {
  id: number;
  status: string;
  description?: string;
  transaction_amount: number;
  date_created: string;
  date_approved?: string | null;
  operation_type?: string;
  metadata?: Record<string, unknown>;
  point_of_interaction?: { type?: string };
  fee_details?: { amount: number }[];
  collector_id?: number;
  payer?: { id?: number | string };
}

/** Operações que só movem dinheiro dentro da própria conta (não são venda). */
// money_transfer fica de fora: de terceiros é receita; para si mesmo cai na checagem do pagador.
const INTERNAL_OPERATIONS = new Set(["partition_transfer", "account_fund"]);

let accountId: number | null = null;
/** Id da conta do token (recebedora). */
async function myAccountId(): Promise<number> {
  if (accountId === null) {
    accountId = await mp<{ id: number }>("/users/me")
      .then((me) => me.id)
      .catch((e) => {
        const fromToken = accountIdFromToken();
        if (fromToken === null) throw e;
        return fromToken;
      });
  }
  return accountId;
}

/**
 * Só pagamentos RECEBIDOS de terceiros viram receita. Compras feitas pela
 * conta e movimentações internas (saque, reserva, transferência para si
 * mesmo) são ignoradas — e, se já tinham sido gravadas, removidas.
 */
async function applyIfReceived(p: MpPayment) {
  const me = await myAccountId();
  const notMine = p.collector_id !== undefined && p.collector_id !== me;
  const internal = INTERNAL_OPERATIONS.has(p.operation_type ?? "") || String(p.payer?.id ?? "") === String(me);
  if (notMine || internal) {
    const removed = await sql`delete from controle_interno.transactions where external_id in (${`mp:${p.id}`}, ${`mp:${p.id}:taxa`}) returning id`;
    return removed.length ? ("removed" as const) : ("ignored" as const);
  }
  return applyPayment(p);
}

const isRecurring = (p: MpPayment) =>
  p.operation_type === "recurring_payment" ||
  p.point_of_interaction?.type === "SUBSCRIPTIONS" ||
  !!p.metadata?.preapproval_id;

/** Aprovado → upsert (receita + taxa). Demais status → remove. */
async function applyPayment(p: MpPayment): Promise<"saved" | "removed" | "ignored"> {
  const id = `mp:${p.id}`;
  const feeId = `mp:${p.id}:taxa`;
  if (p.status !== "approved") {
    const removed = await sql`delete from controle_interno.transactions where external_id in (${id}, ${feeId}) returning id`;
    return removed.length ? "removed" : "ignored";
  }
  const date = (p.date_approved ?? p.date_created).slice(0, 10);
  const recurring = isRecurring(p);
  const description = `${p.description?.trim() || (recurring ? "Assinatura" : "Pagamento")} · MP #${p.id}`;
  await sql`
    insert into controle_interno.transactions (date, description, category, type, amount, source, external_id)
    values (${date}::date, ${description}, ${recurring ? "Receita recorrente" : "Vendas"}, 'receita',
            ${p.transaction_amount}, 'gateway', ${id})
    on conflict (external_id) where external_id is not null do update
      set date = excluded.date, description = excluded.description, category = excluded.category,
          amount = excluded.amount`;
  const fee = (p.fee_details ?? []).reduce((a, f) => a + (Number(f.amount) || 0), 0);
  if (fee > 0) {
    await sql`
      insert into controle_interno.transactions (date, description, category, type, amount, source, external_id)
      values (${date}::date, ${`Taxa Mercado Pago · MP #${p.id}`}, 'Taxas', 'despesa', ${fee}, 'gateway', ${feeId})
      on conflict (external_id) where external_id is not null do update
        set date = excluded.date, amount = excluded.amount`;
  } else {
    await sql`delete from controle_interno.transactions where external_id = ${feeId}`;
  }
  return "saved";
}

async function setSetting(key: string, value: number) {
  await sql`insert into controle_interno.settings (key, value) values (${key}, ${value})
            on conflict (key) do update set value = excluded.value`;
}

// ---------------------------------------------------------------------------
// Assinaturas → MRR e assinaturas ativas
// ---------------------------------------------------------------------------

interface MpPreapproval {
  status: string;
  auto_recurring?: { transaction_amount?: number; frequency?: number; frequency_type?: string };
}

async function syncSubscriptions(): Promise<{ active: number; mrr: number } | null> {
  try {
    let offset = 0;
    let active = 0;
    let mrr = 0;
    for (;;) {
      const page = await mp<{ results: MpPreapproval[]; paging?: { total: number } }>(
        `/preapproval/search?status=authorized&limit=100&offset=${offset}`
      );
      for (const s of page.results ?? []) {
        const r = s.auto_recurring ?? {};
        const amount = Number(r.transaction_amount) || 0;
        const freq = Number(r.frequency) || 1;
        // Normaliza para valor mensal.
        mrr += r.frequency_type === "days" ? (amount * 30) / freq : amount / freq;
        active += 1;
      }
      offset += 100;
      if (!page.results?.length || offset >= (page.paging?.total ?? 0) || offset >= 2000) break;
    }
    await setSetting("mrr_gateway", Math.round(mrr * 100) / 100);
    await setSetting("assinaturas_ativas", active);
    return { active, mrr };
  } catch {
    // Conta sem o produto Assinaturas: segue só com pagamentos.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sincronização completa (últimos 90 dias)
// ---------------------------------------------------------------------------

async function syncAll() {
  const me = { id: await myAccountId() };
  const now = new Date();
  const begin = new Date(now.getTime() - 90 * 86_400_000);
  let offset = 0;
  const counts = { saved: 0, removed: 0, ignored: 0 };
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  let recurringApproved = 0;
  let recurringRejected = 0;

  for (;;) {
    const qs = new URLSearchParams({
      sort: "date_created",
      criteria: "desc",
      range: "date_created",
      begin_date: begin.toISOString(),
      end_date: now.toISOString(),
      "collector.id": String(me.id),
      limit: "100",
      offset: String(offset),
    });
    const page = await mp<{ results: MpPayment[]; paging?: { total: number } }>(`/v1/payments/search?${qs}`);
    for (const p of page.results ?? []) {
      counts[await applyIfReceived(p)] += 1;
      if (isRecurring(p) && p.date_created.slice(0, 10) >= monthStart) {
        if (p.status === "approved") recurringApproved += p.transaction_amount;
        if (p.status === "rejected") recurringRejected += p.transaction_amount;
      }
    }
    offset += 100;
    if (!page.results?.length || offset >= (page.paging?.total ?? 0) || offset >= 2000) break;
  }

  // Inadimplência = cobranças recorrentes recusadas / cobradas no mês.
  const charged = recurringApproved + recurringRejected;
  await setSetting("inadimplencia", charged > 0 ? Math.round((recurringRejected / charged) * 10000) / 10000 : 0);
  const subscriptions = await syncSubscriptions();
  await setSetting("mp_last_sync", Math.floor(Date.now() / 1000));
  return { ...counts, subscriptions };
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

async function validSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET")?.trim();
  if (!secret) return true; // sem segredo configurado: confia na releitura pela API
  const header = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === parts.v1;
}

async function handleWebhook(req: Request, body: Record<string, unknown>) {
  const url = new URL(req.url);
  const type = String(body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "");
  const data = (body.data ?? {}) as { id?: string | number };
  const dataId = String(data.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (!dataId) return json({ ok: true, ignored: "sem id" });
  if (!(await validSignature(req, dataId))) return json({ error: "Assinatura inválida." }, 401);
  if (!token()) return json({ ok: true, ignored: "MP_ACCESS_TOKEN ausente" });

  if (type === "payment") {
    const result = await applyIfReceived(await mp<MpPayment>(`/v1/payments/${dataId}`));
    return json({ ok: true, result });
  }
  if (type === "subscription_authorized_payment") {
    const ap = await mp<{ payment?: { id?: number } }>(`/authorized_payments/${dataId}`);
    if (ap.payment?.id) await applyIfReceived(await mp<MpPayment>(`/v1/payments/${ap.payment.id}`));
    await syncSubscriptions();
    return json({ ok: true });
  }
  if (type.startsWith("subscription") || type === "preapproval") {
    await syncSubscriptions();
    return json({ ok: true });
  }
  return json({ ok: true, ignored: type || "tipo desconhecido" });
}

// ---------------------------------------------------------------------------
// Chamadas do app
// ---------------------------------------------------------------------------

interface Member {
  role: string;
  sector: string;
  is_super_admin: boolean;
}

async function memberFromToken(authHeader: string | null): Promise<Member | null> {
  const jwt = authHeader?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${jwt}` } });
  if (!res.ok) return null;
  const user = await res.json();
  const [m] = await sql<Member[]>`
    select role::text, sector::text, is_super_admin from controle_interno.app_users
     where auth_user_id = ${user.id} and active`;
  return m ?? null;
}

async function status() {
  const settings = Object.fromEntries(
    (await sql`select key, value from controle_interno.settings where key in ('mp_last_sync','assinaturas_ativas','mrr_gateway')`)
      .map((r) => [r.key, Number(r.value)])
  );
  const base = {
    provider: "mercadopago",
    webhookUrl: WEBHOOK_URL,
    webhookSigned: !!Deno.env.get("MP_WEBHOOK_SECRET")?.trim(),
    lastSync: settings.mp_last_sync ? new Date(settings.mp_last_sync * 1000).toISOString() : null,
    activeSubscriptions: settings.assinaturas_ativas ?? null,
    // Só o tipo e o final da credencial, para conferir com o painel do MP.
    tokenHint: token() ? `${token().startsWith("TEST-") ? "TEST" : token().startsWith("APP_USR-") ? "APP_USR" : "?"}…${token().slice(-4)}` : null,
  };
  if (!token()) return { ...base, connected: false, reason: "Credencial MP_ACCESS_TOKEN não configurada no servidor." };
  try {
    const me = await mp<{ nickname?: string }>("/users/me");
    return { ...base, connected: true, account: me.nickname ?? null };
  } catch (first) {
    // Algumas credenciais não leem o perfil, mas leem pagamentos: é o que importa.
    try {
      await mp("/v1/payments/search?limit=1");
      const id = accountIdFromToken();
      return { ...base, connected: true, account: id ? `conta ${id}` : null };
    } catch (e) {
      return { ...base, connected: false, reason: `${(e as Error).message} (perfil: ${(first as Error).message})` };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: true });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* webhook pode vir só com query string */
  }

  try {
    if (body.op === "status" || body.op === "sync" || body.op === "diagnose" || body.op === "inspect") {
      const member = await memberFromToken(req.headers.get("Authorization"));
      if (!member) return json({ error: "Sessão expirada. Faça login novamente." }, 401);
      if (body.op === "status") return json({ data: await status() });
      if (body.op === "inspect") {
        // Detalhe dos pagamentos dos últimos 90 dias, sem gravar nada.
        if (!(member.is_super_admin || ["CEO", "Founder"].includes(member.role) || member.sector === "Financeiro")) {
          return json({ error: "Sem permissão." }, 403);
        }
        const me = await myAccountId();
        const qs = new URLSearchParams({
          sort: "date_created", criteria: "desc", range: "date_created",
          begin_date: new Date(Date.now() - 90 * 86_400_000).toISOString(), end_date: new Date().toISOString(), limit: "50",
        });
        type Raw = MpPayment & {
          payment_type_id?: string; payment_method_id?: string; payer?: { id?: number | string };
          transaction_details?: { net_received_amount?: number }; money_release_date?: string;
        };
        const page = await mp<{ results: Raw[] }>(`/v1/payments/search?${qs}`);
        return json({
          data: (page.results ?? []).map((p) => ({
            id: p.id, created: p.date_created, approved: p.date_approved, status: p.status,
            amount: p.transaction_amount, net: p.transaction_details?.net_received_amount,
            operation: p.operation_type, type: p.payment_type_id, method: p.payment_method_id,
            description: p.description ?? null,
            received: p.collector_id === me, paidByMe: String(p.payer?.id ?? "") === String(me),
          })),
        });
      }
      if (body.op === "diagnose") {
        // Só códigos HTTP e mensagens do MP, nenhum dado de pagamento.
        const probe = async (path: string) => {
          const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
          const msg = await res.json().then((b) => (res.ok ? "ok" : b?.message ?? b?.error ?? "")).catch(() => "");
          return { path: path.split("?")[0], status: res.status, msg };
        };
        // Impressão digital (não reversível) para comparar com o valor do painel.
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token()));
        const fingerprint = [...new Uint8Array(digest)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
        return json({
          fingerprint,
          length: token().length,
          data: await Promise.all([
            probe("/v1/payment_methods"),
            probe("/users/me"),
            probe("/v1/payments/search?limit=1"),
            probe("/preapproval/search?limit=1"),
          ]),
        });
      }
      const allowed = member.is_super_admin || ["CEO", "Founder"].includes(member.role) || member.sector === "Financeiro";
      if (!allowed) return json({ error: "Apenas o setor Financeiro e CEO/Founder sincronizam o gateway." }, 403);
      if (!token()) return json({ error: "Configure o segredo MP_ACCESS_TOKEN no Supabase antes de sincronizar." }, 400);
      return json({ data: await syncAll() });
    }
    return await handleWebhook(req, body);
  } catch (e) {
    // 500 faz o Mercado Pago reenviar o aviso mais tarde.
    return json({ error: (e as Error).message }, 500);
  }
});
