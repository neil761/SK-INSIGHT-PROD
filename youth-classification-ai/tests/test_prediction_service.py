import pytest
import pandas as pd
from src.prediction_service import predict_youth_classification

def test_predict_youth_classification():
    # Sample input data for testing
    input_data = {
        'educationalBackground': 'High School',
        'workStatus': 'Employed',
        'age': 18
    }
    
    # Expected output (this should be adjusted based on the actual model's predictions)
    expected_output = 'Youth'  # Replace with the actual expected classification

    # Call the prediction function
    prediction = predict_youth_classification(input_data)

    # Assert that the prediction matches the expected output
    assert prediction == expected_output

def test_predict_youth_classification_invalid_input():
    # Sample invalid input data for testing
    invalid_input_data = {
        'educationalBackground': 'Unknown',
        'workStatus': 'Unemployed',
        'age': -5  # Invalid age
    }

    # Call the prediction function and expect it to raise an error
    with pytest.raises(ValueError):
        predict_youth_classification(invalid_input_data)