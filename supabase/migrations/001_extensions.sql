-- Enable pgvector for semantic / similarity search
create extension if not exists vector with schema extensions;

-- Enable pg_trgm for fast BM25-style keyword search fallback
create extension if not exists pg_trgm with schema extensions;

-- uuid generation
create extension if not exists "uuid-ossp" with schema extensions;
