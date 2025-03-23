from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from src.api.routes import router, setup_routes
import os

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="templates")

# Include API routes with templates
setup_routes(app, templates)

# Ensure upload directory exists
os.makedirs("data/uploaded", exist_ok=True)