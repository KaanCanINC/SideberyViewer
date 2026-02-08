import React from "react";
import { ParsedSnapshot } from "../types";
import { TabNodeView } from "./TabNodeView";

interface SnapshotViewerProps {
  snapshot: ParsedSnapshot;
  onDeleteTab?: (
    panelId: string | undefined,
    groupIndex: number | undefined,
    node: any,
    collapsed: boolean
  ) => void;
  onDeletePanel?: (panelId: string) => void;
  styleMode?: "style1" | "style2";
  selectedPanelId?: string | null;
  onSelectPanel?: (panelId: string | null) => void;
  showLinks?: boolean;
}

export function SnapshotViewer({
  snapshot,
  onDeleteTab,
  onDeletePanel,
  styleMode = "style1",
  selectedPanelId,
  onSelectPanel,
  showLinks = true,
}: SnapshotViewerProps) {
  const containers = snapshot.containers ?? {};
  const panels = snapshot.panels ?? [];
  const singlePanelId = selectedPanelId ?? (panels[0] && panels[0].id) ?? "";

  const renderPanel = (panel: any) => (
    <section className="panel" key={panel.id}>
      <div className="panel-header">
        {styleMode === "style2" && onSelectPanel && (
          <label className="panel-selector" style={{ marginRight: 8 }}>
            <select
              value={singlePanelId || ""}
              onChange={(e) => onSelectPanel && onSelectPanel(e.target.value || null)}
            >
              <option value="">— select —</option>
              {panels.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.meta?.name ?? p.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="panel-title">{panel.meta?.name ?? panel.id}</div>
        {onDeletePanel && (
          <button
            className="panel-delete"
            title="Delete panel"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete panel "${panel.meta?.name ?? panel.id}"?`)) {
                onDeletePanel(panel.id);
              }
            }}
          >
            🗑
          </button>
        )}
      </div>

      <div className="panel-groups">
        {panel.groups.map((group: any, groupIndex: number) => (
          <div className="group" key={groupIndex}>
            <div className="group-header">Group {groupIndex + 1}</div>
            <div className="group-body">
              {group.tree && group.tree.length > 0 ? (
                group.tree.map((root: any, rootIndex: number) => (
                  <TabNodeView
                    key={rootIndex}
                    node={root}
                    depth={0}
                    containers={containers}
                    panelId={panel.id}
                    groupIndex={groupIndex}
                    onDelete={onDeleteTab}
                    showLinks={showLinks}
                  />
                ))
              ) : (
                group.raw.map((tab: any, ti: number) => (
                  <div className="tab-node" style={{ paddingLeft: `${0 * 16}px` }} key={ti}>
                    <div
                      className="tab-row"
                      style={
                        tab.containerId && containers[tab.containerId]
                          ? { borderLeft: `4px solid ${containers[tab.containerId].color || containers[tab.containerId].theme || "#888"}` }
                          : undefined
                      }
                    >
                      <span className="twistie-spacer" />
                      <a
                        className="favicon"
                        href={tab.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => { if (!tab.url) e.preventDefault(); }}
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${tab.url || ""}`}
                          alt=""
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </a>
                      <div className="meta">
                        <a href={tab.url || "#"} target="_blank" rel="noopener noreferrer" className="title-link" onClick={(e) => { if (!tab.url) e.preventDefault(); }}>
                          <div className="title">{tab.title || tab.url || "(no title)"}</div>
                          {showLinks && tab.url && <div className="url">{tab.url}</div>}
                        </a>
                      </div>
                      {tab.containerId && containers[tab.containerId] && (
                        <div className="container-label">{containers[tab.containerId].name}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (styleMode === "style2") {
    return (
      <div className="single-panel-view">
        <div className="single-panel-body">
          {panels.filter((p: any) => p.id === singlePanelId).map(renderPanel)}
        </div>
      </div>
    );
  }

  return <div className="panels">{panels.map(renderPanel)}</div>;
}