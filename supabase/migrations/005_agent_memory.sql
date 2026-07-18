-- â”€â”€â”€ Agent Memory (long-term, episodic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--
-- Agents can store facts, preferences, and episodic memories here.
-- The Store API in LangGraph also maps to this table.

create table if not exists agent_memory (
  id          uuid        primary key default uuid_generate_v4(),
  namespace   text[]      not null,   -- e.g. ["user_123", "preferences"]
  key         text        not null,
  value       jsonb       not null,
  embedding   vector(768),           -- for semantic memory retrieval
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz,            -- null = permanent
  unique (namespace, key)
);

create index if not exists memory_namespace_idx  on agent_memory using gin(namespace);
create index if not exists memory_embedding_idx  on agent_memory using ivfflat(embedding vector_cosine_ops)
  with (lists = 50);

-- Semantic memory retrieval
create or replace function match_memory(
  query_embedding vector(768),
  namespace_filter text[] default null,
  match_threshold  float  default 0.5,
  match_count      int    default 10
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
