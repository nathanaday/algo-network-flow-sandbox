# Ford-Fulkerson Algorithm Visualizer

An interactive visualization of the Ford-Fulkerson max-flow algorithm built with React, TypeScript, D3, and Vite. Build flow networks on a dark, IDE-style canvas and step through the algorithm to see augmenting paths, residual graphs, and min-cuts in action.

## Features

- **Interactive graph editor** -- drag-and-drop nodes, create/edit edges with capacities
- **Algorithm playback** -- step forward and backward through Ford-Fulkerson execution
- **Live code display** -- highlighted source tracks the current algorithm step
- **Variables pane** -- inspect flow values, paths, and residual capacities at each step
- **Save/load graphs** -- persist your networks to local storage

## Quickstart

Requires [Node.js](https://nodejs.org/) (v18+).

```bash
git clone <repo-url>
cd ford-fulkerson
npm install
npm run dev
```

Then open the local URL printed in your terminal (default: `http://localhost:5173`).

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the Vite dev server          |
| `npm run build`   | Type-check and build for production|
| `npm run preview` | Preview the production build       |
| `npm run lint`    | Run ESLint                         |
