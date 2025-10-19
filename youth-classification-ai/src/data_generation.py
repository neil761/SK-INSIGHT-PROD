import pandas as pd
import numpy as np

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)  # For reproducibility

    educational_backgrounds = ['High School', 'Associate Degree', 'Bachelor Degree', 'Master Degree']
    work_statuses = ['Employed', 'Unemployed', 'Student', 'Intern']

    data = {
        'educationalBackground': np.random.choice(educational_backgrounds, num_samples),
        'workStatus': np.random.choice(work_statuses, num_samples),
        'age': np.random.randint(15, 30, num_samples),
        'youthClassification': np.random.choice(['Youth', 'Not Youth'], num_samples)
    }

    df = pd.DataFrame(data)
    return df

def save_synthetic_data(file_path='data/synthetic_data.csv', num_samples=1000):
    synthetic_data = generate_synthetic_data(num_samples)
    synthetic_data.to_csv(file_path, index=False)

if __name__ == "__main__":
    save_synthetic_data()