import {
  getCalculation,
  CalculationType,
  PanelData,
} from "@perses-dev/plugin-system";
import { TimeSeriesData } from "@perses-dev/spec";

/** Shown for a label that is present but empty. */
export const EMPTY_LABEL = "(none)";

export interface SankeyNode {
  /** `<level index>:<name>`, so the same name in two columns is two nodes and never a cycle. */
  id: string;
  /** Label value as displayed. */
  name: string;
  /** Column (index into the levels). */
  level: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyGraph {
  nodes: SankeyNode[];
  /** Largest first. */
  links: SankeyLink[];
  /** Series with at least one level label missing: not drawn. */
  missingLabel: number;
  /** Level labels that at least one series was missing. */
  missingLabelNames: string[];
  /** Series reduced to a negative value: a Sankey cannot draw them. */
  negative: number;
  /** Links dropped by `minValue` or `maxLinks`, and their total value. */
  hiddenLinks: number;
  hiddenValue: number;
  /** Series that went into the graph. */
  used: number;
}

export interface BuildOptions {
  calculation: CalculationType;
  levels: string[];
  minValue: number;
  maxLinks?: number;
}

export function nodeId(level: number, name: string): string {
  return `${level}:${name}`;
}

/**
 * Reduces every series to one value and adds it to each link between consecutive levels.
 * Series that share a link are summed. Links only ever run from column i to column i + 1, so the
 * graph has no cycles even when a name appears in several columns (A to B and B to A).
 */
export function buildSankey(
  queryResults: Array<PanelData<TimeSeriesData>>,
  opts: BuildOptions,
): SankeyGraph {
  const { levels } = opts;
  const linkValues = new Map<string, SankeyLink>();
  const missingNames = new Set<string>();
  let missingLabel = 0;
  let negative = 0;
  let used = 0;

  for (const result of queryResults) {
    for (const series of result.data.series) {
      const labels = series.labels ?? {};
      const missing = levels.filter((l) => labels[l] === undefined);
      if (missing.length > 0) {
        missingLabel += 1;
        missing.forEach((l) => missingNames.add(l));
        continue;
      }
      const value = getCalculation(series.values, opts.calculation);
      if (value === null || value === undefined || !Number.isFinite(value))
        continue;
      if (value < 0) {
        negative += 1;
        continue;
      }
      used += 1;
      const names = levels.map((l) => labels[l]?.trim() || EMPTY_LABEL);
      for (let i = 0; i + 1 < names.length; i++) {
        const source = nodeId(i, names[i] as string);
        const target = nodeId(i + 1, names[i + 1] as string);
        const key = `${source}\u0000${target}`;
        const link = linkValues.get(key);
        if (link) link.value += value;
        else linkValues.set(key, { source, target, value });
      }
    }
  }

  const all = [...linkValues.values()].sort((a, b) => b.value - a.value);
  // Zero-value links have no width; they are not counted as hidden.
  const nonEmpty = all.filter((l) => l.value > 0);
  const aboveMin = nonEmpty.filter((l) => l.value >= opts.minValue);
  const links =
    opts.maxLinks !== undefined && opts.maxLinks > 0
      ? aboveMin.slice(0, opts.maxLinks)
      : aboveMin;
  const hidden = nonEmpty.length - links.length;
  const hiddenValue =
    nonEmpty.reduce((s, l) => s + l.value, 0) -
    links.reduce((s, l) => s + l.value, 0);

  const nodes = new Map<string, SankeyNode>();
  for (const l of links) {
    for (const id of [l.source, l.target]) {
      if (nodes.has(id)) continue;
      const sep = id.indexOf(":");
      nodes.set(id, {
        id,
        level: Number(id.slice(0, sep)),
        name: id.slice(sep + 1),
      });
    }
  }

  return {
    nodes: [...nodes.values()].sort(
      (a, b) => a.level - b.level || a.name.localeCompare(b.name),
    ),
    links,
    missingLabel,
    missingLabelNames: levels.filter((l) => missingNames.has(l)),
    negative,
    hiddenLinks: hidden,
    hiddenValue,
    used,
  };
}
