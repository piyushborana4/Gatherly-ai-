import { GoogleGenAI, Type } from '@google/genai';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const GEMINI_TIMEOUT_MS = 25_000;

export function getDefaultGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: GEMINI_TIMEOUT_MS,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  retries = 2,
  timeoutMs = GEMINI_TIMEOUT_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      return await fn(signal);
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
          ? err.status
          : undefined;
      const code =
        typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string'
          ? err.code
          : undefined;

      if (
        (status !== undefined && status >= 400 && status < 500) ||
        code === 'API_KEY_INVALID' ||
        code === 'PERMISSION_DENIED' ||
        code === 'RESOURCE_EXHAUSTED'
      ) {
        throw err;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export interface ResearchCacheValue {
  researchSummary: string;
  groundingSources: { title: string; uri: string }[];
  cachedAt: number;
}

/**
 * Bounded in-memory LRU cache (max = 50 entries, TTL = 10 minutes) for /api/ai/research.
 */
export class ResearchLruCache {
  private readonly store = new Map<string, ResearchCacheValue>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 50, ttlMs = 10 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string, now = Date.now()): ResearchCacheValue | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now - entry.cachedAt > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  set(
    key: string,
    value: Omit<ResearchCacheValue, 'cachedAt'>,
    now = Date.now()
  ): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { ...value, cachedAt: now });
  }
}

export const PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.STRING,
      description: 'Executive summary of the event plan tailored to city, guest count, and budget.',
    },
    strategy: {
      type: Type.STRING,
      description: 'Actionable planning strategy and cost-optimization approach.',
    },
    themeAndDecorIdeas: {
      type: Type.STRING,
      description: 'Personalized theme, color palette, lighting, and decor ideas.',
    },
    foodAndCateringSuggestions: {
      type: Type.STRING,
      description: 'Menu and catering recommendations respecting dietary and regional preferences.',
    },
    entertainmentIdeas: {
      type: Type.STRING,
      description: 'Music, cultural performances, and guest engagement ideas.',
    },
    riskAndContingencyPlan: {
      type: Type.STRING,
      description: 'Weather, logistics, traffic, permit, and budget buffer risk mitigation.',
    },
    guestManagementRecommendations: {
      type: Type.STRING,
      description: 'RSVP timeline, hospitality, accessibility, and seating recommendations.',
    },
    importantReminders: {
      type: Type.STRING,
      description: 'Critical local permits, deadlines, and cultural reminders.',
    },
    feasibilityNote: {
      type: Type.STRING,
      description:
        'If the budget is tight for the guest count/location, explain trade-offs and realistic alternatives.',
    },
    budgetAllocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description:
              'Must be one of: Venue, Catering, Decoration, Photography, Entertainment, Clothing, Transportation, Accommodation, Invitations, Miscellaneous',
          },
          title: { type: Type.STRING },
          percentageOfTotal: {
            type: Type.NUMBER,
            description: 'Percentage of total budget (all items should sum to 100).',
          },
          rationale: { type: Type.STRING },
        },
        required: ['category', 'title', 'percentageOfTotal', 'rationale'],
      },
    },
    timelineMilestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          stage: {
            type: Type.STRING,
            description:
              'Must be one of: 6+ Months Out, 3-5 Months Out, 1-2 Months Out, 2-3 Weeks Out, Event Week, Event Day, Post-Event',
          },
          priority: {
            type: Type.STRING,
            description: 'Must be one of: critical, high, medium, low',
          },
          daysBeforeEvent: {
            type: Type.INTEGER,
            description: 'Number of days prior to event start date (e.g. 180, 90, 60, 30, 7, 1).',
          },
        },
        required: ['title', 'description', 'stage', 'priority', 'daysBeforeEvent'],
      },
    },
    vendorRecommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description:
              'Illustrative vendor archetype name (never fabricate fake verified contact numbers).',
          },
          category: {
            type: Type.STRING,
            description:
              'Must be one of: Venues, Caterers, Photographers, Decorators, Makeup Artists, DJs & Entertainers, Transportation, Florists, Invitation Designers',
          },
          priorityLevel: {
            type: Type.STRING,
            description: 'Must be one of: immediate, high, standard, optional',
          },
          estimatedCostPercentage: {
            type: Type.NUMBER,
            description: 'Estimated percentage of total budget for this vendor.',
          },
          notes: {
            type: Type.STRING,
            description: 'Selection criteria, questions to ask, and illustrative guidance.',
          },
        },
        required: [
          'name',
          'category',
          'priorityLevel',
          'estimatedCostPercentage',
          'notes',
        ],
      },
    },
  },
  required: [
    'overview',
    'strategy',
    'themeAndDecorIdeas',
    'foodAndCateringSuggestions',
    'entertainmentIdeas',
    'riskAndContingencyPlan',
    'guestManagementRecommendations',
    'importantReminders',
    'budgetAllocations',
    'timelineMilestones',
    'vendorRecommendations',
  ],
};

export const COPILOT_TOOLS = [
  {
    type: 'function' as const,
    name: 'update_event_budget',
    description:
      'Update the total event budget and optionally rebalance expense category allocations proportionally.',
    parameters: {
      type: 'object',
      properties: {
        newTotalBudget: {
          type: 'number',
          description: 'New total event budget in the event currency.',
        },
        rebalanceCategoriesProportionally: {
          type: 'boolean',
          description: 'Whether to proportionally scale existing expense allocations.',
        },
        reason: {
          type: 'string',
          description: 'Explanation of why the budget is being adjusted.',
        },
      },
      required: ['newTotalBudget'],
    },
  },
  {
    type: 'function' as const,
    name: 'update_guest_count',
    description: 'Update the estimated number of guests for the event.',
    parameters: {
      type: 'object',
      properties: {
        newGuestCount: {
          type: 'number',
          description: 'New total guest count (integer >= 1).',
        },
        reason: {
          type: 'string',
          description: 'Reason or impact note for the guest count change.',
        },
      },
      required: ['newGuestCount'],
    },
  },
  {
    type: 'function' as const,
    name: 'add_timeline_task',
    description: 'Add a new milestone task to the event planning timeline.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Concise task title.' },
        description: { type: 'string', description: 'Actionable task details.' },
        stage: {
          type: 'string',
          description:
            'One of: 6+ Months Out, 3-5 Months Out, 1-2 Months Out, 2-3 Weeks Out, Event Week, Event Day, Post-Event',
        },
        priority: {
          type: 'string',
          description: 'One of: critical, high, medium, low',
        },
        dueDate: {
          type: 'string',
          description: 'Target due date in YYYY-MM-DD format.',
        },
      },
      required: ['title', 'stage', 'priority', 'dueDate'],
    },
  },
  {
    type: 'function' as const,
    name: 'move_task_deadline',
    description: 'Change the due date of an existing task matching a keyword.',
    parameters: {
      type: 'object',
      properties: {
        taskTitleKeyword: {
          type: 'string',
          description: 'Keyword identifying the existing task (e.g. "photography", "venue").',
        },
        newDueDate: {
          type: 'string',
          description: 'New due date in YYYY-MM-DD format.',
        },
      },
      required: ['taskTitleKeyword', 'newDueDate'],
    },
  },
  {
    type: 'function' as const,
    name: 'add_expense_item',
    description: 'Add a new planned expense or budget line item to the event budget.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description:
            'One of: Venue, Catering, Decoration, Photography, Entertainment, Clothing, Transportation, Accommodation, Invitations, Miscellaneous',
        },
        title: { type: 'string', description: 'Line item title.' },
        allocatedAmount: { type: 'number', description: 'Allocated budget amount.' },
        plannedAmount: { type: 'number', description: 'Estimated or planned spend.' },
        notes: { type: 'string', description: 'Notes or details.' },
      },
      required: ['category', 'title', 'allocatedAmount', 'plannedAmount'],
    },
  },
  {
    type: 'function' as const,
    name: 'add_vendor_suggestion',
    description:
      'Add an illustrative vendor archetype suggestion to the event vendor shortlist.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Illustrative vendor archetype title (labelled as AI suggestion).',
        },
        category: {
          type: 'string',
          description:
            'One of: Venues, Caterers, Photographers, Decorators, Makeup Artists, DJs & Entertainers, Transportation, Florists, Invitation Designers',
        },
        estimatedCost: { type: 'number', description: 'Estimated cost in event currency.' },
        priorityLevel: {
          type: 'string',
          description: 'One of: immediate, high, standard, optional',
        },
        notes: { type: 'string', description: 'Selection criteria and notes.' },
      },
      required: ['name', 'category', 'estimatedCost', 'priorityLevel'],
    },
  },
  {
    type: 'function' as const,
    name: 'rebalance_category_allocations',
    description:
      'Proportionally rebalance all existing expense category allocations to match a target budget ceiling.',
    parameters: {
      type: 'object',
      properties: {
        targetBudget: {
          type: 'number',
          description: 'Target total budget ceiling to scale category allocations to.',
        },
      },
      required: ['targetBudget'],
    },
  },
];

interface GroundingChunkShape {
  web?: {
    uri?: string;
    title?: string;
  };
}

interface CandidateWithGrounding {
  groundingMetadata?: {
    groundingChunks?: GroundingChunkShape[];
  };
}

export function extractSearchGroundingSources(
  responseOrInteraction: unknown
): { title: string; uri: string }[] {
  const sources: { title: string; uri: string }[] = [];
  const seen = new Set<string>();

  const addSource = (uri?: string, title?: string) => {
    if (!uri || typeof uri !== 'string' || seen.has(uri) || sources.length >= 6) return;
    try {
      const parsed = new URL(uri);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      seen.add(uri);
      const cleanTitle =
        title && title.trim().length > 0
          ? title.trim().slice(0, 120)
          : parsed.hostname.replace(/^www\./, '');
      sources.push({ title: cleanTitle, uri });
    } catch {
      // Ignore invalid URLs
    }
  };

  if (typeof responseOrInteraction === 'object' && responseOrInteraction !== null) {
    const obj = responseOrInteraction as {
      candidates?: CandidateWithGrounding[];
      steps?: {
        type?: string;
        groundingMetadata?: { groundingChunks?: GroundingChunkShape[] };
        content?: {
          type?: string;
          groundingMetadata?: { groundingChunks?: GroundingChunkShape[] };
        }[];
      }[];
    };

    for (const candidate of obj.candidates ?? []) {
      for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
        addSource(chunk.web?.uri, chunk.web?.title);
      }
    }

    for (const step of obj.steps ?? []) {
      for (const chunk of step.groundingMetadata?.groundingChunks ?? []) {
        addSource(chunk.web?.uri, chunk.web?.title);
      }
      for (const item of step.content ?? []) {
        for (const chunk of item.groundingMetadata?.groundingChunks ?? []) {
          addSource(chunk.web?.uri, chunk.web?.title);
        }
      }
    }
  }

  return sources;
}
