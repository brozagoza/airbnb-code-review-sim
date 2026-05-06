import { useState } from 'react';

export default function Setup({ onStart, savedKey, historyCount, onViewHistory }) {
  const [key, setKey] = useState(savedKey || '');
  const [showKey, setShowKey] = useState(false);
  const [language, setLanguage] = useState('Java');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <span>●</span> Code Review Simulator
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Airbnb Virtual Onsite</h1>
          <p className="text-gray-400 text-lg">Practice the Code Review round. Get graded like a senior engineer.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Start your session</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Used for AI grading and PR generation. Stored locally in your browser only.
            </p>
          </div>

          {/* Language picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <div className="flex gap-2">
              {['Java', 'Python'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    language === lang
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Interview info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 mt-0.5">📋</span>
              <div>
                <div className="text-sm font-medium text-gray-800">Random service — 6 possible codebases</div>
                <div className="text-xs text-gray-500">{language} · 3 Pull Requests · New bugs each time</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-500 mt-0.5">⏱</span>
              <div>
                <div className="text-sm font-medium text-gray-800">45-minute time limit</div>
                <div className="text-xs text-gray-500">PR #3 is worth the most points — time it wisely</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">🏆</span>
              <div>
                <div className="text-sm font-medium text-gray-800">Graded to Senior Engineer bar</div>
                <div className="text-xs text-gray-500">Based on Google's Engineering Practices rubric</div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 mb-6 space-y-1.5">
            <p>• Click any line in the diff to leave an inline comment</p>
            <p>• Add an overall PR comment at the bottom of each PR</p>
            <p>• Prioritize logical bugs over style nits</p>
            <p>• After submitting, AI grades your review and shows what you missed</p>
          </div>

          <button
            onClick={() => key.trim() && onStart(key.trim(), language)}
            disabled={!key.trim()}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Start Code Review Interview
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <p className="text-gray-500 text-xs">
            Modeled after the Airbnb Senior SWE virtual onsite (2024–2026)
          </p>
          {historyCount > 0 && (
            <button
              onClick={onViewHistory}
              className="text-xs text-gray-400 hover:text-white underline underline-offset-2"
            >
              {historyCount} past attempt{historyCount !== 1 ? 's' : ''} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
