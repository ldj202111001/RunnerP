from fastapi import FastAPI

from app.routers import auth, goals, health, plans, runs, stats, users

app = FastAPI(title="Running Planner API", version="0.1.0")

API_PREFIX = "/api/v1"
for module in (health, auth, users, goals, runs, plans, stats):
    app.include_router(module.router, prefix=API_PREFIX)
