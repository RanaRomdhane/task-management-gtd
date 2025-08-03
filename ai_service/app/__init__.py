"""
AI Service Package

This package provides task understanding and prediction capabilities including:
- Task grouping
- Dependency inference
- Prioritization
- Scheduling
"""

from .models import TaskModel, TaskEmbedder
from .schemas import Task, SimilarTaskGroup, InferredTask

__all__ = [
    'TaskModel',
    'TaskEmbedder',
    'Task',
    'SimilarTaskGroup',
    'InferredTask'
]

__version__ = '1.0.0'