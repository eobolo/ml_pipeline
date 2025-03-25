# src/database.py
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv
import pandas as pd
from typing import List, Dict, Optional

# Load environment variables from .env file
load_dotenv()

# MongoDB connection details
MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = "student_grade_db"
TRAIN_COLLECTION = "train"
TEST_COLLECTION = "test"

# Expected columns for validation
EXPECTED_COLUMNS = [
    'STUDENTID', 'AGE', 'GENDER', 'HS_TYPE', 'SCHOLARSHIP', 'WORK', 'ACTIVITY', 'PARTNER', 
    'SALARY', 'TRANSPORT', 'LIVING', 'MOTHER_EDU', 'FATHER_EDU', '#_SIBLINGS', 
    'KIDS', 'MOTHER_JOB', 'FATHER_JOB', 'STUDY_HRS', 'READ_FREQ', 'READ_FREQ_SCI', 
    'ATTEND_DEPT', 'IMPACT', 'ATTEND', 'PREP_STUDY', 'PREP_EXAM', 'NOTES', 
    'LISTENS', 'LIKES_DISCUSS', 'CLASSROOM', 'CUML_GPA', 'EXP_GPA', 'COURSE ID', 'GRADE'
]

class Database:
    def __init__(self):
        """Initialize MongoDB client."""
        try:
            self.client = MongoClient(MONGODB_URI)
            self.db = self.client[DATABASE_NAME]
            # Test connection
            self.client.server_info()
            self.connected = True
        except ConnectionFailure:
            print("Failed to connect to MongoDB. Using file-based fallback.")
            self.connected = False

    def is_connected(self) -> bool:
        """Check if the database is connected."""
        return self.connected

    def validate_data(self, df: pd.DataFrame) -> None:
        """Validate that the DataFrame matches expected columns and has no nulls."""
        if list(df.columns) != EXPECTED_COLUMNS:
            raise ValueError(f"Data must have columns: {EXPECTED_COLUMNS}")
        if df.isnull().any().any():
            raise ValueError("Data contains missing values")

    def save_to_collection(self, df: pd.DataFrame, collection_name: str) -> None:
        """Save DataFrame to a MongoDB collection."""
        if not self.connected:
            raise ConnectionFailure("Database not connected")
        self.validate_data(df)
        collection = self.db[collection_name]
        records = df.to_dict(orient="records")
        if records:
            collection.insert_many(records)

    def load_from_collection(self, collection_name: str) -> Optional[pd.DataFrame]:
        """Load data from a MongoDB collection into a DataFrame."""
        if not self.connected:
            return None
        collection = self.db[collection_name]
        data = list(collection.find({}, {"_id": 0}))  # Exclude MongoDB _id field
        if not data:
            return pd.DataFrame(columns=EXPECTED_COLUMNS)
        return pd.DataFrame(data)

    def clear_collection(self, collection_name: str) -> None:
        """Clear all data from a collection."""
        if self.connected:
            self.db[collection_name].delete_many({})

# Singleton instance
db = Database()