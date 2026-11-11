// Shared BGG XML API2 helpers (server-only). No client import.
export const BGG_HOST = "https://boardgamegeek.com";
export const UA = "PerGioco/1.0 (APS Ragusa; +https://app.pergioco.org)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const txt = (s: unknown, max = 80) =>
  String(s ?? "").normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").replace(/[<>"`]/g, "").trim().slice(0, max);
export const int = (v: unknown, lo: number, hi: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};
export const num = (v: unknown, lo: number, hi: number, d = 2) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? +n.toFixed(d) : null;
};
export const decodeXml = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function thumbOk(u: unknown) {
  const s = String(u || "");
  return /^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:()-]+$/.test(s) && s.length <= 400 ? s : null;
}

export function avatarOk(u: unknown) {
  const s = String(u || "").trim();
  // Avatar BGG: cf.geekdo-static.com, cf.geekdo-images.com, o host *.boardgamegeek.com (solo https)
  if (s.length > 400) return null;
  if (/^https:\/\/cf\.geekdo-static\.com\/[A-Za-z0-9_./%=:?&+-]+$/i.test(s)) return s;
  if (/^https:\/\/cf\.geekdo-images\.com\/[A-Za-z0-9_./%=:?&+-]+$/i.test(s)) return s;
  if (/^https:\/\/([A-Za-z0-9-]+\.)*boardgamegeek\.com\/[A-Za-z0-9_./%=:?&+-]+$/i.test(s)) return s;
  return null;
}

/** Parse /xmlapi2/user?name=… — id vuoto = utente assente. */
export function parseUser(xml: string) {
  const m = xml.match(/<user\b([^>]*)>([\s\S]*?)<\/user>/i) || xml.match(/<user\b([^>]*)\/?>/i);
  if (!m) return { found: false as const };
  const attrs = m[1] || "";
  const block = m[2] || "";
  const idRaw = (attrs.match(/\bid="([^"]*)"/) || [])[1] ?? "";
  const nameRaw = (attrs.match(/\bname="([^"]*)"/) || [])[1] ?? "";
  const id = String(idRaw).trim();
  const username = txt(decodeXml(nameRaw), 50);
  if (!id) return { found: false as const, username: username || null };
  const firstname = txt(decodeXml((block.match(/<firstname[^>]*value="([^"]*)"/i) || [])[1] || ""), 50);
  const lastname = txt(decodeXml((block.match(/<lastname[^>]*value="([^"]*)"/i) || [])[1] || ""), 50);
  const avatar = avatarOk((block.match(/<avatarlink[^>]*value="([^"]*)"/i) || [])[1] || "");
  return {
    found: true as const,
    id,
    username: username || null,
    firstname: firstname || null,
    lastname: lastname || null,
    avatar,
  };
}


/** Fetch XML API2 with Bearer. Handles 202 (collection queue), 429/5xx with bounded backoff. Never logs token. */
export async function bggXml(
  pathAndQuery: string,
  token: string,
  opts: { maxAttempt?: number; accept202?: boolean } = {},
): Promise<{ status: number; body: string }> {
  const maxAttempt = opts.maxAttempt ?? 8;
  const accept202 = opts.accept202 ?? true;
  let attempt = 1;
  while (attempt <= maxAttempt) {
    const r = await fetch(`${BGG_HOST}${pathAndQuery}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": UA, Accept: "application/xml" },
      signal: AbortSignal.timeout(30000),
    });
    const body = await r.text();
    if (body.length > 5_000_000) throw new Error("risposta troppo grande");
    if (r.status === 202 && accept202 && attempt < maxAttempt) {
      await sleep(Math.min(3000 * 2 ** (attempt - 1), 30000));
      attempt++;
      continue;
    }
    if ((r.status === 429 || r.status >= 500) && attempt < maxAttempt) {
      await sleep(Math.min(5000 * 2 ** (attempt - 1), 60000));
      attempt++;
      continue;
    }
    return { status: r.status, body };
  }
  return { status: 504, body: "" };
}

export type SearchHit = { bgg_id: number; nome: string; anno: number | null; tipo: string | null };

export function parseSearch(xml: string): SearchHit[] {
  const out: SearchHit[] = [];
  for (const m of xml.matchAll(/<item\b([^>]*)>([\s\S]*?)<\/item>/g)) {
    const attrs = m[1], block = m[2];
    const id = int((attrs.match(/\bid="(\d+)"/) || [])[1], 1, 99999999);
    if (!id) continue;
    const n = block.match(/<name[^>]*type="primary"[^>]*value="([^"]*)"/) || block.match(/<name[^>]*value="([^"]*)"[^>]*type="primary"/) || block.match(/<name[^>]*value="([^"]*)"/);
    const y = block.match(/<yearpublished[^>]*value="(\d+)"/);
    const nome = txt(decodeXml(n?.[1] || ""), 100);
    if (!nome) continue;
    const tipoRaw = (attrs.match(/\btype="([^"]*)"/) || [])[1] || "";
    const tipo = txt(tipoRaw, 40) || null;
    out.push({ bgg_id: id, nome, anno: int(y?.[1], 1800, 2100), tipo });
  }
  return out;
}

/** Normalizza per confrontare query e titoli RPGGeek (&, punteggiatura, maiuscole). */
export function rpgNorm(s: string) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Ordina i risultati della ricerca GDR: prima i sistemi (type=rpg),
 * poi i manuali (rpgitem), con priorità alle corrispondenze sul nome.
 * Così «Dungeons & Dragons (5th Edition)» (rpg 17181) emerge rispetto
 * ai tanti manuali/avventure che l'API restituisce per la stessa query.
 */
export function rankRpgSearch(items: SearchHit[], q: string): SearchHit[] {
  const nq = rpgNorm(q);
  const toks = nq.split(/\s+/).filter((t) => t.length > 1);
  const q5 = /\b(5e|5th|fifth)\b/.test(nq);
  const qdd = /d\s*&\s*d|\bdnd\b/i.test(q);
  const scored = items.map((it) => {
    const n = rpgNorm(it.nome);
    let s = 0;
    if (nq) {
      if (n === nq) s += 100;
      else if (n.startsWith(nq)) s += 40;
      else if (n.includes(nq)) s += 20;
      if (toks.length) s += Math.round((20 * toks.filter((t) => n.includes(t)).length) / toks.length);
    }
    if ((it.tipo || "") === "rpg") s += 30;
    if (q5 && /\b(5e|5th|fifth)\b/.test(n)) s += 25;
    if (qdd && n.includes("dungeons") && n.includes("dragons")) s += 25;
    // Edizione ufficiale attuale: «Dungeons & Dragons (5th Edition)» (rpg 17181),
    // non la 3.5/4e né i playtest, quando la query non precisa l'edizione.
    if (n.includes("dungeons") && n.includes("dragons") && n === "dungeons dragons 5th edition") s += 40;
    return { it, s };
  });
  scored.sort((a, b) => b.s - a.s || ((a.it.tipo === "rpg" ? 0 : 1) - (b.it.tipo === "rpg" ? 0 : 1)) || a.it.nome.localeCompare(b.it.nome, "en"));
  const seen = new Set<number>();
  const out: SearchHit[] = [];
  for (const { it } of scored) {
    if (seen.has(it.bgg_id)) continue;
    seen.add(it.bgg_id);
    out.push(it);
  }
  return out;
}

function attr(tag: string, name: string) {
  return (tag.match(new RegExp(name + '="([^"]*)"')) || [])[1];
}
function linkNames(xml: string, type: string, max: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(new RegExp(`<link[^>]*type="${type}"[^>]*>`, "g"))) {
    const n = txt(decodeXml(attr(m[0], "value") || ""), 60);
    if (n && !seen.has(n)) { seen.add(n); out.push(n); if (out.length >= max) break; }
  }
  return out;
}
function pollNums(xml: string, name: string) {
  const block = xml.match(new RegExp(`<poll-summary[^>]*name="${name}"[^>]*>([\\s\\S]*?)<\\/poll-summary>`, "i"))
    || xml.match(new RegExp(`<poll[^>]*name="${name}"[^>]*>([\\s\\S]*?)<\\/poll>`, "i"));
  return block?.[1] || "";
}
function suggestedPlayers(xml: string, result: string) {
  const s = new Set<number>();
  for (const m of xml.matchAll(/<results\b[^>]*numplayers="(\d+\+?)"[^>]*>([\s\S]*?)<\/results>/g)) {
    const nRaw = m[1];
    if (nRaw.endsWith("+")) continue;
    const n = int(nRaw, 1, 20); if (!n) continue;
    let best = 0, rec = 0, not = 0;
    for (const v of m[2].matchAll(/<result[^>]*value="([^"]*)"[^>]*numvotes="(\d+)"/g)) {
      const lab = v[1].toLowerCase(), c = +v[2] || 0;
      if (lab.includes("best")) best = c; else if (lab.includes("recommend") && !lab.includes("not")) rec = c; else not = c;
    }
    if (result === "best" && best >= rec && best >= not && best > 0) s.add(n);
    if (result === "recommended" && (best + rec) >= not && (best + rec) > 0) s.add(n);
  }
  return [...s].sort((a, b) => a - b);
}

const LANG: Record<string, number> = {
  "No necessary in-game text": 0,
  "Some necessary text - easily memorized or small crib sheet": 1,
  "Moderate in-game text - needs crib sheet or paste ups": 2,
  "Extensive use of text - massive conversion needed to be playable": 3,
  "Unplayable in another language": 4,
};
const HI = new Set(["Take That", "Player Elimination", "Area Majority / Influence", "Negotiation", "Trading", "Card Play Conflict Resolution",
  "Betting and Bluffing", "Bribery", "Hidden Roles", "Traitor Game", "Team-Based Game", "Auction / Bidding", "Force Commitment", "Alliances", "Grid Movement", "Area Movement"]);
const LUCK: Record<string, number> = { "Dice Rolling": 2, "Push Your Luck": 2, "Die Icon Resolution": 1, "Betting and Bluffing": 1, "Critical Hits and Failures": 1, "Random Production": 1, "Roll / Spin and Move": 2 };

export function parseThing(xml: string, bggId: number) {
  const item = xml.match(new RegExp(`<item\\b[^>]*id="${bggId}"[^>]*>([\\s\\S]*?)<\\/item>`)) || xml.match(/<item\b[^>]*>([\s\S]*?)<\/item>/);
  if (!item) return null;
  const block = item[1];
  const itemTag = (xml.match(new RegExp(`<item\\b[^>]*id="${bggId}"[^>]*>`)) || xml.match(/<item\b[^>]*>/) || [""])[0];
  const type = attr(itemTag, "type") || "";
  const exp = type === "boardgameexpansion" || block.includes('value="Expansion for Base-game"');
  const name = txt(decodeXml((block.match(/<name[^>]*type="primary"[^>]*value="([^"]*)"/) || block.match(/<name[^>]*value="([^"]*)"/) || [])[1] || ""), 100);
  if (!name) return null;
  const year = int((block.match(/<yearpublished[^>]*value="(\d+)"/) || [])[1], 1800, 2100);
  const min = int((block.match(/<minplayers[^>]*value="(\d+)"/) || [])[1], 1, 100) || 1;
  let max = int((block.match(/<maxplayers[^>]*value="(\d+)"/) || [])[1], 1, 100) || min; if (max < min) max = min;
  const minT = int((block.match(/<minplaytime[^>]*value="(\d+)"/) || [])[1], 0, 1440);
  const maxT = int((block.match(/<maxplaytime[^>]*value="(\d+)"/) || [])[1], 0, 1440);
  const pt = int((block.match(/<playingtime[^>]*value="(\d+)"/) || [])[1], 0, 1440);
  const age = int((block.match(/<minage[^>]*value="(\d+)"/) || [])[1], 0, 99) || 0;
  const th = thumbOk((block.match(/<thumbnail>([^<]+)<\/thumbnail>/) || [])[1]);
  const mech = linkNames(block, "boardgamemechanic", 60);
  const cat = linkNames(block, "boardgamecategory", 40);
  const sub = linkNames(block, "boardgamesubdomain", 10);
  const weight = num((block.match(/<averageweight[^>]*value="([0-9.]+)"/) || [])[1], 1, 5);
  const bgg_avg = num((block.match(/<average[^>]*value="([0-9.]+)"/) || [])[1], 0, 10);
  const rank = int((block.match(/<rank[^>]*name="boardgame"[^>]*value="(\d+)"/) || [])[1], 1, 1000000);
  let lang_dep: number | null = null;
  for (const m of block.matchAll(/<result[^>]*value="([^"]*)"[^>]*numvotes="(\d+)"[^>]*level="(\d+)"/g)) {
    if (LANG[m[1]] != null) {
      // pick highest votes
    }
  }
  // language dependence: choose level with most votes
  let bestVotes = -1;
  for (const m of block.matchAll(/<result[^>]*value="([^"]*)"[^>]*numvotes="(\d+)"[^>]*(?:level="(\d+)")?/g)) {
    if (!(m[1] in LANG)) continue;
    const votes = +m[2] || 0;
    if (votes > bestVotes) { bestVotes = votes; lang_dep = LANG[m[1]]; }
  }
  const best = suggestedPlayers(block, "best");
  const rec = suggestedPlayers(block, "recommended");
  const hi = mech.filter((m) => HI.has(m)).length;
  const interaction = mech.includes("Cooperative Game") ? 0 : (mech.includes("Take That") || mech.includes("Player Elimination") || hi >= 2 ? 2 : 1);
  const luck = Math.min(2, mech.reduce((s, m) => s + (LUCK[m] || 0), 0));
  return {
    bgg_id: bggId, nome: name, anno: year, min, max,
    minT: minT ?? pt ?? 30, maxT: maxT ?? pt ?? minT ?? 30, durata: pt ?? maxT ?? minT, eta: age, thumb: th, exp,
    cats: cat, mec: mech, cat, peso: weight, best, rec,
    weight, best_players: best, rec_players: rec, min_age: age || null, lang_dep, bgg_rank: rank, bgg_avg,
    mechanics: mech, categories: cat, subdomains: sub, interaction, luck,
  };
}

export function parseCollectionItems(xml: string, exp: boolean) {
  const out: any[] = [];
  for (const m of xml.matchAll(/<item\b([^>]*)>([\s\S]*?)<\/item>/g)) {
    const attrs = m[1], block = m[2];
    const id = int(attr(attrs, "objectid"), 1, 99999999); if (!id) continue;
    const name = txt(decodeXml((block.match(/<name[^>]*>([^<]*)<\/name>/) || block.match(/<name[^>]*value="([^"]*)"/) || [])[1] || ""), 100);
    if (!name) continue;
    const year = int((block.match(/<yearpublished[^>]*value="(\d+)"/) || block.match(/<yearpublished>(\d+)/) || [])[1], 1800, 2100);
    const stats = block.match(/<stats[\s\S]*?<\/stats>/)?.[0] || attrs;
    const min = int((stats.match(/minplayers="(\d+)"/) || [])[1], 1, 100) || 1;
    let max = int((stats.match(/maxplayers="(\d+)"/) || [])[1], 1, 100) || min; if (max < min) max = min;
    const minT = int((stats.match(/minplaytime="(\d+)"/) || [])[1], 0, 1440);
    const maxT = int((stats.match(/maxplaytime="(\d+)"/) || [])[1], 0, 1440);
    const pt = int((stats.match(/playingtime="(\d+)"/) || [])[1], 0, 1440);
    const age = int((stats.match(/minage="(\d+)"/) || [])[1], 0, 99) || 0;
    const th = thumbOk((block.match(/<thumbnail>([^<]+)<\/thumbnail>/) || [])[1]);
    out.push({ bgg_id: id, nome: name, anno: year, min, max, minT: minT ?? pt ?? 30, maxT: maxT ?? pt ?? minT ?? 30, durata: pt ?? maxT ?? minT, eta: age, thumb: th, exp });
  }
  return out;
}
