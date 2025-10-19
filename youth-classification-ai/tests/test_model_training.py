import pandas as pd
import joblib
from sklearn.metrics import accuracy_score
from src.model_training import train_model

def test_model_training():
    # Generate synthetic data
    synthetic_data = pd.read_csv('data/synthetic_data.csv')
    
    # Train the model
    model, X_test, y_test = train_model(synthetic_data)
    
    # Make predictions
    predictions = model.predict(X_test)
    
    # Evaluate the model
    accuracy = accuracy_score(y_test, predictions)
    
    # Assert that the accuracy is above a certain threshold
    assert accuracy > 0.7, f"Model accuracy is too low: {accuracy}"

if __name__ == "__main__":
    test_model_training()