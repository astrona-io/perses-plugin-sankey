package model

import (
	"github.com/perses/shared/cue/common"
)

// A Prometheus label name.
#labelName: string & =~"^[a-zA-Z_][a-zA-Z0-9_]*$"

kind: "SankeyChart"
spec: close({
	// How each series is reduced to one value (last, sum, mean, ...).
	calculation: common.#calculation
	// Ordered label names, one column each (at least two). Every series adds its value to each
	// link between consecutive columns. Default ["source", "destination"].
	levels?: [#labelName, #labelName, ...#labelName]
	format?: common.#format
	// Flow direction. Default horizontal.
	orientation?: "horizontal" | "vertical"
	// Where nodes go when links on one side are hidden. Default justify.
	nodeAlign?: "justify" | "left" | "right"
	// Links below this value are hidden. Default 0.
	minValue?: number & >=0
	// Keep only the largest N links. Unset: no limit.
	maxLinks?: int & >=1
	// source: every node its own palette color, links take their source's. level: one color per column.
	colorBy?: "source" | "level"
	// Link opacity. Default 0.4.
	linkOpacity?: number & >=0 & <=1
})
