import numpy as np
from src.model import train_and_save_model, evaluate_model
from src.prediction import load_and_predict
from src.preprocessing import preprocess_train_data, preprocess_test_data
from src.visualization import generate_plot_data, get_available_features, generate_confusion_matrix_data

# Preprocess the training and testing data
X_train_scaled, y_train, X_val_scaled, y_val = preprocess_train_data('data/train/train.csv')
X_test_scaled, y_test = preprocess_test_data('data/test/test.csv')

# Train the model with explicit validation data
model, history = train_and_save_model(
    X_train_scaled, y_train,
    model_save_path='models/model.keras',
    epochs=30,
    batch_size=32,
    X_val=X_val_scaled,
    y_val=y_val
)

# Evaluate the model on test data
metrics = evaluate_model(X_test_scaled, y_test, model_path='models/model.keras')

# Get available readable feature names for visualization
available_features = get_available_features()
print("Available features for plotting:", available_features)

# Generate plot data for training set (scatter plot)
plot_data_train = generate_plot_data(
    'data/train/train.csv',
    plot_type='scatter',
    features=['Cumulative GPA', 'Weekly Study Hours']
)

# Generate plot data for test set (boxplot)
plot_data_test = generate_plot_data(
    'data/test/test.csv',
    plot_type='boxplot',
    features=['Class Attendance']
)

# Generate confusion matrix data
confusion_data = generate_confusion_matrix_data(metrics['y_true'], metrics['y_pred'])

# Example new data point for prediction (30 features)
new_data = np.array([[2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 4, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 5]])

# Load the model and make predictions
predictions = load_and_predict(new_data)

# Output results
print(f"Accuracy: {metrics['accuracy']}")
print(f"Classification Report: {metrics['classification_report']}")
print("Training Plot Data:", plot_data_train)
print("Test Plot Data:", plot_data_test)
print("Confusion Matrix Data:", confusion_data)
print(f"Predicted grade: {predictions}")