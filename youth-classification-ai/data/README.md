# README for Synthetic Dataset

This document provides an overview of the synthetic dataset used for training the AI model to predict a resident's Youth Classification based on profiling answers.

## Dataset Overview

The synthetic dataset is stored in `synthetic_data.csv` and contains records with the following fields:

- **educationalBackground**: Categorical variable representing the educational background of the resident (e.g., High School, Bachelor's, Master's).
- **workStatus**: Categorical variable indicating the current work status of the resident (e.g., Employed, Unemployed, Student).
- **age**: Numerical variable representing the age of the resident.
- **youthClassification**: Categorical variable representing the classification of the resident (e.g., Youth, Adult).

## Dataset Generation

The synthetic dataset is generated using the `data_generation.py` script located in the `src` directory. The generation process involves:

1. Defining the rules and distributions for each feature.
2. Creating a specified number of records based on these rules.
3. Saving the generated dataset to `synthetic_data.csv`.

This dataset is used to train the logistic regression model for predicting youth classification.