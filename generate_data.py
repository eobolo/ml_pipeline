from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
import pandas as pd
import os

# Load Iris dataset
iris = load_iris()
X = pd.DataFrame(iris.data, columns=iris.feature_names)
y = pd.Series(iris.target, name='target')

# Split into train and test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Save to CSV
os.makedirs('data/train', exist_ok=True)
os.makedirs('data/test', exist_ok=True)
pd.concat([X_train, y_train], axis=1).to_csv('data/train/train.csv', index=False)
pd.concat([X_test, y_test], axis=1).to_csv('data/test/test.csv', index=False)