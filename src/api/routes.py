from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from pydantic import BaseModel
from typing import List, Optional
from src.visualization import generate_plot_data, get_available_features, generate_confusion_matrix_data, all_columns_names, categorical_name_mapping
from src.prediction import load_and_predict
from src.preprocessing import merge_and_split_data, preprocess_train_data, preprocess_test_data
from src.model import train_and_save_model, retrain_and_save_model, evaluate_model
import shutil
import os
import time
import joblib

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

# Endpoint to get available features
@router.get("/features")
def get_features():
    """
    Retrieve a mapping of categorical features to their human-readable options for dropdowns.
    Returns a list of features with user-friendly names and their possible values as label-value pairs.
    """
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
    """Make a prediction based on input features."""
    try:
        prediction = load_and_predict(input.features)
        return {"prediction": prediction, "meaning": GRADE_MEANINGS.get(prediction, "Unknown")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Default visualizations endpoint
@router.get("/visualizations/default")
def get_default_visualizations():
    """Retrieve data for predefined default visualizations with interpretations."""
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
    for plot in default_plots:
        try:
            plot_data = generate_plot_data(
                data_path=TRAIN_DATA_PATH,
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
    return visualizations

# Custom visualization endpoint
class CustomVisualizationInput(BaseModel):
    plot_type: str
    features: Optional[List[str]] = None

@router.post("/visualizations/custom")
def get_custom_visualization(input: CustomVisualizationInput):
    """Generate data for a custom visualization."""
    available_plot_types = ["scatter", "boxplot", "barplot", "histogram", "pairplot"]
    if input.plot_type not in available_plot_types:
        raise HTTPException(status_code=400, detail=f"Invalid plot_type. Must be one of {available_plot_types}")
    
    available_features = get_available_features()
    features = input.features
    
    if features is None or not features:
        if input.plot_type in ["scatter", "pairplot"]:
            raise HTTPException(status_code=400, detail=f"{input.plot_type.capitalize()} requires exactly 2 features.")
        features = available_features
    else:
        for feature in features:
            if feature not in available_features:
                raise HTTPException(status_code=400, detail=f"Invalid feature: {feature}")
    
    try:
        plot_data = generate_plot_data(
            data_path=TRAIN_DATA_PATH,
            plot_type=input.plot_type,
            features=features
        )
        return {"plot_data": plot_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating custom visualization: {str(e)}")

# Upload endpoint
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV file, merge with existing train.csv, and split into train/test sets."""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")

        timestamp = int(time.time())
        unique_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOADED_DATA_DIR, unique_filename)

        os.makedirs(UPLOADED_DATA_DIR, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        train_path, test_path = merge_and_split_data(file_path, TRAIN_DATA_PATH, TEST_DATA_PATH)
        os.remove(file_path)

        return {"message": f"Data uploaded, merged, and split into {train_path} and {test_path}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error uploading file: {str(e)}")

# Retrain endpoint
@router.post("/retrain")
async def retrain():
    """Retrain the model using the updated training data and evaluate on test data."""
    try:
        model_path = "models/model.keras"
        backup_path = "models/model_backup.keras"
        old_metrics = None

        if os.path.exists(model_path):
            shutil.copy(model_path, backup_path)
            X_test_scaled_old, y_test_onehot_old = preprocess_test_data(TEST_DATA_PATH)
            old_metrics = evaluate_model(X_test_scaled_old, y_test_onehot_old)

        X_train_scaled, y_train_onehot, X_val_scaled, y_val_onehot = preprocess_train_data(TRAIN_DATA_PATH)

        if os.path.exists(model_path):
            retrain_and_save_model(X_train_scaled, y_train_onehot, X_val=X_val_scaled, y_val=y_val_onehot)
        else:
            train_and_save_model(X_train_scaled, y_train_onehot, X_val=X_val_scaled, y_val=y_val_onehot)

        X_test_scaled_new, y_test_onehot_new = preprocess_test_data(TEST_DATA_PATH)
        new_metrics = evaluate_model(X_test_scaled_new, y_test_onehot_new)

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
    """Evaluate the current model on the test data."""
    try:
        X_test_scaled, y_test_onehot = preprocess_test_data(TEST_DATA_PATH)
        metrics = evaluate_model(X_test_scaled, y_test_onehot)
        y_true = metrics.pop('y_true')  # Remove from metrics for cleaner JSON
        y_pred = metrics.pop('y_pred')  # Remove from metrics for cleaner JSON
        confusion_data = generate_confusion_matrix_data(y_true, y_pred)
        return {
            "metrics": metrics,
            "confusion_matrix": confusion_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Save retrain endpoint
@router.post("/save_retrain")
async def save_retrain(save: bool = Body(..., embed=False)):
    """Save or discard the retrained model based on the 'save' parameter."""
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