# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-13

### Added

- `SankeyChart` panel: a flow diagram from any time-series query. An ordered list of label names
  (`levels`, default `source`, `destination`) gives the columns; every series adds its value to each
  link between consecutive columns, and series that share a link are summed.
- Per-series reduction with any Perses calculation.
- Node ids are prefixed by column, so a name that appears in several columns (A to B and B to A) is
  drawn as separate nodes instead of failing as a cycle.
- `minValue` and `maxLinks` hide small links; a note under the chart says how many were hidden and
  their total.
- Series without one of the level labels, and negative series, are counted in the note instead of
  being dropped silently. An empty label value is shown as `(none)`.
- Horizontal or vertical layout, node alignment (`justify`, `left`, `right`), colour by source node
  or by column from the Perses chart palette, link opacity, formatted tooltips, light and dark
  themes.
- Panel settings editor and CUE schema.
- `Containerfile` for a plugin-only OCI image, for use as a Kubernetes image volume.

Built against the Perses v0.54.0 libraries.

[Unreleased]: https://github.com/astrona-io/perses-plugin-sankey/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/astrona-io/perses-plugin-sankey/releases/tag/v0.1.0
