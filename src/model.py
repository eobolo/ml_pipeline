import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import accuracy_score, classification_report
import numpy as np

def evaluate_model(X_test, y_test, model_path='models/model.keras'):
    """Evaluate the trained model on test data."""
    try:
        model = tf.keras.models.load_model(model_path)
        y_pred_probs = model.predict(X_test, verbose=0)
        y_pred = np.argmax(y_pred_probs, axis=1)
        accuracy = accuracy_score(y_test, y_pred)
        report = classification_report(y_test, y_pred, target_names=['setosa', 'versicolor', 'virginica'], output_dict=True)
        return {'accuracy': accuracy, 'classification_report': report}
    except FileNotFoundError:
        raise FileNotFoundError(f"Model file {model_path} not found")
    except Exception as e:
        raise Exception(f"Error during evaluation: {e}")

def create_model(input_shape):
    """Create a neural network model for Iris classification."""
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(input_shape,)),
        tf.keras.layers.Dense(32, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(16, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(3, activation='softmax')
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model

def train_and_save_model(X_train, y_train, model_save_path='models/model.keras', epochs=100, batch_size=16):
    """Train and save the model."""
    try:
        model = create_model(X_train.shape[1])
        early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        history = model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size,
                            validation_split=0.2, callbacks=[early_stopping], verbose=1)
        model.save(model_save_path)
        return model, history.history
    except Exception as e:
        raise Exception(f"Error during training: {e}")