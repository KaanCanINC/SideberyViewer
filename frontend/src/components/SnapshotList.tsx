import React from "react";
import { SnapshotMeta } from "../types";

interface SnapshotListProps {
  snapshots: SnapshotMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload: (file: File | null) => void;
  loading: boolean;
}

export function SnapshotList({
  snapshots,
  selectedId,
  onSelect,
  onUpload,
  loading,
}: SnapshotListProps) {
  return (
    <aside className="sidebar">
      <h3>Snapshots</h3>
      <div className="upload">
        <label htmlFor="file-upload" className="upload-label">
          Choose Snapshot File
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".json,application/json"
          onChange={(e) => onUpload(e.target.files ? e.target.files[0] : null)}
          disabled={loading}
        />
      </div>
      <div className="list">
        {snapshots.length === 0 && (
          <div className="empty-list">No snapshots uploaded yet</div>
        )}
        {snapshots.map((snapshot) => (
          <button
            key={snapshot.id}
            className={`snap-btn ${snapshot.id === selectedId ? "active" : ""}`}
            onClick={() => onSelect(snapshot.id)}
            disabled={loading}
          >
            <div className="snap-title">
              {snapshot.previewTitle && snapshot.previewTitle.length > 0
                ? snapshot.previewTitle
                : new Date(snapshot.time).toLocaleString()}
            </div>
            <div className="snap-sub">
              {snapshot.id ? `${snapshot.id.slice(0, 8)}...` : ""}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}