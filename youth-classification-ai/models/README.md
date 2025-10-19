# README for Youth Classification AI Model

This directory contains the trained models used for predicting a resident's Youth Classification based on profiling answers.

## Model File

- **logistic_regression_model.pkl**: This file contains the trained logistic regression model. It has been trained on a synthetic dataset generated to reflect various profiling answers related to educational background, work status, age, and youth classification.

## Usage

To use the trained model for predictions, you can load the `logistic_regression_model.pkl` file in your Python scripts. Below is an example of how to do this:

```python
import pickle

# Load the trained model
with open('models/logistic_regression_model.pkl', 'rb') as model_file:
    model = pickle.load(model_file)

# Example input data for prediction
input_data = [[...]]  # Replace with actual input data

# Make a prediction
prediction = model.predict(input_data)
```

Ensure that the input data is preprocessed in the same way as the training data to achieve accurate predictions.

## Model Training

The model was trained using the synthetic dataset located in the `data/synthetic_data.csv` file. For details on the training process, refer to the `src/model_training.py` file.