// v41.11 — bgg-meta: SOLO BoardGameGeek XML API2 (Bearer BGG_TOKEN, host senza www).
// Rimosso: api.geekdo.com, search/boardgame scraping, Wikidata come canale dati giochi.
// Cache server su public.bgg_api_cache (TTL). Token mai nel client / mai nei log.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { bggXml, int, parseRpgThing, parseSearch, parseThing, rankRpgSearch, txt } from "../_shared/bgg.ts";

const ORIGINS = ["https://app.pergioco.org", "https://vincenzoassenza-blip.github.io", "http://localhost:8765", "http://localhost:8799", "http://127.0.0.1:8799"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin",
});
const TTL_SEARCH_MS = 60 * 60 * 1000;
const TTL_THING_MS = 7 * 24 * 60 * 60 * 1000;

type SB = ReturnType<typeof createClient>;

async function cacheGet(admin: SB, key: string) {
  const { data } = await admin.from("bgg_api_cache").select("payload,expires_at").eq("key", key).maybeSingle();
  if (!data?.payload) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data.payload;
}
async function cacheSet(admin: SB, key: string, payload: unknown, ttlMs: number) {
  const expires = new Date(Date.now() + ttlMs).toISOString();
  await admin.from("bgg_api_cache").upsert({ key, payload, expires_at: expires, created_at: new Date().toISOString() });
}

async function requireToken() {
  const token = Deno.env.get("BGG_TOKEN");
  if (!token) throw new Error("BGG_TOKEN assente");
  return token;
}

async function cercaBgg(admin: SB, q: string) {
  const key = "search:" + q.toLowerCase();
  const hit = await cacheGet(admin, key);
  if (Array.isArray(hit)) return hit.slice(0, 10);
  const token = await requireToken();
  const r = await bggXml(`/xmlapi2/search?type=boardgame,boardgameexpansion&query=${encodeURIComponent(q)}`, token, { accept202: false, maxAttempt: 4 });
  if (r.status !== 200) throw new Error(`BGG ${r.status}`);
  const items = parseSearch(r.body).slice(0, 10);
  await cacheSet(admin, key, items, TTL_SEARCH_MS);
  return items;
}

/**
 * RPGGeek: XML API2 search type=rpg,rpgitem (stesso host/token BGG).
 * type=rpg è il sistema/edizione (es. «Dungeons & Dragons (5th Edition)», id 17181);
 * type=rpgitem sono i prodotti (manuali, avventure). Solo rpgitem non trova
 * quello che l'utente vede come scheda RPG sul sito. encodeURIComponent
 * protegge la «&» nella query. Cache v2 perché i payload vecchi erano solo rpgitem.
 */
async function cercaRpg(admin: SB, q: string) {
  const key = "rpgsearch-v2:" + q.toLowerCase();
  const hit = await cacheGet(admin, key);
  if (Array.isArray(hit)) return hit.slice(0, 10);
  const token = await requireToken();
  const r = await bggXml(`/xmlapi2/search?type=rpg,rpgitem&query=${encodeURIComponent(q)}`, token, { accept202: false, maxAttempt: 4 });
  if (r.status !== 200) throw new Error(`BGG ${r.status}`);
  const items = rankRpgSearch(parseSearch(r.body), q).slice(0, 10);
  await cacheSet(admin, key, items, TTL_SEARCH_MS);
  return items;
}

async function thingInfo(admin: SB, id: number) {
  const key = "thing:" + id;
  const hit = await cacheGet(admin, key);
  if (hit && typeof hit === "object") return hit as any;
  const token = await requireToken();
  const r = await bggXml(`/xmlapi2/thing?id=${id}&stats=1`, token, { accept202: false, maxAttempt: 4 });
  if (r.status !== 200) throw new Error(`BGG ${r.status}`);
  const parsed = parseThing(r.body, id);
  if (!parsed) throw new Error("dati BGG assenti");
  await cacheSet(admin, key, parsed, TTL_THING_MS);
  return parsed;
}

// v41.15 — scheda GDR per la collezione (stesso token, cache come thing).
async function rpgInfo(admin: SB, id: number) {
  const key = "rpgthing-v3:" + id;
  const hit = await cacheGet(admin, key);
  if (hit && typeof hit === "object") return hit as any;
  const token = await requireToken();
  // type=rpg è una family, non una thing (BGG XML API2). type=rpgitem è una thing.
  // Lo stesso id può essere un boardgame su /thing senza type.
  let parsed=null, last=0;
  const paths = [
    `/xmlapi2/family?id=${id}&type=rpg`,
    `/xmlapi2/thing?id=${id}&type=rpgitem`,
  ];
  for (const q of paths) {
    const r = await bggXml(q, token, { accept202: false, maxAttempt: 4, maxBytes: 400_000 });
    last=r.status;
    if (r.status !== 200) continue;
    parsed = parseRpgThing(r.body, id);
    if (parsed) break;
  }
  if (!parsed) throw new Error(last && last!==200 ? `BGG ${last}` : "dati RPGGeek assenti");
  await cacheSet(admin, key, parsed, TTL_THING_MS);
  return parsed;
}

async function complete(admin: SB, gameId: string) {
  const { data: g } = await admin.from("games").select("id,name,bgg_id,is_expansion").eq("id", gameId).maybeSingle();
  if (!g) return { game_id: gameId, status: "missing" };
  const { data: cur } = await admin.from("game_meta").select("attempts").eq("game_id", gameId).maybeSingle();
  try {
    let id = int(g.bgg_id, 1, 99999999);
    if (!id) {
      const hits = await cercaBgg(admin, txt(g.name, 60));
      const ex = hits.find((x: any) => String(x.nome).toLowerCase() === String(g.name).toLowerCase()) || hits[0];
      id = ex ? int(ex.bgg_id, 1, 99999999) : null;
    }
    if (!id) throw new Error("gioco non trovato su BGG: serve l'ID BGG");
    const m = await thingInfo(admin, id);
    const row = {
      game_id: gameId,
      bgg_id: id,
      weight: m.weight,
      best_players: m.best_players,
      rec_players: m.rec_players,
      min_age: m.min_age,
      lang_dep: m.lang_dep,
      bgg_rank: m.bgg_rank,
      bgg_avg: m.bgg_avg,
      mechanics: m.mechanics,
      categories: m.categories,
      subdomains: m.subdomains,
      interaction: m.interaction,
      luck: m.luck,
      status: "ok",
      fetched_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    };
    const { error } = await admin.from("game_meta").upsert(row);
    if (error) throw error;
    const patch: Record<string, unknown> = {};
    if (!g.bgg_id) patch.bgg_id = id;
    if (m.thumb) patch.thumb = m.thumb;
    if (Object.keys(patch).length) await admin.from("games").update(patch).eq("id", gameId);
    return { game_id: gameId, status: "ok" };
  } catch (e) {
    const att = Math.min(100, (cur?.attempts || 0) + 1);
    await admin.from("game_meta").upsert({
      game_id: gameId,
      status: att >= 8 ? "error" : "pending",
      attempts: att,
      last_error: txt((e as Error).message, 300),
    });
    return { game_id: gameId, status: "pending" };
  }
}

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response('{"error":"metodo"}', { status: 405, headers: h });
  const raw = await req.text();
  if (raw.length > 2000) return new Response('{"error":"troppo grande"}', { status: 413, headers: h });
  let body: any;
  try { body = JSON.parse(raw || "{}"); } catch { return new Response('{"error":"json"}', { status: 400, headers: h }); }
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (body?.mode === "retry") {
    const s = Deno.env.get("CRON_SECRET");
    const got = req.headers.get("x-cron-secret") || "";
    if (!s || s.length < 24 || got.length !== s.length || got !== s) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
    const { data } = await admin.from("game_meta").select("game_id").in("status", ["pending", "error"]).lt("attempts", 20).limit(25);
    const out = [];
    for (const r of data || []) {
      out.push(await complete(admin, r.game_id));
      await new Promise((x) => setTimeout(x, 2000));
    }
    return new Response(JSON.stringify({ done: out.length, ok: out.filter((x) => x.status === "ok").length }), { headers: h });
  }

  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();

  if (body?.mode === "cerca" || body?.mode === "info" || body?.mode === "rpg" || body?.mode === "rpginfo") {
    if (!u?.user) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
    try {
      if (!Deno.env.get("BGG_TOKEN")) return new Response('{"error":"BGG_TOKEN assente"}', { status: 503, headers: h });
      if (body.mode === "cerca") {
        const q = txt(body.q, 60);
        if (q.length < 2) return new Response('{"items":[]}', { headers: h });
        const items = await cercaBgg(admin, q);
        return new Response(JSON.stringify({ items }), { headers: h });
      }
      if (body.mode === "rpg") {
        const q = txt(body.q, 60);
        if (q.length < 2) return new Response('{"items":[]}', { headers: h });
        const items = await cercaRpg(admin, q);
        return new Response(JSON.stringify({ items }), { headers: h });
      }
      if (body.mode === "rpginfo") {
        const rid = int(body.bgg_id, 1, 99999999);
        if (!rid) return new Response('{"error":"bgg_id non valido"}', { status: 400, headers: h });
        return new Response(JSON.stringify(await rpgInfo(admin, rid)), { headers: h });
      }
      const id = int(body.bgg_id, 1, 99999999);
      if (!id) return new Response('{"error":"bgg_id non valido"}', { status: 400, headers: h });
      const m = await thingInfo(admin, id);
      return new Response(JSON.stringify({
        bgg_id: id, nome: m.nome, thumb: m.thumb, min: m.min, max: m.max, durata: m.durata, anno: m.anno,
        peso: m.peso, cat: (m.cat || []).slice(0, 10), minT: m.minT, maxT: m.maxT, eta: m.eta,
        cats: (m.cats || []).slice(0, 20), mec: (m.mec || []).slice(0, 40), best: m.best, rec: m.rec, exp: !!m.exp,
      }), { headers: h });
    } catch (e) {
      const msg = txt((e as Error).message, 80);
      if (msg.includes("BGG_TOKEN")) return new Response('{"error":"BGG_TOKEN assente"}', { status: 503, headers: h });
      const safe = /^BGG \d+$/.test(msg) || msg === "dati RPGGeek assenti" || msg === "dati BGG assenti" || msg === "risposta troppo grande"
        ? msg
        : "BGG non raggiungibile, riprova";
      return new Response(JSON.stringify({ error: safe }), { status: 502, headers: h });
    }
  }

  const { data: staff } = await user.rpc("is_staff");
  if (!u?.user || staff !== true) return new Response('{"error":"solo staff"}', { status: 403, headers: h });
  const gid = typeof body?.game_id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(body.game_id) ? body.game_id : null;
  if (!gid) return new Response('{"error":"game_id non valido"}', { status: 400, headers: h });
  return new Response(JSON.stringify(await complete(admin, gid)), { headers: h });
});
