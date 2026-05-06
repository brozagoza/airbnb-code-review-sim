import { useState, useEffect, useRef } from 'react';

/* Minimal Java syntax highlighter — no external dep needed for diff lines */
function highlightJava(code) {
  if (!code.trim()) return code;
  const keywords = /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|null|true|false|record|sealed|permits|yield)\b/g;
  const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
  const annotations = /(@\w+)/g;
  const numbers = /\b(\d+\.?\d*[lLfFdD]?)\b/g;
  const types = /\b([A-Z][a-zA-Z0-9_]*)\b/g;

  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Apply highlighting with span markers (order matters)
  escaped = escaped
    .replace(strings, m => `<span style="color:#032f62">${m}</span>`)
    .replace(comments, m => `<span style="color:#6a737d;font-style:italic">${m}</span>`)
    .replace(annotations, m => `<span style="color:#e36209">${m}</span>`)
    .replace(keywords, m => `<span style="color:#d73a49;font-weight:bold">${m}</span>`)
    .replace(types, m => `<span style="color:#6f42c1">${m}</span>`)
    .replace(numbers, m => `<span style="color:#005cc5">${m}</span>`);

  return escaped;
}

function CommentThread({ comments, onDelete }) {
  return (
    <div className="comment-thread mx-0 my-0 px-4 py-3 space-y-2">
      {comments.map(c => (
        <div key={c.id} className="flex items-start gap-2 group">
          <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">Y</div>
          <div className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm text-gray-800 shadow-sm">
            {c.text}
          </div>
          <button
            onClick={() => onDelete(c.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs mt-1 shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function CommentInput({ lineKey, file, prId, onAdd, onCancel }) {
  const [text, setText] = useState('');
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    if (text.trim()) {
      onAdd(prId, file, lineKey, text.trim());
      setText('');
      onCancel();
    }
  };

  return (
    <div className="mx-0 my-0 px-4 py-3 bg-white border-t border-b border-amber-300 shadow-inner">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">Y</div>
        <div className="flex-1">
          <textarea
            ref={ref}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); if (e.key === 'Escape') onCancel(); }}
            placeholder="Leave a comment... (Cmd+Enter to submit, Esc to cancel)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={submit} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-md">
              Add Comment
            </button>
            <button onClick={onCancel} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-xs">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiffViewer({ pr, prId, comments, onAddComment, onDeleteComment }) {
  const [activeInput, setActiveInput] = useState(null); // { file, lineKey }
  const [expandedFiles, setExpandedFiles] = useState({});

  useEffect(() => {
    const init = {};
    pr.files.forEach(f => { init[f.filename] = true; });
    setExpandedFiles(init);
  }, [pr]);

  const getComments = (file, lineKey) => {
    const key = `${prId}--${file}--${lineKey}`;
    return comments[key] || [];
  };

  const totalComments = pr.files.reduce((sum, f) => {
    return sum + f.hunks.reduce((s2, h) => {
      return s2 + h.lines.reduce((s3, l) => {
        return s3 + getComments(f.filename, l.lineKey || `${l.newLine || l.oldLine}`).length;
      }, 0);
    }, 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* PR header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
            pr.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
            pr.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>{pr.difficulty}</span>
          <span className="text-xs text-gray-500">{pr.points} pts</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">by {pr.author}</span>
          <span className="ml-auto text-xs text-gray-500">
            {totalComments} comment{totalComments !== 1 ? 's' : ''} left
          </span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{pr.title}</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{pr.description}</p>
      </div>

      {/* Files */}
      {pr.files.map(file => (
        <div key={file.filename} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* File header */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
            onClick={() => setExpandedFiles(prev => ({ ...prev, [file.filename]: !prev[file.filename] }))}
          >
            <span className="text-gray-400">{expandedFiles[file.filename] ? '▾' : '▸'}</span>
            <span className="font-mono text-xs font-medium text-gray-700">{file.filename}</span>
            {file.isNew && <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">New file</span>}
          </div>

          {expandedFiles[file.filename] && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '600px' }}>
                <tbody>
                  {file.hunks.map((hunk, hi) => (
                    hunk.lines.map((line, li) => {
                      const lineKey = line.lineKey || `${line.newLine || ''}:${line.oldLine || ''}`;
                      const lineComments = getComments(file.filename, lineKey);
                      const isInputOpen = activeInput?.file === file.filename && activeInput?.lineKey === lineKey;
                      const isHunkHeader = line.type === 'hunk-header';

                      return [
                        <tr
                          key={`${hi}-${li}`}
                          className={`group ${
                            isHunkHeader ? 'diff-hunk' :
                            line.type === 'added' ? 'diff-added' :
                            line.type === 'removed' ? 'diff-removed' :
                            'diff-context'
                          }`}
                          onClick={isHunkHeader ? undefined : () => setActiveInput(
                            isInputOpen ? null : { file: file.filename, lineKey }
                          )}
                        >
                          {/* Old line num */}
                          <td className="select-none text-right text-xs text-gray-400 px-3 py-0 border-r border-gray-200 w-10 align-top leading-5" style={{ minWidth: 40 }}>
                            {isHunkHeader ? '' : (line.oldLine || '')}
                          </td>
                          {/* New line num */}
                          <td className="select-none text-right text-xs text-gray-400 px-3 py-0 border-r border-gray-200 w-10 align-top leading-5" style={{ minWidth: 40 }}>
                            {isHunkHeader ? '' : (line.newLine || '')}
                          </td>
                          {/* +/- */}
                          <td className={`select-none text-center text-xs px-1 py-0 border-r border-gray-200 w-5 font-mono leading-5 ${
                            line.type === 'added' ? 'text-green-600' :
                            line.type === 'removed' ? 'text-red-500' : 'text-gray-300'
                          }`} style={{ minWidth: 20 }}>
                            {isHunkHeader ? '' : (line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ')}
                          </td>
                          {/* Code */}
                          <td className="diff-code py-0 px-3 leading-5 font-mono text-xs align-top" style={{ whiteSpace: 'pre' }}>
                            {isHunkHeader ? (
                              <span className="text-blue-500 font-medium">{line.content}</span>
                            ) : (
                              <span dangerouslySetInnerHTML={{ __html: highlightJava(line.content) }} />
                            )}
                          </td>
                          {/* Comment icon */}
                          {!isHunkHeader && (
                            <td className="w-8 px-1 text-center">
                              {lineComments.length > 0 ? (
                                <span className="text-amber-500 text-xs">💬{lineComments.length}</span>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-40 text-gray-400 text-xs cursor-pointer">+</span>
                              )}
                            </td>
                          )}
                        </tr>,
                        /* Comment input row */
                        isInputOpen && (
                          <tr key={`input-${hi}-${li}`}>
                            <td colSpan={5}>
                              <CommentInput
                                lineKey={lineKey}
                                file={file.filename}
                                prId={prId}
                                onAdd={onAddComment}
                                onCancel={() => setActiveInput(null)}
                              />
                            </td>
                          </tr>
                        ),
                        /* Existing comments rows */
                        lineComments.length > 0 && (
                          <tr key={`comments-${hi}-${li}`}>
                            <td colSpan={5}>
                              <CommentThread
                                comments={lineComments}
                                onDelete={id => onDeleteComment(prId, file.filename, lineKey, id)}
                              />
                            </td>
                          </tr>
                        ),
                      ].filter(Boolean);
                    })
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
