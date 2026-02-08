import React, { useEffect, useState } from "react";
import { SnapshotList } from "./components/SnapshotList";
import { SnapshotViewer } from "./components/SnapshotViewer";
import {
  uploadSnapshot,
  listSnapshots,
  getParsedSnapshot,
  deleteSnapshot,
  getRawSnapshot,
  updateSnapshot,
} from "./api";
import { SnapshotMeta, ParsedSnapshot } from "./types";
import "./styles.css";

export default function App() {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // persist style selection across refreshes
  const [styleMode, setStyleMode] = useState<"style1" | "style2">(() => {
    try {
      const stored = localStorage.getItem("styleMode");
      return (stored === "style2" ? "style2" : "style1");
    } catch {
      return "style1";
    }
  });

  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState<boolean>(true);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    try {
      setError(null);
      const data = await listSnapshots();
      setSnapshots(data);
    } catch (err: any) {
      console.error("Failed to fetch snapshots:", err);
      setError("Failed to load snapshots. Is the backend running?");
      setSnapshots([]);
    }
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await uploadSnapshot(file);
      await fetchList();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(`Upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id: string) {
    setSelectedId(id);
    setParsed(null);
    setLoading(true);
    setError(null);
    try {
      const data = await getParsedSnapshot(id);
      setParsed(data);
      setSelectedPanelId(data.panels[0]?.id ?? null);
    } catch (err: any) {
      console.error("Failed to load snapshot:", err);
      setError(`Failed to load snapshot: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSnapshot(id: string) {
    try {
      setLoading(true);
      await deleteSnapshot(id);
      await fetchList();
      if (selectedId === id) {
        setSelectedId(null);
        setParsed(null);
      }
    } catch (err: any) {
      console.error("Failed to delete snapshot:", err);
      setError("Failed to delete snapshot");
    } finally {
      setLoading(false);
    }
  }

  // Delete a whole panel (remove all groups belonging to panelId). If no panels left, delete snapshot.
  async function handleDeletePanel(panelId: string) {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await getRawSnapshot(selectedId);
      if (!raw) throw new Error("Raw snapshot not found");

      const normalizeGroup = (g: any): any[] => {
        if (!g) return [];
        if (Array.isArray(g) && g.length && typeof g[0] === "object" && !Array.isArray(g[0])) return g;
        if (typeof g === "object" && !Array.isArray(g) && g.url !== undefined) return [g];
        if (Array.isArray(g) && g.length && Array.isArray(g[0])) return g[0];
        return [];
      };

      const tabs = Array.isArray(raw.tabs) ? raw.tabs : raw.tabs ? [raw.tabs] : [];
      const newTabs: any[] = [];

      for (const win of tabs) {
        if (Array.isArray(win)) {
          const newPanelGroups: any[] = [];
          for (const maybePanelGroups of win) {
            if (Array.isArray(maybePanelGroups)) {
              // array of groups
              const newGroups: any[] = [];
              for (const grp of maybePanelGroups) {
                const g = grp;
                const firstTab = (Array.isArray(g) && g.length && typeof g[0] === "object") ? g[0] : (typeof g === "object" && g.url ? g : null);
                const pid = String(firstTab?.panelId ?? "__unknown__");
                if (pid !== panelId) newGroups.push(g);
              }
              if (newGroups.length) newPanelGroups.push(newGroups);
            } else {
              // single group
              const g = maybePanelGroups;
              const groupTabs = normalizeGroup(g);
              const firstTab = groupTabs[0];
              const pid = String(firstTab?.panelId ?? "__unknown__");
              if (pid !== panelId) newPanelGroups.push(g);
            }
          }
          if (newPanelGroups.length) newTabs.push(newPanelGroups);
        } else {
          const groupTabs = normalizeGroup(win);
          const firstTab = groupTabs[0];
          const pid = String(firstTab?.panelId ?? "__unknown__");
          if (pid !== panelId) newTabs.push(win);
        }
      }

      raw.tabs = newTabs;

      // detect remaining panels
      const remainingPanelIds = new Set<string>();
      const tabsAfter = Array.isArray(raw.tabs) ? raw.tabs : raw.tabs ? [raw.tabs] : [];
      for (const win of tabsAfter) {
        const panelGroupsList = Array.isArray(win) ? win : [win];
        for (const panelGroups of panelGroupsList) {
          const g = normalizeGroup(panelGroups);
          if (g.length) remainingPanelIds.add(String(g[0]?.panelId ?? "__unknown__"));
        }
      }

      if (remainingPanelIds.size === 0) {
        await deleteSnapshot(selectedId);
        await fetchList();
        setSelectedId(null);
        setParsed(null);
        return;
      }

      await updateSnapshot(selectedId, raw, raw.time ?? Date.now());
      await fetchList();
      await handleSelect(selectedId);
    } catch (err: any) {
      console.error("Failed to delete panel:", err);
      setError("Failed to delete panel");
    } finally {
      setLoading(false);
    }
  }

  // Helper used by deletion of individual tab nodes
  function normalizeGroupForDelete(g: any): any[] {
    if (!g) return [];
    if (Array.isArray(g) && g.length && typeof g[0] === "object" && !Array.isArray(g[0])) return g;
    if (typeof g === "object" && !Array.isArray(g) && g.url !== undefined) return [g];
    if (Array.isArray(g) && g.length && Array.isArray(g[0])) return g[0];
    return [];
  }

  async function handleDeleteTab(
    panelId: string | undefined,
    groupIndex: number | undefined,
    node: any,
    deleteSubtree: boolean
  ) {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await getRawSnapshot(selectedId);
      if (!raw) throw new Error("Raw snapshot not found");

      let found = false;
      let groupCounter = 0;

      const tabs = Array.isArray(raw.tabs) ? raw.tabs : raw.tabs ? [raw.tabs] : [];
      outer: for (let wi = 0; wi < tabs.length; wi++) {
        const win = tabs[wi];
        const panelGroupsList = Array.isArray(win) ? win : [win];

        for (let pgi = 0; pgi < panelGroupsList.length; pgi++) {
          const panelGroups = panelGroupsList[pgi];

          if (Array.isArray(panelGroups)) {
            if (panelGroups.length > 0 && typeof panelGroups[0] === "object" && !Array.isArray(panelGroups[0])) {
              const groupTabs = normalizeGroupForDelete(panelGroups);
              const firstTab = groupTabs[0];
              const pid = String(firstTab?.panelId ?? "__unknown__");
              if (pid === panelId) {
                if (groupCounter === (groupIndex ?? 0)) {
                  const baseArray = panelGroups;
                  const idx = node.indexInGroup;
                  const rootLvl = typeof node.tab.lvl === "number" ? node.tab.lvl : 0;

                  if (node.children && node.children.length > 0) {
                    if (deleteSubtree) {
                      let j = idx + 1;
                      while (j < baseArray.length && (baseArray[j].lvl ?? 0) > rootLvl) j++;
                      baseArray.splice(idx, j - idx);
                    } else {
                      baseArray.splice(idx, 1);
                      let k = idx;
                      while (k < baseArray.length && (baseArray[k].lvl ?? 0) > rootLvl) {
                        baseArray[k].lvl = Math.max(0, (baseArray[k].lvl ?? 0) - 1);
                        k++;
                      }
                    }
                  } else {
                    baseArray.splice(idx, 1);
                  }

                  found = true;
                  break outer;
                }
                groupCounter++;
              }
            } else {
              // panelGroups is array of groups
              for (let mg = 0; mg < panelGroups.length; mg++) {
                const maybeGroup = panelGroups[mg];
                const groupTabs = normalizeGroupForDelete(maybeGroup);
                if (!groupTabs.length) continue;
                const firstTab = groupTabs[0];
                const pid = String(firstTab?.panelId ?? "__unknown__");
                if (pid === panelId) {
                  if (groupCounter === (groupIndex ?? 0)) {
                    const baseArray = panelGroups[mg];
                    const idx = node.indexInGroup;
                    const rootLvl = typeof node.tab.lvl === "number" ? node.tab.lvl : 0;

                    if (node.children && node.children.length > 0) {
                      if (deleteSubtree) {
                        let j = idx + 1;
                        while (j < baseArray.length && (baseArray[j].lvl ?? 0) > rootLvl) j++;
                        baseArray.splice(idx, j - idx);
                      } else {
                        baseArray.splice(idx, 1);
                        let k = idx;
                        while (k < baseArray.length && (baseArray[k].lvl ?? 0) > rootLvl) {
                          baseArray[k].lvl = Math.max(0, (baseArray[k].lvl ?? 0) - 1);
                          k++;
                        }
                      }
                    } else {
                      baseArray.splice(idx, 1);
                    }

                    found = true;
                    break outer;
                  }
                  groupCounter++;
                }
              }
            }
          } else {
            const groupTabs = normalizeGroupForDelete(panelGroups);
            if (!groupTabs.length) continue;
            const firstTab = groupTabs[0];
            const pid = String(firstTab?.panelId ?? "__unknown__");
            if (pid === panelId) {
              if (groupCounter === (groupIndex ?? 0)) {
                const baseArray = panelGroups;
                const idx = node.indexInGroup;
                const rootLvl = typeof node.tab.lvl === "number" ? node.tab.lvl : 0;

                if (node.children && node.children.length > 0) {
                  if (deleteSubtree) {
                    let j = idx + 1;
                    while (j < baseArray.length && (baseArray[j].lvl ?? 0) > rootLvl) j++;
                    baseArray.splice(idx, j - idx);
                  } else {
                    baseArray.splice(idx, 1);
                    let k = idx;
                    while (k < baseArray.length && (baseArray[k].lvl ?? 0) > rootLvl) {
                      baseArray[k].lvl = Math.max(0, (baseArray[k].lvl ?? 0) - 1);
                      k++;
                    }
                  }
                } else {
                  baseArray.splice(idx, 1);
                }

                found = true;
                break outer;
              }
              groupCounter++;
            }
          }
        }
      }

      if (!found) throw new Error("Failed to locate group to modify");
      await updateSnapshot(selectedId, raw, raw.time ?? Date.now());
      await handleSelect(selectedId);
    } catch (err: any) {
      console.error("Failed to delete tab:", err);
      setError("Failed to delete tab");
    } finally {
      setLoading(false);
    }
  }

  // persist style selection whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("styleMode", styleMode);
    } catch {}
  }, [styleMode]);

  return (
    <div className="app dark">
      <SnapshotList
        snapshots={snapshots}
        selectedId={selectedId}
        onSelect={handleSelect}
        onUpload={handleUpload}
        onDeleteSnapshot={handleDeleteSnapshot}
        loading={loading}
        styleMode={styleMode}
        onToggleStyle={() => {
          const next = styleMode === "style1" ? "style2" : "style1";
          setStyleMode(next);
          try { localStorage.setItem("styleMode", next); } catch {}
        }}
        showLinks={showLinks}
        onToggleShowLinks={() => setShowLinks((s) => !s)}
      />
      <div style={{ width: 8 }} />
      <main className="viewer">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!selectedId && !error && (
          <div className="empty">
            <h2>Welcome to Sidebery Snapshot Viewer</h2>
            <p>Upload a snapshot file to get started</p>
          </div>
        )}

        {loading && <div className="loading">Loading…</div>}

        {parsed && !loading && (
          <SnapshotViewer
            snapshot={parsed}
            onDeleteTab={handleDeleteTab}
            onDeletePanel={handleDeletePanel}
            styleMode={styleMode}
            selectedPanelId={selectedPanelId}
            onSelectPanel={(id) => setSelectedPanelId(id)}
            showLinks={showLinks}
          />
        )}
      </main>
    </div>
  );
}