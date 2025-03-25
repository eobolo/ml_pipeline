import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import f1_score, classification_report
import numpy as np
import joblib

def create_model(input_shape, num_classes):
    """Create a neural network model for student grade classification."""
    model = tf.keras.models.Sequential([
        tf.keras.layers.Input(shape=(input_shape,)),
        tf.keras.layers.Dense(units=16, activation='relu'),
        tf.keras.layers.Dense(units=32, activation='relu'),
        tf.keras.layers.Dense(units=num_classes, activation='softmax')
    ])

    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
                  loss=tf.keras.losses.CategoricalCrossentropy(),
                  metrics=[tf.keras.metrics.CategoricalAccuracy(name="accuracy"),
                           tf.keras.metrics.Precision(name='precision'),
                           tf.keras.metrics.Recall(name='recall')])
    return model

def train_and_save_model(X_train, y_train, model_save_path='models/model.keras', epochs=100, batch_size=32, X_val=None, y_val=None):
    """Train a new model from scratch and save it, optionally using a validation set."""
    try:
        input_shape = X_train.shape[1]
        num_classes = y_train.shape[1]
        model = create_model(input_shape, num_classes)
        
        if X_val is not None and y_val is not None:
            if X_val.shape[1] != input_shape:
                raise ValueError(f"Validation input shape {X_val.shape[1]} does not match training input shape {input_shape}")
            if y_val.shape[1] != num_classes:
                raise ValueError(f"Validation output shape {y_val.shape[1]} does not match model output shape {num_classes}")
            history = model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size,
                                validation_data=(X_val, y_val), verbose=1)
        else:
            history = model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, verbose=1)
        
        model.save(model_save_path)
        return model, history.history
    except Exception as e:
        raise Exception(f"Error during training: {e}")

def retrain_and_save_model(X_train, y_train, model_path='models/model.keras', epochs=50, batch_size=32, X_val=None, y_val=None):
    """Retrain an existing model with new data (transfer learning) and save it."""
    try:
        model = tf.keras.models.load_model(model_path)
        if X_train.shape[1] != model.input_shape[1]:
            raise ValueError(f"Input shape {X_train.shape[1]} does not match model input shape {model.input_shape[1]}")
        if y_train.shape[1] != model.output_shape[1]:
            raise ValueError(f"Output shape {y_train.shape[1]} does not match model output shape {model.output_shape[1]}")
        
        if X_val is not None and y_val is not None:
            if X_val.shape[1] != model.input_shape[1]:
                raise ValueError(f"Validation input shape {X_val.shape[1]} does not match model input shape {model.input_shape[1]}")
            if y_val.shape[1] != model.output_shape[1]:
                raise ValueError(f"Validation output shape {y_val.shape[1]} does not match model output shape {model.output_shape[1]}")
            history = model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size,
                                validation_data=(X_val, y_val), verbose=1)
        else:
            history = model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, verbose=1)
        
        model.save(model_path)
        return model, history.history
    except FileNotFoundError:
        raise FileNotFoundError(f"Model file {model_path} not found")
    except Exception as e:
        raise Exception(f"Error during retraining: {e}")

def evaluate_model(X_test, y_test, model_path='models/model.keras', mapping_path='models/categorical_mapping.pkl'):
    """Evaluate the trained model on test data and return metrics with predictions."""
    try:
        model = tf.keras.models.load_model(model_path)
        with open(mapping_path, 'rb') as f:
            categorical_mapping = joblib.load(f)
        grade_mapping = categorical_mapping['GRADE']
        target_names = [grade_mapping[i] for i in sorted(grade_mapping.keys())]
        
        evaluation = model.evaluate(X_test, y_test, verbose=0)
        test_loss, test_accuracy, test_precision, test_recall = evaluation
        
        y_pred_probs = model.predict(X_test, verbose=0)
        y_pred = np.argmax(y_pred_probs, axis=1)
        y_true = np.argmax(y_test, axis=1)
        
        f1 = f1_score(y_true, y_pred, average='weighted')
        report = classification_report(y_true, y_pred, target_names=target_names, output_dict=True)
        
        return {
            'loss': test_loss,
            'accuracy': test_accuracy,
            'precision': test_precision,
            'recall': test_recall,
            'f1_score': f1,
            'classification_report': report,
            'y_true': y_true.tolist(),  # Convert to list for JSON compatibility
            'y_pred': y_pred.tolist()   # Convert to list for JSON compatibility
        }
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Missing file: {e}")
    except Exception as e:
        raise Exception(f"Error during evaluation: {e}")