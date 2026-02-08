import React from "react";
import { SnapshotMeta } from "../types";

interface SnapshotListProps {
  snapshots: SnapshotMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload: (file: File | null) => void;
  onDeleteSnapshot: (id: string) => void;
  loading: boolean;
  styleMode: "style1" | "style2";
  onToggleStyle: () => void;
  showLinks: boolean;
  onToggleShowLinks: () => void;
}

export function SnapshotList({
  snapshots,
  selectedId,
  onSelect,
  onUpload,
  onDeleteSnapshot,
  loading,
  styleMode,
  onToggleStyle,
  showLinks,
  onToggleShowLinks,
}: SnapshotListProps) {
  return (
    <aside className="sidebar">
      <h3>Snapshots</h3>
      <div className="upload">
        <label htmlFor="file-upload" className="upload-label">
          Browse…
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
          <div key={snapshot.id} className="snap-row">
            <button
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
            <button
              className="snap-delete"
              title="Delete snapshot"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this snapshot? This cannot be undone.")) {
                  onDeleteSnapshot(snapshot.id);
                }
              }}
              disabled={loading}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="style-toggle">
          <button
            className={styleMode === "style1" ? "selected" : ""}
            onClick={() => {
              if (styleMode !== "style1") onToggleStyle();
            }}
          >
            Style 1 - {styleMode === "style1" ? "selected" : "select"}
          </button>
          <button
            className={styleMode === "style2" ? "selected" : ""}
            onClick={() => {
              if (styleMode !== "style2") onToggleStyle();
            }}
          >
            Style 2 - {styleMode === "style2" ? "selected" : "select"}
          </button>
        </div>

        <div className="visibility-toggle">
          <label>
            <input type="checkbox" checked={showLinks} onChange={() => onToggleShowLinks()} />
            Show links under panels
          </label>
        </div>
      </div>
    </aside>
  );
}