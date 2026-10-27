// ============================================================================
// Edge Function `controle-interno` — API do Controle Interno.
// ----------------------------------------------------------------------------
// O front envia { fn, args } com o token do Supabase Auth. Aqui:
//   1. validamos o token no Auth (GET /auth/v1/user);
//   2. abrimos uma transação como `authenticated`, com request.jwt.claims
//      preenchido (auth.uid() funciona dentro das funções);
//   3. chamamos a função public.ci_* correspondente — que revalida as
//      permissões no banco (ver db/supabase/001_schema.sql).
// Só as funções da lista abaixo podem ser chamadas.
// ============================================================================

import postgres from "npm:postgres@3.4.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 3, prepare: false });
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Args = Record<string, unknown>;
type Tx = postgres.TransactionSql;
type Call = (tx: Tx, a: Args) => Promise<postgres.RowList<postgres.Row[]>>;

const s = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));

/** Funções expostas: nome → chamada parametrizada. */
const CALLS: Record<string, Call> = {
  ci_me: (tx) => tx`select public.ci_me() as r`,
  ci_list_users: (tx) => tx`select public.ci_list_users() as r`,
  ci_create_user: (tx, a) => tx`select public.ci_create_user(
      p_name => ${s(a.name)}, p_role => ${s(a.role)}, p_sector => ${s(a.sector)},
      p_title => ${s(a.title)}, p_email => ${s(a.email)}, p_password => ${s(a.password)}) as r`,
  ci_set_user_active: (tx, a) =>
    tx`select public.ci_set_user_active(${s(a.id)}, ${Boolean(a.active)}) as r`,
  ci_set_user_login: (tx, a) =>
    tx`select public.ci_set_user_login(${s(a.id)}, ${s(a.email)}, ${s(a.password)}) as r`,
  ci_list_tasks: (tx) => tx`select public.ci_list_tasks() as r`,
  ci_create_tasks: (tx, a) =>
    tx`select public.ci_create_tasks(${sql.json((a.tasks ?? []) as postgres.JSONValue)}) as r`,
  ci_update_task_status: (tx, a) =>
    tx`select public.ci_update_task_status(${s(a.id)}, ${s(a.status)}) as r`,
  ci_delete_task: (tx, a) => tx`select public.ci_delete_task(${s(a.id)}) as r`,
  ci_finance_kpis: (tx) => tx`select public.ci_finance_kpis() as r`,
  ci_revenue_series: (tx) => tx`select public.ci_revenue_series() as r`,
  ci_list_transactions: (tx) => tx`select public.ci_list_transactions() as r`,
  ci_create_transaction: (tx, a) => tx`select public.ci_create_transaction(
      p_description => ${s(a.description)}, p_category => ${s(a.category)},
      p_type => ${s(a.type)}, p_amount => ${Number(a.amount)}::numeric,
      p_date => ${s(a.date)}::date, p_source => ${s(a.source) ?? "manual"}) as r`,
  ci_marketing_kpis: (tx) => tx`select public.ci_marketing_kpis() as r`,
  ci_list_channels: (tx) => tx`select public.ci_list_channels() as r`,
  ci_funnel: (tx) => tx`select public.ci_funnel() as r`,
  ci_leads_trend: (tx) => tx`select public.ci_leads_trend() as r`,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método não suportado." }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sessão ausente. Faça login." }, 401);

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!authRes.ok) return json({ error: "Sessão expirada. Faça login novamente." }, 401);
  const user = await authRes.json();

  let body: { fn?: string; args?: Args };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  const call = body.fn ? CALLS[body.fn] : undefined;
  if (!call) return json({ error: `Operação desconhecida: ${body.fn}` }, 404);

  try {
    const rows = await sql.begin(async (tx) => {
      const claims = JSON.stringify({ sub: user.id, email: user.email, role: "authenticated" });
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx`set local role authenticated`;
      return call(tx, body.args ?? {});
    });
    return json({ data: rows[0]?.r ?? null });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const status = err.code === "42501" ? 403 : 400;
    return json({ error: err.message ?? "Erro inesperado.", code: err.code }, status);
  }
});
