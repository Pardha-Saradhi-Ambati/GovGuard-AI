from fastapi import APIRouter, HTTPException, status
from models.schemas import FinancialRecordInput, PredictionResponse
from services.ml_service import ml_service
from services.explanation_engine import explanation_engine

router = APIRouter(prefix="/api/v1", tags=["Fraud Risk Intelligence"])

@router.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Fraud Risk Score",
    description="Evaluates a government financial transaction record using Isolation Forest machine learning and Pandas feature extraction to return a risk score (0-100), risk tier prediction, confidence rating, and explanatory indicators."
)
async def predict_fraud_risk(record: FinancialRecordInput) -> PredictionResponse:
    try:
        # Convert input Pydantic model to dictionary
        record_dict = record.model_dump()
        
        # Execute ML prediction service
        result = ml_service.predict_risk(record_dict)
        
        # Generate human-readable reasons and recommendations
        explanation = explanation_engine.generate_explanation(record_dict, result)

        return PredictionResponse(
            risk_score=result["risk_score"],
            prediction=result["prediction"],
            confidence=result["confidence"],
            reasons=explanation["reasons"],
            recommendation=explanation["recommendation"]
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Data validation error: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference error: {str(e)}"
        )
