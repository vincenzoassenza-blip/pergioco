// node tests/v41.17-sql.test.js — verifica SQL dei blocchi DB (file migrazione; self-test live dopo il deploy)
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let ok=0,n=0;const chk=(c,m)=>{n++;if(c){ok++;console.log('OK',m)}else{console.error('FAIL',m);process.exitCode=1}};
const sql=fs.readFileSync(path.join(root,'supabase/migrate-v41.17.sql'),'utf8');

const has=s=>sql.includes(s);
chk(has('create or replace function public.accesso_stato()'),'definisce accesso_stato');
chk(/returns jsonb/.test(sql)&&/security definer/.test(sql),'accesso_stato è security definer e restituisce jsonb');
chk(/s\.stato_quote = 'non_in_regola'/.test(sql)&&/s\.data_uscita is null/.test(sql),'non in regola: stesso predicato dei Libri sociali');
chk(/coalesce\(m\.sospeso, false\) then/.test(sql)||/if coalesce\(m\.sospeso, false\)/.test(sql),'sospeso: accesso_stato imposta blocca_azioni');
chk(/m\.active is not true/.test(sql)&&/blocca_app', true/.test(sql),'disattivato: accesso_stato imposta blocca_app');
chk(/is_staff\(\)/.test(sql)&&/stato', 'staff'/.test(sql),'staff: accesso_stato non blocca');

chk(has('create policy accesso_non_disattivato')&&/as restrictive/.test(sql)&&/can_read_app\(\)/.test(sql),'policy RESTRICTIVE accesso_non_disattivato su tutte le tabelle RLS');
chk(/to authenticated/.test(sql)&&!/to anon[\s\S]{0,40}can_read_app/.test(sql),'la restrizione vale per authenticated, non tocca le letture anon');

chk(/member_can_act\(m\.id\)/.test(sql)&&/is_active_member\(\)/.test(sql),'policy tavoli/partite usano member_can_act / is_active_member');
chk(/perform public\.require_active_member\(\)/.test(sql),'le RPC di azione chiamano require_active_member');
const acts=["'table_seat'","'poll_vota'","'des_vota'","'des_proponi'","'des_proponi_voto'","'rate_game'","'evento_prenota'","'ricompensa_scegli'","'update_my_profile'","'set_stats_pubbliche'","'table_cancel'","'tables_host_guard'","'coppa_iscrivi'"];
chk(acts.every(a=>sql.includes(a)),'elenco RPC di azione coperto dalla patch');

chk(/rc_solo_admin\(p_id\) and not public\.is_admin\(\)/.test(sql)||/rc_solo_admin\(v_id\) and not public\.is_admin\(\)/.test(sql)||/rc_solo_admin\(/.test(sql)&&/not public\.is_admin\(\)/.test(sql),'Presidente/Past President: is_admin obbligatorio');
chk(/after insert on public\.socio_ricompense/.test(sql)&&/past-president/.test(sql),'trigger AFTER INSERT su socio_ricompense');
chk(/on conflict \(member_id, ricompensa_id\) do nothing/.test(sql),'il trigger e il backfill sono idempotenti');
chk(/grant execute on function public\.member_can_act\(text\) to authenticated/.test(sql)&&/revoke all on function public\.member_can_act\(text\) from public, anon/.test(sql),'GRANT helper solo ad authenticated');
chk(/revoke all on function public\.rc_past_president_trg\(\) from public, anon/.test(sql),'trigger function non eseguibile da anon');

// la migrazione è idempotente
chk(/drop policy if exists accesso_non_disattivato/.test(sql)&&/drop trigger if exists trg_rc_past_president/.test(sql)&&/create or replace function/.test(sql)&&/on conflict \(id\) do nothing/.test(sql),'migrazione idempotente (drop if exists, replace, on conflict)');

console.log(`v41.17 sql: ${ok}/${n} ok`);
if(ok!==n)process.exit(1);
