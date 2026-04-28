# Monte Carlo RL Simulation

This is a Next.js application that interactively demonstrates First-Visit and Every-Visit Monte Carlo prediction algorithms for Reinforcement Learning.

## Features
- Interactive 2x3 Grid World with real-time agent tracking
- Live backward G-calculation visualization
- Side-by-side First-Visit vs Every-Visit Value Function table
- Live convergence charting using Recharts
- Adjustable discount factor (Gamma) and animation speeds

## How to run locally
Because Node.js was not initially found in your environment, you can run this app anytime you install Node.js by simply doing:

```bash
npm install
npm run dev
```
Then open `http://localhost:3000` in your browser.

## How to deploy to Vercel
1. Push this folder (`mc-simulation`) to a new GitHub repository.
2. Go to [Vercel.com](https://vercel.com) and sign in.
3. Click **Add New** -> **Project**.
4. Import your newly created GitHub repository.
5. Vercel will automatically detect that it's a Next.js app. Click **Deploy**.
6. Within seconds, your app will be live on the internet!
