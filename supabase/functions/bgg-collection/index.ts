// v41.10.2 — Edge Function bgg-collection (admin-only, non moderator).
// mode omesso/collection: XML API2 collection own=1.
// mode "user": XML API2 user?name=… (verifica username + avatar).
// Retry 202, throttle, cache TTL, Bearer BGG_TOKEN. Nessun token nel client.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { bggXml, parseCollectionItems, parseUser, txt } from "../_shared/bgg.ts";

const ORIGINS = ["https://app.pergioco.org", "https://vincenzoassenza-blip.github.io", "http://localhost:8765", "http://localhost:8799", "http://127.0.0.1:8799"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin",
});
const TTL_MS = 6 * 60 * 60 * 1000;
const TTL_USER_MS = 24 * 60 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UNAME = /^[A-Za-z0-9][A-Za-z0-9_ -]{0,49}$/;

function cleanUsername(raw: unknown) {
  const u = txt(raw, 50).replace(/[^A-Za-z0-9_ -]/g, "").trim();
  if (u.length < 1 || u.length > 50 || !UNAME.test(u)) return null;
  return u;
}

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response('{"error":"metodo"}', { status: 405, headers: h });
  const token = Deno.env.get("BGG_TOKEN");
  if (!token) return new Response('{"error":"BGG_TOKEN assente"}', { status: 503, headers: h });
  const raw = await req.text();
  if (raw.length > 500) return new Response('{"error":"troppo grande"}', { status: 413, headers: h });
  let body: any;
  try { body = JSON.parse(raw || "{}"); } catch { return new Response('{"error":"json"}', { status: 400, headers: h }); }
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth)) return new Response('{"error":"non autorizzato"}', { status: 401, headers: h });
  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u } = await user.auth.getUser();
  const { data: adm } = await user.rpc("is_admin");
  // Solo admin (is_admin). I moderatori non passano.
  if (!u?.user || adm !== true) return new Response('{"error":"solo admin"}', { status: 403, headers: h });

  const mode = body?.mode === "user" ? "user" : "collection";
  const username = cleanUsername(body?.username);
  if (!username) return new Response('{"error":"username non valido"}', { status: 400, headers: h });

  if (mode === "user") {
    const cacheKey = "user:" + username.toLowerCase();
    try {
      const { data: cached } = await admin.from("bgg_api_cache").select("payload,expires_at").eq("key", cacheKey).maybeSingle();
      if (cached?.payload && new Date(cached.expires_at).getTime() > Date.now()) {
        return new Response(JSON.stringify({ ...cached.payload, cached: true }), { headers: h });
      }
      const r = await bggXml(`/xmlapi2/user?name=${encodeURIComponent(username)}`, token, { maxAttempt: 4, accept202: false });
      if (r.status !== 200) return new Response(JSON.stringify({ error: `BGG ${r.status}` }), { status: 502, headers: h });
      const parsed = parseUser(r.body);
      const payload = parsed.found
        ? {
          found: true,
          id: parsed.id,
          username: parsed.username || username,
          firstname: parsed.firstname,
          lastname: parsed.lastname,
          avatar: parsed.avatar,
        }
        : { found: false, username };
      await admin.from("bgg_api_cache").upsert({
        key: cacheKey,
        payload,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + TTL_USER_MS).toISOString(),
      });
      return new Response(JSON.stringify({ ...payload, cached: false }), { headers: h });
    } catch {
      return new Response(JSON.stringify({ error: "BGG non raggiungibile" }), { status: 502, headers: h });
    }
  }

  const cacheKey = "collection:" + username.toLowerCase();
  try {
    const { data: cached } = await admin.from("bgg_api_cache").select("payload,expires_at").eq("key", cacheKey).maybeSingle();
    if (cached?.payload && new Date(cached.expires_at).getTime() > Date.now()) {
      return new Response(JSON.stringify({ items: cached.payload, cached: true }), { headers: h });
    }
    const base = `/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&stats=1`;
    const a = await bggXml(`${base}&excludesubtype=boardgameexpansion`, token, { maxAttempt: 8, accept202: true });
    if (a.status !== 200) return new Response(JSON.stringify({ error: `BGG ${a.status}` }), { status: 502, headers: h });
    await sleep(5000);
    const b = await bggXml(`${base}&subtype=boardgameexpansion`, token, { maxAttempt: 8, accept202: true });
    const items = [...parseCollectionItems(a.body, false), ...(b.status === 200 ? parseCollectionItems(b.body, true) : [])];
    const seen = new Set<number>();
    const uniq = items.filter((x) => !seen.has(x.bgg_id) && seen.add(x.bgg_id));
    if (uniq.length > 2000) return new Response('{"error":"collezione troppo grande"}', { status: 413, headers: h });
    await admin.from("bgg_api_cache").upsert({
      key: cacheKey,
      payload: uniq,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    });
    return new Response(JSON.stringify({ items: uniq, cached: false }), { headers: h });
  } catch {
    return new Response(JSON.stringify({ error: "BGG non raggiungibile" }), { status: 502, headers: h });
  }
});
