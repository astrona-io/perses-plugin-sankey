import { ReactElement } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Slider,
  Stack,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material";
import {
  FormatControls,
  FormatOptions,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
} from "@perses-dev/components";
import { CalculationSelector } from "@perses-dev/plugin-system";
import {
  ColorBy,
  DEFAULT_COLOR_BY,
  DEFAULT_LEVELS,
  DEFAULT_LINK_OPACITY,
  DEFAULT_NODE_ALIGN,
  DEFAULT_ORIENTATION,
  LABEL_NAME_PATTERN,
  NodeAlign,
  Orientation,
  SankeyChartEditorProps,
  SankeyChartOptions,
} from "./sankey-chart-types";

const DEFAULT_FORMAT: FormatOptions = { unit: "decimal" };

const ICONS = {
  up: "M7 14l5-5 5 5z",
  down: "M7 10l5 5 5-5z",
  remove:
    "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};

function parseNumber(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseCount(raw: string): number | undefined {
  const n = parseNumber(raw);
  return n === undefined || n < 1 ? undefined : Math.floor(n);
}

interface LevelsEditorProps {
  levels: string[];
  onChange: (levels: string[]) => void;
}

/** Ordered list of label names, one column each. */
function LevelsEditor(props: LevelsEditorProps): ReactElement {
  const { levels, onChange } = props;
  const move = (from: number, to: number): void => {
    const next = [...levels];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as string);
    onChange(next);
  };
  const iconButton = (
    label: string,
    path: string,
    onClick: () => void,
    disabled: boolean,
  ): ReactElement => (
    <IconButton
      size="small"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <SvgIcon sx={{ fontSize: 18 }}>
        <path d={path} />
      </SvgIcon>
    </IconButton>
  );

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        One column per label, in order. Each series adds its value to the link
        between every two consecutive columns.
      </Typography>
      {levels.map((level, i) => {
        const invalid = level !== "" && !LABEL_NAME_PATTERN.test(level);
        return (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              label={`Level ${i + 1}`}
              value={level}
              error={invalid || level === ""}
              helperText={
                invalid
                  ? "Letters, digits and _ only"
                  : level === ""
                    ? "Label name required"
                    : undefined
              }
              onChange={(e) => {
                const next = [...levels];
                next[i] = e.target.value.trim();
                onChange(next);
              }}
            />
            {iconButton("Move up", ICONS.up, () => move(i, i - 1), i === 0)}
            {iconButton(
              "Move down",
              ICONS.down,
              () => move(i, i + 1),
              i === levels.length - 1,
            )}
            {iconButton(
              "Remove level",
              ICONS.remove,
              () => onChange(levels.filter((_, j) => j !== i)),
              levels.length <= 2,
            )}
          </Box>
        );
      })}
      <Box>
        <Button size="small" onClick={() => onChange([...levels, ""])}>
          Add level
        </Button>
      </Box>
    </Stack>
  );
}

export function SankeyChartSettingsEditor(
  props: SankeyChartEditorProps,
): ReactElement {
  const { onChange, value } = props;
  const set = (patch: Partial<SankeyChartOptions>): void =>
    onChange({ ...value, ...patch });

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Data">
          {/* Renders its own labelled control. Series that share a link are summed after it. */}
          <CalculationSelector
            value={value.calculation ?? "last"}
            onChange={(calculation) => set({ calculation })}
          />
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Levels">
          <LevelsEditor
            levels={value.levels ?? DEFAULT_LEVELS}
            onChange={(levels) => set({ levels })}
          />
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Format">
          <FormatControls
            value={value.format ?? DEFAULT_FORMAT}
            onChange={(format) => set({ format })}
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Layout">
          <OptionsEditorControl
            label="Orientation"
            control={
              <TextField
                select
                size="small"
                value={value.orientation ?? DEFAULT_ORIENTATION}
                onChange={(e) =>
                  set({ orientation: e.target.value as Orientation })
                }
              >
                <MenuItem value="horizontal">Horizontal</MenuItem>
                <MenuItem value="vertical">Vertical</MenuItem>
              </TextField>
            }
          />
          <OptionsEditorControl
            label="Node alignment"
            description="Where nodes go when links on one side are hidden: justify puts nodes without outgoing links in the last column"
            control={
              <TextField
                select
                size="small"
                value={value.nodeAlign ?? DEFAULT_NODE_ALIGN}
                onChange={(e) =>
                  set({ nodeAlign: e.target.value as NodeAlign })
                }
              >
                <MenuItem value="justify">Justify</MenuItem>
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </TextField>
            }
          />
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Filter">
          <OptionsEditorControl
            label="Min value"
            description="Hide links below this value"
            control={
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 0 }}
                value={value.minValue ?? ""}
                onChange={(e) => {
                  const n = parseNumber(e.target.value);
                  set({
                    minValue: n === undefined ? undefined : Math.max(0, n),
                  });
                }}
              />
            }
          />
          <OptionsEditorControl
            label="Max links"
            description="Keep only the largest links; empty for all"
            control={
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={value.maxLinks ?? ""}
                onChange={(e) => set({ maxLinks: parseCount(e.target.value) })}
              />
            }
          />
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Colour">
          <OptionsEditorControl
            label="Colour by"
            description="Source: each node its own colour, links take their source's. Level: one colour per column"
            control={
              <TextField
                select
                size="small"
                value={value.colorBy ?? DEFAULT_COLOR_BY}
                onChange={(e) => set({ colorBy: e.target.value as ColorBy })}
              >
                <MenuItem value="source">Source</MenuItem>
                <MenuItem value="level">Level</MenuItem>
              </TextField>
            }
          />
          <OptionsEditorControl
            label="Link opacity"
            control={
              <Slider
                size="small"
                min={0.05}
                max={1}
                step={0.05}
                valueLabelDisplay="auto"
                value={value.linkOpacity ?? DEFAULT_LINK_OPACITY}
                onChange={(_, v) =>
                  set({ linkOpacity: Array.isArray(v) ? v[0] : v })
                }
              />
            }
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
