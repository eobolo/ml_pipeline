import tensorflow as tf
import pickle
import numpy as np

def load_and_predict(new_data, model_path='models/model.keras', poly_path='models/poly.pkl', scaler_path='models/scaler.pkl'):
    """Load model and predict."""
    try:
        with open(poly_path, 'rb') as f:
            poly = pickle.load(f)
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        model = tf.keras.models.load_model(model_path)
        new_data = np.array(new_data).reshape(1, -1)
        if new_data.shape[1] != 4:
            raise ValueError("Input must have 4 features")
        new_data_poly = poly.transform(new_data)
        new_data_scaled = scaler.transform(new_data_poly)
        predictions = model.predict(new_data_scaled, verbose=0)
        return predictions[0]
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Missing file: {e}")
    except ValueError as e:
        raise ValueError(f"Prediction error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error: {e}")