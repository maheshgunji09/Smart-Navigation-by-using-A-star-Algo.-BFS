# Installation

## Prerequisites

- **C++ compiler** with C++17 support (g++ ≥ 7 or clang++ ≥ 5)
- **GNU Make**
- Any modern web browser for the web dashboard

## Building the C++ backend

```bash
cd SmartNavigationSystem
make
./sns data
```

The `data/` directory ships with `cities.txt`, `roads.txt`, `traffic.txt`, and
`config.txt`. The binary loads them at startup and exposes an interactive menu.

To rebuild after edits:

```bash
make clean && make
```

## Running the web dashboard

The web dashboard has zero build step — it is plain HTML, CSS, and ES modules.
Any static file server will do:

```bash
# Python 3
python3 -m http.server -d public/app 8080
# then open http://localhost:8080

# or Node
npx serve public/app
```

Opening `index.html` directly via `file://` will not work because browsers
block ES-module imports from `file://` origins.

## Regenerating the dataset

`scripts/gen-dataset.mjs` produces both `data/*.txt` (for C++) and
`public/app/js/data.js` (for the web dashboard) from a shared seed list of
real Indian cities. Run:

```bash
node scripts/gen-dataset.mjs
```
