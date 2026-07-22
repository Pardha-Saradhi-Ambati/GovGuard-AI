from typing import Dict, Any, List
from datetime import datetime

class ExplanationEngine:
    """Service for generating human-readable explanation reasons and actionable recommendations."""

    def generate_explanation(self, record_data: Dict[str, Any], prediction_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates explanation reasons and a recommendation based on transaction data and prediction metrics.
        """
        reasons = []
        amount = float(record_data.get("amount", 0))
        payment_method = str(record_data.get("payment_method", "")).strip()
        payment_method_lower = payment_method.lower()
        purpose = str(record_data.get("purpose", "")).strip()
        purpose_lower = purpose.lower()
        vendor = str(record_data.get("vendor", "")).strip()
        vendor_lower = vendor.lower()
        date_str = record_data.get("date")

        # 1. Amount anomalies
        if amount > 5000000:
            reasons.append("Very high payment amount exceeding ₹50,00,000 threshold")
        elif amount > 2000000:
            reasons.append("High payment amount exceeding ₹20,00,000 threshold")
        elif amount > 1000000:
            reasons.append("High payment amount exceeding ₹10,00,000 threshold")
        elif amount > 500000:
            reasons.append("Payment amount exceeding ₹5,00,000 threshold")

        # 2. Payment Channel heuristic
        if amount > 500000 and any(pm in payment_method_lower for pm in ["upi", "imps"]):
            reasons.append(f"High-value transfer routed via instant retail channel ({payment_method})")
        elif amount > 1000000 and "cheque" in payment_method_lower:
            reasons.append(f"High-value transaction cleared via Cheque payment method")

        # 3. Weekend transaction heuristic
        if date_str:
            try:
                # Clean date string if contains time or Z suffix
                clean_date = date_str.split('T')[0] if 'T' in date_str else date_str
                dt = datetime.strptime(clean_date, '%Y-%m-%d')
                if dt.weekday() >= 5:  # Saturday or Sunday
                    weekday_name = dt.strftime('%A')
                    reasons.append(f"Transaction processed on a weekend ({weekday_name})")
            except Exception:
                pass

        # 4. Blacklisted/Suspicious Keywords
        suspicious_list = ["shell", "phantom", "cash", "unlicensed", "double", "urgent", "no license"]
        for kw in suspicious_list:
            if kw in purpose_lower or kw in vendor_lower:
                reasons.append(f"Suspicious keyword '{kw}' flagged in vendor or description details")

        # 5. Isolation Forest Anomaly classification
        risk_score = prediction_result.get("risk_score", 0)
        prediction = prediction_result.get("prediction", "Low Risk")
        
        if prediction in ["High Risk", "Medium Risk"] or risk_score >= 40:
            reasons.append("Isolation Forest statistical anomaly detected in spending pattern")

        # Ensure we have reasons or default if empty
        if not reasons:
            reasons.append("No significant fraud indicators detected.")

        # 6. Generate Recommendation
        if prediction == "High Risk":
            recommendation = "Hold payment immediately and assign to an investigation officer for full forensic audit."
        elif prediction == "Medium Risk":
            recommendation = "Route transaction through secondary supervisor approval and verify vendor credentials."
        else:
            recommendation = "Approve payment for processing. Standard post-payment reconciliation applies."

        return {
            "reasons": reasons,
            "recommendation": recommendation
        }

# Global singleton instance
explanation_engine = ExplanationEngine()
