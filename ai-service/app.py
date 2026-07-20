import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.predict import router as predict_router

# Initialize FastAPI application with Swagger metadata
app = FastAPI(
    title="AI Government Integrity & Fraud Intelligence Service",
    description="Microservice providing Isolation Forest anomaly detection and risk classification for government financial disbursements.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(predict_router)


@app.get("/", tags=["System Health"])
async def root():
    """Root endpoint verifying AI Service status."""
    return {
        "service": "AI Government Integrity & Fraud Intelligence Microservice",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/docs"
    }


@app.get("/health", tags=["System Health"])
async def health_check():
    """Health check endpoint for container / service monitoring."""
    return {
        "status": "healthy",
        "model_status": "loaded"
    }


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
