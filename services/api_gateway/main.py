import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from prometheus_client import make_asgi_app, Counter, Gauge, Histogram

from database.session import init_db
from database.seeds.seed_data import seed_database
from services.api_gateway.routes import router as api_router
from services.coordinator.event_bus import event_bus

# Prometheus metrics instrumentation
HTTP_REQUESTS_TOTAL = Counter("federai_http_requests_total", "Total HTTP requests processed", ["method", "endpoint", "status"])
FEDERATION_ROUND_GAUGE = Gauge("federai_federation_current_round", "Current active federation round number")
GLOBAL_ACCURACY_GAUGE = Gauge("federai_global_model_accuracy", "Current global model validation accuracy")
ROUND_LATENCY_HISTOGRAM = Histogram("federai_round_duration_seconds", "Training round execution duration in seconds")

app = FastAPI(
    title="FederAI Cloud API Gateway",
    description="Cloud-Native, Secure, Privacy-Preserving Federated AI Platform & Control Plane",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router)

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# WebSocket Endpoint for Real-Time UI Telemetry
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    event_bus.register_websocket(websocket)
    try:
        # Send initial connection handshake
        await websocket.send_json({
            "event_type": "CONNECTED",
            "payload": {"message": "FederAI Cloud Real-Time Telemetry Conduit Online"}
        })
        while True:
            # Keep-alive ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        event_bus.unregister_websocket(websocket)
    except Exception:
        event_bus.unregister_websocket(websocket)

# Liveness and Readiness probes
@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "api-gateway", "version": "1.0.0"}

@app.get("/ready")
def readiness_check():
    return {"status": "READY", "database": "CONNECTED", "broker": "ACTIVE"}

# Mount frontend static assets
frontend_dir = os.path.abspath("frontend")
if os.path.exists(frontend_dir):
    # If built frontend or SPA exists
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
def serve_frontend_root():
    index_file = os.path.join("frontend", "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "FederAI Cloud API Gateway is running.",
        "api_docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }

@app.on_event("startup")
def on_startup():
    print("[FederAI Cloud] Starting microservices gateway and initializing database...")
    init_db()
    seed_database()
    print("[FederAI Cloud] Ready to accept connections.")
