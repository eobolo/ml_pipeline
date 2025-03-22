import pandas as pd

def generate_plot_data(data_path, plot_type='scatter', features=None, target_col='target', expected_feature_names=['sepal length (cm)', 'sepal width (cm)', 'petal length (cm)', 'petal width (cm)']):
    """
    Generate JSON-compatible data for interactive plots of the Iris dataset.

    Parameters:
    - data_path (str): Path to the CSV file containing the Iris dataset.
    - plot_type (str): Type of plot ('scatter', 'boxplot', 'pairplot') (default: 'scatter').
    - features (list): Specific features to include (default: None, uses all except target).
    - target_col (str): Name of the target column (default: 'target').
    - expected_feature_names (list): Expected feature names for validation (default: standard Iris feature names).

    Returns:
    - dict: JSON-compatible data structure for the specified plot type.

    Raises:
    - ValueError: If feature names, target values, or feature count for plot type are invalid.
    - FileNotFoundError: If the data file is not found.
    """
    try:
        # Load data
        data = pd.read_csv(data_path)
        
        # Enforce feature names
        expected_columns = expected_feature_names + [target_col]
        if list(data.columns) != expected_columns:
            raise ValueError(f"Input data must have columns: {expected_columns}")
        
        # Map target to class names for plotting
        class_names = {0: 'setosa', 1: 'versicolor', 2: 'virginica'}
        if not set(data[target_col]).issubset({0, 1, 2}):
            raise ValueError("Target column must contain only 0, 1, 2 for Iris classes.")
        data['species'] = data[target_col].map(class_names)
        
        # Default to all features if none specified
        if features is None:
            features = expected_feature_names
        
        # Validate features exist
        if not all(f in expected_feature_names for f in features):
            raise ValueError(f"All features must be in {expected_feature_names}")

        # Generate plot data based on plot_type
        if plot_type == 'scatter':
            if len(features) != 2:
                raise ValueError("Scatter plot requires exactly 2 features.")
            plot_data = {
                'type': 'scatter',
                'x': data[features[0]].tolist(),
                'y': data[features[1]].tolist(),
                'color': data['species'].tolist(),
                'x_label': features[0],
                'y_label': features[1]
            }
        elif plot_type == 'boxplot':
            if not features:
                raise ValueError("Boxplot requires at least one feature.")
            plot_data = {
                'type': 'boxplot',
                'features': features,
                'data': {
                    feature: {
                        class_name: data[data['species'] == class_name][feature].tolist()
                        for class_name in class_names.values()
                    }
                    for feature in features
                }
            }
        elif plot_type == 'pairplot':
            plot_data = {
                'type': 'pairplot',
                'features': features,
                'data': data[features + ['species']].to_dict(orient='records')
            }
        else:
            raise ValueError(f"Unsupported plot_type '{plot_type}'. Use 'scatter', 'boxplot', or 'pairplot'.")

        return plot_data

    except FileNotFoundError:
        raise FileNotFoundError(f"The file {data_path} was not found.")
    except ValueError as e:
        raise ValueError(f"Plot data generation error: {e}")
    except Exception as e:
        raise Exception(f"Unexpected error during plot data generation: {e}")