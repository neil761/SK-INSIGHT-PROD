# Youth Classification AI Project

This project aims to predict a resident's Youth Classification based on profiling answers using a logistic regression model. The project includes synthetic dataset generation, model training, and a prediction service integrated into a backend workflow.

## Project Structure

- **data/**: Contains the synthetic dataset and documentation.
  - `synthetic_data.csv`: The synthetic dataset generated for training the AI model.
  - `README.md`: Documentation about the synthetic dataset, including its structure and generation process.

- **models/**: Stores the trained model and documentation.
  - `logistic_regression_model.pkl`: The trained logistic regression model used for predicting youth classification.
  - `README.md`: Documentation about the model files, including how to use the trained model.

- **notebooks/**: Contains Jupyter notebooks for data exploration.
  - `data_exploration.ipynb`: Used for exploring the synthetic dataset, visualizing data distributions, and understanding relationships between features.

- **src/**: Contains the source code for the project.
  - `data_generation.py`: Code for generating the synthetic dataset based on specified rules.
  - `model_training.py`: Implementation for training the logistic regression model using the synthetic dataset.
  - `prediction_service.py`: Defines the prediction service that loads the trained model and returns predictions.
  - **utils/**: Contains utility functions for preprocessing input data.
    - `preprocessing.py`: Functions for encoding categorical variables and preparing data for model input.

- **tests/**: Contains unit tests for the project.
  - `test_data_generation.py`: Unit tests for the data generation process.
  - `test_model_training.py`: Unit tests for the model training process.
  - `test_prediction_service.py`: Unit tests for the prediction service.

- **requirements.txt**: Lists the dependencies required for the project.

- `README.md`: Overview of the project, including its goals, setup instructions, and usage guidelines.

- `main.py`: Entry point for the application, coordinating the data generation, model training, and prediction processes.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd youth-classification-ai
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Generate the synthetic dataset:
   ```
   python src/data_generation.py
   ```

4. Train the logistic regression model:
   ```
   python src/model_training.py
   ```

5. Use the prediction service to make predictions:
   ```
   python src/prediction_service.py
   ```

## Usage Guidelines

- Ensure that the synthetic dataset is generated before training the model.
- The trained model can be used to predict youth classification based on new input data.
- Refer to the individual README files in the `data` and `models` directories for more detailed documentation on those components.

## License

This project is licensed under the MIT License.