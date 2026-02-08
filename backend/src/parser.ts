import { SnapshotRaw, TabRaw, TabNode, ParsedSnapshot, ParsedPanel } from "./types";

export function parseGroupToTree(group: TabRaw[] = []): TabNode[] {
  const roots: TabNode[] = [];
  const stack: TabNode[] = [];

  for (let i = 0; i < group.length; i++) {
    const tab = group[i];
    const lvl = typeof tab.lvl === "number" ? tab.lvl : 0;
    const node: TabNode = { tab, children: [], indexInGroup: i };

    // Pop stack while current level is less than or equal to stack top level
    while (stack.length && (stack[stack.length - 1].tab.lvl ?? 0) >= lvl) {
      stack.pop();
    }

    // If stack is empty, this is a root node
    if (!stack.length) {
      roots.push(node);
    } else {
      // Otherwise, add as child to stack top
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return roots;
}

export function buildParsedSnapshot(snapshot: SnapshotRaw): ParsedSnapshot {
  const panels = snapshot.sidebar?.panels ?? {};
  const nav: string[] = snapshot.sidebar?.nav ?? [];
  const windows = snapshot.tabs ?? [];

  const panelsMap: Record<string, ParsedPanel> = {};

  // Helper: normalize a raw group value into an array of TabRaw
  const normalizeGroup = (g: any): TabRaw[] => {
    if (!g) return [];
    // If g is an array of tabs
    if (Array.isArray(g) && g.length && typeof g[0] === "object" && !Array.isArray(g[0])) {
      return g as TabRaw[];
    }
    // If g is already a single tab object
    if (typeof g === "object" && !Array.isArray(g) && g.url !== undefined) {
      return [g as TabRaw];
    }
    // If g is an array whose first element is an array (extra nesting), unwrap
    if (Array.isArray(g) && g.length && Array.isArray(g[0])) {
      return (g[0] as TabRaw[]) ?? [];
    }
    return [];
  };

  // Iterate windows -> panels -> groups, but be resilient to different nesting shapes
  for (const win of windows as any[]) {
    // each win may be an array of panelGroups OR a single panelGroups object
    const panelGroupsList = Array.isArray(win) ? win : [win];

    for (const panelGroups of panelGroupsList) {
      // panelGroups may be:
      // - an array of groups (each group could be an array of tabs or a single tab object)
      // - a single group (array of tab objects)
      // - a nested structure
      if (Array.isArray(panelGroups)) {
        // If panelGroups looks like a single group (array of tab objects), treat it as one group
        if (panelGroups.length > 0 && typeof panelGroups[0] === "object" && !Array.isArray(panelGroups[0])) {
          const groupTabs = normalizeGroup(panelGroups);
          if (!groupTabs.length) continue;
          const firstTab = groupTabs[0];
          const panelId = String(firstTab?.panelId ?? "__unknown__");
          if (!panelsMap[panelId]) {
            panelsMap[panelId] = {
              id: panelId,
              meta: panels[panelId] ?? { id: panelId },
              groups: [],
            };
          }
          panelsMap[panelId].groups.push({
            raw: groupTabs,
            tree: parseGroupToTree(groupTabs),
          });
        } else {
          // Otherwise it's an array of groups; iterate and normalize each entry
          for (const maybeGroup of panelGroups) {
            const groupTabs = normalizeGroup(maybeGroup);
            if (!groupTabs.length) continue;
            const firstTab = groupTabs[0];
            const panelId = String(firstTab?.panelId ?? "__unknown__");
            if (!panelsMap[panelId]) {
              panelsMap[panelId] = {
                id: panelId,
                meta: panels[panelId] ?? { id: panelId },
                groups: [],
              };
            }
            panelsMap[panelId].groups.push({
              raw: groupTabs,
              tree: parseGroupToTree(groupTabs),
            });
          }
        }
      } else {
        // single group object
        const groupTabs = normalizeGroup(panelGroups);
        if (!groupTabs.length) continue;
        const firstTab = groupTabs[0];
        const panelId = String(firstTab?.panelId ?? "__unknown__");
        if (!panelsMap[panelId]) {
          panelsMap[panelId] = {
            id: panelId,
            meta: panels[panelId] ?? { id: panelId },
            groups: [],
          };
        }
        panelsMap[panelId].groups.push({
          raw: groupTabs,
          tree: parseGroupToTree(groupTabs),
        });
      }
    }
  }

  // Respect sidebar.nav ordering when possible
  const resultPanels: ParsedPanel[] = [];
  for (const pid of nav) {
    if (panelsMap[pid]) resultPanels.push(panelsMap[pid]);
  }
  for (const pid of Object.keys(panelsMap)) {
    if (!nav.includes(pid)) resultPanels.push(panelsMap[pid]);
  }

  return {
    id: snapshot.id,
    time: snapshot.time,
    containers: snapshot.containers ?? {},
    sidebar: snapshot.sidebar ?? {},
    panels: resultPanels,
  };
}
