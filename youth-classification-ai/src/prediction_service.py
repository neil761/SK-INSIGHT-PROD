import joblib
import pandas as pd

class YouthClassificationPredictor:
    def __init__(self, model_path, preprocessor_path):
        self.model = joblib.load(model_path)
        self.preprocessor = joblib.load(preprocessor_path)

    def predict(self, input_data):
        # Preprocess the input data
        processed_data = self.preprocessor.transform(input_data)
        prediction = self.model.predict(processed_data)
        return prediction

if __name__ == "__main__":
    # Example usage
    model_path = '../models/logistic_regression_model.pkl'
    preprocessor_path = '../models/preprocessor.pkl'
    predictor = YouthClassificationPredictor(model_path, preprocessor_path)

    # Sample input data
    sample_input = {
        'educationalBackground': 'High School',
        'workStatus': 'Employed',
        'age': 18
    }

    prediction = predictor.predict(pd.DataFrame([sample_input]))
    print(f'Predicted Youth Classification: {prediction[0]}')