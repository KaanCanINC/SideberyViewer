export type SnapshotRaw = {
  id?: string;
  time?: number;
  containers?: Record<string, any>;
  sidebar?: { panels: Record<string, any>; nav: string[] };
  tabs?: any;
  [k: string]: any;
};

export type TabRaw = {
  url?: string;
  title?: string;
  panelId?: string | number;
  containerId?: string;
  lvl?: number;
  folded?: boolean;
  [k: string]: any;
};

export type TabNode = {
  tab: TabRaw;
  children: TabNode[];
  indexInGroup: number;
};

export type ParsedGroup = {
  raw: TabRaw[];
  tree: TabNode[];
};

export type ParsedPanel = {
  id: string;
  meta: any;
  groups: ParsedGroup[];
};

export type ParsedSnapshot = {
  id?: string;
  time?: number;
  containers?: Record<string, any>;
  sidebar?: any;
  panels: ParsedPanel[];
};

export type SnapshotMeta = {
  id: string;
  time: number;
  created_at: string;
};

export type DbRow = {
  id: string;
  time: number;
  rawJson: string;
  created_at: string;
};