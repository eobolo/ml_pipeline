import pandas as pd
import numpy as np
from sklearn.metrics import confusion_matrix
import joblib

# Define the full set of original columns
all_columns_names = [
    'STUDENTID', 'AGE', 'GENDER', 'HS_TYPE', 'SCHOLARSHIP', 'WORK', 'ACTIVITY', 'PARTNER', 
    'SALARY', 'TRANSPORT', 'LIVING', 'MOTHER_EDU', 'FATHER_EDU', '#_SIBLINGS', 
    'KIDS', 'MOTHER_JOB', 'FATHER_JOB', 'STUDY_HRS', 'READ_FREQ', 'READ_FREQ_SCI', 
    'ATTEND_DEPT', 'IMPACT', 'ATTEND', 'PREP_STUDY', 'PREP_EXAM', 'NOTES', 
    'LISTENS', 'LIKES_DISCUSS', 'CLASSROOM', 'CUML_GPA', 'EXP_GPA', 'COURSE ID', 'GRADE'
]
target_col = 'GRADE'

# Mapping of technical column names to user-friendly English names
categorical_name_mapping = {
    'AGE': 'Student Age',
    'GENDER': 'Gender',
    'HS_TYPE': 'High School Type',
    'SCHOLARSHIP': 'Scholarship Type',
    'WORK': 'Additional Work',
    'ACTIVITY': 'Artistic/Sports Activity',
    'PARTNER': 'Has Partner',
    'SALARY': 'Total Salary',
    'TRANSPORT': 'Transportation Method',
    'LIVING': 'Accommodation Type',
    'MOTHER_EDU': "Mother's Education",
    'FATHER_EDU': "Father's Education",
    '#_SIBLINGS': 'Number of Siblings',
    'KIDS': 'Parental Status',
    'MOTHER_JOB': "Mother's Occupation",
    'FATHER_JOB': "Father's Occupation",
    'STUDY_HRS': 'Weekly Study Hours',
    'READ_FREQ': 'Reading Frequency (Non-Scientific)',
    'READ_FREQ_SCI': 'Reading Frequency (Scientific)',
    'ATTEND_DEPT': 'Seminar/Conference Attendance',
    'IMPACT': 'Project Impact',
    'ATTEND': 'Class Attendance',
    'PREP_STUDY': 'Midterm Exam 1 Preparation',
    'PREP_EXAM': 'Midterm Exam 2 Preparation',
    'NOTES': 'Taking Notes in Classes',
    'LISTENS': 'Listening in Classes',
    'LIKES_DISCUSS': 'Discussion Impact',
    'CLASSROOM': 'Flip-Classroom Preference',
    'CUML_GPA': 'Cumulative GPA',
    'EXP_GPA': 'Expected Graduation GPA',
    'COURSE ID': 'Course Identifier',
    'GRADE': 'Output Grade'
}

# Reverse mapping for user input to technical names
reverse_mapping = {v: k for k, v in categorical_name_mapping.items()}

def get_available_features():
    """Return a list of user-friendly feature names for the API."""
    return [categorical_name_mapping[col] for col in all_columns_names if col != 'STUDENTID']

def generate_plot_data(data_path, plot_type='scatter', features=None):
    """Generate JSON-compatible data for interactive plots of the student dataset."""
    try:
        data = pd.read_csv(data_path)
        expected_columns = all_columns_names
        if list(data.columns) != expected_columns:
            raise ValueError(f"Input data must have columns: {expected_columns}")

        data = data.drop(columns=['STUDENTID'])
        grade_names = {0: 'Fail', 1: 'DD', 2: 'DC', 3: 'CC', 4: 'CB', 5: 'BB', 6: 'BA', 7: 'AA'}
        if not set(data[target_col]).issubset(set(range(8))):
            raise ValueError("Target column must contain integers 0-7 for grade classes.")
        data['grade_label'] = data[target_col].map(grade_names)

        available_features = [col for col in all_columns_names if col != 'STUDENTID']
        if features is None or not features:
            features = [categorical_name_mapping[col] for col in available_features]
        else:
            features = [f.strip() for f in features if f.strip()]
            technical_features = [reverse_mapping.get(f) for f in features]
            if None in technical_features or not all(f in available_features for f in technical_features):
                raise ValueError(f"Features must be in {get_available_features()}")

        if plot_type == 'scatter':
            if len(features) < 2:
                raise ValueError("Scatter plot requires at least 2 features.")
            plot_data = {
                'type': 'scatter',
                'features': features[:2],  # Use only first 2 features
                'x': data[reverse_mapping[features[0]]].tolist(),
                'y': data[reverse_mapping[features[1]]].tolist(),
                'color': data['grade_label'].tolist(),
                'x_label': features[0],
                'y_label': features[1]
            }
        elif plot_type == 'boxplot':
            if len(features) < 1:
                raise ValueError("Boxplot requires at least 1 feature.")
            plot_data = {
                'type': 'boxplot',
                'features': features,
                'data': {
                    feature: {
                        grade: data[data['grade_label'] == grade][reverse_mapping[feature]].tolist()
                        for grade in grade_names.values()
                    }
                    for feature in features
                }
            }
        elif plot_type == 'barplot':
            if len(features) < 1:
                raise ValueError("Barplot requires at least 1 feature.")
            plot_data = {
                'type': 'barplot',
                'features': features,
                'data': {
                    feature: {
                        grade: data[data['grade_label'] == grade][reverse_mapping[feature]].mean()
                        for grade in grade_names.values()
                    }
                    for feature in features
                }
            }
        elif plot_type == 'histogram':
            if len(features) < 1:
                raise ValueError("Histogram requires at least 1 feature.")
            plot_data = {
                'type': 'histogram',
                'features': features,
                'data': {
                    feature: {
                        'values': data[reverse_mapping[feature]].tolist(),
                        'bins': 10
                    }
                    for feature in features
                }
            }
        elif plot_type == 'pairplot':
            if len(features) < 2:
                raise ValueError("Pairplot requires exactly 2 features.")
            features = features[:2]  # Enforce only the first 2 features
            plot_data = {
                'type': 'pairplot',
                'features': features,
                'data': data[[reverse_mapping[f] for f in features] + ['grade_label']].to_dict(orient='records')
            }
        else:
            raise ValueError(f"Unsupported plot_type '{plot_type}'. Use 'scatter', 'boxplot', 'barplot', 'histogram', or 'pairplot'.")
        
        return plot_data
    except FileNotFoundError:
        raise FileNotFoundError(f"The file {data_path} was not found.")
    except ValueError as e:
        raise ValueError(f"Plot data generation error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error during plot data generation: {e}")

def generate_confusion_matrix_data(y_true, y_pred, mapping_path='models/categorical_mapping.pkl'):
    """Generate confusion matrix data for plotting."""
    try:
        with open(mapping_path, 'rb') as f:
            categorical_mapping = joblib.load(f)
        grade_mapping = categorical_mapping['GRADE']
        labels = [grade_mapping[i] for i in sorted(grade_mapping.keys())]
        
        cm = confusion_matrix(y_true, y_pred)
        
        return {
            'type': 'confusion_matrix',
            'confusion_matrix': cm.tolist(),
            'labels': labels
        }
    except FileNotFoundError:
        raise FileNotFoundError(f"Mapping file {mapping_path} not found")
    except Exception as e:
        raise Exception(f"Error generating confusion matrix data: {e}")