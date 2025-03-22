import os
import pandas as pd
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
import pickle

def preprocess_train_data(train_path, expected_feature_names=['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)'], target_col='target', save_dir='../models'):
    """
    Preprocess the training Iris dataset: enforce feature names, apply polynomial features, scale, and save preprocessing objects.

    Parameters:
    - train_path (str): Path to the training CSV file (e.g., 'data/train/train.csv').
    - expected_feature_names (list): Expected feature names for the Iris dataset (default: standard Iris feature names).
    - target_col (str): Name of the target column (default: 'target').
    - save_dir (str): Directory to save preprocessing objects (default: '../models').

    Returns:
    - X_train_scaled (np.array): Scaled training features.
    - y_train (np.array): Training labels.

    Raises:
    - FileNotFoundError: If the training CSV file is not found.
    - ValueError: If feature names or target values don’t match expectations.
    - Exception: For unexpected errors during preprocessing.
    """
    try:
        # Load training data
        train_data = pd.read_csv(train_path)
        
        # Enforce feature names
        expected_columns = expected_feature_names + [target_col]
        if list(train_data.columns) != expected_columns:
            raise ValueError(f"Training data must have columns exactly matching: {expected_columns}")
        
        X_train = train_data[expected_feature_names]
        y_train = train_data[target_col]

        # Validate target values (Iris-specific: 0, 1, 2)
        if not set(y_train).issubset({0, 1, 2}):
            raise ValueError("Target column must contain only 0, 1, 2 for Iris classes.")

        # Apply polynomial features
        poly = PolynomialFeatures(degree=2, include_bias=False)
        X_train_poly = poly.fit_transform(X_train)

        # Scale the features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train_poly)

        # Ensure save directory exists and save preprocessing objects
        os.makedirs(save_dir, exist_ok=True)
        with open(os.path.join(save_dir, 'poly.pkl'), 'wb') as f:
            pickle.dump(poly, f)
        with open(os.path.join(save_dir, 'scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)

        return X_train_scaled, y_train

    except FileNotFoundError:
        raise FileNotFoundError(f"The file {train_path} was not found.")
    except ValueError as e:
        raise ValueError(f"Preprocessing error: {e}")
    except Exception as e:
        raise Exception(f"An unexpected error occurred during preprocessing: {e}")

def preprocess_test_data(test_path, expected_feature_names=['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)'], target_col='target', load_dir='../models'):
    """
    Preprocess the test Iris dataset using saved preprocessing objects.

    Parameters:
    - test_path (str): Path to the test CSV file (e.g., 'data/test/test.csv').
    - expected_feature_names (list): Expected feature names for the Iris dataset (default: standard Iris feature names).
    - target_col (str): Name of the target column (default: 'target').
    - load_dir (str): Directory to load preprocessing objects from (default: '../models').

    Returns:
    - X_test_scaled (np.array): Scaled test features.
    - y_test (np.array): Test labels.

    Raises:
    - FileNotFoundError: If the test CSV or preprocessing files are not found.
    - ValueError: If feature names or target values don’t match expectations.
    - Exception: For unexpected errors during preprocessing.
    """
    try:
        # Load preprocessing objects
        with open(os.path.join(load_dir, 'poly.pkl'), 'rb') as f:
            poly = pickle.load(f)
        with open(os.path.join(load_dir, 'scaler.pkl'), 'rb') as f:
            scaler = pickle.load(f)

        # Load test data
        test_data = pd.read_csv(test_path)
        
        # Enforce feature names
        expected_columns = expected_feature_names + [target_col]
        if list(test_data.columns) != expected_columns:
            raise ValueError(f"Test data must have columns exactly matching: {expected_columns}")
        
        X_test = test_data[expected_feature_names]
        y_test = test_data[target_col]

        # Validate target values (Iris-specific: 0, 1, 2)
        if not set(y_test).issubset({0, 1, 2}):
            raise ValueError("Target column must contain only 0, 1, 2 for Iris classes.")

        # Apply preprocessing using loaded objects
        X_test_poly = poly.transform(X_test)
        X_test_scaled = scaler.transform(X_test_poly)

        return X_test_scaled, y_test

    except FileNotFoundError as e:
        raise FileNotFoundError(f"Missing file: {e}")
    except ValueError as e:
        raise ValueError(f"Preprocessing error: {e}")
    except Exception as e:
        raise Exception(f"An unexpected error occurred during preprocessing: {e}")