-- v10: niente accesso anonimo. Tutto solo per utenti autenticati.
do $$ declare r record; begin
  for r in select tablename,policyname from pg_policies where schemaname='public' and 'anon'=any(roles) loop
    execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('revoke all on public.%I from anon', r.tablename);
  end loop;
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;
-- policy in sola lettura/scrittura per autenticati
do $$ declare r record; begin
  for r in select p.oid::regprocedure sig from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f'
           and p.proname not in ('reset_password_with_code') and p.prorettype<>'trigger'::regtype loop
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end $$;
-- unica eccezione per anon: reimpostare la password con il codice (la registrazione passa dai trigger su auth.users)
grant execute on function public.reset_password_with_code(text,text,text) to anon, authenticated;
