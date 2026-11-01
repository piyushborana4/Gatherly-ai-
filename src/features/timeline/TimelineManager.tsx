import React, { useState, useMemo } from 'react';
import {
  TimelineTask,
  TimelineStage,
  TaskPriority,
  TaskStatus,
} from '../../types/domain';
import {
  TIMELINE_STAGES,
  evaluateTasksAndDependencies,
  formatIndianDate,
  buildGoogleCalendarUrl,
  EvaluatedTask,
} from '../../utils/timeline';
import { TimelineTaskInputSchema } from '../../schemas/validation';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  List,
  Lock,
  Link2,
  X,
} from 'lucide-react';

interface TimelineManagerProps {
  tasks: TimelineTask[];
  canEdit: boolean;
  onAddTask: (task: Omit<TimelineTask, 'id' | 'eventId' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<TimelineTask>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

const PRIORITY_BADGES: Record<TaskPriority, { label: string; classes: string }> = {
  critical: {
    label: 'Critical',
    classes: 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/25',
  },
  high: {
    label: 'High',
    classes: 'bg-[#B84420]/10 text-[#B84420] border-[#B84420]/25',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-[#F0EDE5] text-[#242321] border-[#E6E0D7]',
  },
  low: {
    label: 'Low',
    classes: 'bg-[#F8F6F1] text-[#77736D] border-[#E6E0D7]',
  },
};

export const TimelineManager: React.FC<TimelineManagerProps> = ({
  tasks,
  canEdit,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const evalResult = useMemo(() => evaluateTasksAndDependencies(tasks), [tasks]);

  const [viewMode, setViewMode] = useState<'stages' | 'calendar' | 'chronological'>('stages');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<TimelineStage>('3-5 Months Out');
  const [dueDate, setDueDate] = useState<string>(() =>
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [assigneeName, setAssigneeName] = useState('Event Organizer');
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>('');

  const filteredTasks = useMemo(() => {
    return evalResult.evaluatedTasks.filter((t) =>
      statusFilter === 'all' ? true : t.status === statusFilter
    );
  }, [evalResult.evaluatedTasks, statusFilter]);

  const groupedByStage = useMemo(() => {
    const groups: Record<string, EvaluatedTask[]> = {};
    filteredTasks.forEach((t) => {
      const st = t.stage || 'Event Week';
      if (!groups[st]) groups[st] = [];
      groups[st].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, EvaluatedTask[]> = {};
    filteredTasks.forEach((t) => {
      const d = new Date(t.dueDate);
      const key = isNaN(d.getTime())
        ? 'Unscheduled'
        : d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTasks]);

  const handleToggleStatus = async (task: EvaluatedTask) => {
    if (!canEdit) return;
    setErrorMsg(null);

    const nextStatus: TaskStatus =
      task.status === 'completed'
        ? 'todo'
        : task.status === 'todo'
        ? 'in_progress'
        : 'completed';

    if (nextStatus === 'completed' && task.isBlockedByDependency) {
      setErrorMsg(
        `Cannot mark "${task.title}" complete until prerequisite "${task.blockingTaskTitle}" is completed.`
      );
      return;
    }

    await onUpdateTask(task.id, { status: nextStatus });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = TimelineTaskInputSchema.safeParse({
      title,
      description,
      stage,
      dueDate,
      priority,
      status: 'todo',
      assigneeName,
      dependsOnTaskId: dependsOnTaskId || '',
      reminderEnabled: true,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || 'Please check task inputs.');
      return;
    }

    await onAddTask(parsed.data);
    setTitle('');
    setDescription('');
    setDependsOnTaskId('');
    setShowAddModal(false);
  };

  const renderTaskCard = (task: EvaluatedTask) => {
    const badge = PRIORITY_BADGES[task.priority];

    return (
      <div
        key={task.id}
        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
          task.status === 'completed'
            ? 'bg-[#F8F6F1]/75 border-[#E6E0D7]'
            : task.isOverdue
            ? 'bg-white border-[#B42318]/40 shadow-2xs'
            : 'bg-white border-[#E6E0D7] shadow-2xs hover:border-[#B84420]/50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => handleToggleStatus(task)}
              aria-label={
                task.isBlockedByDependency
                  ? `Blocked by prerequisite ${task.blockingTaskTitle}`
                  : `Advance status for ${task.title}`
              }
              title={
                task.isBlockedByDependency
                  ? `Blocked by: ${task.blockingTaskTitle}`
                  : `Current: ${task.status}. Click to advance.`
              }
              className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                task.status === 'completed'
                  ? 'bg-[#2E6F40] border-[#2E6F40] text-white'
                  : task.isBlockedByDependency
                  ? 'bg-[#F0EDE5] border-[#E6E0D7] text-[#77736D]'
                  : task.status === 'in_progress'
                  ? 'bg-[#B84420]/15 border-[#B84420] text-[#B84420]'
                  : 'bg-[#F8F6F1] border-[#E6E0D7] text-transparent hover:border-[#B84420]'
              }`}
            >
              {task.isBlockedByDependency ? (
                <Lock className="w-3.5 h-3.5 text-[#77736D]" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </button>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.classes}`}
                >
                  {badge.label}
                </span>
                <span className="text-[11px] font-mono text-[#77736D] bg-[#F0EDE5] px-2 py-0.5 rounded">
                  {task.stage}
                </span>
                {task.isOverdue && (
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-[#B42318]/10 text-[#B42318]">
                    Overdue
                  </span>
                )}
              </div>

              <h4
                className={`text-sm sm:text-base font-semibold leading-snug ${
                  task.status === 'completed'
                    ? 'line-through text-[#77736D]'
                    : 'text-[#242321]'
                }`}
              >
                {task.title}
              </h4>

              {task.description && (
                <p className="text-xs text-[#77736D] leading-relaxed">{task.description}</p>
              )}

              {task.dependsOnTaskId && (
                <div
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md mt-1 ${
                    task.isBlockedByDependency
                      ? 'bg-[#B84420]/10 text-[#B84420] font-medium'
                      : 'bg-[#2E6F40]/10 text-[#2E6F40]'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>
                    Prerequisite: {task.blockingTaskTitle || 'Completed'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {canEdit && (
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-1.5 rounded-lg text-[#77736D] hover:text-[#B42318] hover:bg-[#B42318]/10 transition-colors shrink-0 cursor-pointer"
              title="Delete Task"
              aria-label={`Delete task ${task.title}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-[#E6E0D7] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-[#77736D] font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#B84420]" />
              <span>Due {formatIndianDate(task.dueDate)}</span>
            </span>
            <a
              href={buildGoogleCalendarUrl(task)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Add ${task.title} to Google Calendar`}
              className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-[#98341D] hover:underline"
            >
              <span>+ Google Calendar</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {task.assigneeName && (
              <span className="text-[11px] text-[#77736D]">Owner: {task.assigneeName}</span>
            )}
            {canEdit && (
              <select
                aria-label={`Status for ${task.title}`}
                value={task.status}
                onChange={(e) => {
                  const newStatus = e.target.value as TaskStatus;
                  if (newStatus === 'completed' && task.isBlockedByDependency) {
                    setErrorMsg(
                      `Cannot complete "${task.title}" before prerequisite "${task.blockingTaskTitle}".`
                    );
                    return;
                  }
                  setErrorMsg(null);
                  onUpdateTask(task.id, { status: newStatus });
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F8F6F1] border border-[#E6E0D7] text-xs font-semibold text-[#242321] cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            )}
          </div>
        </div>
      </div>
    );
  };

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  return (
    <div className="space-y-8">
      {/* ==================================================
          STITCH VEDIC MUHURAT & GROUND TELEMETRY BAR
      ================================================== */}
      <div className="rounded-2xl bg-[#FAF2ED] border border-[#DEC0B9]/40 p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#98341D] text-[18px]">
              wb_twilight
            </span>
            <span className="font-bold text-[#1E1B18]">18:14 IST</span>
            <span className="text-[#8A716C]">Golden Hour Muhurat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4C5946] text-[18px]">air</span>
            <span className="font-bold text-[#1E1B18]">8 kts NW</span>
            <span className="text-[#8A716C]">Calm Courtyard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7F525D] text-[18px]">verified</span>
            <span className="font-bold text-[#1E1B18]">SDM NOC</span>
            <span className="text-[#8A716C]">65dB Acoustic Lock</span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFDAD2] text-[#3D0600] text-[11px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#98341D] animate-pulse"></span>
          Vedic &amp; Run-of-Show Synchronized
        </span>
      </div>

      {/* ==================================================
          1. TIMELINE COMMAND HEADER & PROGRESS METRICS
      ================================================== */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E6E0D7] shadow-2xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E6E0D7]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#98341D]">
              <Clock className="w-3.5 h-3.5" />
              <span>Critical-Path Execution Engine</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E1B18] mt-1">
              Vedic Timings &amp; Run-of-Show Timeline
            </h2>
            <p className="text-sm text-[#57423D] mt-1">
              Track milestone stages, prerequisite dependencies, and monthly execution windows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-xl bg-[#F0EDE5] border border-[#E6E0D7]">
              <button
                onClick={() => setViewMode('stages')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'stages'
                    ? 'bg-[#242321] text-[#F8F6F1]'
                    : 'text-[#77736D] hover:text-[#242321]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stages</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-[#242321] text-[#F8F6F1]'
                    : 'text-[#77736D] hover:text-[#242321]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setViewMode('chronological')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'chronological'
                    ? 'bg-[#242321] text-[#F8F6F1]'
                    : 'text-[#77736D] hover:text-[#242321]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>All Tasks</span>
              </button>
            </div>

            {canEdit && (
              <button
                onClick={() => setShowAddModal(!showAddModal)}
                className="px-4 py-2.5 rounded-xl bg-[#B84420] hover:bg-[#9B3616] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Milestone</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[#77736D]">
                Overall Milestone Completion
              </span>
              <span className="font-mono font-bold text-[#242321] tabular-nums">
                {evalResult.completedCount} of {tasks.length} Completed (
                {evalResult.completionPercent}%)
              </span>
            </div>
            <div className="w-full h-3 bg-[#F0EDE5] rounded-full overflow-hidden flex">
              <div
                className="bg-[#2E6F40] h-full transition-all duration-500"
                style={{ width: `${evalResult.completionPercent}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
            {[
              { id: 'all' as const, label: `All (${tasks.length})` },
              { id: 'todo' as const, label: `To Do (${todoCount})` },
              { id: 'in_progress' as const, label: `In Progress (${inProgressCount})` },
              { id: 'completed' as const, label: `Done (${evalResult.completedCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-[#B84420] text-white border-[#B84420]'
                    : 'bg-[#F8F6F1] text-[#77736D] border-[#E6E0D7] hover:text-[#242321]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-[#B42318]/10 border border-[#B42318]/30 flex items-center justify-between text-xs font-semibold text-[#B42318]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorMsg(null)}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showAddModal && canEdit && (
        <form
          onSubmit={handleCreateTask}
          className="bg-white rounded-2xl p-6 border border-[#B84420]/40 shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#E6E0D7] pb-3">
            <h3 className="font-serif text-xl font-semibold text-[#242321]">
              Create New Timeline Milestone
            </h3>
            <button
              type="button"
              aria-label="Close add milestone form"
              onClick={() => setShowAddModal(false)}
              className="p-1.5 rounded-lg text-[#77736D] hover:text-[#242321]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="timeline-title"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Milestone Title
              </label>
              <input
                id="timeline-title"
                type="text"
                required
                placeholder="e.g., Confirm Mehendi Artisans & Canopy Lighting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="timeline-stage"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Timeline Stage
              </label>
              <select
                id="timeline-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as TimelineStage)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                {TIMELINE_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="timeline-due-date"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Due Date
              </label>
              <input
                id="timeline-due-date"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] font-mono text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="timeline-priority"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Priority Level
              </label>
              <select
                id="timeline-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="timeline-prerequisite"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Prerequisite Task (Optional)
              </label>
              <select
                id="timeline-prerequisite"
                value={dependsOnTaskId}
                onChange={(e) => setDependsOnTaskId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              >
                <option value="">None (Unlocked)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="timeline-description"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Execution Notes
              </label>
              <input
                id="timeline-description"
                type="text"
                placeholder="Specific deliverables, vendor contacts, or permit notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="timeline-assignee"
                className="block text-xs font-semibold text-[#242321] mb-1"
              >
                Assignee
              </label>
              <input
                id="timeline-assignee"
                type="text"
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F6F1] border border-[#E6E0D7] text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E0D7] text-xs font-semibold text-[#77736D]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#B84420] text-white text-xs font-semibold cursor-pointer"
            >
              Add Milestone
            </button>
          </div>
        </form>
      )}

      {viewMode === 'stages' && (
        <div className="space-y-8 relative before:hidden md:before:block before:absolute before:left-5 before:top-6 before:bottom-6 before:w-0.5 before:bg-[#E6E0D7]">
          {Object.entries(groupedByStage).map(([stageName, stageTasks], idx) => {
            const doneCount = stageTasks.filter((t) => t.status === 'completed').length;
            const stagePct =
              stageTasks.length > 0 ? Math.round((doneCount / stageTasks.length) * 100) : 0;

            return (
              <div key={stageName} className="md:pl-14 relative space-y-4">
                <div
                  className={`hidden md:flex absolute left-2 top-1 w-6 h-6 rounded-full border-2 items-center justify-center text-[10px] font-mono font-bold ${
                    stagePct === 100
                      ? 'bg-[#2E6F40] border-[#2E6F40] text-white'
                      : 'bg-[#F8F6F1] border-[#B84420] text-[#B84420]'
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="bg-[#F0EDE5] rounded-2xl px-5 py-3.5 border border-[#E6E0D7] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-xl font-semibold text-[#242321]">
                      {stageName}
                    </h3>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-white border border-[#E6E0D7] text-[#77736D]">
                      {doneCount}/{stageTasks.length} Done
                    </span>
                  </div>
                  <div className="w-36 h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#B84420] transition-all"
                      style={{ width: `${stagePct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {stageTasks.map((task) => renderTaskCard(task))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(groupedByMonth).map(([monthLabel, monthTasks]) => (
            <div
              key={monthLabel}
              className="bg-white rounded-2xl border border-[#E6E0D7] shadow-2xs overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 bg-[#242321] text-[#F8F6F1] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D99B91]" />
                  <h3 className="font-serif text-lg font-semibold text-white">
                    {monthLabel}
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#D99B91]">
                  {monthTasks.length} Milestone(s)
                </span>
              </div>

              <div className="p-5 space-y-3 flex-1">
                {monthTasks.map((task) => renderTaskCard(task))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'chronological' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map((task) => renderTaskCard(task))}
        </div>
      )}
    </div>
  );
};
