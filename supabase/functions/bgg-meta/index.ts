// v25 — Edge Function "bgg-meta": recupera da api.geekdo.com i dati extra di un gioco e li scrive in public.game_meta.
// Chiamate ammesse:
//  1) dall'app, POST {game_id} con JWT di uno staff (verificato con is_staff())
//  2) dal cron settimanale, POST {mode:"retry"} con header x-cron-secret = CRON_SECRET
// Segreti richiesti (supabase secrets set): CRON_SECRET. SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sono forniti da Supabase.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = ["https://vincenzoassenza-blip.github.io", "http://localhost:8765"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const LANG: Record<string, number> = {
  "No necessary in-game text": 0, "Some necessary text - easily memorized or small crib sheet": 1,
  "Moderate in-game text - needs crib sheet or paste ups": 2, "Extensive use of text - massive conversion needed to be playable": 3,
  "Unplayable in another language": 4,
};
// stesse regole di tools/build-meta.py
const HI = new Set(["Take That", "Player Elimination", "Area Majority / Influence", "Negotiation", "Trading", "Card Play Conflict Resolution",
  "Betting and Bluffing", "Bribery", "Hidden Roles", "Traitor Game", "Team-Based Game", "Auction / Bidding", "Force Commitment", "Alliances", "Grid Movement", "Area Movement"]);
const LUCK: Record<string, number> = { "Dice Rolling": 2, "Push Your Luck": 2, "Die Icon Resolution": 1, "Betting and Bluffing": 1, "Critical Hits and Failures": 1, "Random Production": 1, "Roll / Spin and Move": 2 };

const txt = (s: unknown) => String(s ?? "").normalize("NFC").replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "").replace(/[<>"`]/g, "").trim().slice(0, 80);
const list = (a: unknown, max: number) => Array.isArray(a) ? [...new Set(a.map((x: any) => txt(x?.name)).filter(Boolean))].slice(0, max) : [];
const int = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const num = (v: unknown, lo: number, hi: number, d = 2) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? +n.toFixed(d) : null; };
const range = (l: any) => { const s = new Set<number>(); for (const r of Array.isArray(l) ? l : []) { const a = int(r?.min, 1, 20); if (a === null) continue; const b = int(r?.max, 1, 20) ?? a; for (let i = a; i <= b; i++) s.add(i); } return [...s].sort((x, y) => x - y); };

async function getJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "PerGioco/1.0 (APS Ragusa)", Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`BGG ${r.status}`);
  const t = await r.text(); if (t.length > 3_000_000) throw new Error("risposta troppo grande");
  return JSON.parse(t);
}
// v36b — ricerca per nome. La ricerca di BGG (sito: Cloudflare; XML API2: token dal 2025) non risponde ai server:
// 1) XML API2 se c'è il secret BGG_TOKEN, 2) ricerca del sito BGG, 3) Wikidata (proprietà P2339 = ID BGG), 4) giochi già in ludoteca.
type Hit = { bgg_id: number; nome: string; anno: number | null };
const okHits = (a: any[]) => a.filter((x) => x.bgg_id && x.nome).slice(0, 10) as Hit[];
async function cercaBgg(q: string, user: any): Promise<Hit[]> {
  const tok = Deno.env.get("BGG_TOKEN");
  if (tok) try {
    const r = await fetch(`https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${tok}`, "User-Agent": "PerGioco/1.0 (APS Ragusa)" }, signal: AbortSignal.timeout(15000) });
    if (r.ok) { const x = (await r.text()).slice(0, 2_000_000); const out: any[] = [];
      for (const m of x.matchAll(/<item[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g)) { const n = m[2].match(/<name[^>]*value="([^"]*)"/), y = m[2].match(/<yearpublished[^>]*value="(\d+)"/);
        out.push({ bgg_id: int(m[1], 1, 99999999), nome: txt((n?.[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, "'").replace(/&#0?39;/g, "'")), anno: int(y?.[1], 1800, 2100) }); }
      if (out.length) return okHits(out); }
  } catch { /* prossima fonte */ }
  try {
    const j = await getJson(`https://boardgamegeek.com/search/boardgame?q=${encodeURIComponent(q)}&nosession=1&showcount=10`);
    const a = okHits((Array.isArray(j?.items) ? j.items : []).map((x: any) => ({ bgg_id: int(x?.objectid, 1, 99999999), nome: txt(x?.name), anno: int(x?.yearpublished, 1800, 2100) })));
    if (a.length) return a;
  } catch { /* prossima fonte */ }
  let wd: Hit[] = [];
  try {
    const wu = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q.replace(/[^\p{L}\p{N} :'&.-]/gu, " ") + " haswbstatement:P2339")}&srlimit=10&format=json`;
    const s = await getJson(wu).catch(() => new Promise((r) => setTimeout(r, 800)).then(() => getJson(wu)));
    const ids = (s?.query?.search || []).map((x: any) => String(x?.title || "")).filter((t: string) => /^Q\d+$/.test(t)).slice(0, 10);
    if (ids.length) {
      const e = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=labels|claims&languages=it|en&format=json`);
      wd = okHits(ids.map((id: string) => { const it = e?.entities?.[id]; const c = it?.claims;
        const b = c?.P2339?.[0]?.mainsnak?.datavalue?.value; const y = String(c?.P577?.[0]?.mainsnak?.datavalue?.value?.time || "").match(/^\+(\d{4})/);
        return { bgg_id: int(b, 1, 99999999), nome: txt(it?.labels?.it?.value || it?.labels?.en?.value), anno: int(y?.[1], 1800, 2100) }; }));
    }
  } catch { /* prossima fonte */ }
  let loc: Hit[] = [];
  try {
    const { data } = await user.from("games").select("name,bgg_id,year").not("bgg_id", "is", null).ilike("name", `%${q.replace(/[%_\\,()]/g, " ")}%`).limit(10);
    loc = okHits((data || []).map((g: any) => ({ bgg_id: int(g.bgg_id, 1, 99999999), nome: txt(g.name), anno: int(g.year, 1800, 2100) })));
  } catch { /* nessuna */ }
  const seen = new Set<number>(); const all = [...wd, ...loc].filter((x) => !seen.has(x.bgg_id) && seen.add(x.bgg_id));
  return all.slice(0, 10);
}
async function findId(name: string): Promise<number | null> {
  // ricerca per nome (best effort): il primo risultato esatto, altrimenti il primo
  const q = encodeURIComponent(txt(name));
  const j = await getJson(`https://boardgamegeek.com/search/boardgame?q=${q}&nosession=1&showcount=5`).catch(() => null);
  const items = j?.items || []; const ex = items.find((x: any) => String(x?.name).toLowerCase() === name.toLowerCase()) || items[0];
  return ex ? int(ex.objectid, 1, 99999999) : null;
}
async function fetchMeta(bggId: number) {
  const it = (await getJson(`https://api.geekdo.com/api/geekitems?objectid=${bggId}&objecttype=thing`))?.item;
  const dy = (await getJson(`https://api.geekdo.com/api/dynamicinfo?objectid=${bggId}&objecttype=thing`))?.item;
  if (!it || !dy) throw new Error("dati BGG assenti");
  const p = dy.polls || {}; const mech = list(it.links?.boardgamemechanic, 60);
  const hi = mech.filter((m) => HI.has(m)).length;
  const interaction = mech.includes("Cooperative Game") ? 0 : (mech.includes("Take That") || mech.includes("Player Elimination") || hi >= 2 ? 2 : 1);
  const rank = (dy.rankinfo || []).find((r: any) => r?.rankobjectid === 1)?.rank;
  return {
    bgg_id: bggId, weight: num(p.boardgameweight?.averageweight, 1, 5), best_players: range(p.userplayers?.best), rec_players: range(p.userplayers?.recommended),
    min_age: int(it.minage, 1, 99), lang_dep: LANG[p.languagedependence] ?? null, bgg_rank: int(rank, 1, 1000000), bgg_avg: num(dy.stats?.average, 0, 10),
    mechanics: mech, categories: list(it.links?.boardgamecategory, 40), subdomains: list(it.links?.boardgamesubdomain, 10), interaction,
    luck: Math.min(2, mech.reduce((s, m) => s + (LUCK[m] || 0), 0)), status: "ok", fetched_at: new Date().toISOString(), attempts: 0, last_error: null,
  };
}
async function complete(admin: any, gameId: string) {
  const { data: g } = await admin.from("games").select("id,name,bgg_id,is_expansion").eq("id", gameId).maybeSingle();
  if (!g) return { game_id: gameId, status: "missing" };
  const { data: cur } = await admin.from("game_meta").select("attempts").eq("game_id", gameId).maybeSingle();
  try {
    let id = int(g.bgg_id, 1, 99999999); if (!id) id = await findId(g.name);
    if (!id) throw new Error("gioco non trovato su BGG: serve l'ID BGG");
    const m = await fetchMeta(id);
    const { error } = await admin.from("game_meta").upsert({ game_id: gameId, ...m }); if (error) throw error;
    if (!g.bgg_id) await admin.from("games").update({ bgg_id: id }).eq("id", gameId);
    return { game_id: gameId, status: "ok" };
  } catch (e) {
    const att = Math.min(100, (cur?.attempts || 0) + 1);
    await admin.from("game_meta").upsert({ game_id: gameId, status: att >= 8 ? "error" : "pending", attempts: att, last_error: txt((e as Error).message).slice(0, 300) });
    return { game_id: gameId, status: "pending" };
  }
}

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response('{"error":"metodo"}', { status: 405, headers: h });
  const raw = await req.text(); if (raw.length > 2000) return new Response('{"error":"troppo grande"}', { status: 413, headers: h });
  let body: any; try { body = JSON.parse(raw || "{}"); } catch { return new Response('{"error":"json"}', { status: 400, headers: h }); }
  const url = Deno.env.get("SUPABASE_URL")!; const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  if (body?.mode === "retry") {
    const s = Deno.env.get("CRON_SECRET"); const got = req.headers.get("x-cron-secret") || "";
    if (!s || s.length < 24 || got.length !== s.length || !crypto.subtle || got !== s) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
    const { data } = await admin.from("game_meta").select("game_id").in("status", ["pending", "error"]).lt("attempts", 20).limit(25);
    const out = []; for (const r of data || []) { out.push(await complete(admin, r.game_id)); await new Promise((r) => setTimeout(r, 1500)); }
    return new Response(JSON.stringify({ done: out.length, ok: out.filter((x) => x.status === "ok").length }), { headers: h });
  }
  // chiamata dall'app: staff (game_id) oppure qualsiasi utente autenticato (mode cerca/info)
  const auth = req.headers.get("authorization") || ""; if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();
  // v36 — Lista desideri: ricerca e scheda BGG per qualsiasi utente autenticato (solo lettura, dati ripuliti, nessuna scrittura)
  if (body?.mode === "cerca" || body?.mode === "info") {
    if (!u?.user) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
    try {
      if (body.mode === "cerca") {
        const q = txt(body.q).slice(0, 60); if (q.length < 2) return new Response('{"items":[]}', { headers: h });
        const items = await cercaBgg(q, user);
        return new Response(JSON.stringify({ items }), { headers: h });
      }
      const id = int(body.bgg_id, 1, 99999999); if (!id) return new Response('{"error":"bgg_id non valido"}', { status: 400, headers: h });
      const it = (await getJson(`https://api.geekdo.com/api/geekitems?objectid=${id}&objecttype=thing`))?.item;
      const dy = (await getJson(`https://api.geekdo.com/api/dynamicinfo?objectid=${id}&objecttype=thing`))?.item;
      if (!it) throw new Error("dati BGG assenti");
      const th = String(it.images?.square200 || it.images?.thumb || it.imageurl || "");
      const durata = int(it.maxplaytime, 1, 1440) ?? int(it.minplaytime, 1, 1440);
      return new Response(JSON.stringify({ bgg_id: id, nome: txt(it.name), thumb: /^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:()-]+$/.test(th) && th.length <= 400 ? th : null,
        min: int(it.minplayers, 1, 20), max: int(it.maxplayers, 1, 30), durata, anno: int(it.yearpublished, 1800, 2100),
        peso: num(dy?.polls?.boardgameweight?.averageweight, 1, 5), cat: list(it.links?.boardgamecategory, 10) }), { headers: h });
    } catch { return new Response('{"error":"BGG non raggiungibile, riprova"}', { status: 502, headers: h }); }
  }
  const { data: staff } = await user.rpc("is_staff");
  if (!u?.user || staff !== true) return new Response('{"error":"solo staff"}', { status: 403, headers: h });
  const gid = typeof body?.game_id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(body.game_id) ? body.game_id : null;
  if (!gid) return new Response('{"error":"game_id non valido"}', { status: 400, headers: h });
  return new Response(JSON.stringify(await complete(admin, gid)), { headers: h });
});
