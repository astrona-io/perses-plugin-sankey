import { ReactElement, useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import {
  NoDataOverlay,
  TextOverlay,
  formatValue,
  useChartsTheme,
} from "@perses-dev/components";
import type { EChartsOption } from "echarts";
import {
  DEFAULT_COLOR_BY,
  DEFAULT_LEVELS,
  DEFAULT_LINK_OPACITY,
  DEFAULT_NODE_ALIGN,
  DEFAULT_ORIENTATION,
  SankeyChartProps,
} from "./sankey-chart-types";
import { SankeyNode, buildSankey } from "./data";
import { SankeyCanvas } from "./SankeyCanvas";

const DEFAULT_FORMAT = { unit: "decimal" as const };
const FOOTNOTE_HEIGHT = 18;
const NODE_WIDTH = 12;
const NODE_GAP = 8;
const MARGIN = 8;

interface NodeDatum {
  id: string;
  name: string;
  level: number;
}

interface TooltipParams {
  dataType?: "node" | "edge";
  value?: number;
  data?: NodeDatum & { source?: string; target?: string };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Stable palette index for a name, so a namespace keeps its colour across refreshes and columns. */
function hashIndex(name: string, size: number): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) % size;
}

function quote(names: string[]): string {
  return names.map((n) => `"${n}"`).join(", ");
}

export function SankeyChartComponent(
  props: SankeyChartProps,
): ReactElement | null {
  const { queryResults, spec, contentDimensions } = props;
  const muiTheme = useTheme();
  const chartsTheme = useChartsTheme();

  const calculation = spec.calculation ?? "last";
  const levels = useMemo(() => {
    const configured = (spec.levels ?? DEFAULT_LEVELS).filter(
      (l) => l.trim() !== "",
    );
    return configured.length > 0 ? configured : DEFAULT_LEVELS;
  }, [spec.levels]);
  const format = spec.format ?? DEFAULT_FORMAT;
  const orientation = spec.orientation ?? DEFAULT_ORIENTATION;
  const nodeAlign = spec.nodeAlign ?? DEFAULT_NODE_ALIGN;
  const colorBy = spec.colorBy ?? DEFAULT_COLOR_BY;
  const linkOpacity = spec.linkOpacity ?? DEFAULT_LINK_OPACITY;
  const minValue = spec.minValue ?? 0;
  const maxLinks = spec.maxLinks;

  const graph = useMemo(
    () =>
      buildSankey(queryResults, { calculation, levels, minValue, maxLinks }),
    [queryResults, calculation, levels, minValue, maxLinks],
  );

  const palette = useMemo(() => {
    const themed = chartsTheme.echartsTheme.color;
    if (Array.isArray(themed) && themed.length > 0)
      return themed.filter((c): c is string => typeof c === "string");
    const p = muiTheme.palette;
    return [
      p.primary.main,
      p.secondary.main,
      p.success.main,
      p.warning.main,
      p.info.main,
      p.error.main,
    ];
  }, [chartsTheme, muiTheme]);

  const footnote = useMemo(() => {
    const fmt = (v: number): string => formatValue(v, format);
    const parts: string[] = [];
    if (graph.hiddenLinks > 0)
      parts.push(
        `${graph.hiddenLinks} smaller link${graph.hiddenLinks === 1 ? "" : "s"} hidden (${fmt(graph.hiddenValue)})`,
      );
    if (graph.missingLabel > 0)
      parts.push(
        `${graph.missingLabel} series without ${quote(graph.missingLabelNames)} not shown`,
      );
    if (graph.negative > 0)
      parts.push(`${graph.negative} negative series not shown`);
    return parts.join(" · ");
  }, [graph, format]);

  const option = useMemo((): EChartsOption => {
    const text = muiTheme.palette.text;
    const paper = muiTheme.palette.background.paper;
    const fmt = (v: number): string => formatValue(v, format);
    const horizontal = orientation === "horizontal";
    const width = contentDimensions?.width ?? 0;
    const lastLevel = Math.max(0, ...graph.nodes.map((n) => n.level));
    const columns = Math.max(1, lastLevel);
    // Room for a label beside a node: a share of the gap between two columns.
    const labelWidth = Math.max(
      40,
      Math.floor(
        horizontal ? ((width - 2 * MARGIN) / columns) * 0.45 : width / 6,
      ),
    );

    const colorOf = (n: SankeyNode): string => {
      const size = palette.length || 1;
      const index =
        colorBy === "level" ? n.level % size : hashIndex(n.name, size);
      return palette[index] ?? text.primary;
    };
    const labelPosition = (n: SankeyNode): string => {
      const last = n.level === lastLevel && lastLevel > 0;
      if (horizontal) return last ? "left" : "right";
      return last ? "top" : "bottom";
    };
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const levelOf = (id?: string): string => {
      const n = id ? byId.get(id) : undefined;
      return n ? (levels[n.level] ?? "") : "";
    };
    const nameOf = (id?: string): string =>
      (id ? byId.get(id)?.name : undefined) ?? "";

    return {
      animation: false,
      tooltip: {
        trigger: "item",
        confine: true,
        formatter: (raw: unknown): string => {
          const p = raw as TooltipParams;
          const value = escapeHtml(fmt(p.value ?? 0));
          if (p.dataType === "edge") {
            const src = p.data?.source;
            const dst = p.data?.target;
            return (
              `${escapeHtml(levelOf(src))}: ${escapeHtml(nameOf(src))}<br/>` +
              `&rarr; ${escapeHtml(levelOf(dst))}: ${escapeHtml(nameOf(dst))}<br/>` +
              `<b>${value}</b>`
            );
          }
          return `${escapeHtml(levelOf(p.data?.id))}: ${escapeHtml(p.data?.name ?? "")}<br/><b>${value}</b>`;
        },
      },
      series: [
        {
          type: "sankey",
          orient: orientation,
          nodeAlign,
          left: MARGIN,
          right: MARGIN,
          top: horizontal ? MARGIN : MARGIN + 16,
          bottom: (footnote ? FOOTNOTE_HEIGHT : 0) + (horizontal ? 8 : 24),
          nodeWidth: NODE_WIDTH,
          nodeGap: NODE_GAP,
          layoutIterations: 32,
          draggable: false,
          emphasis: { focus: "adjacency" },
          data: graph.nodes.map((n) => ({
            id: n.id,
            name: n.name,
            level: n.level,
            itemStyle: { color: colorOf(n), borderWidth: 0 },
            label: { position: labelPosition(n) },
          })) as never,
          links: graph.links.map((l) => ({ ...l })),
          lineStyle: { color: "source", opacity: linkOpacity, curveness: 0.5 },
          label: {
            color: text.primary,
            fontSize: 11,
            textBorderColor: paper,
            textBorderWidth: 2,
            width: labelWidth,
            overflow: "truncate",
            formatter: (p: { name?: string }) => p.name ?? "",
          },
        },
      ],
    };
  }, [
    graph,
    levels,
    palette,
    colorBy,
    linkOpacity,
    orientation,
    nodeAlign,
    format,
    footnote,
    muiTheme,
    contentDimensions,
  ]);

  if (!contentDimensions) return null;

  let empty: ReactElement | null = null;
  if (graph.links.length === 0) {
    if (levels.length < 2)
      empty = <TextOverlay message="Set at least two levels" />;
    else if (graph.used === 0 && graph.missingLabel > 0)
      empty = (
        <TextOverlay
          message={`No series with the labels ${quote(graph.missingLabelNames)}`}
        />
      );
    else empty = <NoDataOverlay resource="data" />;
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: contentDimensions.width,
        height: contentDimensions.height,
      }}
    >
      {empty ? (
        <Box sx={{ position: "absolute", inset: 0 }}>{empty}</Box>
      ) : (
        <SankeyCanvas
          option={option}
          theme={chartsTheme.echartsTheme}
          width={contentDimensions.width}
          height={contentDimensions.height}
        />
      )}
      {footnote ? (
        <Typography
          variant="caption"
          noWrap
          title={footnote}
          sx={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 0,
            color: "text.secondary",
            textAlign: "center",
          }}
        >
          {footnote}
        </Typography>
      ) : null}
    </Box>
  );
}
