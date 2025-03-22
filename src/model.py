import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

def evaluate_model(X_test, y_test, model_path='../models/model.keras'):
    """
    Evaluate the trained model on test data.

    Parameters:
    - X_test (np.array): Preprocessed test features.
    - y_test (np.array): Test labels.
    - model_path (str): Path to the saved model (default: '../models/model.keras').

    Returns:
    - dict: Metrics including accuracy and classification report.

    Raises:
    - FileNotFoundError: If the model file is missing.
    """
    try:
        # Load the model
        model = tf.keras.models.load_model(model_path)
        
        # Predict
        y_pred_probs = model.predict(X_test)
        y_pred = np.argmax(y_pred_probs, axis=1)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, target_names=['setosa', 'versicolor', 'virginica'], output_dict=True)
        
        return {
            'accuracy': accuracy,
            'classification_report': report
        }
    except FileNotFoundError:
        raise FileNotFoundError(f"Model file {model_path} not found.")
    except Exception as e:
        raise Exception(f"Error during evaluation: {e}")
    
    
def create_model(input_shape):
    """
    Create a neural network model for Iris classification.

    Parameters:
    - input_shape (int): Number of input features after preprocessing.

    Returns:
    - model (tf.keras.Model): Compiled neural network model.
    """
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(input_shape,)),
        tf.keras.layers.Dense(32, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(16, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(3, activation='softmax')
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

def train_and_save_model(X_train, y_train, model_save_path='../models/model.keras', epochs=100, batch_size=16):
    """
    Train the model and save it to the specified path.

    Parameters:
    - X_train (np.array): Preprocessed training features.
    - y_train (np.array): Training labels.
    - model_save_path (str): Path to save the trained model (default: '../models/model.keras').
    - epochs (int): Number of training epochs (default: 100).
    - batch_size (int): Batch size for training (default: 16).

    Returns:
    - model (tf.keras.Model): Trained model.
    - history (dict): Training history with loss and accuracy metrics.

    Raises:
    - Exception: If training fails.
    """
    try:
        model = create_model(X_train.shape[1])
        early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        history = model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            callbacks=[early_stopping],
            verbose=1
        )
        model.save(model_save_path)
        return model, history.history
    except Exception as e:
        raise Exception(f"Error during model training: {e}")