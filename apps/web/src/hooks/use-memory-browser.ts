import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MemoryRecord, ProjectRef, ScanFinding } from "@meminspect/core";
import {
  EMPTY_RECORD_FILTERS,
  filterProjects,
  filterRecords,
  isRecordFiltersActive,
  type ProjectSort,
  type RecordFiltersState,
  sortProjects,
  sortRecordsForDisplay,
} from "@/lib/memory-labels";
import {
  getScanDemoProject,
  getRecord,
  listProjectRecords,
  listProjects,
  runHealthScan,
  searchProjectRecords,
  snoozeFinding,
  type ScanResponse,
} from "@/services";
import type { FlatRecord } from "@/components/memory-browser/types";

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useMemoryBrowser() {
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [records, setRecords] = useState<FlatRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MemoryRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<string[] | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSort, setProjectSort] = useState<ProjectSort>("name-asc");
  const [recordFilters, setRecordFilters] = useState<RecordFiltersState>(EMPTY_RECORD_FILTERS);
  const [error, setError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const latestProjectLoadRef = useRef(0);
  const latestRecordLoadRef = useRef(0);
  const latestSearchLoadRef = useRef(0);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [showScanPanel, setShowScanPanel] = useState(false);
  const [returnToScanPanel, setReturnToScanPanel] = useState(false);
  const [scanning, setScanning] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load projects"));
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadProjectRecords = useCallback(async (projectPath: string) => {
    const loadId = ++latestProjectLoadRef.current;
    setLoadingRecords(true);
    setError(null);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setSearchQuery("");
    setSearchHits(null);
    setRecordFilters(EMPTY_RECORD_FILTERS);
    latestSearchLoadRef.current++;
    setScanResult(null);
    setShowScanPanel(false);
    setReturnToScanPanel(false);
    try {
      const bundles = await listProjectRecords(projectPath);
      if (loadId !== latestProjectLoadRef.current) {
        return;
      }
      const flat = bundles.flatMap((b) =>
        b.records.map((record) => ({ ...record, tool: b.tool })),
      );
      setRecords(flat);
      setSelectedPath(projectPath);
    } catch (err) {
      if (loadId === latestProjectLoadRef.current) {
        setError(toErrorMessage(err, "Failed to load records"));
      }
    } finally {
      if (loadId === latestProjectLoadRef.current) {
        setLoadingRecords(false);
      }
    }
  }, []);

  const openRecord = useCallback(
    async (record: FlatRecord) => {
      if (!selectedPath) {
        return;
      }
      const loadId = ++latestRecordLoadRef.current;
      setSelectedRecordId(record.id);
      setLoadingRecord(true);
      setError(null);
      try {
        const full = await getRecord(selectedPath, record.id, record.tool);
        if (loadId !== latestRecordLoadRef.current) {
          return;
        }
        setSelectedRecord(full);
      } catch (err) {
        if (loadId === latestRecordLoadRef.current) {
          setError(toErrorMessage(err, "Failed to load record"));
        }
      } finally {
        if (loadId === latestRecordLoadRef.current) {
          setLoadingRecord(false);
        }
      }
    },
    [selectedPath],
  );

  const runSearch = useCallback(async () => {
    if (!selectedPath || !searchQuery.trim()) {
      return;
    }
    const loadId = ++latestSearchLoadRef.current;
    setError(null);
    try {
      const hits = await searchProjectRecords(selectedPath, searchQuery.trim());
      if (loadId !== latestSearchLoadRef.current) {
        return;
      }
      setSearchHits(hits.map((h) => h.recordId));
    } catch (err) {
      if (loadId !== latestSearchLoadRef.current) {
        return;
      }
      setError(toErrorMessage(err, "Search failed"));
    }
  }, [searchQuery, selectedPath]);

  const clearMemorySearch = useCallback(() => {
    latestSearchLoadRef.current++;
    setSearchQuery("");
    setSearchHits(null);
    setRecordFilters(EMPTY_RECORD_FILTERS);
  }, []);

  const handleTryDemo = useCallback(async () => {
    setError(null);
    try {
      const { path: demoPath } = await getScanDemoProject();
      await loadProjectRecords(demoPath);
      setShowScanPanel(false);
      setScanResult(null);
    } catch (err) {
      setError(toErrorMessage(err, "Demo project not available"));
    }
  }, [loadProjectRecords]);

  const handleRunScan = useCallback(async () => {
    if (!selectedPath) {
      return;
    }
    setScanning(true);
    setError(null);
    setShowScanPanel(true);
    try {
      const result = await runHealthScan(selectedPath);
      setScanResult(result);
    } catch (err) {
      setError(toErrorMessage(err, "Scan failed"));
      setShowScanPanel(false);
    } finally {
      setScanning(false);
    }
  }, [selectedPath]);

  const handleSnoozeFinding = useCallback(
    async (finding: ScanFinding) => {
      if (!selectedPath || !scanResult) {
        return;
      }
      try {
        await snoozeFinding(selectedPath, finding.id);
        setScanResult({
          ...scanResult,
          findings: scanResult.findings.filter((f) => f.id !== finding.id),
          stats: {
            ...scanResult.stats,
            findingsVisible: scanResult.stats.findingsVisible - 1,
            snoozed: scanResult.stats.snoozed + 1,
          },
        });
      } catch (err) {
        setError(toErrorMessage(err, "Failed to snooze finding"));
      }
    },
    [selectedPath, scanResult],
  );

  const handleSelectFinding = useCallback(
    (finding: ScanFinding) => {
      const recordId = finding.recordIds[0];
      if (!recordId) {
        return;
      }
      const record = records.find((r) => r.id === recordId);
      if (record) {
        setReturnToScanPanel(true);
        setShowScanPanel(false);
        void openRecord(record);
      }
    },
    [records, openRecord],
  );

  const handleSelectRecord = useCallback(
    (record: FlatRecord) => {
      setReturnToScanPanel(false);
      void openRecord(record);
    },
    [openRecord],
  );

  const handleBackToScanResults = useCallback(() => {
    setReturnToScanPanel(false);
    setSelectedRecord(null);
    setSelectedRecordId(null);
    setShowScanPanel(true);
  }, []);

  const handleCloseScanPanel = useCallback(() => {
    setShowScanPanel(false);
    setReturnToScanPanel(false);
  }, []);

  const isMemorySearchActive =
    searchQuery.trim().length > 0 ||
    searchHits !== null ||
    isRecordFiltersActive(recordFilters);

  const filteredProjects = useMemo(() => {
    return sortProjects(filterProjects(projects, projectSearch), projectSort);
  }, [projects, projectSearch, projectSort]);

  const visibleRecords = useMemo(() => {
    let list = records;
    if (searchHits !== null) {
      const hitSet = new Set(searchHits);
      list = records.filter((r) => hitSet.has(r.id));
    }
    list = filterRecords(list, recordFilters);
    return sortRecordsForDisplay(list);
  }, [records, searchHits, recordFilters]);

  const recordsAfterSearch = useMemo(() => {
    if (searchHits === null) {
      return records;
    }
    const hitSet = new Set(searchHits);
    return records.filter((r) => hitSet.has(r.id));
  }, [records, searchHits]);

  const selectedProject = projects.find((p) => p.path === selectedPath);

  return {
    projects,
    filteredProjects,
    selectedPath,
    selectedProject,
    records,
    visibleRecords,
    recordsAfterSearch,
    selectedRecordId,
    selectedRecord,
    searchQuery,
    projectSearch,
    projectSort,
    recordFilters,
    searchHits,
    isMemorySearchActive,
    error,
    loadingProjects,
    loadingRecords,
    loadingRecord,
    scanResult,
    showScanPanel,
    returnToScanPanel,
    scanning,
    onProjectSearchChange: setProjectSearch,
    onProjectSortChange: setProjectSort,
    onSelectProject: (path: string) => void loadProjectRecords(path),
    onRefreshProjects: () => void loadProjects(),
    onOpenProjectPath: (path: string) => void loadProjectRecords(path),
    onTryDemo: () => void handleTryDemo(),
    onRunScan: () => void handleRunScan(),
    onRecordFiltersChange: setRecordFilters,
    onSearchQueryChange: setSearchQuery,
    onRunSearch: () => void runSearch(),
    onClearMemorySearch: clearMemorySearch,
    onSelectRecord: handleSelectRecord,
    onSelectFinding: handleSelectFinding,
    onSnoozeFinding: (finding: ScanFinding) => void handleSnoozeFinding(finding),
    onCloseScanPanel: handleCloseScanPanel,
    onBackToScanResults: handleBackToScanResults,
  };
}
