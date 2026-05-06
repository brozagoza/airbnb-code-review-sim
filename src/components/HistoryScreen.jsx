const SIGNAL = (pct) =>
  pct >= 80 ? { label: 'Strong hire', color: 'text-green-700 bg-green-50 border-green-200' } :
  pct >= 60 ? { label: 'Lean hire',   color: 'text-blue-700 bg-blue-50 border-blue-200' } :
  pct >= 40 ? { label: 'Borderline',  color: 'text-amber-700 bg-amber-50 border-amber-200' } :
              { label: 'No hire',     color: 'text-red-700 bg-red-50 border-red-200' };

function ScoreBadge({ score, max }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className={`text-3xl font-bold ${color}`}>
      {pct}<span className="text-base font-normal text-gray-400">%</span>
      <div className="text-xs font-normal text-gray-500 mt-0.5">{score}/{max} pts</div>
    </div>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen({ history, onViewFeedback, onRetry, onBack, onClearHistory }) {
  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Attempt History</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">No attempts yet. Complete an interview to see your history.</p>
            <button onClick={onBack} className="mt-4 text-sm text-red-500 hover:text-red-700 font-medium">
              Start an interview →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
          <span className="text-gray-300">|</span>
          <span className="text-red-500 font-bold">Airbnb</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Attempt History</span>
        </div>
        <button
          onClick={onClearHistory}
          className="text-xs text-gray-400 hover:text-red-500"
        >
          Clear all
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <p className="text-sm text-gray-500">{history.length} attempt{history.length !== 1 ? 's' : ''}</p>

        {[...history].reverse().map((entry) => {
          const pct = Math.round((entry.totalScore / entry.maxScore) * 100);
          const sig = SIGNAL(pct);
          return (
            <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-5">
              <ScoreBadge score={entry.totalScore} max={entry.maxScore} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sig.color}`}>
                    {sig.label}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mt-1 truncate">{entry.interviewTitle}</p>

                {/* Per-PR mini scores */}
                {entry.prScores && (
                  <div className="flex gap-3 mt-2">
                    {entry.prScores.map((pr, i) => (
                      <span key={i} className="text-xs text-gray-500">
                        PR{i + 1} <span className="font-medium text-gray-700">{pr.score}/{pr.maxScore}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onViewFeedback(entry)}
                  className="text-xs bg-gray-900 hover:bg-gray-700 text-white font-medium px-3 py-1.5 rounded-lg"
                >
                  View Feedback
                </button>
                <button
                  onClick={() => onRetry(entry)}
                  className="text-xs border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 font-medium px-3 py-1.5 rounded-lg"
                >
                  Retry
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
