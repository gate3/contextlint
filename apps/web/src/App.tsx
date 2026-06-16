import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemoryRecord, ProjectRef, ToolId } from "@meminspect/core";
import {
  fetchProjects,
  fetchRecord,
  fetchRecords,
  searchRecords,
} from "./api";

type FlatRecord = MemoryRecord & { tool: ToolId };

export function App() {
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [records, setRecords] = useState<FlatRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MemoryRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<string[] | null>(null);
  const [manualPath, setManualPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setError(null);
    try {
      const { projects: discovered } = await fetchProjects();
      setProjects(discovered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadProjectRecords = useCallback(async (projectPath: string) => {
    setLoading(true);
    setError(null);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setSearchHits(null);
    try {
      const { bundles } = await fetchRecords(projectPath);
      const flat = bundles.flatMap((b) =>
        b.records.map((record) => ({ ...record, tool: b.tool })),
      );
      setRecords(flat);
      setSelectedPath(projectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  const openRecord = useCallback(
    async (record: FlatRecord) => {
      if (!selectedPath) {
        return;
      }
      setSelectedRecordId(record.id);
      setError(null);
      try {
        const { record: full } = await fetchRecord(selectedPath, record.id, record.tool);
        setSelectedRecord(full);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load record");
      }
    },
    [selectedPath],
  );

  const runSearch = useCallback(async () => {
    if (!selectedPath || !searchQuery.trim()) {
      setSearchHits(null);
      return;
    }
    setError(null);
    try {
      const { hits } = await searchRecords(selectedPath, searchQuery.trim());
      setSearchHits(hits.map((h) => h.recordId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  }, [searchQuery, selectedPath]);

  const visibleRecords = useMemo(() => {
    if (!searchHits) {
      return records;
    }
    const hitSet = new Set(searchHits);
    return records.filter((r) => hitSet.has(r.id));
  }, [records, searchHits]);

  const selectedProject = projects.find((p) => p.path === selectedPath);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Meminspect</h1>
          <p>Inspect agent memory for Cursor and Claude Code</p>
        </div>
        <button type="button" onClick={() => void loadProjects()}>
          Refresh projects
        </button>
      </header>

      <aside className="panel">
        <h2>Projects</h2>
        {projects.length === 0 ? (
          <p className="empty">No projects discovered yet.</p>
        ) : (
          <ul className="list">
            {projects.map((project) => (
              <li key={project.path}>
                <button
                  type="button"
                  className={selectedPath === project.path ? "active" : ""}
                  onClick={() => void loadProjectRecords(project.path)}
                >
                  {project.name}
                  <span className="meta">{project.path}</span>
                  <span className="meta">{project.tools.join(", ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="manual-path">
          <input
            type="text"
            placeholder="/path/to/project"
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
          />
          <button
            type="button"
            onClick={() => manualPath.trim() && void loadProjectRecords(manualPath.trim())}
          >
            Open
          </button>
        </div>
      </aside>

      <section className="panel">
        <h2>Records {selectedProject ? `— ${selectedProject.name}` : ""}</h2>
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search memory…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          />
          <button type="button" onClick={() => void runSearch()}>
            Search
          </button>
          <button type="button" onClick={() => setSearchHits(null)}>
            Clear
          </button>
        </div>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : !selectedPath ? (
          <p className="empty">Select a project to browse memory.</p>
        ) : visibleRecords.length === 0 ? (
          <p className="empty">No records found.</p>
        ) : (
          <ul className="list">
            {visibleRecords.map((record) => (
              <li key={`${record.tool}-${record.id}`}>
                <button
                  type="button"
                  className={selectedRecordId === record.id ? "active" : ""}
                  onClick={() => void openRecord(record)}
                >
                  {record.title}
                  <span className="meta">
                    <span className="badge">{record.tool}</span>
                    <span className="badge">{record.source}</span>
                    {record.metadata.writable ? "writable" : "read-only"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <main className="record-view">
        {selectedRecord ? (
          <>
            <h1>{selectedRecord.title}</h1>
            <p className="meta">
              <span className="badge">{selectedRecord.source}</span>
              <span className="badge">{selectedRecord.metadata.scope}</span>
              {selectedRecord.path}
            </p>
            <pre>{selectedRecord.content}</pre>
          </>
        ) : (
          <p className="empty">Select a record to view its content.</p>
        )}
      </main>
    </div>
  );
}
