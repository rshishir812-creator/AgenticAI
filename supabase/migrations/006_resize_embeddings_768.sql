-- ── Migration 006: Resize embedding columns from 1536 → 768 dims ─────────────
-- Required after switching from OpenAI text-embedding-3-small (1536)
-- to HuggingFace all-mpnet-base-v2 (768).
-- Run in Supabase SQL Editor if you already ran the initial migrations.

-- 1. Drop indexes that depend on the old vector type
drop index if exists documents_embedding_idx;
drop index if exists memory_embedding_idx;

-- 2. Alter column types
alter table documents    alter column embedding type vector(768);
alter table agent_memory alter column embedding type vector(768);

-- 3. Recreate IVFFlat indexes with correct dims
create index documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index memory_embedding_idx
  on agent_memory using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- 4. Recreate functions with 768-dim signatures
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
  from documents order by embedding <=> query_embedding
  limit match_count * 2
)
select d.id, d.content, d.metadata, d.source,
  coalesce(1.0 / (60 + ft.rank_ix), 0) * full_text_weight
  + coalesce(1.0 / (60 + s.rank_ix), 0) * semantic_weight as rrf_score
from documents d
full outer join full_text ft using (id)
full outer join semantic s using (id)
order by rrf_score desc limit match_count;
$$;

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
