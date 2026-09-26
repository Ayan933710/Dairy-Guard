# NANDI Frontend

The frontend interface for the NANDI platform, built to be accessible, responsive, and highly visual. It allows farmers to view real-time telemetry from their cattle and allows veterinarians/administrators to manage cooperatives.

## Tech Stack

- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS + Vanilla CSS for dynamic aesthetic overrides
- **Routing:** React Router v6
- **State & Context:** React Context API (AuthContext)
- **Icons:** Lucide React

## Key Features

- **Dynamic Dark/Light Mode:** Full integration of a custom Tailwind dark mode, heavily customized with semantic colors to maintain readability.
- **Role-Based Views:** UI dynamically changes based on `role` (Farmer vs. Cooperative Admin vs. Veterinarian).
- **Real-Time Indicators:** Visual badges for predicted infections, such as quarter-level Subclinical Mastitis indicators directly mapping to LF, RF, LR, RR lobes.
- **Predictive Dashboards:** Integrated charts and telemetry feeds for cow temperature, rumination delta, and shed THI.

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Variables:**
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```
   For production deployments (EC2 / Docker Compose), set the environment variables to target your server's IP address or domain on port `80` (where Nginx proxies `/api` and `/socket.io`):
   ```env
   VITE_API_URL=http://<YOUR_EC2_PUBLIC_IP>:5000/api
   VITE_SOCKET_URL=http://<YOUR_EC2_PUBLIC_IP>:5000
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:5173`.

4. **Production Build:**
   ```bash
   npm run build
   ```
   The static files will be generated in the `dist` folder.
