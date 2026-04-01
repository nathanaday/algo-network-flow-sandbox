# Ford-Fulkerson Algorithm Visualizer

An interactive visualization of the Ford-Fulkerson max-flow algorithm built with React, TypeScript, D3, and Vite. Build flow networks on a dark, IDE-style canvas and step through the algorithm to see augmenting paths, residual graphs, and min-cuts in action.

---
<img width="800" alt="Screenshot 2026-04-01 at 10 27 37 AM" src="https://github.com/user-attachments/assets/7ce3ea03-59a4-490c-a3c7-dfeaade8534a" />

<img width="800" alt="Screenshot 2026-04-01 at 10 27 55 AM" src="https://github.com/user-attachments/assets/16a770c8-e200-4316-b598-9aa464e95c2e" />

<img width="800" alt="Screenshot 2026-04-01 at 10 28 47 AM" src="https://github.com/user-attachments/assets/9f64d1dc-c176-461e-9a6c-4c603a536b69" />


---


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
