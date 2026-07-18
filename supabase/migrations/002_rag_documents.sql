-- â”€â”€â”€ RAG: document store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--
-- Stores chunked documents with vector embeddings (text-embedding-3-small,
-- 1536 dims by default; change EMBEDDING_DIMENSIONS env var for other models).
--
-- Used by: labs/rag/naive, labs/rag/agentic, all agents doing retrieval.

create table if not exists documents (
  id          uuid primary key default uuid_generate_v4(),
  content     text        not null,
  embedding   vector(768),                       -- all-mpnet-base-v2 (768 dims)
  metadata    jsonb       not null default '{}', -- source, chunk_index, etc.
  source      text,                              -- URL or filename
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Cosine similarity index (IVFFlat â€” good for < 1M rows)
create index if not exists documents_embedding_idx
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Full-text search fallback
create index if not exists documents_content_trgm_idx
  on documents using gin (content extensions.gin_trgm_ops);

-- Match by cosine similarity (returns top k most similar chunks)
create or replace function match_documents(
  query_embedding vector(768),
  match_threshold float  default 0.5,
  match_count     int    default 5
)
returns table (
  id          uuid,
  content     text,
  metadata    jsonb,
  source      text,
  similarity  float
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    source,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Hybrid search: vector + keyword (BM25-style via pg_trgm)
create or replace function hybrid_search(
  query_text      text,
  query_embedding vector(768),
  match_count     int   default 5,
  full_text_weight float default 1.0,
  semantic_weight  float default 1.0
)
returns table (
  id         uuid,
  content    text,
  metadata   jsonb,
  source     text,
  rrf_score  float
)
language sql stable
as $$
with full_text as (
  select id, row_number() over (order by ts_rank_cd(to_tsvector('english', content), plainto_tsquery('english', query_text)) desc) as rank_ix
  from documents
  where to_tsvector('english', content) @@ plainto_tsquery('english', query_text)
  order by rank_ix
  limit match_count * 2
),
semantic as (
  select id, row_number() over (order by embedding <=> query_embedding) as rank_ix
  from documents
  order by embedding <=> query_embedding
  limit match_count * 2
)
select
  d.id,
  d.content,
  d.metadata,
  d.source,
  coalesce(1.0 / (60 + ft.rank_ix), 0) * full_text_weight
  + coalesce(1.0 / (60 + s.rank_ix), 0) * semantic_weight as rrf_score
from documents d
full outer join full_text ft using (id)
full outer join semantic s using (id)
order by rrf_score desc
limit match_count;
$$;
