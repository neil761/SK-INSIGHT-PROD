import pandas as pd
import numpy as np

def generate_synthetic_data(num_samples=1000):
    np.random.seed(42)  # For reproducibility

    educational_background = np.random.choice(['High School', 'Associate Degree', 'Bachelor Degree', 'Master Degree'], num_samples)
    work_status = np.random.choice(['Employed', 'Unemployed', 'Student'], num_samples)
    age = np.random.randint(15, 30, num_samples)

    # Simple logic for youth classification based on age and educational background
    youth_classification = []
    for i in range(num_samples):
        if age[i] < 18:
            youth_classification.append('Minor')
        elif educational_background[i] == 'High School' and age[i] >= 18:
            youth_classification.append('High School Graduate')
        elif educational_background[i] in ['Associate Degree', 'Bachelor Degree'] and age[i] >= 18:
            youth_classification.append('Graduate')
        else:
            youth_classification.append('Postgraduate')

    data = pd.DataFrame({
        'educationalBackground': educational_background,
        'workStatus': work_status,
        'age': age,
        'youthClassification': youth_classification
    })

    return data

def test_generate_synthetic_data():
    data = generate_synthetic_data(100)
    assert len(data) == 100
    assert 'educationalBackground' in data.columns
    assert 'workStatus' in data.columns
    assert 'age' in data.columns
    assert 'youthClassification' in data.columns
    assert data['age'].min() >= 15
    assert data['age'].max() <= 30
    assert all(data['youthClassification'].isin(['Minor', 'High School Graduate', 'Graduate', 'Postgraduate']))

if __name__ == "__main__":
    test_generate_synthetic_data()