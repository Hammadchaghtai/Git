# GRC Platform — Frontend

React 19 + Vite 8 + Tailwind CSS 4 single-page application for the GRC Compliance Management Platform.

See the [main README](../README.md) at the project root for full documentation, setup instructions, and architecture details.

## Development

The frontend runs inside Docker via `docker compose up`. To run locally for development:

```bash
npm install
npm run dev
```

The dev server starts on [http://localhost:5173](http://localhost:5173) and proxies API requests to the Django backend at `localhost:8000`.

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` | UI framework |
| `react-router-dom` | Client-side routing |
| `axios` | HTTP client with JWT interceptors |
| `tailwindcss` | Utility-first CSS |
| `recharts` | Dashboard charts and graphs |
| `lucide-react` | Icon library |
| `jspdf` / `jspdf-autotable` | Client-side PDF generation |
