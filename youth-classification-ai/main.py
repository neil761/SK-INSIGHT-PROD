import pandas as pd
from src.data_generation import generate_synthetic_data
from src.model_training import train_model
from src.prediction_service import YouthClassificationPredictor
import joblib

def main():
    # Step 1: Generate synthetic data
    print("Generating synthetic data...")
    data = generate_synthetic_data()  # Ensure this function returns the generated data

    # Step 2: Train the logistic regression model
    print("Training the model...")
    model, preprocessor = train_model(data)  # Pass the generated data to the train_model function

    # Save the trained model and preprocessor
    model_path = './models/logistic_regression_model.pkl'
    preprocessor_path = './models/preprocessor.pkl'
    joblib.dump(model, model_path)
    joblib.dump(preprocessor, preprocessor_path)

    # Step 3: Load the trained model and make predictions
    predictor = YouthClassificationPredictor(model_path, preprocessor_path)

    # Example input for prediction
    sample_input = {
        'educationalBackground': 'High School',
        'workStatus': 'Employed',
        'age': 18
    }

    prediction = predictor.predict(pd.DataFrame([sample_input]))
    print(f'Predicted Youth Classification: {prediction[0]}')

if __name__ == "__main__":
    main()