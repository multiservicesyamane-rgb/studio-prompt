create table if not exists public.studio_prompt_documents (
  user_id text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  primary key (user_id, id)
);

alter table public.studio_prompt_documents enable row level security;

-- Aucun accès direct depuis le navigateur. Studio Prompt passe par son serveur
-- local, qui garde SUPABASE_SECRET_KEY dans .env.
revoke all on table public.studio_prompt_documents from anon, authenticated;

create index if not exists studio_prompt_documents_updated_idx
  on public.studio_prompt_documents (user_id, updated_at desc);
