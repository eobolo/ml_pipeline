import tensorflow as tf
import pickle
import numpy as np
import pandas as pd

def load_and_predict(new_data, expected_feature_names=['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)'], model_path='../models/model.keras', poly_path='../models/poly.pkl', scaler_path='../models/scaler.pkl'):
    """
    Load the saved model and preprocessing objects to make predictions on new data.

    Parameters:
    - new_data (np.array or pd.DataFrame): Input data for prediction (raw features, no target).
    - expected_feature_names (list): Expected feature names to enforce (default: standard Iris feature names).
    - model_path (str): Path to the saved model (default: '../models/model.keras').
    - poly_path (str): Path to the saved polynomial feature transformer (default: '../models/poly.pkl').
    - scaler_path (str): Path to the saved scaler (default: '../models/scaler.pkl').

    Returns:
    - predictions (np.array): Model predictions (class probabilities).

    Raises:
    - ValueError: If feature names don’t match expectations.
    - FileNotFoundError: If model or preprocessing files are missing.
    """
    try:
        # Load the model and preprocessing objects
        model = tf.keras.models.load_model(model_path)
        with open(poly_path, 'rb') as f:
            poly = pickle.load(f)
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)

        # Convert to DataFrame if needed and enforce feature names
        if isinstance(new_data, pd.DataFrame):
            if list(new_data.columns) != expected_feature_names:
                raise ValueError(f"New data must have columns: {expected_feature_names}")
            new_data = new_data[expected_feature_names].values
        elif isinstance(new_data, np.ndarray):
            if new_data.shape[1] != len(expected_feature_names):
                raise ValueError(f"New data must have {len(expected_feature_names)} features matching: {expected_feature_names}")
        else:
            raise ValueError("new_data must be a pandas DataFrame or numpy array.")

        # Ensure correct shape
        if new_data.ndim == 1:
            new_data = new_data.reshape(1, -1)

        # Preprocess the new data
        new_data_poly = poly.transform(new_data)
        new_data_scaled = scaler.transform(new_data_poly)

        # Make predictions
        predictions = model.predict(new_data_scaled)
        return predictions

    except FileNotFoundError as e:
        raise FileNotFoundError(f"Missing file: {e}")
    except ValueError as e:
        raise ValueError(f"Prediction error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error during prediction: {e}")