from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

class FinancialRecordInput(BaseModel):
    record_number: Optional[str] = Field(None, description="Unique financial record identifier (e.g. REC-2026-0001)")
    department: str = Field(..., min_length=2, description="Government department allocating funds")
    vendor: str = Field(..., min_length=2, description="Vendor or contractor name receiving funds")
    invoice_number: str = Field(..., min_length=1, description="Vendor invoice / voucher number")
    payment_method: str = Field(..., min_length=2, description="Disbursement channel (e.g., Direct Bank Transfer, Cheque, UPI)")
    amount: float = Field(..., gt=0, description="Disbursement amount in INR (must be positive)")
    purpose: str = Field(..., min_length=3, description="Contract or disbursement purpose description")
    date: str = Field(..., description="Transaction date string (YYYY-MM-DD format)")
    status: Optional[str] = Field("Pending", description="System approval status (Pending, Approved, Rejected)")

    @field_validator('date')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            # Parse ISO date string
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            try:
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError("Invalid date format. Expected YYYY-MM-DD or ISO-8601 string.")

    class Config:
        json_schema_extra = {
            "example": {
                "record_number": "REC-2026-0042",
                "department": "Department of Urban Development",
                "vendor": "Apex Construction Group",
                "invoice_number": "INV-99018",
                "payment_method": "Direct Bank Transfer",
                "amount": 1450000.00,
                "purpose": "Smart City Infrastructure Expansion Project Phase 2",
                "date": "2026-07-15",
                "status": "Approved"
            }
        }


class PredictionResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100, description="Calculated fraud risk score percentage (0 to 100)")
    prediction: Literal["Low Risk", "Medium Risk", "High Risk"] = Field(..., description="Risk tier classification")
    confidence: int = Field(..., ge=0, le=100, description="Model prediction confidence score percentage (0 to 100)")
    reasons: List[str] = Field(..., description="Human-readable fraud explanation bullet points")
    recommendation: str = Field(..., description="Actionable recommendation for audit or payment processing")

    class Config:
        json_schema_extra = {
            "example": {
                "risk_score": 92,
                "prediction": "High Risk",
                "confidence": 95,
                "reasons": [
                    "Very high payment amount exceeding ₹10,00,000 threshold",
                    "High-value transfer routed via instant retail channel (UPI / IMPS)",
                    "Isolation Forest statistical anomaly detected in spending pattern"
                ],
                "recommendation": "Hold payment immediately and assign to an investigation officer for full forensic audit."
            }
        }
