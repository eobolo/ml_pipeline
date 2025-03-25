import tensorflow as tf
import joblib
import numpy as np

def load_and_predict(new_data, model_path='models/model.keras', scaler_path='models/scaler.pkl', mapping_path='models/categorical_mapping.pkl'):
    """Load model and predict the grade label."""
    try:
        with open(scaler_path, 'rb') as f:
            scaler = joblib.load(f)
        model = tf.keras.models.load_model(model_path)
        with open(mapping_path, 'rb') as f:
            categorical_mapping = joblib.load(f)
        grade_mapping = categorical_mapping['GRADE']
        
        new_data = np.array(new_data).reshape(1, -1)
        if new_data.shape[1] != 30:
            raise ValueError("Input must have 30 features")
        new_data_scaled = scaler.transform(new_data)
        new_data_scaled = np.clip(new_data_scaled, -5, 5)
        
        predictions = model.predict(new_data_scaled, verbose=0)
        predicted_class = np.argmax(predictions, axis=1)[0]
        predicted_grade = grade_mapping[predicted_class]
        return predicted_grade
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Missing file: {e}")
    except ValueError as e:
        raise ValueError(f"Prediction error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error: {e}")