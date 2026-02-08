import React from "react";
import { ParsedSnapshot } from "../types";
import { TabNodeView } from "./TabNodeView";

interface SnapshotViewerProps {
  snapshot: ParsedSnapshot;
}

export function SnapshotViewer({ snapshot }: SnapshotViewerProps) {
  const containers = snapshot.containers ?? {};

  return (
    <div className="panels">
      {snapshot.panels.map((panel) => (
        <section className="panel" key={panel.id}>
          <div className="panel-header">
            <div className="panel-title">{panel.meta?.name ?? panel.id}</div>
          </div>
          <div className="panel-groups">
            {panel.groups.map((group, groupIndex) => (
              <div className="group" key={groupIndex}>
                <div className="group-header">Group {groupIndex + 1}</div>
                <div className="group-body">
                  {group.tree && group.tree.length > 0 ? (
                    group.tree.map((root, rootIndex) => (
                      <TabNodeView
                        key={rootIndex}
                        node={root}
                        depth={0}
                        containers={containers}
                      />
                    ))
                  ) : (
                    // fallback: render raw flat list if parsing produced no tree
                    group.raw.map((tab, ti) => (
                      <div className="tab-node" style={{ paddingLeft: `${0 * 16}px` }} key={ti}>
                        <div className="tab-row">
                          <span className="twistie-spacer" />
                          <div className="favicon">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${tab.url || ""}`}
                              alt=""
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          </div>
                          <div className="meta">
                            <div className="title">{tab.title || tab.url || "(no title)"}</div>
                            {tab.url && <div className="url">{tab.url}</div>}
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
      ))}
    </div>
  );
}