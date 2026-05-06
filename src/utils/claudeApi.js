const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

async function callClaude(apiKey, systemPrompt, userMessage, { timeoutMs = 90000, maxTokens = 4096 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(CLAUDE_API, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out after 90 seconds. Try again.');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

function flattenComments(interview, comments, overallComments) {
  const lines = [];
  for (const pr of interview.prs) {
    lines.push(`\n=== ${pr.title} (${pr.difficulty}, ${pr.points} pts) ===`);
    const overall = overallComments[pr.id];
    if (overall) lines.push(`OVERALL COMMENT: ${overall}`);

    for (const [key, commentArr] of Object.entries(comments)) {
      if (!key.startsWith(`${pr.id}--`)) continue;
      const parts = key.split('--');
      const file = parts[1];
      const lineKey = parts[2];
      for (const c of commentArr) {
        lines.push(`[${file} line ${lineKey}]: ${c.text}`);
      }
    }
  }
  return lines.join('\n');
}

function buildExpectedIssuesList(interview) {
  return interview.prs.map(pr => {
    const issues = pr.expectedIssues.map(i =>
      `  [${i.severity}/${i.category}] Line ~${i.lineStart}: ${i.description} (${i.points} pts)`
    ).join('\n');
    return `PR "${pr.title}" (${pr.points} pts total):\n${issues}`;
  }).join('\n\n');
}

export async function gradeReview(apiKey, interview, comments, overallComments) {
  const candidateComments = flattenComments(interview, comments, overallComments);
  const expectedIssues = buildExpectedIssuesList(interview);

  const system = `You are an expert interviewer at Airbnb grading a Senior Software Engineer code review interview.
Grade according to Google's Engineering Practices rubric:
- Design (architecture, interactions, belongs in codebase)
- Functionality (correctness, bugs, edge cases, concurrency)
- Complexity (over-engineering, readability, simplicity)
- Naming (clarity, descriptiveness)
- Comments (why not what, obsolete comments)
- Style (style guide adherence)
- Thread Safety (concurrency correctness - critical for senior engineers)
- Error Handling (proper exception handling, null safety, failure modes)

For senior engineers, PRIORITIZE: functionality/correctness bugs, thread safety, design issues.
Style/naming misses are minor deductions only.

You MUST return ONLY valid JSON, no markdown, no explanation outside the JSON.`;

  const user = `Interview: ${interview.title}

CANDIDATE'S COMMENTS:
${candidateComments || '(no comments left)'}

EXPECTED ISSUES (not shown to candidate during interview):
${expectedIssues}

Total possible points: ${interview.prs.reduce((s, p) => s + p.points, 0)}

Return this exact JSON structure:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "overallFeedback": "<2-3 sentence overall assessment>",
  "seniorLevelAssessment": "<specific assessment of whether they demonstrated senior-level review skills>",
  "categoryScores": {
    "Functionality": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Thread Safety": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Design": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Error Handling": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Complexity": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Naming": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Comments": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" },
    "Style": { "score": <n>, "maxScore": <n>, "feedback": "<1 sentence>" }
  },
  "prResults": [
    {
      "prId": "<id>",
      "score": <n>,
      "maxScore": <n>,
      "issuesFound": [
        { "issueId": "<id>", "found": <bool>, "description": "<issue description>", "candidateComment": "<matching comment or null>", "points": <n> }
      ],
      "missedIssues": [
        { "description": "<issue description>", "severity": "<Critical|High|Medium|Low>", "hint": "<1-sentence hint for next time>" }
      ]
    }
  ],
  "tips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`;

  const raw = await callClaude(apiKey, system, user, { maxTokens: 8192 });

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse grading response');
  }
}

const THEMES = [
  {
    name: 'Vacation Rental Compliance Service',
    context: `A Java Spring Boot service that checks Airbnb listings have valid registration numbers.
Key classes: ListingService, ListingRepository, AtlantisClient, ComplianceController.
Endpoints: POST /register_listing, GET /get_status?mode=EVENTUAL|STRONG, POST /sync_listing.
Background sync job runs daily. ListingStatus enum: APPROVED, PENDING, NOT_SYNCED, ERRORED.`,
    javaPath: 'com/airbnb/compliance',
    pythonPath: 'compliance',
  },
  {
    name: 'Booking & Reservation Service',
    context: `A Java Spring Boot service managing Airbnb listing reservations and availability.
Key classes: BookingService, ReservationRepository, AvailabilityCache, PaymentClient.
Endpoints: POST /reservations, DELETE /reservations/{id}, GET /availability, POST /confirm_booking.
BookingStatus enum: PENDING, CONFIRMED, CANCELLED, EXPIRED.`,
    javaPath: 'com/airbnb/booking',
    pythonPath: 'booking',
  },
  {
    name: 'Pricing & Availability Service',
    context: `A Java Spring Boot service handling dynamic pricing and calendar availability for listings.
Key classes: PricingService, AvailabilityService, PriceRepository, CalendarRepository.
Endpoints: GET /price?listingId&checkIn&checkOut, POST /block_dates, GET /calendar/{listingId}.
PricingStrategy enum: BASE, SEASONAL, SURGE, DISCOUNTED.`,
    javaPath: 'com/airbnb/pricing',
    pythonPath: 'pricing',
  },
  {
    name: 'Review & Trust Service',
    context: `A Java Spring Boot service managing guest/host reviews and trust scores.
Key classes: ReviewService, TrustScoreService, ModerationQueue, ReviewRepository.
Endpoints: POST /reviews, GET /reviews/{userId}, POST /flag_review, GET /trust_score/{userId}.
ReviewStatus enum: PENDING_MODERATION, PUBLISHED, FLAGGED, REMOVED.`,
    javaPath: 'com/airbnb/reviews',
    pythonPath: 'reviews',
  },
  {
    name: 'Notification & Messaging Service',
    context: `A Java Spring Boot service handling push notifications, emails, and in-app messages.
Key classes: NotificationService, MessageQueue, PushClient, EmailClient.
Endpoints: POST /notify, POST /send_message, GET /messages/{userId}, POST /mark_read.
NotificationStatus enum: QUEUED, SENT, DELIVERED, FAILED.`,
    javaPath: 'com/airbnb/notifications',
    pythonPath: 'notifications',
  },
  {
    name: 'Search & Listing Indexing Service',
    context: `A Java Spring Boot service handling listing search, indexing, and ranking.
Key classes: SearchService, ListingIndexer, SearchClient, RankingEngine.
Endpoints: GET /search, POST /index_listing, DELETE /index/{listingId}, POST /reindex.
IndexStatus enum: INDEXED, PENDING, STALE, REMOVED.`,
    javaPath: 'com/airbnb/search',
    pythonPath: 'search',
  },
];

const BUG_POOLS = {
  1: [
    'null safety violations and incorrect string comparison using == instead of .equals()',
    'missing input validation, incorrect default return values, and swallowed exceptions',
    'off-by-one errors, wrong status codes returned, and missing null checks on method parameters',
    'incorrect use of Optional (calling .get() without isPresent()), missing required field validation',
  ],
  2: [
    'non-thread-safe collections (ArrayList, HashMap) accessed from multiple threads causing data races',
    'resource leaks (connections/streams not closed in finally blocks) and N+1 database query patterns',
    'silent data loss when queue/buffer is full, missing error propagation to callers',
    'incorrect retry logic with no backoff, missing idempotency keys, duplicate processing risk',
    'check-then-act race conditions, non-atomic read-modify-write operations on shared state',
  ],
  3: [
    'broken circuit breaker with unsynchronized shared state and incorrect HALF_OPEN probe behavior',
    '@Transactional boundary violations — cache or queue writes inside transactions that rollback',
    'distributed race conditions in booking/reservation logic allowing double-booking',
    'architectural coupling — business logic leaked into infrastructure layer, violating separation of concerns',
    'missing @PreDestroy lifecycle shutdown on ExecutorService causing thread leaks on application stop',
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPRSchema(language, theme) {
  const filePath = language === 'Python'
    ? `src/${theme.pythonPath}/<module>.py`
    : `src/main/java/${theme.javaPath}/<ClassName>.java`;

  return `{
  "id": "<pr1|pr2|pr3>",
  "title": "<realistic PR title>",
  "difficulty": "<Easy|Medium|Hard>",
  "points": <25|35|40>,
  "author": "<firstname.lastname>@airbnb.com",
  "description": "<1-2 sentence PR description>",
  "files": [
    {
      "filename": "${filePath}",
      "isNew": <bool>,
      "hunks": [
        {
          "lines": [
            { "type": "context", "content": "<code>", "oldLine": 1, "newLine": 1, "lineKey": "c1" },
            { "type": "removed", "content": "<old code>", "oldLine": 2, "newLine": null, "lineKey": "r2" },
            { "type": "added",   "content": "<new code with bug>", "oldLine": null, "newLine": 2, "lineKey": "a2" }
          ]
        }
      ]
    }
  ],
  "expectedIssues": [
    {
      "id": "<prN-issueN>",
      "file": "<short filename>",
      "lineStart": <n>,
      "lineEnd": <n>,
      "description": "<clear bug description>",
      "category": "<Functionality|Design|Thread Safety|Error Handling|Naming|Style|Complexity>",
      "severity": "<Critical|High|Medium|Low>",
      "points": <n>
    }
  ]
}`;
}

async function generatePR(apiKey, prNumber, theme, language, bugFocus) {
  const configs = {
    1: { difficulty: 'Easy',   points: 25 },
    2: { difficulty: 'Medium', points: 35 },
    3: { difficulty: 'Hard',   points: 40 },
  };
  const { difficulty, points } = configs[prNumber];
  const langName = language === 'Python' ? 'Python (FastAPI-style)' : 'Java Spring Boot';
  const prSchema = getPRSchema(language, theme);

  const system = `You are creating one pull request for an Airbnb code review interview exercise.
Service: ${theme.name}
${theme.context}

Return ONLY a single valid JSON object matching this schema (no markdown, no explanation):
${prSchema}`;

  const user = `Generate PR #${prNumber} (${difficulty}, ${points} pts) in ${langName}.
Bug focus for this PR: ${bugFocus}
- id must be "pr${prNumber}", difficulty "${difficulty}", points ${points}
- Write realistic ${langName} code that looks like something a junior/mid engineer submitted
- The bugs must clearly match the bug focus above — don't invent unrelated bugs
- Keep diffs concise: max 2-3 context lines before/after each change, no large unchanged blocks
- lineKey values must be unique strings within this PR (e.g. "c1", "a2", "r3")
Return only the JSON object, no markdown.`;

  const raw = await callClaude(apiKey, system, user, { maxTokens: 8192, timeoutMs: 90000 });

  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse PR ${prNumber} — response may have been cut off. Try again.`);
  }
}

export async function generateInterview(apiKey, language = 'Java') {
  const theme = pickRandom(THEMES);
  const bugFocus1 = pickRandom(BUG_POOLS[1]);
  const bugFocus2 = pickRandom(BUG_POOLS[2]);
  const bugFocus3 = pickRandom(BUG_POOLS[3]);

  const [pr1, pr2, pr3] = await Promise.all([
    generatePR(apiKey, 1, theme, language, bugFocus1),
    generatePR(apiKey, 2, theme, language, bugFocus2),
    generatePR(apiKey, 3, theme, language, bugFocus3),
  ]);

  return {
    id: `generated-${Date.now()}`,
    title: theme.name,
    description: 'Review these 3 PRs from your team. Difficulty increases — budget your time accordingly.',
    timeLimit: 45 * 60,
    prs: [pr1, pr2, pr3],
  };
}
