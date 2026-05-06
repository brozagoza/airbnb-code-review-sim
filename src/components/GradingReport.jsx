const CATEGORY_ICONS = {
  Design: '🏗️',
  Functionality: '⚙️',
  Complexity: '🔀',
  Tests: '🧪',
  Naming: '🏷️',
  Comments: '💬',
  Style: '✨',
  'Thread Safety': '🔒',
  'Error Handling': '🛡️',
};

const SEVERITY_COLORS = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-gray-100 text-gray-600 border-gray-200',
};

function ScoreRing({ score, max = 100 }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${(pct / 100) * 263.9} 263.9`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x="50" y="54" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>{pct}</text>
      </svg>
      <div className="text-xs text-gray-500 mt-1">{score}/{max} pts</div>
    </div>
  );
}

function CategoryBar({ name, score, maxScore }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-6 text-center">{CATEGORY_ICONS[name] || '📌'}</span>
      <span className="text-sm text-gray-700 w-36 shrink-0">{name}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-700 w-16 text-right">{score}/{maxScore}</span>
    </div>
  );
}

export default function GradingReport({ result, interview, comments, overallComments, onRetry, onNewInterview, onViewHistory }) {
  if (!result) return null;

  const allMissed = result.prResults?.flatMap(p => p.missedIssues || []) || [];
  const allFound = result.prResults?.flatMap(p => p.issuesFound?.filter(i => i.found) || []) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-red-500 font-bold">Airbnb</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Code Review — Grading Report</span>
        </div>
        <div className="flex gap-3">
          {onViewHistory && (
            <button onClick={onViewHistory} className="text-sm border border-gray-300 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg">
              History
            </button>
          )}
          <button onClick={onRetry} className="text-sm border border-gray-300 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg">
            Retry Same PRs
          </button>
          <button onClick={onNewInterview} className="text-sm bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg">
            New Interview
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Score overview */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-8">
            <ScoreRing score={result.totalScore} max={result.maxScore || 100} />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {result.totalScore >= 80 ? '🎉 Strong hire' :
                 result.totalScore >= 60 ? '👍 Lean hire' :
                 result.totalScore >= 40 ? '⚠️ Borderline' : '❌ No hire'} signal
              </h2>
              <p className="text-gray-600 text-sm mb-4">{result.overallFeedback}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <strong>Senior bar assessment:</strong> {result.seniorLevelAssessment}
              </div>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {result.categoryScores && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(result.categoryScores).map(([cat, data]) => (
                <div key={cat}>
                  <CategoryBar name={cat} score={data.score} maxScore={data.maxScore} />
                  {data.feedback && (
                    <p className="text-xs text-gray-500 ml-9 mt-0.5">{data.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-PR results */}
        {result.prResults?.map((pr, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">PR #{i + 1}: {interview.prs[i]?.title}</h3>
              <span className="text-sm font-medium text-gray-600">{pr.score}/{pr.maxScore} pts</span>
            </div>

            {/* Issues found */}
            {pr.issuesFound?.filter(f => f.found).length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">✓ Issues you caught</div>
                <div className="space-y-2">
                  {pr.issuesFound.filter(f => f.found).map((issue, j) => (
                    <div key={j} className="flex gap-3 items-start bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <span className="text-green-600 font-bold text-sm shrink-0">+{issue.points}</span>
                      <div>
                        <p className="text-sm text-gray-800">{issue.description}</p>
                        {issue.candidateComment && (
                          <p className="text-xs text-gray-500 mt-0.5">Your comment: "{issue.candidateComment}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missed issues */}
            {pr.missedIssues?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">✗ Issues you missed</div>
                <div className="space-y-2">
                  {pr.missedIssues.map((issue, j) => (
                    <div key={j} className={`flex gap-3 items-start border rounded-lg px-3 py-2 ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.Medium}`}>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border shrink-0 ${SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.Medium}`}>
                        {issue.severity}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{issue.description}</p>
                        {issue.hint && <p className="text-xs mt-0.5 opacity-75">{issue.hint}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Tips */}
        {result.tips && result.tips.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">💡 Tips for next time</h3>
            <ul className="space-y-2">
              {result.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-400 shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
