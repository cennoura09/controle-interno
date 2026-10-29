// ============================================================================
// Edge Function `mercadopago` — gateway do Financeiro.
// ----------------------------------------------------------------------------
// Entradas e saídas da conta Mercado Pago viram lançamentos (source = gateway,
// external_id = mp:<id>[:taxa|:saida]):
//   - recebido de terceiros  → receita (+ taxa do MP como despesa)
//   - pago/enviado a terceiros → despesa "Pagamentos e transferências"
//   - movimentação interna (reserva, saldo, para si mesmo) → ignorada
// Só conta o que aconteceu a partir de `settings.mp_start_date` (epoch).
//
// 1. Webhook (POST do Mercado Pago): o pagamento é sempre relido na API do MP;
//    com MP_WEBHOOK_SECRET definido, a assinatura (x-signature) é conferida.
// 2. App (POST { op } com token do Supabase Auth): status | sync | inspect | diagnose | set_start.
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

let accountId: number | null = null;
/** Id da conta dona do token. */
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

async function getSetting(key: string): Promise<number | null> {
  const [row] = await sql`select value from controle_interno.settings where key = ${key}`;
  return row ? Number(row.value) : null;
}

async function setSetting(key: string, value: number) {
  await sql`insert into controle_interno.settings (key, value) values (${key}, ${value})
            on conflict (key) do update set value = excluded.value`;
}

/** Início da contagem (ms). Sem configuração: últimos 90 dias. */
async function startMs(): Promise<number> {
  const start = await getSetting("mp_start_date");
  return start ? start * 1000 : Date.now() - 90 * 86_400_000;
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
  payment_type_id?: string;
  payment_method_id?: string;
  metadata?: Record<string, unknown>;
  point_of_interaction?: { type?: string };
  fee_details?: { amount: number }[];
  collector_id?: number;
  payer?: { id?: number | string };
  transaction_details?: { net_received_amount?: number };
}

/** Operações que só movem dinheiro dentro da própria conta (não são venda nem gasto). */
const INTERNAL_OPERATIONS = new Set(["partition_transfer", "account_fund"]);

const isRecurring = (p: MpPayment) =>
  p.operation_type === "recurring_payment" ||
  p.point_of_interaction?.type === "SUBSCRIPTIONS" ||
  !!p.metadata?.preapproval_id;

type Direction = "in" | "out" | "internal";

function direction(p: MpPayment, me: number): Direction {
  const iReceived = p.collector_id === me;
  const iPaid = String(p.payer?.id ?? "") === String(me);
  if (INTERNAL_OPERATIONS.has(p.operation_type ?? "") || (iReceived && iPaid)) return "internal";
  if (iPaid) return "out";
  if (iReceived || p.collector_id === undefined) return "in";
  return "internal"; // não envolve a conta como pagadora nem recebedora
}

const ids = (p: MpPayment) => [`mp:${p.id}`, `mp:${p.id}:taxa`, `mp:${p.id}:saida`];

async function removeEntries(p: MpPayment): Promise<"removed" | "ignored"> {
  const removed = await sql`delete from controle_interno.transactions where external_id = any(${ids(p)}) returning id`;
  return removed.length ? "removed" : "ignored";
}

async function upsert(date: string, description: string, category: string, type: "receita" | "despesa", amount: number, externalId: string) {
  await sql`
    insert into controle_interno.transactions (date, description, category, type, amount, source, external_id)
    values (${date}::date, ${description}, ${category}, ${type}, ${amount}, 'gateway', ${externalId})
    on conflict (external_id) where external_id is not null do update
      set date = excluded.date, description = excluded.description, category = excluded.category,
          type = excluded.type, amount = excluded.amount`;
}

/** Grava, atualiza ou remove os lançamentos de um pagamento. */
async function applyPayment(p: MpPayment): Promise<"saved" | "removed" | "ignored"> {
  const me = await myAccountId();
  const dir = direction(p, me);
  const happenedAt = new Date(p.date_approved ?? p.date_created).getTime();
  if (dir === "internal" || p.status !== "approved" || happenedAt < (await startMs())) return removeEntries(p);

  const date = (p.date_approved ?? p.date_created).slice(0, 10);
  if (dir === "out") {
    const label = p.description?.trim() || (p.payment_method_id === "pix" ? "Pix enviado" : "Pagamento enviado");
    await sql`delete from controle_interno.transactions where external_id = any(${[`mp:${p.id}`, `mp:${p.id}:taxa`]})`;
    await upsert(date, `${label} · MP #${p.id}`, "Pagamentos e transferências", "despesa", p.transaction_amount, `mp:${p.id}:saida`);
    return "saved";
  }

  const recurring = isRecurring(p);
  const label = p.description?.trim() || (recurring ? "Assinatura" : p.payment_method_id === "pix" ? "Pix recebido" : "Pagamento");
  await sql`delete from controle_interno.transactions where external_id = ${`mp:${p.id}:saida`}`;
  await upsert(date, `${label} · MP #${p.id}`, recurring ? "Receita recorrente" : "Vendas", "receita", p.transaction_amount, `mp:${p.id}`);
  const fee = (p.fee_details ?? []).reduce((a, f) => a + (Number(f.amount) || 0), 0);
  if (fee > 0) await upsert(date, `Taxa Mercado Pago · MP #${p.id}`, "Taxas", "despesa", fee, `mp:${p.id}:taxa`);
  else await sql`delete from controle_interno.transactions where external_id = ${`mp:${p.id}:taxa`}`;
  return "saved";
}

/** Busca paginada de pagamentos com filtros extras (collector.id / payer.id). */
async function searchPayments(extra: Record<string, string>, beginMs: number): Promise<MpPayment[]> {
  const out: MpPayment[] = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const qs = new URLSearchParams({
      sort: "date_created",
      criteria: "desc",
      range: "date_created",
      begin_date: new Date(beginMs).toISOString(),
      end_date: new Date().toISOString(),
      limit: "100",
      offset: String(offset),
      ...extra,
    });
    const page = await mp<{ results: MpPayment[]; paging?: { total: number } }>(`/v1/payments/search?${qs}`);
    out.push(...(page.results ?? []));
    if (!page.results?.length || offset + 100 >= (page.paging?.total ?? 0)) break;
  }
  return out;
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
    let active = 0;
    let mrr = 0;
    for (let offset = 0; offset < 2000; offset += 100) {
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
      if (!page.results?.length || offset + 100 >= (page.paging?.total ?? 0)) break;
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
// Sincronização completa (desde mp_start_date)
// ---------------------------------------------------------------------------

async function syncAll() {
  const me = await myAccountId();
  const begin = await startMs();
  const counts = { saved: 0, removed: 0, ignored: 0 };

  // Recebidos pela conta + pagos/enviados pela conta (sem repetir).
  const received = await searchPayments({ "collector.id": String(me) }, begin);
  const sent = await searchPayments({ "payer.id": String(me) }, begin).catch(() => [] as MpPayment[]);
  const seen = new Set<number>();
  const all = [...received, ...sent].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  // Lançamentos de antes do início da contagem saem do painel.
  await sql`delete from controle_interno.transactions
             where external_id like 'mp:%' and date < ${new Date(begin - 3 * 3_600_000).toISOString().slice(0, 10)}::date`;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  let recurringApproved = 0;
  let recurringRejected = 0;
  for (const p of all) {
    counts[await applyPayment(p)] += 1;
    if (isRecurring(p) && p.collector_id === me && p.date_created.slice(0, 10) >= monthStart) {
      if (p.status === "approved") recurringApproved += p.transaction_amount;
      if (p.status === "rejected") recurringRejected += p.transaction_amount;
    }
  }

  // Inadimplência = cobranças recorrentes recusadas / cobradas no mês.
  const charged = recurringApproved + recurringRejected;
  await setSetting("inadimplencia", charged > 0 ? Math.round((recurringRejected / charged) * 10000) / 10000 : 0);
  const subscriptions = await syncSubscriptions();
  await setSetting("mp_last_sync", Math.floor(Date.now() / 1000));
  return { ...counts, sent: sent.length, subscriptions };
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
    const result = await applyPayment(await mp<MpPayment>(`/v1/payments/${dataId}`));
    return json({ ok: true, result });
  }
  if (type === "subscription_authorized_payment") {
    const ap = await mp<{ payment?: { id?: number } }>(`/authorized_payments/${dataId}`);
    if (ap.payment?.id) await applyPayment(await mp<MpPayment>(`/v1/payments/${ap.payment.id}`));
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

const canManage = (m: Member) => m.is_super_admin || ["CEO", "Founder"].includes(m.role) || m.sector === "Financeiro";

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
    (await sql`select key, value from controle_interno.settings
                where key in ('mp_last_sync','assinaturas_ativas','mrr_gateway','mp_start_date')`)
      .map((r) => [r.key, Number(r.value)])
  );
  const base = {
    provider: "mercadopago",
    webhookUrl: WEBHOOK_URL,
    webhookSigned: !!Deno.env.get("MP_WEBHOOK_SECRET")?.trim(),
    lastSync: settings.mp_last_sync ? new Date(settings.mp_last_sync * 1000).toISOString() : null,
    countingSince: settings.mp_start_date ? new Date(settings.mp_start_date * 1000).toISOString() : null,
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

/** Lista o que o MP tem (sem gravar) para conferência. */
async function inspect() {
  const me = await myAccountId();
  const begin = Date.now() - 90 * 86_400_000;
  const received = await searchPayments({ "collector.id": String(me) }, begin);
  let sentError: string | null = null;
  const sent = await searchPayments({ "payer.id": String(me) }, begin).catch((e) => {
    sentError = (e as Error).message;
    return [] as MpPayment[];
  });
  const seen = new Set<number>();
  return {
    sentSearch: sentError ?? `${sent.length} pagamento(s) feitos pela conta`,
    data: [...received, ...sent]
      .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
      .map((p) => ({
        id: p.id, created: p.date_created, status: p.status, amount: p.transaction_amount,
        net: p.transaction_details?.net_received_amount, operation: p.operation_type,
        method: p.payment_method_id, description: p.description ?? null, direction: direction(p, me),
      })),
  };
}

async function diagnose() {
  const probe = async (path: string) => {
    const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
    const msg = await res.json().then((b) => (res.ok ? "ok" : b?.message ?? b?.error ?? "")).catch(() => "");
    return { path: path.split("?")[0], status: res.status, msg };
  };
  // Impressão digital (não reversível) para comparar com o valor do painel.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token()));
  const fingerprint = [...new Uint8Array(digest)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
  return {
    fingerprint,
    length: token().length,
    data: await Promise.all([
      probe("/v1/payment_methods"),
      probe("/users/me"),
      probe("/v1/payments/search?limit=1"),
      probe("/preapproval/search?limit=1"),
    ]),
  };
}

const APP_OPS = new Set(["status", "sync", "inspect", "diagnose", "set_start"]);

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
    if (typeof body.op === "string" && APP_OPS.has(body.op)) {
      const member = await memberFromToken(req.headers.get("Authorization"));
      if (!member) return json({ error: "Sessão expirada. Faça login novamente." }, 401);
      if (body.op === "status") return json({ data: await status() });
      if (!canManage(member)) return json({ error: "Apenas o setor Financeiro e CEO/Founder gerenciam o gateway." }, 403);
      if (!token()) return json({ error: "Configure o segredo MP_ACCESS_TOKEN no Supabase." }, 400);
      if (body.op === "inspect") return json(await inspect());
      if (body.op === "diagnose") return json(await diagnose());
      if (body.op === "set_start") {
        // Data (YYYY-MM-DD) no horário de Brasília; vazio = últimos 90 dias.
        const day = String(body.date ?? "");
        if (!day) {
          await sql`delete from controle_interno.settings where key = 'mp_start_date'`;
        } else {
          const ms = new Date(`${day}T00:00:00-03:00`).getTime();
          if (Number.isNaN(ms)) return json({ error: "Data inválida." }, 400);
          await setSetting("mp_start_date", Math.floor(ms / 1000));
        }
        return json({ data: await syncAll() });
      }
      return json({ data: await syncAll() });
    }
    return await handleWebhook(req, body);
  } catch (e) {
    // 500 faz o Mercado Pago reenviar o aviso mais tarde.
    return json({ error: (e as Error).message }, 500);
  }
});
