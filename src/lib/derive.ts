import type { Note, Project, Task } from '../types';
import { addDays, addMonths, daysSince, isOverdue, parseDate, today } from './dates';

export type Vitality = 'healthy' | 'dry' | 'yellowing' | 'browning';

export interface ProjectMeta {
  /** Live task counts — never stored (§3, §3.1). */
  total: number;
  done: number;
  pct: number;
  overdue: number;
  noteCount: number;
  milestonesDone: number;
  milestonesTotal: number;
  /** Growth 1–5, from progress. Neglect never reduces it (§5.2). */
  stage: number;
  /** Vitality, from days since last activity. Independent of stage (§5.2). */
  vitality: Vitality;
  daysSinceActivity: number;
  needsWater: boolean;
  /** Active projects only, ≥7 days idle, not dismissed (§5.3). */
  nudge: boolean;
  streak: number;
}

/** §5.2: healthy ≤3d → dry ≤6d → yellowing ≤10d → browning >10d. */
export function vitalityFor(days: number): Vitality {
  if (days <= 3) return 'healthy';
  if (days <= 6) return 'dry';
  if (days <= 10) return 'yellowing';
  return 'browning';
}

export const VITALITY_LABEL: Record<Vitality, string> = {
  healthy: 'Thriving',
  dry: 'A little dry',
  yellowing: 'Getting thirsty',
  browning: 'Needs water',
};

export const VITALITY_DOT: Record<Vitality, string> = {
  healthy: '#4a6b52',
  dry: '#8a8a4a',
  yellowing: '#c99a3f',
  browning: '#9a6b48',
};

/** §5.2 growth thresholds for Active projects. */
export function stageFromPct(pct: number): number {
  if (pct >= 100) return 5;
  if (pct >= 70) return 4;
  if (pct >= 40) return 3;
  if (pct >= 15) return 2;
  return 1;
}

/**
 * A Retainer's streak: consecutive cadence periods, counting back from now, in
 * which at least one of its tasks was completed. Derived from completedAt — the
 * prototype hardcoded this number, but the spec is explicit that counts are
 * never manual.
 *
 * The current period is allowed to be empty without breaking the streak (you
 * haven't necessarily done this week's watering yet on a Monday morning); the
 * walk simply starts from the last period that has a completion.
 */
export function retainerStreak(project: Project, tasks: Task[]): number {
  if (project.cadence === null) return 0;
  const completions = tasks
    .filter((t) => t.projectId === project.id && t.done && t.completedAt)
    .map((t) => parseDate(t.completedAt!.slice(0, 10)));
  if (completions.length === 0) return 0;

  const step = project.cadence === 'weekly' ? -7 : -1;
  const stepBack = (d: Date, n: number) =>
    project.cadence === 'weekly' ? addDays(d, step * n) : addMonths(d, step * n);

  const inPeriod = (d: Date, periodEnd: Date): boolean => {
    const periodStart =
      project.cadence === 'weekly' ? addDays(periodEnd, -6) : addMonths(periodEnd, -1);
    return d > periodStart && d <= periodEnd;
  };

  let streak = 0;
  let offset = 0;
  // Skip an empty current period rather than zeroing the streak.
  if (!completions.some((c) => inPeriod(c, today()))) offset = 1;

  for (let i = 0; i < 52; i++) {
    const periodEnd = stepBack(today(), offset + i);
    if (completions.some((c) => inPeriod(c, periodEnd))) streak++;
    else break;
  }
  return streak;
}

export function projectMeta(
  project: Project,
  tasks: Task[],
  notes: Note[],
  dismissed: string[],
): ProjectMeta {
  // Archived tasks are completed instances of a recurring series — they're
  // history, and counting them would make a retainer's progress bar meaningless.
  const own = tasks.filter((t) => t.projectId === project.id && !t.archived);
  const total = own.length;
  const done = own.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const overdue = own.filter((t) => isOverdue(t.dueDate, t.done)).length;
  const noteCount = notes.filter((n) => n.projectId === project.id).length;
  const milestonesTotal = project.milestones.length;
  const milestonesDone = project.milestones.filter((m) => m.done).length;
  const days = daysSince(project.lastActivityDate);
  const streak = project.type === 'retainer' ? retainerStreak(project, tasks) : 0;

  let stage: number;
  let vitality: Vitality;
  if (project.type === 'active') {
    stage = stageFromPct(pct);
    vitality = vitalityFor(days);
  } else if (project.type === 'retainer') {
    stage = streak >= 8 ? 4 : streak >= 4 ? 3 : 2;
    vitality = vitalityFor(days);
  } else {
    // Areas are evergreen reference homes — a calm constant plant (§3.1).
    stage = 3;
    vitality = 'healthy';
  }

  const nudge =
    project.type === 'active' &&
    project.status === 'active' &&
    days >= 7 &&
    !dismissed.includes(project.id);

  return {
    total,
    done,
    pct,
    overdue,
    noteCount,
    milestonesDone,
    milestonesTotal,
    stage,
    vitality,
    daysSinceActivity: days,
    needsWater: vitality === 'yellowing' || vitality === 'browning',
    nudge,
    streak,
  };
}
