import pandas as pd
from sklearn.model_selection import train_test_split
import os

# Define the path to your student dataset
dataset_path = 'notebook/student_prediction.csv'

# Define all original columns (32 features + target)
all_feature_names = [
    'STUDENTID', 'AGE', 'GENDER', 'HS_TYPE', 'SCHOLARSHIP', 'WORK', 'ACTIVITY', 'PARTNER', 
    'SALARY', 'TRANSPORT', 'LIVING', 'MOTHER_EDU', 'FATHER_EDU', '#_SIBLINGS', 
    'KIDS', 'MOTHER_JOB', 'FATHER_JOB', 'STUDY_HRS', 'READ_FREQ', 'READ_FREQ_SCI', 
    'ATTEND_DEPT', 'IMPACT', 'ATTEND', 'PREP_STUDY', 'PREP_EXAM', 'NOTES', 
    'LISTENS', 'LIKES_DISCUSS', 'CLASSROOM', 'CUML_GPA', 'EXP_GPA', 'COURSE ID'
]
target_col = 'GRADE'

# Load the dataset
data = pd.read_csv(dataset_path)

# Validate columns
expected_columns = all_feature_names + [target_col]
if list(data.columns) != expected_columns:
    raise ValueError(f"Dataset must have columns: {expected_columns}")

# Separate features and target
X = data.drop(columns=[target_col])
y = data[target_col]

# Perform stratified split to maintain class distribution
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Save to CSV with all columns
os.makedirs('data/train', exist_ok=True)
os.makedirs('data/test', exist_ok=True)
pd.concat([X_train, y_train], axis=1).to_csv('data/train/train.csv', index=False)
pd.concat([X_test, y_test], axis=1).to_csv('data/test/test.csv', index=False)

print("Training and testing data generated successfully.")