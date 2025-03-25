# routes.py
from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from pydantic import BaseModel
from typing import List, Optional
from src.visualization import generate_plot_data, get_available_features, generate_confusion_matrix_data, all_columns_names, categorical_name_mapping
from src.prediction import load_and_predict
from src.preprocessing import merge_and_split_data, preprocess_train_data, preprocess_test_data
from src.model import train_and_save_model, retrain_and_save_model, evaluate_model
from src.database import db  # Import database module
import shutil
import os
import time
import joblib
import pandas as pd

router = APIRouter()

# Grade meaning mapping
GRADE_MEANINGS = {
    'Fail': 'Fail',
    'DD': 'Poor',
    'DC': 'Poor',
    'CC': 'Average',
    'CB': 'Average',
    'BB': 'Good',
    'BA': 'Good',
    'AA': 'Excellent'
}

# Default data paths
TRAIN_DATA_PATH = "data/train/train.csv"
TEST_DATA_PATH = "data/test/test.csv"
UPLOADED_DATA_DIR = "data/uploaded"

def get_data_source(train_path: str = TRAIN_DATA_PATH, test_path: str = TEST_DATA_PATH):
    """Get train and test data from MongoDB if available, else from files."""
    if db.is_connected():
        train_data = db.load_from_collection("train")
        test_data = db.load_from_collection("test")
        if train_data is not None and not train_data.empty and test_data is not None and not test_data.empty:
            return train_data, test_data
    # Fallback to files
    train_data = pd.read_csv(train_path) if os.path.exists(train_path) else pd.DataFrame(columns=all_columns_names + ['GRADE'])
    test_data = pd.read_csv(test_path) if os.path.exists(test_path) else pd.DataFrame(columns=all_columns_names + ['GRADE'])
    return train_data, test_data

# Endpoint to get available features
@router.get("/features")
def get_features():
    mapping_path = "models/categorical_mapping.pkl"
    if not os.path.exists(mapping_path):
        raise HTTPException(status_code=404, detail="Categorical mapping file not found")
    try:
        with open(mapping_path, "rb") as f:
            categorical_mapping = joblib.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading mapping: {str(e)}")
    
    technical_features = [col for col in all_columns_names if col not in ["STUDENTID", "EXP_GPA", "GRADE"]]
    features = []
    for feature in technical_features:
        if feature in categorical_mapping:
            friendly_name = categorical_name_mapping.get(feature, feature)
            mapping = categorical_mapping[feature]
            options = [{"label": mapping[i], "value": i} for i in sorted(mapping.keys())]
            features.append({"feature": friendly_name, "options": options})
    
    return {"features": features}

# Prediction endpoint
class PredictionInput(BaseModel):
    features: List[int]

@router.post("/predict")
def predict(input: PredictionInput):
    try:
        prediction = load_and_predict(input.features)
        return {"prediction": prediction, "meaning": GRADE_MEANINGS.get(prediction, "Unknown")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Default visualizations endpoint
@router.get("/visualizations/default")
def get_default_visualizations():
    default_plots = [
        {
            "plot_type": "histogram",
            "features": ["Output Grade"],
            "title": "Distribution of Grades",
            "interpretation": (
                "This histogram displays the frequency of each grade in the dataset, providing insight into the overall "
                "grade distribution and highlighting any skewness or outliers."
            )
        },
        {
            "plot_type": "scatter",
            "features": ["Weekly Study Hours", "Output Grade"],
            "title": "Weekly Study Hours vs. Grade",
            "interpretation": (
                "This scatter plot examines the relationship between weekly study hours and final grades. A positive "
                "trend may indicate that more study hours correlate with higher grades."
            )
        },
        {
            "plot_type": "boxplot",
            "features": ["Mother's Education"],
            "title": "Mother's Education Impact on Grades",
            "interpretation": (
                "This box plot shows grade distributions across different levels of mother's education, revealing "
                "potential influences of parental education on student performance."
            )
        },
        {
            "plot_type": "barplot",
            "features": ["Class Attendance"],
            "title": "Class Attendance vs. Average Grade",
            "interpretation": (
                "This bar chart displays average grades by attendance level, illustrating the impact of regular class "
                "attendance on academic success."
            )
        }
    ]
    visualizations = []
    train_data, _ = get_data_source()
    temp_path = "temp_train.csv"
    train_data.to_csv(temp_path, index=False)
    
    for plot in default_plots:
        try:
            plot_data = generate_plot_data(
                data_path=temp_path,
                plot_type=plot["plot_type"],
                features=plot["features"]
            )
            visualizations.append({
                "title": plot["title"],
                "plot_data": plot_data,
                "interpretation": plot["interpretation"]
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating default visualization: {str(e)}")
    os.remove(temp_path)
    return visualizations

# Custom visualization endpoint
class CustomVisualizationInput(BaseModel):
    plot_type: str
    features: Optional[List[str]] = None

@router.post("/visualizations/custom")
def get_custom_visualization(input: CustomVisualizationInput):
    available_plot_types = ["scatter", "boxplot", "barplot", "histogram", "pairplot"]
    if input.plot_type not in available_plot_types:
        raise HTTPException(status_code=400, detail=f"Invalid plot_type. Must be one of {available_plot_types}")
    
    available_features = get_available_features()
    features = input.features or available_features
    for feature in features:
        if feature not in available_features:
            raise HTTPException(status_code=400, detail=f"Invalid feature: {feature}")
    
    train_data, _ = get_data_source()
    temp_path = "temp_train.csv"
    train_data.to_csv(temp_path, index=False)
    
    try:
        plot_data = generate_plot_data(
            data_path=temp_path,
            plot_type=input.plot_type,
            features=features
        )
        os.remove(temp_path)
        return {"plot_data": plot_data}
    except Exception as e:
        os.remove(temp_path) if os.path.exists(temp_path) else None
        raise HTTPException(status_code=500, detail=f"Error generating custom visualization: {str(e)}")

# Upload endpoint
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV file, save to MongoDB, merge with existing data, and split into train/test sets."""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")

        # Save uploaded file temporarily
        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOADED_DATA_DIR, unique_filename)
        os.makedirs(UPLOADED_DATA_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Validate and split data
        train_path, test_path = merge_and_split_data(file_path, TRAIN_DATA_PATH, TEST_DATA_PATH)
        os.remove(file_path)

        # Save to MongoDB if connected
        if db.is_connected():
            train_data = pd.read_csv(train_path)
            test_data = pd.read_csv(test_path)
            db.clear_collection("train")
            db.clear_collection("test")
            db.save_to_collection(train_data, "train")
            db.save_to_collection(test_data, "test")

        return {"message": f"Data uploaded, merged, and split into {train_path} and {test_path}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error uploading file: {str(e)}")

# Retrain endpoint
@router.post("/retrain")
async def retrain():
    """Retrain the model using data from MongoDB or files."""
    try:
        model_path = "models/model.keras"
        backup_path = "models/model_backup.keras"
        old_metrics = None

        # Get test data
        _, test_data = get_data_source()
        temp_test_path = "temp_test.csv"
        test_data.to_csv(temp_test_path, index=False)

        if os.path.exists(model_path):
            shutil.copy(model_path, backup_path)
            X_test_scaled_old, y_test_onehot_old = preprocess_test_data(temp_test_path)
            old_metrics = evaluate_model(X_test_scaled_old, y_test_onehot_old)

        # Get train data
        train_data, _ = get_data_source()
        temp_train_path = "temp_train.csv"
        train_data.to_csv(temp_train_path, index=False)

        X_train_scaled, y_train_onehot, X_val_scaled, y_val_onehot = preprocess_train_data(temp_train_path)

        if os.path.exists(model_path):
            retrain_and_save_model(X_train_scaled, y_train_onehot, X_val=X_val_scaled, y_val=y_val_onehot)
        else:
            train_and_save_model(X_train_scaled, y_train_onehot, X_val=X_val_scaled, y_val=y_val_onehot)

        X_test_scaled_new, y_test_onehot_new = preprocess_test_data(temp_test_path)
        new_metrics = evaluate_model(X_test_scaled_new, y_test_onehot_new)

        os.remove(temp_train_path)
        os.remove(temp_test_path)

        return {
            "message": "Model retrained successfully",
            "old_metrics": old_metrics,
            "new_metrics": new_metrics
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Evaluate endpoint
@router.get("/evaluate")
async def evaluate():
    """Evaluate the current model on the test data from MongoDB or files."""
    try:
        _, test_data = get_data_source()
        temp_test_path = "temp_test.csv"
        test_data.to_csv(temp_test_path, index=False)

        X_test_scaled, y_test_onehot = preprocess_test_data(temp_test_path)
        metrics = evaluate_model(X_test_scaled, y_test_onehot)
        y_true = metrics.pop('y_true')
        y_pred = metrics.pop('y_pred')
        confusion_data = generate_confusion_matrix_data(y_true, y_pred)

        os.remove(temp_test_path)
        return {
            "metrics": metrics,
            "confusion_matrix": confusion_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Save retrain endpoint
@router.post("/save_retrain")
async def save_retrain(save: bool = Body(..., embed=False)):
    try:
        backup_path = "models/model_backup.keras"
        model_path = "models/model.keras"
        if save:
            if os.path.exists(backup_path):
                os.remove(backup_path)
            return {"message": "New model saved"}
        else:
            if os.path.exists(backup_path):
                shutil.move(backup_path, model_path)
            return {"message": "Reverted to previous model"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))