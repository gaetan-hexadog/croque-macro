-- ════════════════════════════════════════════════════════════════════════════
-- 011_workout_logs.sql — Séances de musculation synchronisées (RLS auth.uid())
--
--   workout_logs : une ligne par séance loggée
--      (user_id, id, data)   id = clé de la séance ("W8-A", "manual-C-<ts>"…)
--      data = { date, completed, sessionId, week, manual?, data[], cardioData?,
--               chargeAdjustments? }   (cf. src/sport.js)
--
--   La config sport légère (startDate, currentWeek, preferences, vacationMode…)
--   reste dans app_state.data.sport — pas de table dédiée.
--   Chaque ligne n'est lisible/écrivable que par son propriétaire (auth.uid()).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.workout_logs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Tri/lecture par date (la date réelle de la séance vit dans data->>'date')
create index if not exists workout_logs_user_idx on public.workout_logs (user_id);

-- updated_at automatique. La fonction vient normalement de 002_personal.sql ;
-- on la (re)crée ici pour que cette migration soit autonome (idempotent).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists workout_logs_updated_at on public.workout_logs;
create trigger workout_logs_updated_at before update on public.workout_logs for each row execute function public.set_updated_at();

-- RLS : chacun ne voit/écrit que ses lignes
alter table public.workout_logs enable row level security;

drop policy if exists "workout_logs perso" on public.workout_logs;
create policy "workout_logs perso" on public.workout_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
