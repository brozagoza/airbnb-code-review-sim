import { useState, useCallback, useEffect, useRef } from 'react';
import Setup from './components/Setup.jsx';
import InterviewScreen from './components/InterviewScreen.jsx';
import GradingReport from './components/GradingReport.jsx';
import HistoryScreen from './components/HistoryScreen.jsx';
import { interview1 } from './data/interview1.js';
import { gradeReview } from './utils/claudeApi.js';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('interview_history') || '[]'); } catch { return []; }
}

function saveHistory(entries) {
  try {
    localStorage.setItem('interview_history', JSON.stringify(entries));
  } catch (e) {
    console.warn('Could not save history to localStorage:', e);
  }
}

export default function App() {
  const [screen, setScreen] = useState('setup'); // 'setup' | 'interview' | 'grading' | 'history'
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [comments, setComments] = useState({});
  const [overallComments, setOverallComments] = useState({});
  const [gradingResult, setGradingResult] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingError, setGradingError] = useState(null);
  const [gradingElapsed, setGradingElapsed] = useState(0);
  const gradingTimerRef = useRef(null);
  const [activeInterview, setActiveInterview] = useState(interview1);
  const [language, setLanguage] = useState('Java');
  const [history, setHistory] = useState(loadHistory);

  const handleStart = (key, lang = 'Java') => {
    localStorage.setItem('anthropic_api_key', key);
    setApiKey(key);
    setLanguage(lang);
    setComments({});
    setOverallComments({});
    setGradingResult(null);
    setScreen('interview');
  };

  const handleAddComment = useCallback((prId, file, lineKey, text) => {
    const key = `${prId}--${file}--${lineKey}`;
    setComments(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { text, lineKey, file, prId, id: Date.now() }],
    }));
  }, []);

  const handleDeleteComment = useCallback((prId, file, lineKey, commentId) => {
    const key = `${prId}--${file}--${lineKey}`;
    setComments(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(c => c.id !== commentId),
    }));
  }, []);

  const handleOverallComment = useCallback((prId, text) => {
    setOverallComments(prev => ({ ...prev, [prId]: text }));
  }, []);

  const handleSubmit = async () => {
    setIsGrading(true);
    setGradingError(null);
    setGradingElapsed(0);
    gradingTimerRef.current = setInterval(() => setGradingElapsed(s => s + 1), 1000);
    try {
      const result = await gradeReview(apiKey, activeInterview, comments, overallComments);

      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        interviewId: activeInterview.id,
        interviewTitle: activeInterview.title,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        prScores: result.prResults?.map(p => ({ score: p.score, maxScore: p.maxScore })),
        result,
        interview: activeInterview,
        comments,
        overallComments,
      };
      const updated = [...history, entry];
      saveHistory(updated);
      setHistory(updated);
      setGradingResult(result);
      setScreen('grading');
    } catch (err) {
      setGradingError(err.message);
    } finally {
      setIsGrading(false);
      clearInterval(gradingTimerRef.current);
    }
  };

  const handleRegenerate = async (newInterview) => {
    setActiveInterview(newInterview);
    setComments({});
    setOverallComments({});
    setGradingResult(null);
    setScreen('interview');
  };

  const handleRetry = (entry) => {
    // entry is either undefined (retry current) or a history entry
    if (entry?.interview) setActiveInterview(entry.interview);
    setComments({});
    setOverallComments({});
    setGradingResult(null);
    setScreen('interview');
  };

  const handleViewFeedback = (entry) => {
    setGradingResult(entry.result);
    setActiveInterview(entry.interview);
    setComments(entry.comments);
    setOverallComments(entry.overallComments);
    setScreen('grading');
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear all attempt history?')) {
      setHistory([]);
      saveHistory([]);
    }
  };

  return (
    <div className="min-h-screen">
      {(isGrading || gradingError) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            {gradingError ? (
              <>
                <div className="text-3xl">⚠️</div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 mb-1">Grading failed</p>
                  <p className="text-sm text-red-600">{gradingError}</p>
                </div>
                <button
                  onClick={() => setGradingError(null)}
                  className="mt-2 px-5 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-lg"
                >
                  Dismiss & try again
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Grading your review…</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Claude is analyzing your comments against the rubric
                  </p>
                </div>
                <div className="text-2xl font-mono font-bold text-gray-400">
                  {String(Math.floor(gradingElapsed / 60)).padStart(2, '0')}:{String(gradingElapsed % 60).padStart(2, '0')}
                </div>
                <p className="text-xs text-gray-400">This usually takes 15–30 seconds</p>
              </>
            )}
          </div>
        </div>
      )}
      {screen === 'setup' && (
        <Setup
          onStart={handleStart}
          savedKey={apiKey}
          historyCount={history.length}
          onViewHistory={() => setScreen('history')}
        />
      )}
      {screen === 'interview' && (
        <InterviewScreen
          interview={activeInterview}
          comments={comments}
          overallComments={overallComments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onOverallComment={handleOverallComment}
          onSubmit={handleSubmit}
          onBack={() => setScreen('setup')}
          isGrading={isGrading}
          apiKey={apiKey}
          language={language}
          onRegenerate={handleRegenerate}
        />
      )}
      {screen === 'grading' && (
        <GradingReport
          result={gradingResult}
          interview={activeInterview}
          comments={comments}
          overallComments={overallComments}
          onRetry={() => handleRetry()}
          onNewInterview={() => setScreen('setup')}
          onViewHistory={() => setScreen('history')}
        />
      )}
      {screen === 'history' && (
        <HistoryScreen
          history={history}
          onViewFeedback={handleViewFeedback}
          onRetry={handleRetry}
          onBack={() => setScreen('setup')}
          onClearHistory={handleClearHistory}
        />
      )}
    </div>
  );
}
