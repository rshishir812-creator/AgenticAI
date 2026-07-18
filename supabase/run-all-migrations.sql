-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Agentic AI Lab â€” all migrations combined
-- Run this once in: Supabase Dashboard â†’ SQL Editor â†’ New Query â†’ Paste â†’ Run
-- https://app.supabase.com/project/sjqebfcvrufafpfnvuhs/sql/new
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- â”€â”€ 001: Extensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- â”€â”€ 002: RAG document store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists documents (
  id          uuid primary key default uuid_generate_v4(),
  content     text        not null,
  embedding   vector(768),
  metadata    jsonb       not null default '{}',
  source      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists documents_content_trgm_idx
  on documents using gin (content extensions.gin_trgm_ops);

create or replace function match_documents(
  query_embedding vector(768),
  match_threshold float  default 0.5,
  match_count     int    default 5
)
returns table (id uuid, content text, metadata jsonb, source text, similarity float)
language sql stable as $$
  select id, content, metadata, source,
         1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function hybrid_search(
  query_text      text,
  query_embedding vector(768),
  match_count     int   default 5,
  full_text_weight float default 1.0,
  semantic_weight  float default 1.0
)
returns table (id uuid, content text, metadata jsonb, source text, rrf_score float)
language sql stable as $$
with full_text as (
  select id, row_number() over (order by ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', query_text)) desc) as rank_ix
  from documents
  where to_tsvector('english', content) @@ plainto_tsquery('english', query_text)
  order by rank_ix limit match_count * 2
),
semantic as (
  select id, row_number() over (order by embedding <=> query_embedding) as rank_ix
  from documents
  order by embedding <=> query_embedding
  limit match_count * 2
)
select d.id, d.content, d.metadata, d.source,
  coalesce(1.0 / (60 + ft.rank_ix), 0) * full_text_weight
  + coalesce(1.0 / (60 + s.rank_ix), 0) * semantic_weight as rrf_score
from documents d
full outer join full_text ft using (id)
full outer join semantic s using (id)
order by rrf_score desc
limit match_count;
$$;

-- â”€â”€ 003: Runs and traces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists runs (
  id                 text        primary key,
  agent_id           text        not null,
  status             text        not null default 'pending',
  input              text        not null,
  output             text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  duration_ms        int,
  total_tokens       int,
  estimated_cost_usd numeric(10,6),
  error_message      text,
  thread_id          text,
  metadata           jsonb       not null default '{}'
);

create index if not exists runs_agent_id_idx    on runs(agent_id);
create index if not exists runs_status_idx      on runs(status);
create index if not exists runs_started_at_idx  on runs(started_at desc);

create table if not exists traces (
  span_id             text    primary key,
  parent_span_id      text,
  run_id              text    not null references runs(id) on delete cascade,
  trace_id            text    not null,
  name                text    not null,
  kind                text    not null,
  start_time_ms       bigint  not null,
  end_time_ms         bigint,
  status              text    not null default 'unset',
  error_message       text,
  genai_system        text,
  genai_model         text,
  genai_operation     text,
  input_tokens        int,
  output_tokens       int,
  total_tokens        int,
  finish_reason       text,
  loop_detected       boolean not null default false,
  step_budget_exceeded  boolean not null default false,
  token_budget_exceeded boolean not null default false,
  redacted            boolean not null default false,
  routing_model       text,
  routing_reason      text,
  routing_complexity  numeric(4,2),
  attributes          jsonb   not null default '{}'
);

create index if not exists traces_run_id_idx     on traces(run_id);
create index if not exists traces_trace_id_idx   on traces(trace_id);
create index if not exists traces_start_time_idx on traces(start_time_ms desc);
create index if not exists traces_loop_flag_idx  on traces(loop_detected) where loop_detected = true;

-- â”€â”€ 004: LangGraph checkpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists checkpoints (
  thread_id            text not null,
  checkpoint_ns        text not null default '',
  checkpoint_id        text not null,
  parent_checkpoint_id text,
  type                 text,
  checkpoint           jsonb not null,
  metadata             jsonb not null default '{}',
  primary key (thread_id, checkpoint_ns, checkpoint_id)
);

create table if not exists checkpoint_blobs (
  thread_id     text not null,
  checkpoint_ns text not null default '',
  channel       text not null,
  version       text not null,
  type          text not null,
  blob          bytea,
  primary key (thread_id, checkpoint_ns, channel, version)
);

create table if not exists checkpoint_writes (
  thread_id     text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  task_id       text not null,
  idx           int  not null,
  channel       text not null,
  type          text,
  blob          bytea,
  primary key (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- â”€â”€ 005: Agent memory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists agent_memory (
  id          uuid        primary key default uuid_generate_v4(),
  namespace   text[]      not null,
  key         text        not null,
  value       jsonb       not null,
  embedding   vector(768),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz,
  unique (namespace, key)
);

create index if not exists memory_namespace_idx  on agent_memory using gin(namespace);
create index if not exists memory_embedding_idx  on agent_memory
  using ivfflat(embedding vector_cosine_ops) with (lists = 50);

create or replace function match_memory(
  query_embedding  vector(768),
  namespace_filter text[]  default null,
  match_threshold  float   default 0.5,
  match_count      int     default 10
)
returns table (id uuid, namespace text[], key text, value jsonb, similarity float)
language sql stable as $$
  select id, namespace, key, value,
         1 - (embedding <=> query_embedding) as similarity
  from agent_memory
  where (namespace_filter is null or namespace @> namespace_filter)
    and (expires_at is null or expires_at > now())
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
