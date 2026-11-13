import { TimeSeriesData } from "@perses-dev/spec";
import {
  CalculationType,
  OptionsEditorProps,
  PanelProps,
} from "@perses-dev/plugin-system";
import { FormatOptions } from "@perses-dev/components";

export type QueryData = TimeSeriesData;

export type SankeyChartProps = PanelProps<SankeyChartOptions, QueryData>;
export type SankeyChartEditorProps = OptionsEditorProps<SankeyChartOptions>;

export type Orientation = "horizontal" | "vertical";
export type NodeAlign = "justify" | "left" | "right";
/** `source`: every node its own palette color, links take their source's. `level`: one color per column. */
export type ColorBy = "source" | "level";

export interface SankeyChartOptions {
  /** How each series is reduced to one value. */
  calculation: CalculationType;
  /**
   * Ordered label names, one column each. Every series adds its value to each link between
   * consecutive columns. At least two. Default `["source", "destination"]`.
   */
  levels?: string[];
  format?: FormatOptions;
  /** Flow direction: left to right, or top to bottom. Default `horizontal`. */
  orientation?: Orientation;
  /** Where nodes go when links on one side are hidden (`justify`: nodes without outgoing links in the last column). Default `justify`. */
  nodeAlign?: NodeAlign;
  /** Links below this value are hidden. Default 0 (only empty links are hidden). */
  minValue?: number;
  /** Keep only the largest N links. Unset: no limit. */
  maxLinks?: number;
  /** Default `source`. */
  colorBy?: ColorBy;
  /** Link opacity, 0 to 1. Default 0.4. */
  linkOpacity?: number;
}

export const DEFAULT_LEVELS = ["source", "destination"];
export const DEFAULT_ORIENTATION: Orientation = "horizontal";
export const DEFAULT_NODE_ALIGN: NodeAlign = "justify";
export const DEFAULT_COLOR_BY: ColorBy = "source";
export const DEFAULT_LINK_OPACITY = 0.4;
export const DEFAULT_MAX_LINKS = 50;
/** Prometheus label names; the CUE schema enforces the same pattern. */
export const LABEL_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function createInitialSankeyChartOptions(): SankeyChartOptions {
  return {
    calculation: "last",
    levels: [...DEFAULT_LEVELS],
    format: { unit: "decimal" },
    orientation: DEFAULT_ORIENTATION,
    nodeAlign: DEFAULT_NODE_ALIGN,
    maxLinks: DEFAULT_MAX_LINKS,
    colorBy: DEFAULT_COLOR_BY,
    linkOpacity: DEFAULT_LINK_OPACITY,
  };
}
