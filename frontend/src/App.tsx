import React, { useEffect, useState } from "react";
import { SnapshotList } from "./components/SnapshotList";
import { SnapshotViewer } from "./components/SnapshotViewer";
import { uploadSnapshot, listSnapshots, getParsedSnapshot } from "./api";
import { SnapshotMeta, ParsedSnapshot } from "./types";
import "./styles.css";

export default function App() {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      console.error("Failed to load snapshot:", err);
      setError(`Failed to load snapshot: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app dark">
      <SnapshotList
        snapshots={snapshots}
        selectedId={selectedId}
        onSelect={handleSelect}
        onUpload={handleUpload}
        loading={loading}
      />

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

        {parsed && !loading && <SnapshotViewer snapshot={parsed} />}
      </main>
    </div>
  );
}