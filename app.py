from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from src.api.routes import router
import uvicorn
import os

app = FastAPI(title="pipeline-app", version="0.1")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up templates
templates = Jinja2Templates(directory="template")

# Include the API router
app.include_router(router, prefix="/api")

# Serve the HTML page
@app.get("/", include_in_schema=False)
def index(request: Request):
    return templates.TemplateResponse("pipeline.html", {"request": request})

# Ensure upload directory exists (optional for now)
os.makedirs("data/uploaded", exist_ok=True)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)