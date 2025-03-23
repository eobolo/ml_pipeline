from fastapi import APIRouter, Request, File, UploadFile, HTTPException, Body
from fastapi.responses import HTMLResponse, JSONResponse
from src.preprocessing import preprocess_train_data, preprocess_test_data, merge_and_split_data
from src.model import train_and_save_model, evaluate_model
from src.prediction import load_and_predict
from src.visualization import generate_plot_data
import os
import shutil
import pandas as pd
import numpy as np
import logging
import time

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

def setup_routes(app, templates):
    @router.get("/", response_class=HTMLResponse)
    async def homepage(request: Request):
        return templates.TemplateResponse("pipeline.html", {"request": request})

    @router.post("/api/predict")
    async def predict(features: list[float]):
        try:
            if len(features) != 4:
                raise ValueError("Exactly 4 features required")
            prediction = load_and_predict(features)
            class_names = ['setosa', 'versicolor', 'virginica']
            predicted_class = class_names[np.argmax(prediction)]
            return {"prediction": predicted_class, "probabilities": prediction.tolist()}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @router.get("/api/visualization")
    async def get_visualization(plot_type: str, features: str = ''):
        try:
            features_list = features.split(',') if features else []
            plot_data = generate_plot_data("data/train/train.csv", plot_type, features_list)
            return plot_data
        except Exception as e:
            logger.error(f"Visualization error: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))

    @router.post("/api/upload")
    async def upload_file(file: UploadFile = File(...)):
        try:
            if not file.filename.endswith('.csv'):
                raise HTTPException(status_code=400, detail="Only CSV files are allowed")

            # Generate unique filename
            original_filename = file.filename
            timestamp = int(time.time())
            unique_filename = f"{timestamp}_{original_filename}"
            file_path = f"data/uploaded/{unique_filename}"

            # Ensure the directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)

            # Save the file
            with open(file_path, "wb") as f:
                f.write(await file.read())

            # Optional: Process the file (e.g., merge and split for Iris dataset)
            train_path, test_path = merge_and_split_data(file_path)
            return {"message": f"Data uploaded and merged into {train_path} and {test_path}"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @router.post("/api/retrain")
    async def retrain():
        try:
            # Backup current model
            if os.path.exists("models/model.keras"):
                shutil.copy("models/model.keras", "models/model_backup.keras")
            old_metrics = evaluate_model(*preprocess_test_data("data/test/test.csv")) if os.path.exists("models/model.keras") else None
            X_train_scaled, y_train = preprocess_train_data("data/train/train.csv")
            train_and_save_model(X_train_scaled, y_train)
            X_test_scaled, y_test = preprocess_test_data("data/test/test.csv")
            new_metrics = evaluate_model(X_test_scaled, y_test)
            return {
                "message": "Model retrained successfully",
                "old_metrics": old_metrics,
                "new_metrics": new_metrics
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # **Updated /api/save_retrain Endpoint**
    @router.post("/api/save_retrain")
    async def save_retrain(save: bool = Body(..., embed=False)):
        print(f"Received save: {save}, type: {type(save)}")
        try:
            if save:
                if os.path.exists("models/model_backup.keras"):
                    os.remove("models/model_backup.keras")
                logger.info("New model saved")
                return {"message": "New model saved"}
            else:
                if os.path.exists("models/model_backup.keras"):
                    shutil.move("models/model_backup.keras", "models/model.keras")
                logger.info("Reverted to previous model")
                return {"message": "Reverted to previous model"}
        except Exception as e:
            logger.error(f"Error in save_retrain: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))

    @router.get("/api/evaluate")
    async def evaluate():
        try:
            X_test_scaled, y_test = preprocess_test_data("data/test/test.csv")
            metrics = evaluate_model(X_test_scaled, y_test)
            return metrics
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Include the router in the app
    app.include_router(router)