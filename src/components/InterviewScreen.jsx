import { useState } from 'react';
import Timer from './Timer.jsx';
import DiffViewer from './DiffViewer.jsx';
import { generateInterview } from '../utils/claudeApi.js';

export default function InterviewScreen({
  interview, comments, overallComments,
  onAddComment, onDeleteComment, onOverallComment,
  onSubmit, onBack, isGrading, apiKey, language, onRegenerate,
}) {
  const [activePr, setActivePr] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);

  const pr = interview.prs[activePr];

  const countCommentsForPr = (prId) => {
    return Object.entries(comments)
      .filter(([k]) => k.startsWith(`${prId}--`))
      .reduce((sum, [, arr]) => sum + arr.length, 0);
  };

  const totalComments = interview.prs.reduce((s, p) => s + countCommentsForPr(p.id), 0);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const newInterview = await generateInterview(apiKey, language);
      onRegenerate(newInterview);
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold text-sm">Airbnb</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-800 truncate">{interview.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            {isGenerating ? '⟳ Generating...' : '⟳ New PRs'}
          </button>

          {timeExpired && (
            <span className="text-red-500 text-xs font-medium animate-pulse">⏰ Time's up!</span>
          )}
          <Timer initialSeconds={interview.timeLimit} onExpire={() => setTimeExpired(true)} />

          <button
            onClick={onSubmit}
            disabled={isGrading || totalComments === 0}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {isGrading ? 'Grading...' : `Submit Review (${totalComments} comment${totalComments !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>

      {/* PR tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0 shrink-0">
        {interview.prs.map((p, i) => {
          const count = countCommentsForPr(p.id);
          return (
            <button
              key={p.id}
              onClick={() => setActivePr(i)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activePr === i
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              PR #{i + 1}
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                p.difficulty === 'Easy' ? 'bg-green-100 text-green-600' :
                p.difficulty === 'Medium' ? 'bg-amber-100 text-amber-600' :
                'bg-red-100 text-red-600'
              }`}>{p.difficulty}</span>
              {count > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
          <DiffViewer
            pr={pr}
            prId={pr.id}
            comments={comments}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
          />

          {/* Overall PR comment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Overall PR Comment <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={overallComments[pr.id] || ''}
              onChange={e => onOverallComment(pr.id, e.target.value)}
              placeholder="Leave an overall assessment for this PR — architecture concerns, overall quality, approval/changes requested..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={4}
            />
          </div>

          {/* Navigation between PRs */}
          <div className="flex justify-between pb-6">
            <button
              onClick={() => setActivePr(i => Math.max(0, i - 1))}
              disabled={activePr === 0}
              className="text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30"
            >
              ← Previous PR
            </button>
            {activePr < interview.prs.length - 1 ? (
              <button
                onClick={() => setActivePr(i => i + 1)}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Next PR →
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={isGrading || totalComments === 0}
                className="text-sm bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-lg"
              >
                {isGrading ? 'Grading...' : 'Submit & Get Graded'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
