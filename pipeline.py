from model import train_and_save_model, evaluate_model
import numpy as np
from prediction import load_and_predict
from preprocessing import preprocess_train_data, preprocess_test_data
from visualization import generate_plot_data


X_train_scaled, y_train = preprocess_train_data('data/train/train.csv')
X_test_scaled, y_test = preprocess_test_data('data/test/test.csv')
model, history = train_and_save_model(X_train_scaled, y_train, model_save_path='../models/model.keras', epochs=100, batch_size=16)
metrics = evaluate_model(X_test_scaled, y_test, model_path='../models/model.keras')
plot_data_train = generate_plot_data('data/train/train.csv', plot_type='scatter', features=['sepal length (cm)', 'sepal width (cm)'])
plot_data_test = generate_plot_data('data/test/test.csv', plot_type='boxplot', features=['petal length (cm)'])
new_data = np.array([[5.1, 3.5, 1.4, 0.2]])
predictions = load_and_predict(new_data)

print(f"Accuracy: {metrics['accuracy']}")
print(f"Classification Report: {metrics['classification_report']}")
print(plot_data_train)
print(plot_data_test)
print(f"Predicted probabilities: {predictions}")