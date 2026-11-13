import { PanelPlugin } from "@perses-dev/plugin-system";
import { SankeyChartComponent } from "./SankeyChartComponent";
import {
  SankeyChartOptions,
  SankeyChartProps,
  createInitialSankeyChartOptions,
} from "./sankey-chart-types";
import { SankeyChartSettingsEditor } from "./SankeyChartSettingsEditor";

/** Sankey flow diagram: links between label values (one column per label) over a time-series query. */
export const SankeyChart: PanelPlugin<SankeyChartOptions, SankeyChartProps> = {
  PanelComponent: SankeyChartComponent,
  panelOptionsEditorComponents: [
    { label: "Settings", content: SankeyChartSettingsEditor },
  ],
  supportedQueryTypes: ["TimeSeriesQuery"],
  createInitialOptions: createInitialSankeyChartOptions,
};
