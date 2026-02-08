import React, { useState } from "react";
import { TabNode } from "../types";

interface TabNodeViewProps {
  node: TabNode;
  depth: number;
  containers: Record<string, any>;
}

export function TabNodeView({ node, depth, containers }: TabNodeViewProps) {
  const [collapsed, setCollapsed] = useState<boolean>(!!node.tab.folded);
  const containerLabel = node.tab.containerId
    ? containers[node.tab.containerId]?.name
    : undefined;

  const hasChildren = node.children.length > 0;

  return (
    <div className="tab-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div className="tab-row">
        {hasChildren ? (
          <button
            className="twistie"
            onClick={() => setCollapsed((s) => !s)}
            aria-label="toggle"
          >
            {collapsed ? "▶" : "▼"}
          </button>
        ) : (
          <span className="twistie-spacer" />
        )}
        <div className="favicon">
          <img
            src={`https://www.google.com/s2/favicons?domain=${node.tab.url || ""}`}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
        <div className="meta">
          <div className="title">{node.tab.title || node.tab.url || "(no title)"}</div>
          {node.tab.url && <div className="url">{node.tab.url}</div>}
        </div>
        {containerLabel && <div className="container-label">{containerLabel}</div>}
      </div>
      {!collapsed && hasChildren && (
        <div className="children">
          {node.children.map((child, i) => (
            <TabNodeView key={i} node={child} depth={depth + 1} containers={containers} />
          ))}
        </div>
      )}
    </div>
  );
}