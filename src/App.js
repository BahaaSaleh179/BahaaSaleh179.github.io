import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function Team({ team, onChangeScore, onEliminate }) {
  return (
    <div className="team">
      <div className="team-name">{team.name}</div>
      <div className="team-score">{team.score}</div>
      <div className="team-controls">
        <button onClick={() => onChangeScore(team.id, 5)}>+5</button>
        <button onClick={() => onChangeScore(team.id, 10)}>+10</button>
        <button onClick={() => onChangeScore(team.id, -5)}>-5</button>
        <button className="eliminate" onClick={() => onEliminate(team.id)}>Eliminate</button>
      </div>
    </div>
  );
}

function App() {
  const [teams, setTeams] = useState(() => {
    try {
      const raw = localStorage.getItem('score-tracker:teams');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [eliminated, setEliminated] = useState(() => {
    try {
      const raw = localStorage.getItem('score-tracker:eliminated');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [name, setName] = useState('');

  // persist whenever teams/eliminated change
  useEffect(() => {
    try { localStorage.setItem('score-tracker:teams', JSON.stringify(teams)); } catch (e) {}
  }, [teams]);

  useEffect(() => {
    try { localStorage.setItem('score-tracker:eliminated', JSON.stringify(eliminated)); } catch (e) {}
  }, [eliminated]);

  // undo stack for eliminations (store last eliminated team)
  const [lastEliminated, setLastEliminated] = useState(null);
  const undoTimerRef = useRef(null);
  const [undoVisible, setUndoVisible] = useState(false);

  // derived: top score among active teams
  const topScore = teams.reduce((max, t) => Math.max(max, t.score), Number.NEGATIVE_INFINITY);

  function addTeam(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setTeams(prev => [...prev, { id, name: trimmed, score: 0 }]);
    setName('');
  }

  function changeScore(id, delta) {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, score: t.score + delta } : t));
  }

  function eliminateTeam(id) {
    // Remove from teams and add to eliminated only once
    setTeams(prevTeams => {
      const team = prevTeams.find(t => t.id === id);
      if (!team) return prevTeams;
      const nextTeams = prevTeams.filter(t => t.id !== id);
      setEliminated(prevEl => {
        if (prevEl.some(e => e.id === id)) return prevEl;
        const next = [...prevEl, { ...team }];
        // record last eliminated for undo
        setLastEliminated({ ...team });
        // show undo and start timer
        setUndoVisible(true);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setLastEliminated(null);
          setUndoVisible(false);
          undoTimerRef.current = null;
        }, 8000);
        return next;
      });
      return nextTeams;
    });
  }

  function undoElimination() {
    if (!lastEliminated) return;
    const t = lastEliminated;
    // remove from eliminated and put back to teams
    setEliminated(prev => prev.filter(x => x.id !== t.id));
    setTeams(prev => {
      if (prev.some(p => p.id === t.id)) return prev;
      return [...prev, t];
    });
    setLastEliminated(null);
    setUndoVisible(false);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function restoreEliminated(id) {
    setEliminated(prev => {
      const team = prev.find(t => t.id === id);
      if (!team) return prev;
      // remove from eliminated
      const next = prev.filter(t => t.id !== id);
      // add back to teams
      setTeams(prevTeams => {
        if (prevTeams.some(p => p.id === team.id)) return prevTeams;
        return [...prevTeams, team];
      });
      // clear lastEliminated if it matches the restored team
      setLastEliminated(prevLast => (prevLast && prevLast.id === id ? null : prevLast));
      // clear undo timer if needed
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      setUndoVisible(false);
      return next;
    });
  }

  function resetAll() {
    const ok = window.confirm('Reset all teams and eliminated data? This will clear stored data.');
    if (!ok) return;
    setTeams([]);
    setEliminated([]);
    setLastEliminated(null);
    setUndoVisible(false);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    try {
      localStorage.removeItem('score-tracker:teams');
      localStorage.removeItem('score-tracker:eliminated');
    } catch (e) {}
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Score Tracker</h1>
        <form className="add-form" onSubmit={addTeam}>
          <input aria-label="team-name" value={name} onChange={e => setName(e.target.value)} placeholder="Team name" />
          <button type="submit">Add Team</button>
        </form>
      </header>

      <main className="main">
        <section className="active-teams">
          <h2>Active Teams</h2>
          {teams.length === 0 ? (
            <p className="empty">No active teams. Add one above.</p>
          ) : (
            teams
              .slice()
              .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
              .map(team => (
                <div key={team.id} className={team.score === topScore ? 'top-team-wrapper' : ''}>
                  <Team team={team} onChangeScore={changeScore} onEliminate={eliminateTeam} />
                </div>
              ))
          )}
        </section>

        <section className="eliminated-teams">
          <h2>Eliminated Teams</h2>
          {eliminated.length === 0 ? (
            <p className="empty">No eliminated teams.</p>
          ) : (
            eliminated.map(t => (
              <div className="eliminated" key={t.id}>
                <span className="eliminated-name">{t.name}</span>
                <span className="eliminated-score">{t.score}</span>
                <button className="restore-btn" onClick={() => restoreEliminated(t.id)}>Restore</button>
              </div>
            ))
          )}
        </section>
        <div className="reset-area">
          <button className="reset-btn" onClick={resetAll}>Reset all</button>
        </div>
        <div className="undo-area">
          {lastEliminated ? (
            <button className={"undo-btn" + (undoVisible ? ' visible' : '')} onClick={undoElimination}>Undo eliminate ({lastEliminated.name})</button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default App;
