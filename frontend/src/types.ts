export type SnapshotMeta = {
  id: string;
  time: number;
  created_at?: string;
  previewTitle?: string;
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

export type PanelParsed = {
  id: string;
  meta: any;
  groups: ParsedGroup[];
};

export type ParsedSnapshot = {
  id?: string;
  time?: number;
  containers?: Record<string, any>;
  sidebar?: any;
  panels: PanelParsed[];
};