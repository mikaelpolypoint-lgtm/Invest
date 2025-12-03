# Investment Report PI 26.1

This is an interactive report dashboard visualizing the investment plan based on `PI261_Stories.csv`.

## Features

- **Team Overview**: Total Investment (CHF) and Story Points per team.
- **Feature Breakdown**: Investment distribution by Parent Key (Feature) and Team.
- **Sprint Planning**: Detailed breakdown of Story Points and Value per Sprint for each team.
- **Premium Design**: Dark mode, glassmorphism, and interactive charts.

## Setup & Run

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Configuration

Team costs are configured in `src/Dashboard.tsx`:

- **Tungsten**: 900 CHF/SP
- **Neon**: 1460 CHF/SP
- **H1**: 1270 CHF/SP
- **Zn2C**: 1280 CHF/SP
