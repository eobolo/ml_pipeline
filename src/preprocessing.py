import os
import pandas as pd
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.model_selection import train_test_split
import pickle

def preprocess_train_data(train_path, expected_feature_names=['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)'], target_col='target', save_dir='models'):
    """Preprocess training data and save preprocessing objects."""
    try:
        train_data = pd.read_csv(train_path)
        expected_columns = expected_feature_names + [target_col]
        if list(train_data.columns) != expected_columns:
            raise ValueError(f"Training data must have columns: {expected_columns}")
        if train_data.isnull().any().any():
            raise ValueError("Training data contains missing values")
        X_train = train_data[expected_feature_names]
        y_train = train_data[target_col]
        if not set(y_train).issubset({0, 1, 2}):
            raise ValueError("Target must contain only 0, 1, 2")
        poly = PolynomialFeatures(degree=2, include_bias=False)
        X_train_poly = poly.fit_transform(X_train)
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train_poly)
        os.makedirs(save_dir, exist_ok=True)
        with open(os.path.join(save_dir, 'poly.pkl'), 'wb') as f:
            pickle.dump(poly, f)
        with open(os.path.join(save_dir, 'scaler.pkl'), 'wb') as f:
            pickle.dump(scaler, f)
        return X_train_scaled, y_train
    except FileNotFoundError:
        raise FileNotFoundError(f"File {train_path} not found")
    except ValueError as e:
        raise ValueError(f"Preprocessing error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error: {e}")

def preprocess_test_data(test_path, expected_feature_names=['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)'], target_col='target', load_dir='models'):
    """Preprocess test data using saved objects."""
    try:
        with open(os.path.join(load_dir, 'poly.pkl'), 'rb') as f:
            poly = pickle.load(f)
        with open(os.path.join(load_dir, 'scaler.pkl'), 'rb') as f:
            scaler = pickle.load(f)
        test_data = pd.read_csv(test_path)
        expected_columns = expected_feature_names + [target_col]
        if list(test_data.columns) != expected_columns:
            raise ValueError(f"Test data must have columns: {expected_columns}")
        if test_data.isnull().any().any():
            raise ValueError("Test data contains missing values")
        X_test = test_data[expected_feature_names]
        y_test = test_data[target_col]
        if not set(y_test).issubset({0, 1, 2}):
            raise ValueError("Target must contain only 0, 1, 2")
        X_test_poly = poly.transform(X_test)
        X_test_scaled = scaler.transform(X_test_poly)
        return X_test_scaled, y_test
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Missing file: {e}")
    except ValueError as e:
        raise ValueError(f"Preprocessing error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error: {e}")

def merge_and_split_data(new_data_path, train_path='data/train/train.csv', test_path='data/test/test.csv', test_size=0.2, random_state=42):
    """Merge new data with existing data and append to train/test."""
    try:
        expected_columns = ['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)', 'target']
        new_data = pd.read_csv(new_data_path)
        if list(new_data.columns) != expected_columns:
            raise ValueError(f"Uploaded data must have columns: {expected_columns}")
        if new_data.isnull().any().any():
            raise ValueError("Uploaded data contains missing values")
        
        # Split new data
        X_new = new_data.drop('target', axis=1)
        y_new = new_data['target']
        X_new_train, X_new_test, y_new_train, y_new_test = train_test_split(X_new, y_new, test_size=test_size, random_state=random_state, stratify=y_new)
        
        # Load existing data or initialize empty
        train_data = pd.read_csv(train_path) if os.path.exists(train_path) else pd.DataFrame(columns=expected_columns)
        test_data = pd.read_csv(test_path) if os.path.exists(test_path) else pd.DataFrame(columns=expected_columns)
        
        # Append new splits to existing data
        new_train_df = pd.concat([X_new_train, y_new_train], axis=1)
        new_test_df = pd.concat([X_new_test, y_new_test], axis=1)
        combined_train = pd.concat([train_data, new_train_df], ignore_index=True)
        combined_test = pd.concat([test_data, new_test_df], ignore_index=True)
        
        # Save updated datasets
        combined_train.to_csv(train_path, index=False)
        combined_test.to_csv(test_path, index=False)
        return train_path, test_path
    except Exception as e:
        raise Exception(f"Error merging data: {e}")