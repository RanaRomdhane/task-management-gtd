from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import os
from .schemas.tasks import (
    Task, SimilarTaskGroup, InferredTask,
    GroupTasksRequest, InferDependenciesRequest,
    PrioritizeRequest, PomodoroRequest
)
from .models.task_model import TaskModel
from .models.embeddings import TaskEmbedder
from .config import settings
import logging
from typing import List,Dict

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Task AI Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
embedder = TaskEmbedder()
task_model = TaskModel(embedder)

# Security dependency
async def verify_api_key(api_key: str = Header(...)):
    if api_key != settings.api_key:
        raise HTTPException(
            status_code=403, 
            detail="Invalid API Key"
        )
    return api_key

@app.post("/protected-endpoint")
async def protected_route(
    api_key: str = Depends(verify_api_key)
):
    return {"message": "Access granted"}

@app.post("/group_tasks", response_model=List[SimilarTaskGroup])
async def group_tasks(
    request: GroupTasksRequest,
    api_key: str = Depends(verify_api_key)
):
    """Group similar tasks together"""
    try:
        tasks_data = [task.dict() for task in request.tasks]
        groups = task_model.group_similar_tasks(tasks_data)
        return groups
    except Exception as e:
        logger.error(f"Error in group_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/infer_dependencies", response_model=List[InferredTask])
async def infer_dependencies(
    request: InferDependenciesRequest,
    api_key: str = Depends(verify_api_key)
):
    """Infer task dependencies"""
    try:
        task_data = request.task.dict()
        dependencies = task_model.infer_dependencies(task_data)
        return dependencies
    except Exception as e:
        logger.error(f"Error in infer_dependencies: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/prioritize_tasks", response_model=List[Dict])
async def prioritize_tasks(
    request: PrioritizeRequest,
    api_key: str = Depends(verify_api_key)
):
    """Prioritize a list of tasks"""
    try:
        tasks_data = [task.dict() for task in request.tasks]
        prioritized = task_model.prioritize_tasks(tasks_data)
        return prioritized
    except Exception as e:
        logger.error(f"Error in prioritize_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/create_pomodoro_schedule", response_model=List[Dict])
async def create_pomodoro_schedule(
    request: PomodoroRequest,
    api_key: str = Depends(verify_api_key)
):
    """Create a pomodoro schedule"""
    try:
        tasks_data = [task.dict() for task in request.tasks]
        schedule = task_model.create_pomodoro_schedule(tasks_data)
        return schedule
    except Exception as e:
        logger.error(f"Error in create_pomodoro_schedule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.port)