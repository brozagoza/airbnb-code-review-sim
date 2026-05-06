import { useState, useEffect, useRef } from 'react';

export default function Timer({ initialSeconds, onExpire }) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          onExpire?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const pct = seconds / initialSeconds;
  const color = pct > 0.4 ? 'text-green-600' : pct > 0.2 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className={`font-mono font-bold text-lg tabular-nums ${color}`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}
