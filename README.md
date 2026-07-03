# Student Performance Analyzer

College MVP for examination analysis. Task 1 contains the frontend UI foundation and a FastAPI backend skeleton only.

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui-style local components
- Recharts

## Backend

- FastAPI project structure
- Excel upload and validation
- Merged subject analysis
- PDF and Excel exports

## Demo Flow

1. Start the backend from `backend` with `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`.
2. Start the frontend from `frontend` with `npm.cmd run dev -- --host 127.0.0.1`.
3. Open `http://127.0.0.1:5173`.
4. Configure settings, upload subject Excel files, review dashboard/reports, then export PDF or Excel from Reports.
