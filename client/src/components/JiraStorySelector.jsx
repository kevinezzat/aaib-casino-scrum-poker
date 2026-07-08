import React, { useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';
import CustomSelect from './CustomSelect';

export default function JiraStorySelector({ roomCode, onIssuesFetched }) {
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState([]);
  const [sprints, setSprints] = useState([]);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetchingIssues, setFetchingIssues] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Projects on Mount
  useEffect(() => {
    if (!roomCode) return;
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/api/jira/projects?roomCode=${roomCode}`);
        if (!res.ok) throw new Error('Failed to load projects');
        const data = await res.json();
        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [roomCode]);

  // Fetch Boards when Project changes
  useEffect(() => {
    if (!selectedProject || !roomCode) {
      setBoards([]);
      setSelectedBoard('');
      return;
    }
    const fetchBoards = async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/api/jira/boards?roomCode=${roomCode}&projectKeyOrId=${selectedProject}`);
        if (!res.ok) throw new Error('Failed to load boards');
        const data = await res.json();
        setBoards(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBoards();
  }, [selectedProject, roomCode]);

  // Fetch Sprints when Board changes
  useEffect(() => {
    if (!selectedBoard || !roomCode) {
      setSprints([]);
      setSelectedSprint('');
      return;
    }
    const fetchSprints = async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/api/jira/boards/${selectedBoard}/sprints?roomCode=${roomCode}`);
        if (!res.ok) throw new Error('Failed to load sprints');
        const data = await res.json();
        setSprints(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSprints();
  }, [selectedBoard, roomCode]);

  const handleFetchIssues = async (nextPageToken = null) => {
    // Guard against React SyntheticEvent being passed from onClick
    if (typeof nextPageToken !== 'string') {
      nextPageToken = null;
    }

    setFetchingIssues(true);
    setError(null);
    try {
      let jql = '';
      if (selectedSprint && selectedSprint !== 'backlog') {
        jql = `sprint = ${selectedSprint} AND resolution = Unresolved ORDER BY created DESC`;
      } else if (selectedProject) {
        jql = `project = "${selectedProject}" AND resolution = Unresolved ORDER BY created DESC`;
      }

      let url = `/api/jira/issues?roomCode=${roomCode}&jql=${encodeURIComponent(jql)}`;
      if (nextPageToken) {
        url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
      }

      const res = await fetchApi(url);
      if (!res.ok) throw new Error('Failed to fetch issues');

      const data = await res.json();
      console.log(`fetch issues data response ${JSON.stringify(data)}`);
      // Pass pagination info in case the parent component needs it
      onIssuesFetched(data.issues || [], {
        nextPageToken: data.nextPageToken,
        approximateTotal: data.approximateTotal
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingIssues(false);
    }
  };

  return (
    <div className="bg-surface-container-highest border border-outline-variant rounded-xl p-md flex flex-col gap-md animate-fade-in shadow-sm">
      <div className="flex items-center gap-sm mb-xs">
        <span className="material-symbols-outlined text-[28px] text-primary">filter_alt</span>
        <h3 className="font-label-lg text-on-surface">Select Source</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 font-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-lg">
        {/* Step 1: Project Dropdown */}
        <div className="flex flex-col gap-xs animate-fade-in relative z-30">
          <label className="font-label-md text-on-surface-variant flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
            Project
          </label>
          <CustomSelect
            options={projects.map(p => ({ value: p.key, label: p.name }))}
            value={selectedProject}
            onChange={(val) => setSelectedProject(val)}
            placeholder="-- Select Project --"
            disabled={loading && projects.length === 0}
            loading={loading && projects.length === 0}
          />
        </div>

        {/* Step 2: Board Dropdown (Only show if project is selected) */}
        {selectedProject && (
          <div className="flex flex-col gap-xs animate-slide-up relative z-20">
            <label className="font-label-md text-on-surface-variant flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
              Board
            </label>
            <CustomSelect
              options={boards.map(b => ({ value: b.id, label: b.name }))}
              value={selectedBoard}
              onChange={(val) => setSelectedBoard(val)}
              placeholder={boards.length === 0 && !loading ? 'No boards found' : '-- Select Board --'}
              disabled={loading || boards.length === 0}
              loading={loading && !boards.length}
            />
          </div>
        )}

        {/* Step 3: Sprint Dropdown (Only show if board is selected) */}
        {selectedBoard && (
          <div className="flex flex-col gap-xs animate-slide-up relative z-10">
            <label className="font-label-md text-on-surface-variant flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">3</span>
              Sprint / Backlog
            </label>
            <CustomSelect
              options={sprints.map(s => ({ value: s.id, label: s.name }))}
              value={selectedSprint}
              onChange={(val) => setSelectedSprint(val)}
              placeholder={sprints.length === 0 && !loading ? 'No sprints/backlogs found' : '-- Select Sprint / Backlog --'}
              disabled={loading || (!sprints.length && loading)}
              loading={loading && !sprints.length}
            />
          </div>
        )}
      </div>

      {selectedSprint && (
        <div className="mt-4 flex justify-end animate-fade-in border-t border-outline-variant pt-4">
          <button
            onClick={() => handleFetchIssues()}
            disabled={fetchingIssues}
            className="bg-primary hover:bg-surface-tint text-on-primary font-label-md py-3 px-8 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-xs shadow-md"
          >
            {fetchingIssues ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                Fetching...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">download</span>
                Fetch Issues
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
