// ============================================================================
// Edge Function `controle-interno` — API do Controle Interno.
// ----------------------------------------------------------------------------
// O front envia { fn, args } com o token do Supabase Auth. Aqui:
//   1. validamos o token no Auth (GET /auth/v1/user);
//   2. abrimos uma transação como `authenticated`, com request.jwt.claims
//      preenchido (auth.uid() funciona dentro das funções);
//   3. chamamos a função public.ci_* correspondente — que revalida as
//      permissões no banco (ver db/supabase/*.sql).
// Só as funções da lista abaixo podem ser chamadas; todo valor vai como
// parâmetro ($n) com cast explícito.
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

/** [chave em args, parâmetro SQL, tipo] */
type Param = [string, string, string];
const ID: Param = ["id", "p_id", "text"];
const PATCH: Param = ["patch", "p_patch", "jsonb"];

const CALLS: Record<string, Param[]> = {
  // Sessão / equipe
  ci_me: [],
  ci_heartbeat: [],
  ci_list_users: [],
  ci_create_user: [
    ["name", "p_name", "text"], ["role", "p_role", "text"], ["sector", "p_sector", "text"],
    ["title", "p_title", "text"], ["email", "p_email", "text"], ["password", "p_password", "text"],
  ],
  ci_update_user: [ID, PATCH],
  ci_update_profile: [["name", "p_name", "text"], ["title", "p_title", "text"]],
  ci_set_user_active: [ID, ["active", "p_active", "boolean"]],
  ci_set_user_login: [ID, ["email", "p_email", "text"], ["password", "p_password", "text"]],
  // Tarefas
  ci_list_tasks: [],
  ci_create_tasks: [["tasks", "p_tasks", "jsonb"]],
  ci_update_task_status: [ID, ["status", "p_status", "text"]],
  ci_update_task: [ID, PATCH],
  ci_delete_task: [ID],
  ci_task_detail: [ID],
  ci_add_checklist_item: [
    ["taskId", "p_task", "text"], ["text", "p_text", "text"],
    ["dueDate", "p_due", "date"], ["assigneeId", "p_assignee", "text"],
  ],
  ci_update_checklist_item: [ID, PATCH],
  ci_delete_checklist_item: [ID],
  ci_add_comment: [["taskId", "p_task", "text"], ["body", "p_body", "text"]],
  ci_delete_comment: [ID],
  ci_upload_file: [
    ["taskId", "p_task", "text"], ["name", "p_name", "text"],
    ["mime", "p_mime", "text"], ["base64", "p_base64", "text"],
  ],
  ci_add_link: [["taskId", "p_task", "text"], ["url", "p_url", "text"], ["title", "p_title", "text"]],
  ci_get_file: [ID],
  ci_delete_file: [ID],
  ci_recent_activity: [["limit", "p_limit", "integer"]],
  ci_notifications: [],
  ci_mark_notifications_read: [["ids", "p_ids", "bigint[]"]],
  // Financeiro
  ci_finance_kpis: [],
  ci_revenue_series: [],
  ci_list_transactions: [],
  ci_create_transaction: [
    ["description", "p_description", "text"], ["category", "p_category", "text"],
    ["type", "p_type", "text"], ["amount", "p_amount", "numeric"],
    ["date", "p_date", "date"], ["source", "p_source", "text"],
  ],
  ci_delete_transaction: [ID],
  ci_get_settings: [],
  ci_set_setting: [["key", "p_key", "text"], ["value", "p_value", "numeric"]],
  // Marketing
  ci_marketing_kpis: [],
  ci_list_channels: [],
  ci_funnel: [],
  ci_leads_trend: [],
  ci_upsert_channel: [["channel", "p_channel", "jsonb"]],
  ci_delete_channel: [ID],
  ci_set_funnel: [["stages", "p_stages", "jsonb"]],
  ci_set_leads_day: [["day", "p_day", "date"], ["value", "p_value", "integer"]],
};

/** Converte o valor JS em texto; o cast acontece no SQL. */
function toText(value: unknown, type: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (type === "jsonb") return JSON.stringify(value);
  if (type === "bigint[]") return `{${(value as unknown[]).map(Number).join(",")}}`;
  return String(value);
}

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

  let body: { fn?: string; args?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  const fn = body.fn ?? "";
  const params = Object.hasOwn(CALLS, fn) ? CALLS[fn] : undefined;
  if (!params) return json({ error: `Operação desconhecida: ${fn}` }, 404);

  const args = body.args ?? {};
  // Só envia os parâmetros informados; os demais usam o default da função.
  const used = params.filter(([key]) => args[key] !== undefined);
  const values = used.map(([key, , type]) => toText(args[key], type));
  const list = used.map(([, name, type], i) => `${name} => ($${i + 1}::text)::${type}`).join(", ");
  const query = `select public.${fn}(${list}) as r`;

  try {
    const rows = await sql.begin(async (tx) => {
      const claims = JSON.stringify({ sub: user.id, email: user.email, role: "authenticated" });
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx`set local role authenticated`;
      return tx.unsafe(query, values as string[]);
    });
    return json({ data: rows[0]?.r ?? null });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const status = err.code === "42501" ? 403 : 400;
    return json({ error: err.message ?? "Erro inesperado.", code: err.code }, status);
  }
});
