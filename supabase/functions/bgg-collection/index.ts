// v41.9 — STUB (NON deployare finché non c’è BGG_TOKEN e l’ok di Vincenzo).
// Proxy collezione BGG XML API2: own=1, retry su HTTP 202, throttle ~5s, Bearer da secret BGG_TOKEN.
// Chiamata ammessa: POST {username} con JWT di un admin (is_admin). Nessun token nel client.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORIGINS = ["https://app.pergioco.org", "https://vincenzoassenza-blip.github.io", "http://localhost:8765", "http://localhost:8799"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin",
});
const txt = (s: unknown) => String(s ?? "").normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").replace(/[<>"`]/g, "").trim().slice(0, 80);
const int = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function bggGet(url: string, token: string, attempt = 1): Promise<{ status: number; body: string }> {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "PerGioco/1.0 (APS Ragusa)", Accept: "application/xml" },
    signal: AbortSignal.timeout(30000),
  });
  const body = await r.text();
  if (body.length > 5_000_000) throw new Error("risposta troppo grande");
  if (r.status === 202 && attempt < 8) { await sleep(Math.min(2000 * 2 ** (attempt - 1), 30000)); return bggGet(url, token, attempt + 1); }
  return { status: r.status, body };
}

function parseCollection(xml: string, exp: boolean) {
  const out: any[] = [];
  for (const m of xml.matchAll(/<item[^>]*objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g)) {
    const id = int(m[1], 1, 99999999); if (!id) continue;
    const block = m[2];
    const name = txt((block.match(/<name[^>]*>([^<]*)<\/name>/) || block.match(/<name[^>]*value="([^"]*)"/) || [])[1]);
    const year = int((block.match(/<yearpublished[^>]*value="(\d+)"/) || block.match(/<yearpublished>(\d+)/) || [])[1], 1800, 2100);
    const stats = block.match(/<stats[\s\S]*?<\/stats>/)?.[0] || "";
    const min = int((stats.match(/minplayers="(\d+)"/) || [])[1], 1, 100) || 1;
    let max = int((stats.match(/maxplayers="(\d+)"/) || [])[1], 1, 100) || min; if (max < min) max = min;
    const minT = int((stats.match(/minplaytime="(\d+)"/) || [])[1], 0, 1440);
    const maxT = int((stats.match(/maxplaytime="(\d+)"/) || [])[1], 0, 1440);
    const pt = int((stats.match(/playingtime="(\d+)"/) || [])[1], 0, 1440);
    const age = int((stats.match(/minage="(\d+)"/) || [])[1], 0, 99) || 0;
    const thumb = (block.match(/<thumbnail>([^<]+)<\/thumbnail>/) || [])[1] || "";
    const th = /^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:()-]+$/.test(thumb) && thumb.length <= 400 ? thumb : null;
    if (!name) continue;
    out.push({ bgg_id: id, nome: name, anno: year, min, max, minT: minT ?? pt ?? 30, maxT: maxT ?? pt ?? minT ?? 30, durata: pt ?? maxT ?? minT, eta: age, thumb: th, exp });
  }
  return out;
}

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response('{"error":"metodo"}', { status: 405, headers: h });
  const token = Deno.env.get("BGG_TOKEN");
  if (!token) return new Response('{"error":"BGG_TOKEN assente"}', { status: 503, headers: h });
  const raw = await req.text(); if (raw.length > 500) return new Response('{"error":"troppo grande"}', { status: 413, headers: h });
  let body: any; try { body = JSON.parse(raw || "{}"); } catch { return new Response('{"error":"json"}', { status: 400, headers: h }); }
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();
  const { data: adm } = await user.rpc("is_admin");
  if (!u?.user || adm !== true) return new Response('{"error":"solo admin"}', { status: 403, headers: h });
  const username = txt(body?.username).replace(/[^A-Za-z0-9_ -]/g, "").slice(0, 40);
  if (username.length < 2) return new Response('{"error":"username non valido"}', { status: 400, headers: h });
  try {
    const base = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&stats=1`;
    const a = await bggGet(`${base}&excludesubtype=boardgameexpansion`, token);
    if (a.status !== 200) return new Response(JSON.stringify({ error: `BGG ${a.status}` }), { status: 502, headers: h });
    await sleep(5000);
    const b = await bggGet(`${base}&subtype=boardgameexpansion`, token);
    const items = [...parseCollection(a.body, false), ...(b.status === 200 ? parseCollection(b.body, true) : [])];
    const seen = new Set<number>(); const uniq = items.filter((x) => !seen.has(x.bgg_id) && seen.add(x.bgg_id));
    if (uniq.length > 2000) return new Response('{"error":"collezione troppo grande"}', { status: 413, headers: h });
    return new Response(JSON.stringify({ items: uniq }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: "BGG non raggiungibile" }), { status: 502, headers: h });
  }
});
