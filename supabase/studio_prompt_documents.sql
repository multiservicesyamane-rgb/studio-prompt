begin;

create table if not exists public.studio_prompt_documents (
  user_id text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  primary key (user_id, id)
);

alter table public.studio_prompt_documents enable row level security;
alter table public.studio_prompt_documents force row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'studio_prompt_documents_user_id_length'
      and conrelid = 'public.studio_prompt_documents'::regclass
  ) then
    alter table public.studio_prompt_documents
      add constraint studio_prompt_documents_user_id_length
      check (char_length(user_id) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'studio_prompt_documents_id_length'
      and conrelid = 'public.studio_prompt_documents'::regclass
  ) then
    alter table public.studio_prompt_documents
      add constraint studio_prompt_documents_id_length
      check (char_length(id) between 1 and 160);
  end if;
end
$$;

create or replace function public.studio_prompt_touch_document()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.updated_at is null or new.updated_at <= 0 then
    new.updated_at := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  end if;
  return new;
end;
$$;

drop trigger if exists studio_prompt_documents_touch on public.studio_prompt_documents;
create trigger studio_prompt_documents_touch
before insert or update on public.studio_prompt_documents
for each row execute function public.studio_prompt_touch_document();

-- Aucun accès direct depuis le navigateur. Studio Prompt passe par son serveur
-- local, qui garde SUPABASE_SECRET_KEY dans .env.
revoke all on table public.studio_prompt_documents from anon, authenticated;
grant select, insert, update, delete on table public.studio_prompt_documents to service_role;
revoke all on function public.studio_prompt_touch_document() from public, anon, authenticated;
grant execute on function public.studio_prompt_touch_document() to service_role;

create index if not exists studio_prompt_documents_updated_idx
  on public.studio_prompt_documents (user_id, updated_at desc);

comment on table public.studio_prompt_documents is
  'Mémoire persistante de Studio Prompt. Accès exclusivement côté serveur.';
comment on column public.studio_prompt_documents.data is
  'Document JSON versionné par le code de Studio Prompt.';

create table if not exists public.studio_prompt_rate_limits (
  scope text not null,
  identity_hash text not null,
  window_start bigint not null,
  hits integer not null default 1 check (hits > 0),
  primary key (scope, identity_hash, window_start)
);

alter table public.studio_prompt_rate_limits enable row level security;
alter table public.studio_prompt_rate_limits force row level security;
revoke all on table public.studio_prompt_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.studio_prompt_rate_limits to service_role;

create index if not exists studio_prompt_rate_limits_window_idx
  on public.studio_prompt_rate_limits (window_start);

create or replace function public.studio_prompt_take_rate_limit(
  p_scope text,
  p_identity_hash text,
  p_window_start bigint,
  p_max_hits integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  if p_max_hits < 1
     or char_length(p_scope) not between 1 and 40
     or char_length(p_identity_hash) not between 32 and 128 then
    return false;
  end if;

  insert into public.studio_prompt_rate_limits(scope, identity_hash, window_start, hits)
  values (p_scope, p_identity_hash, p_window_start, 1)
  on conflict (scope, identity_hash, window_start)
  do update set hits = public.studio_prompt_rate_limits.hits + 1
  returning hits into current_hits;

  return current_hits <= p_max_hits;
end;
$$;

revoke all on function public.studio_prompt_take_rate_limit(text, text, bigint, integer)
  from public, anon, authenticated;
grant execute on function public.studio_prompt_take_rate_limit(text, text, bigint, integer)
  to service_role;

comment on table public.studio_prompt_rate_limits is
  'Compteurs anti-abus des API IA publiques de Studio Prompt.';

commit;
