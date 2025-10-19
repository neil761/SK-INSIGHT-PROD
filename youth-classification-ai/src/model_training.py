import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import joblib
from src.utils.preprocessing import preprocess_data

def load_data(file_path):
    data = pd.read_csv(file_path)
    return data

def train_model(data):
    # Preprocess the data
    X_processed, y, preprocessor = preprocess_data(data)

    # Split the dataset into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X_processed, y, test_size=0.2, random_state=42)

    # Create and train the logistic regression model
    model = LogisticRegression()
    model.fit(X_train, y_train)

    # Make predictions and evaluate the model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)

    print(f"Model Accuracy: {accuracy}")
    print("Classification Report:\n", report)

    return model, preprocessor

def save_model(model, file_path):
    joblib.dump(model, file_path)

if __name__ == "__main__":
    # Load the synthetic dataset
    data = load_data('../data/synthetic_data.csv')
    
    # Train the model
    trained_model, preprocessor = train_model(data)
    
    # Save the trained model
    save_model(trained_model, '../models/logistic_regression_model.pkl')