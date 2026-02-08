import React, { useState } from "react";
import { TabNode } from "../types";

interface TabNodeViewProps {
  node: TabNode;
  depth: number;
  containers: Record<string, any>;
  panelId?: string;
  groupIndex?: number;
  onDelete?: (
    panelId: string | undefined,
    groupIndex: number | undefined,
    node: TabNode,
    collapsed: boolean
  ) => void;
  showLinks?: boolean;
}

export function TabNodeView({ node, depth, containers, panelId, groupIndex, onDelete, showLinks = true }: TabNodeViewProps) {
  const [collapsed, setCollapsed] = useState<boolean>(!!node.tab.folded);
  const containerLabel = node.tab.containerId
    ? containers[node.tab.containerId]?.name
    : undefined;

  const containerColor =
    node.tab.containerId && containers[node.tab.containerId]
      ? containers[node.tab.containerId].color || containers[node.tab.containerId].theme || "#888"
      : undefined;

  const hasChildren = node.children.length > 0;

  return (
    <div className="tab-node" style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        className="tab-row"
        style={containerColor ? { borderLeft: `4px solid ${containerColor}` } : undefined}
      >
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
        <a
          className="favicon"
          href={node.tab.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!node.tab.url) e.preventDefault();
          }}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${node.tab.url || ""}`}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </a>
            <div className="meta">
              <a
                href={node.tab.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="title-link"
                onClick={(e) => {
                  if (!node.tab.url) e.preventDefault();
                }}
              >
                <div className="title">{node.tab.title || node.tab.url || "(no title)"}</div>
                {showLinks && node.tab.url && <div className="url">{node.tab.url}</div>}
              </a>
            </div>
        {containerLabel && <div className="container-label">{containerLabel}</div>}
        <button
          className="tab-delete"
          title="Delete link"
          onClick={(e) => {
            e.stopPropagation();
            if (!onDelete) return;
            // Smart confirmation to ensure intended behavior
            if ((node.children?.length ?? 0) > 0) {
              if (collapsed) {
                // collapsed: delete subtree
                if (!confirm("Delete this link and ALL its children? This will remove the entire subtree.")) return;
                onDelete(panelId, groupIndex, node, true);
              } else {
                // expanded: ask whether to delete only this or entire subtree
                const keepChildren = confirm(
                  "Keep the children (they will exit the group) ? OK = keep children, Cancel = delete entire subtree."
                );
                onDelete(panelId, groupIndex, node, keepChildren ? false : true);
              }
            } else {
              // no children: simple delete
              if (confirm("Delete this link?")) {
                onDelete(panelId, groupIndex, node, collapsed);
              }
            }
          }}
        >
          🗑
        </button>
      </div>
      {!collapsed && hasChildren && (
        <div className="children">
          {node.children.map((child, i) => (
            <TabNodeView
              key={i}
              node={child}
              depth={depth + 1}
              containers={containers}
              panelId={panelId}
              groupIndex={groupIndex}
              onDelete={onDelete}
              showLinks={showLinks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
