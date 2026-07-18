-- ─── LangGraph Checkpoints (SupabaseSaver schema) ────────────────────────────
--
-- LangGraph's @langchain/langgraph-checkpoint-supabase package expects these tables.
-- See: https://github.com/langchain-ai/langgraph/tree/main/libs/checkpoint-supabase

create table if not exists checkpoints (
  thread_id     text    not null,
  checkpoint_ns text    not null default '',
  checkpoint_id text    not null,
  parent_checkpoint_id text,
  type          text,
  checkpoint    jsonb   not null,
  metadata      jsonb   not null default '{}',
  primary key (thread_id, checkpoint_ns, checkpoint_id)
);

create table if not exists checkpoint_blobs (
  thread_id     text    not null,
  checkpoint_ns text    not null default '',
  channel       text    not null,
  version       text    not null,
  type          text    not null,
  blob          bytea,
  primary key (thread_id, checkpoint_ns, channel, version)
);

create table if not exists checkpoint_writes (
  thread_id     text    not null,
  checkpoint_ns text    not null default '',
  checkpoint_id text    not null,
  task_id       text    not null,
  idx           int     not null,
  channel       text    not null,
  type          text,
  blob          bytea,
  primary key (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
