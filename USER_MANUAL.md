# User manual

## C++ CLI

Launch with `./sns data`. You get a menu:

```
1) Find routes
2) Compare algorithms
3) Show statistics
0) Quit
```

**Find routes** prompts for:
- source city name (case-insensitive)
- destination city name
- optimisation criterion: `distance`, `time`, `fuel`, `toll`, `traffic`,
  `safest`, `scenic`, `balanced` (default)
- traffic scenario: `morning`, `afternoon` (default), `evening`, `night`,
  `weekend`, `festival`, `rain`, `accident`, `construction`, `vip_movement`

It prints up to 5 routes with distance, time, fuel, toll, avg traffic, avg
risk, segment count, and score labels.

**Compare algorithms** runs Dijkstra, Bellman-Ford, A*, BFS, DFS, and
Floyd-Warshall on the same source/destination and prints a table with cost,
node visits, execution time (ms), memory (KB), complexity, and whether a path
was found.

**Show statistics** prints total cities, total roads, average distance / time
/ fuel / traffic, the most connected city, and the graph density.

## Web dashboard

- Type source and destination — the input auto-completes over all 1000 cities.
- Choose optimisation criterion and traffic scenario.
- **Find routes**: renders up to 5 routes, each with a colour, path preview,
  score, and label badges (Best / Fastest / Cheapest / Shortest / Least
  Traffic / Least Toll). All 5 paths are drawn on the map simultaneously.
- **Compare algorithms**: fills the comparison table and animates the first
  successful algorithm's node visits on the map.
- **Star**: save the current source/destination pair to favourites.
- **Print icon**: opens a printable route report.
- **Export CSV**: downloads the comparison table.
- **Admin panel**: add a new city; changes are stored in localStorage as an
  overlay and applied on every reload until you press "Reset overlay".

### Keyboard shortcuts

| Combo | Action |
| --- | --- |
| Ctrl / ⌘ + Enter | Find routes |
| Ctrl / ⌘ + K | Focus source input |
