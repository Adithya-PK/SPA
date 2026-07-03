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

1. Install Python dependencies from `backend` with `pip install -r requirements.txt`.
2. Install frontend dependencies from `frontend` with `npm install`.
3. Double-click `run_project.bat`, or run the backend and frontend scripts separately.
4. Open `http://127.0.0.1:5173`.
5. Configure semester subjects and section faculty in Settings.
6. Upload subject Excel files, review Dashboard and Reports, then export PDF or Excel from Reports.

## Windows Start Scripts

- `start_backend.bat` starts FastAPI at `http://127.0.0.1:8001`.
- `start_frontend.bat` starts Vite at `http://127.0.0.1:5173`.
- `run_project.bat` opens both servers in separate command windows.

## Local Data

The application remains file-based. Configuration is stored under `backend/data/`, while uploads and processed analysis are stored under `backend/app/storage/`. These folders are created automatically when missing.
