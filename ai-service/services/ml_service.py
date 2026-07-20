import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.ensemble import IsolationForest
from utils.preprocessor import DataPreprocessor

class MLService:
    """Machine Learning Service initializing and executing Isolation Forest anomaly detection."""

    def __init__(self):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.12,
            random_state=42
        )
        self._initialize_and_fit_baseline()

    def _initialize_and_fit_baseline(self):
        """Generates representative baseline government financial dataset to fit Isolation Forest."""
        np.random.seed(42)
        n_samples = 300

        # Baseline normal records: Moderate amounts, normal keywords, standard dates
        normal_amounts = np.random.uniform(10000, 500000, n_samples)
        normal_log_amounts = np.log1p(normal_amounts)
        normal_days = np.random.randint(0, 5, n_samples) # Mon-Fri
        normal_day_of_month = np.random.randint(1, 28, n_samples)
        normal_months = np.random.randint(1, 12, n_samples)
        normal_dept_risk = np.random.choice([0.9, 1.0, 1.1], n_samples)
        normal_pm_risk = np.random.choice([0.8, 1.0], n_samples)
        normal_purpose_len = np.random.randint(20, 80, n_samples)
        normal_purpose_words = np.random.randint(3, 12, n_samples)
        normal_keywords = np.zeros(n_samples)

        X_normal = np.column_stack([
            normal_log_amounts,
            normal_days,
            normal_day_of_month,
            normal_months,
            normal_dept_risk,
            normal_pm_risk,
            normal_purpose_len,
            normal_purpose_words,
            normal_keywords
        ])

        # Anomaly records: Very high amounts, weekend dates, suspicious keywords
        n_anomalies = 35
        anomaly_amounts = np.random.uniform(5000000, 50000000, n_anomalies)
        anomaly_log_amounts = np.log1p(anomaly_amounts)
        anomaly_days = np.random.choice([5, 6], n_anomalies) # Weekends
        anomaly_day_of_month = np.random.randint(1, 28, n_anomalies)
        anomaly_months = np.random.randint(1, 12, n_anomalies)
        anomaly_dept_risk = np.random.choice([1.2, 1.3], n_anomalies)
        anomaly_pm_risk = np.random.choice([1.1, 1.3], n_anomalies)
        anomaly_purpose_len = np.random.randint(5, 15, n_anomalies)
        anomaly_purpose_words = np.random.randint(1, 3, n_anomalies)
        anomaly_keywords = np.random.randint(1, 3, n_anomalies)

        X_anomalies = np.column_stack([
            anomaly_log_amounts,
            anomaly_days,
            anomaly_day_of_month,
            anomaly_months,
            anomaly_dept_risk,
            anomaly_pm_risk,
            anomaly_purpose_len,
            anomaly_purpose_words,
            anomaly_keywords
        ])

        X_train = np.vstack([X_normal, X_anomalies])
        self.model.fit(X_train)

    def predict_risk(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts features from record JSON, computes Isolation Forest decision score, 
        and calculates risk_score (0-100), prediction tier, and confidence level.
        """
        # Convert record dict to DataFrame and extract numerical features
        df = DataPreprocessor.record_to_dataframe(record_data)
        features = DataPreprocessor.extract_features(df)

        # Isolation Forest decision score: lower values indicate higher anomaly likelihood
        raw_score = self.model.decision_function(features)[0] # typical range [-0.5, 0.5]
        
        # Additional feature heuristics: check suspicious keyword hits & extreme amount threshold
        amount = float(record_data.get("amount", 0))
        purpose_str = str(record_data.get("purpose", "")).lower()
        vendor_str = str(record_data.get("vendor", "")).lower()
        
        keyword_penalty = 0
        suspicious_list = ["shell", "phantom", "cash", "unlicensed", "double", "urgent", "no license"]
        for kw in suspicious_list:
            if kw in purpose_str or kw in vendor_str:
                keyword_penalty += 25

        amount_penalty = 0
        if amount > 5000000:
            amount_penalty += 25
        elif amount > 2000000:
            amount_penalty += 15

        # Normalize Isolation Forest raw_score (-0.5 to 0.3) to 0-100 risk score
        # Lower raw_score => Higher risk
        base_risk = (0.25 - raw_score) * 100 # maps raw_score 0.25 -> 0, -0.25 -> 50
        calculated_risk = base_risk + keyword_penalty + amount_penalty
        
        # Clamp risk score to range [0, 100]
        final_risk_score = int(np.clip(round(calculated_risk), 0, 100))

        # Determine Prediction Tier
        if final_risk_score >= 70:
            prediction = "High Risk"
        elif final_risk_score >= 40:
            prediction = "Medium Risk"
        else:
            prediction = "Low Risk"

        # Calculate Confidence Score (0 to 100%)
        # Distance from category boundaries increases confidence
        boundary_dist = min(
            abs(final_risk_score - 40),
            abs(final_risk_score - 70)
        )
        raw_confidence = 75 + (boundary_dist * 0.8)
        confidence = int(np.clip(round(raw_confidence), 70, 99))

        return {
            "risk_score": final_risk_score,
            "prediction": prediction,
            "confidence": confidence
        }

# Global singleton instance
ml_service = MLService()
