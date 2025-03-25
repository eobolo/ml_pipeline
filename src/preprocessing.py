import os
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedShuffleSplit
from imblearn.over_sampling import ADASYN
import joblib
import numpy as np
from tensorflow.keras.utils import to_categorical

# Define all original columns and target
all_feature_names = [
    'STUDENTID', 'AGE', 'GENDER', 'HS_TYPE', 'SCHOLARSHIP', 'WORK', 'ACTIVITY', 'PARTNER', 
    'SALARY', 'TRANSPORT', 'LIVING', 'MOTHER_EDU', 'FATHER_EDU', '#_SIBLINGS', 
    'KIDS', 'MOTHER_JOB', 'FATHER_JOB', 'STUDY_HRS', 'READ_FREQ', 'READ_FREQ_SCI', 
    'ATTEND_DEPT', 'IMPACT', 'ATTEND', 'PREP_STUDY', 'PREP_EXAM', 'NOTES', 
    'LISTENS', 'LIKES_DISCUSS', 'CLASSROOM', 'CUML_GPA', 'EXP_GPA', 'COURSE ID'
]
target_col = 'GRADE'
num_classes = 8
columns_to_drop = ['STUDENTID', 'EXP_GPA']

def preprocess_train_data(train_path, scaler_path='models/scaler.pkl', save_dir='models', val_size=0.2):
    """Preprocess training data: apply ADASYN, split into train/val with stratification, fit scaler, and save it."""
    try:
        # Load training data
        train_data = pd.read_csv(train_path)
        expected_columns = all_feature_names + [target_col]
        if list(train_data.columns) != expected_columns:
            raise ValueError(f"Training data must have columns: {expected_columns}")
        if train_data.isnull().any().any():
            raise ValueError("Training data contains missing values")

        # Drop unnecessary columns
        train_data = train_data.drop(columns=columns_to_drop)

        # Separate features and target
        X = train_data.drop(columns=[target_col])
        y = train_data[target_col]
        if not set(y).issubset(set(range(num_classes))):
            raise ValueError(f"Target must contain only integers from 0 to {num_classes-1}")

        # Check for class imbalance and apply ADASYN
        class_counts = y.value_counts()
        min_class_size = class_counts.min()
        max_class_size = class_counts.max()
        imbalance_ratio = min_class_size / max_class_size
        if imbalance_ratio < 0.5:
            print("Class imbalance detected. Applying ADASYN with dynamic sizing.")
            target_samples_per_class = max(max_class_size, int(len(y) / num_classes)) + 500
            strategy = {grade: target_samples_per_class for grade in range(num_classes)}
            adasyn = ADASYN(sampling_strategy=strategy, random_state=42)
            X, y = adasyn.fit_resample(X, y)
            print(f"After ADASYN: {len(y)} samples, class distribution: {pd.Series(y).value_counts().to_dict()}")
        else:
            print("No significant class imbalance. Skipping oversampling.")

        # Stratified split into train and validation sets
        sss = StratifiedShuffleSplit(n_splits=1, test_size=val_size, random_state=42)
        for train_idx, val_idx in sss.split(X, y):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        # Create and fit scaler on training data only
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)

        # Clip features to avoid extreme values
        X_train_scaled = np.clip(X_train_scaled, -5, 5)
        X_val_scaled = np.clip(X_val_scaled, -5, 5)

        # Convert targets to one-hot encoded format
        y_train_onehot = to_categorical(y_train, num_classes=num_classes)
        y_val_onehot = to_categorical(y_val, num_classes=num_classes)

        # Save the scaler
        os.makedirs(save_dir, exist_ok=True)
        joblib.dump(scaler, scaler_path)
        print(f"Scaler saved to {scaler_path}")

        return X_train_scaled, y_train_onehot, X_val_scaled, y_val_onehot

    except Exception as e:
        raise Exception(f"Error in preprocessing training data: {e}")

def preprocess_test_data(test_path, scaler_path='models/scaler.pkl'):
    """Preprocess test data using the saved scaler."""
    try:
        # Load the scaler
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler not found at {scaler_path}. Please run preprocess_train_data first.")
        with open(scaler_path, 'rb') as f:
            scaler = joblib.load(f)

        # Load test data
        test_data = pd.read_csv(test_path)
        expected_columns = all_feature_names + [target_col]
        if list(test_data.columns) != expected_columns:
            raise ValueError(f"Test data must have columns: {expected_columns}")
        if test_data.isnull().any().any():
            raise ValueError("Test data contains missing values")

        # Drop unnecessary columns
        test_data = test_data.drop(columns=columns_to_drop)

        # Separate features and target
        X_test = test_data.drop(columns=[target_col])
        y_test = test_data[target_col]
        if not set(y_test).issubset(set(range(num_classes))):
            raise ValueError(f"Target must contain only integers from 0 to {num_classes-1}")

        # Scale and clip features
        X_test_scaled = scaler.transform(X_test)
        X_test_scaled = np.clip(X_test_scaled, -5, 5)

        # Convert target to one-hot encoded format
        y_test_onehot = to_categorical(y_test, num_classes=num_classes)

        return X_test_scaled, y_test_onehot

    except Exception as e:
        raise Exception(f"Error in preprocessing test data: {e}")

def merge_and_split_data(new_data_path, train_path='data/train/train.csv', test_path='data/test/test.csv', test_size=0.2, random_state=42):
    """Merge new data with existing data and append to train/test with stratification."""
    try:
        expected_columns = all_feature_names + [target_col]
        new_data = pd.read_csv(new_data_path)
        if list(new_data.columns) != expected_columns:
            raise ValueError(f"Uploaded data must have columns: {expected_columns}")
        if new_data.isnull().any().any():
            raise ValueError("Uploaded data contains missing values")
        
        # Split new data with stratification
        X_new = new_data.drop(columns=[target_col])
        y_new = new_data[target_col]
        sss = StratifiedShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
        for train_idx, test_idx in sss.split(X_new, y_new):
            X_new_train, X_new_test = X_new.iloc[train_idx], X_new.iloc[test_idx]
            y_new_train, y_new_test = y_new.iloc[train_idx], y_new.iloc[test_idx]
        
        # Load existing data or initialize empty
        train_data = pd.read_csv(train_path) if os.path.exists(train_path) else pd.DataFrame(columns=expected_columns)
        test_data = pd.read_csv(test_path) if os.path.exists(test_path) else pd.DataFrame(columns=expected_columns)
        
        # Append new splits to existing data
        new_train_df = pd.concat([X_new_train, y_new_train], axis=1)
        new_test_df = pd.concat([X_new_test, y_new_test], axis=1)
        combined_train = pd.concat([train_data, new_train_df], ignore_index=True)
        combined_test = pd.concat([test_data, new_test_df], ignore_index=True)
        
        # Save updated datasets with all columns
        combined_train.to_csv(train_path, index=False)
        combined_test.to_csv(test_path, index=False)
        return train_path, test_path
    except Exception as e:
        raise Exception(f"Error merging data: {e}")