import type { Note, Project, Task } from '../types';
import { addDays, addMonths, daysSince, isOverdue, parseDate, today } from './dates';

/**
 * The one sort order for open tasks, used by both Today and All tasks
 * (v5 §1, extended v7 §2).
 *
 *   urgent first → then by date → then by time within that date
 *
 * Time is a tiebreaker inside a day, not a replacement for the date: Today's
 * list mixes overdue items with today's, and overdue floating to the top is an
 * established signal that a time shouldn't override. Untimed tasks sit after
 * timed ones on the same date — a time is a commitment at a moment, untimed is
 * "sometime today".
 */
export function sortOpenTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const byDate = (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99');
    if (byDate !== 0) return byDate;
    if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
    if (a.dueTime) return -1;
    if (b.dueTime) return 1;
    return 0;
  });
}

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
  /** Completed-task points behind the current stage. */
  points: number;
  /** Growth 1–4, from points. Neglect never reduces it (§5.2). */
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

/**
 * Growth points: how much work a project has actually absorbed.
 *
 * One point per completed task, so a bigger, longer-running project grows a
 * bigger plant — that's the whole idea, and it replaces the three different
 * per-type formulas this used to have.
 *
 * Recurring tasks are the awkward case. Counting every repeat would send a
 * weekly chore to the top level inside a quarter and hold it there forever;
 * ignoring them (which the progress bar does, deliberately) would leave a
 * retainer you've tended for two years as a seedling. So a series counts once
 * for existing, plus a quarter of its repeats: upkeep matures a plant slowly,
 * and doing fifteen different things still outruns doing one thing fifteen
 * times.
 */
export function growthPoints(own: Task[]): number {
  let points = 0;
  const series = new Map<string, number>();

  for (const t of own) {
    if (!t.done) continue;
    if (t.seriesId) series.set(t.seriesId, (series.get(t.seriesId) ?? 0) + 1);
    else points += 1;
  }
  for (const completions of series.values()) {
    points += 1 + Math.floor(completions / 4);
  }
  return points;
}

/** Four levels of illustration, four bands. Nothing done yet is a seedling
 *  rather than an empty pot — there's no art for an empty pot. */
export function stageFromPoints(points: number): number {
  if (points >= 13) return 4;
  if (points >= 9) return 3;
  if (points >= 5) return 2;
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
  // Archived tasks are completed instances of a recurring series. They're
  // history, and counting them would make a retainer's progress bar
  // meaningless — but they're exactly what growth wants to see, so the two
  // read from different lists.
  const all = tasks.filter((t) => t.projectId === project.id);
  const own = all.filter((t) => !t.archived);
  const total = own.length;
  const done = own.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const overdue = own.filter((t) => isOverdue(t.dueDate, t.done)).length;
  const noteCount = notes.filter((n) => n.projectId === project.id).length;
  const milestonesTotal = project.milestones.length;
  const milestonesDone = project.milestones.filter((m) => m.done).length;
  const days = daysSince(project.lastActivityDate);
  const streak = project.type === 'retainer' ? retainerStreak(project, tasks) : 0;

  const points = growthPoints(all);
  const stage = stageFromPoints(points);
  // Areas stay the one exception to wilting: a reference home you consult
  // every few weeks isn't neglected, and browning it would cry wolf.
  const vitality: Vitality = project.type === 'area' ? 'healthy' : vitalityFor(days);

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
    points,
    stage,
    vitality,
    daysSinceActivity: days,
    needsWater: vitality === 'yellowing' || vitality === 'browning',
    nudge,
    streak,
  };
}
