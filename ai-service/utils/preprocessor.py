import pandas as pd
import numpy as np
from typing import Dict, Any, List

# Standard department mapping weights for categorical encoding
DEPARTMENT_WEIGHTS = {
    "department of urban development": 1.1,
    "department of welfare and social justice": 1.2,
    "department of information technology": 0.9,
    "department of public works (pwd)": 1.3,
    "department of health & family welfare": 1.0,
    "department of agriculture and rural cooperatives": 1.0,
}

# Payment method risk factors
PAYMENT_METHOD_WEIGHTS = {
    "direct bank transfer": 0.8,
    "electronic fund transfer (eft)": 0.8,
    "cheque": 1.1,
    "upi / imps": 1.3,
    "treasury voucher": 1.0,
}

# Known anomaly indicators in purpose or vendor
SUSPICIOUS_KEYWORDS = [
    "shell", "phantom", "cash", "unlicensed", "double", 
    "urgent", "consultancy", "refund", "miscellaneous", "off-book"
]


class DataPreprocessor:
    """Preprocesses financial record JSON data into engineered numerical feature vectors using Pandas."""

    @staticmethod
    def record_to_dataframe(record_dict: Dict[str, Any]) -> pd.DataFrame:
        """Converts raw record dictionary to Pandas DataFrame."""
        return pd.DataFrame([record_dict])

    @staticmethod
    def extract_features(df: pd.DataFrame) -> np.ndarray:
        """Extracts engineered numerical feature vector array for Isolation Forest model input."""
        df = df.copy()

        # 1. Amount Features
        amount = df["amount"].astype(float).values[0]
        log_amount = np.log1p(amount)

        # 2. Date Features
        date_series = pd.to_datetime(df["date"], errors="coerce")
        day_of_week = date_series.dt.dayofweek.values[0] if not date_series.isna().values[0] else 3
        day_of_month = date_series.dt.day.values[0] if not date_series.isna().values[0] else 15
        month = date_series.dt.month.values[0] if not date_series.isna().values[0] else 6

        # 3. Categorical Encodings
        dept_str = str(df["department"].values[0]).strip().lower()
        dept_risk_factor = DEPARTMENT_WEIGHTS.get(dept_str, 1.0)

        pm_str = str(df["payment_method"].values[0]).strip().lower()
        pm_risk_factor = PAYMENT_METHOD_WEIGHTS.get(pm_str, 1.0)

        # 4. Text Analysis Features
        purpose_str = str(df["purpose"].values[0]).lower()
        vendor_str = str(df["vendor"].values[0]).lower()

        purpose_len = len(purpose_str)
        purpose_words = len(purpose_str.split())

        # Check for suspicious keywords
        keyword_hits = sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in purpose_str or kw in vendor_str)

        # Build feature vector array: [log_amount, day_of_week, day_of_month, month, dept_risk_factor, pm_risk_factor, purpose_len, purpose_words, keyword_hits]
        features = np.array([
            log_amount,
            day_of_week,
            day_of_month,
            month,
            dept_risk_factor,
            pm_risk_factor,
            purpose_len,
            purpose_words,
            keyword_hits
        ], dtype=np.float64)

        return features.reshape(1, -1)

    @staticmethod
    def extract_batch_features(records: List[Dict[str, Any]]) -> np.ndarray:
        """Converts a list of record dicts into a batch 2D feature matrix."""
        df_batch = pd.DataFrame(records)
        feature_rows = []
        for i in range(len(df_batch)):
            single_df = df_batch.iloc[[i]]
            feature_rows.append(DataPreprocessor.extract_features(single_df)[0])
        return np.array(feature_rows)
