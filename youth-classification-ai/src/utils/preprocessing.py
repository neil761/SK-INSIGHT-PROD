import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

def preprocess_data(df):
    # Define the features and target variable
    X = df.drop('youthClassification', axis=1)
    y = df['youthClassification']
    
    # Identify categorical and numerical columns
    categorical_cols = X.select_dtypes(include=['object']).columns.tolist()
    numerical_cols = X.select_dtypes(exclude=['object']).columns.tolist()
    
    # Create a column transformer for preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(), categorical_cols)
        ],
        remainder='passthrough'  # Keep numerical columns as they are
    )
    
    # Fit and transform the features
    X_processed = preprocessor.fit_transform(X)
    
    return X_processed, y, preprocessor

def preprocess_input_data(input_data):
    # Add your preprocessing logic here
    processed_data = input_data.copy()
    return processed_data