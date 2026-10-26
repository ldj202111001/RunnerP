from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import auth, goals, health, plans, runs, stats, users
from app.services import predictor


@asynccontextmanager
async def lifespan(_: FastAPI):
    predictor.load()
    yield


app = FastAPI(title="Running Planner API", version="0.1.0", lifespan=lifespan)

API_PREFIX = "/api/v1"
for module in (health, auth, users, goals, runs, plans, stats):
    app.include_router(module.router, prefix=API_PREFIX)
