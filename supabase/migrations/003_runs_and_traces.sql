-- ─── Agent Runs ──────────────────────────────────────────────────────────────

create table if not exists runs (
  id                 text        primary key,   -- nanoid from the client
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

create index if not exists runs_agent_id_idx on runs(agent_id);
create index if not exists runs_status_idx   on runs(status);
create index if not exists runs_started_at_idx on runs(started_at desc);

-- ─── GenAI Spans (OTel GenAI semantic conventions) ───────────────────────────

create table if not exists traces (
  span_id             text        primary key,
  parent_span_id      text,
  run_id              text        not null references runs(id) on delete cascade,
  trace_id            text        not null,
  name                text        not null,
  kind                text        not null,   -- agent | llm | tool | retrieval | embed
  start_time_ms       bigint      not null,
  end_time_ms         bigint,
  status              text        not null default 'unset',
  error_message       text,

  -- GenAI-specific columns (denormalised for fast queries)
  genai_system        text,
  genai_model         text,
  genai_operation     text,
  input_tokens        int,
  output_tokens       int,
  total_tokens        int,
  finish_reason       text,

  -- Production flags
  loop_detected       boolean     not null default false,
  step_budget_exceeded boolean    not null default false,
  token_budget_exceeded boolean   not null default false,
  redacted            boolean     not null default false,
  routing_model       text,
  routing_reason      text,
  routing_complexity  numeric(4,2),

  -- Full attributes blob for anything else
  attributes          jsonb       not null default '{}'
);

create index if not exists traces_run_id_idx      on traces(run_id);
create index if not exists traces_trace_id_idx    on traces(trace_id);
create index if not exists traces_start_time_idx  on traces(start_time_ms desc);
create index if not exists traces_loop_flag_idx   on traces(loop_detected) where loop_detected = true;
