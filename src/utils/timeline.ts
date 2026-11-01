import { TimelineStage, TimelineTask } from '../types/domain';

export const TIMELINE_STAGES: TimelineStage[] = [
  '6+ Months Out',
  '3-5 Months Out',
  '1-2 Months Out',
  '2-3 Weeks Out',
  'Event Week',
  'Event Day',
  'Post-Event',
];

/**
 * Parses a YYYY-MM-DD date string in UTC to avoid local timezone drift.
 */
export function parseIsoDateStrict(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid date format: ${isoDate}. Expected YYYY-MM-DD.`);
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`Impossible calendar date: ${isoDate}`);
  }
  return dt;
}

/**
 * Formats a Date to YYYY-MM-DD in UTC.
 */
export function toIsoDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a YYYY-MM-DD string into Indian date format (e.g., "20 Dec 2026" or "20/12/2026").
 */
export function formatIndianDate(isoDate: string, style: 'short' | 'numeric' = 'short'): string {
  try {
    const dt = parseIsoDateStrict(isoDate);
    if (style === 'numeric') {
      const d = String(dt.getUTCDate()).padStart(2, '0');
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const y = dt.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dt);
  } catch {
    return isoDate;
  }
}

/**
 * Calculates a target due date given the event start date and daysBeforeEvent.
 * Clamps dates so milestones never fall before `minFloorDate` (when provided) and remain ordered.
 */
export function calculateMilestoneDueDate(
  eventStartDate: string,
  daysBeforeEvent: number,
  minFloorDate?: string
): string {
  const eventDt = parseIsoDateStrict(eventStartDate);
  const targetMs = eventDt.getTime() - daysBeforeEvent * 86400000;
  let targetDt = new Date(targetMs);

  if (minFloorDate) {
    const floorDt = parseIsoDateStrict(minFloorDate);
    if (targetDt.getTime() < floorDt.getTime()) {
      targetDt = floorDt;
    }
  }
  return toIsoDateString(targetDt);
}

/**
 * Shifts all tasks proportionally when an event's start date is changed.
 */
export function recalculateTasksForNewEventDate(
  oldEventStartDate: string,
  newEventStartDate: string,
  tasks: TimelineTask[]
): TimelineTask[] {
  const oldDt = parseIsoDateStrict(oldEventStartDate);
  const newDt = parseIsoDateStrict(newEventStartDate);
  const deltaDays = Math.round((newDt.getTime() - oldDt.getTime()) / 86400000);

  return tasks.map((task) => {
    const currentDueDt = parseIsoDateStrict(task.dueDate);
    const shiftedDt = new Date(currentDueDt.getTime() + deltaDays * 86400000);
    return {
      ...task,
      dueDate: toIsoDateString(shiftedDt),
    };
  });
}

export interface EvaluatedTask extends TimelineTask {
  isOverdue: boolean;
  isBlockedByDependency: boolean;
  blockingTaskTitle?: string;
  daysUntilDue: number;
}

/**
 * Evaluates tasks against a reference date (defaults to today) and checks dependencies.
 */
export function evaluateTasksAndDependencies(
  tasks: TimelineTask[],
  referenceDateIso: string = toIsoDateString(new Date())
): {
  evaluatedTasks: EvaluatedTask[];
  completedCount: number;
  overdueCount: number;
  blockedCount: number;
  completionPercent: number;
} {
  const refDt = parseIsoDateStrict(referenceDateIso);
  const taskMap = new Map<string, TimelineTask>();
  for (const t of tasks) {
    taskMap.set(t.id, t);
  }

  let completedCount = 0;
  let overdueCount = 0;
  let blockedCount = 0;

  const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const evaluatedTasks: EvaluatedTask[] = sorted.map((task) => {
    const dueDt = parseIsoDateStrict(task.dueDate);
    const daysUntilDue = Math.round((dueDt.getTime() - refDt.getTime()) / 86400000);
    const isCompleted = task.status === 'completed';

    let isBlockedByDependency = false;
    let blockingTaskTitle: string | undefined;

    if (task.dependsOnTaskId && taskMap.has(task.dependsOnTaskId)) {
      const parentTask = taskMap.get(task.dependsOnTaskId)!;
      if (parentTask.status !== 'completed') {
        isBlockedByDependency = true;
        blockingTaskTitle = parentTask.title;
      }
    }

    const isOverdue = !isCompleted && daysUntilDue < 0;

    if (isCompleted) completedCount += 1;
    if (isOverdue) overdueCount += 1;
    if (isBlockedByDependency && !isCompleted) blockedCount += 1;

    return {
      ...task,
      isOverdue,
      isBlockedByDependency,
      blockingTaskTitle,
      daysUntilDue,
    };
  });

  const completionPercent =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return {
    evaluatedTasks,
    completedCount,
    overdueCount,
    blockedCount,
    completionPercent,
  };
}

/**
 * Generates an official Google Calendar template deep-link for a timeline milestone.
 */
export function buildGoogleCalendarUrl(
  task: Pick<TimelineTask, 'title' | 'description' | 'dueDate' | 'stage' | 'priority'>,
  location: string = ''
): string {
  const startDt = parseIsoDateStrict(task.dueDate);
  const endDt = new Date(startDt.getTime() + 86400000);
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(
      dt.getUTCDate()
    ).padStart(2, '0')}`;
  const dates = `${fmt(startDt)}/${fmt(endDt)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[Gatherly AI] ${task.title}`,
    dates,
    details: `${task.description || 'Event planning milestone'} (${task.stage} • Priority: ${task.priority})`,
  });
  if (location) {
    params.set('location', location);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

