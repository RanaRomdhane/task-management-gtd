import os
import json
import numpy as np
import torch
import time
import logging
from sklearn.cluster import DBSCAN
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error
from sentence_transformers import SentenceTransformer, InputExample, losses, util
from torch.utils.data import DataLoader
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import random
import pickle
from collections import Counter

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class AdvancedTrainingConfig:
    MODEL_NAME = 'all-MiniLM-L6-v2'
    BATCH_SIZE = 16  # Reduced for better convergence
    EPOCHS = 10  # Increased for better learning
    TRAIN_DATA_PATH = 'data/train_tasks.json'
    MODEL_SAVE_PATH = 'models/task_model'
    EMBEDDER_SAVE_PATH = 'models/embedder.pkl'
    ML_MODELS_PATH = 'models/ml_models.pkl'
    DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
    NUM_WORKERS = 0
    WARMUP_STEPS = 200  # Increased warmup
    LEARNING_RATE = 1e-5  # Lower learning rate for stability
    EVAL_SAMPLE_SIZE = 50
    VALIDATION_SPLIT = 0.2

try:
    from .app.models.embeddings import TaskEmbedder
except ImportError:
    try:
        from app.models.embeddings import TaskEmbedder
    except ImportError:
        # Fallback implementation for standalone training
        class TaskEmbedder:
            def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
                self.model = SentenceTransformer(model_name)
                self.task_embeddings = {}
                self.task_data = {}
            
            def embed_task(self, task: Dict) -> np.ndarray:
                text = f"{task['title']} {task.get('description', '')} {task['type']}"
                return self.model.encode(text)
            
            def add_task(self, task: Dict):
                embedding = self.embed_task(task)
                self.task_embeddings[task['id']] = embedding
                self.task_data[task['id']] = task

def load_training_data() -> List[Dict]:
    """Load comprehensive training data"""
    if not os.path.exists(AdvancedTrainingConfig.TRAIN_DATA_PATH):
        logger.error(f"Training data not found at {AdvancedTrainingConfig.TRAIN_DATA_PATH}")
        raise FileNotFoundError("Training data file not found")
    
    with open(AdvancedTrainingConfig.TRAIN_DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    logger.info(f"Loaded {len(data)} training tasks")
    return data

def create_enhanced_training_examples(tasks: List[Dict]) -> Tuple[List[InputExample], List[Tuple]]:
    """Create sophisticated training examples with multiple similarity criteria"""
    examples = []
    dependency_pairs = []
    
    # Similarity criteria weights
    type_weight = 0.3
    description_weight = 0.4
    duration_weight = 0.2
    priority_weight = 0.1
    
    for i, task1 in enumerate(tasks):
        for j, task2 in enumerate(tasks[i+1:], i+1):
            # Calculate multi-dimensional similarity
            similarity_score = 0.0
            
            # Type similarity
            if task1.get('type') == task2.get('type'):
                similarity_score += type_weight
            
            # Description similarity (using keywords)
            desc1_words = set(task1.get('description', '').lower().split())
            desc2_words = set(task2.get('description', '').lower().split())
            if desc1_words and desc2_words:
                keyword_overlap = len(desc1_words.intersection(desc2_words)) / len(desc1_words.union(desc2_words))
                similarity_score += description_weight * keyword_overlap
            
            # Duration similarity
            dur1 = task1.get('estimatedDuration', 60)
            dur2 = task2.get('estimatedDuration', 60)
            duration_similarity = 1 - abs(dur1 - dur2) / max(dur1, dur2, 60)
            similarity_score += duration_weight * duration_similarity
            
            # Priority similarity
            priority_map = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
            prio1 = priority_map.get(task1.get('priority', 'medium'), 2)
            prio2 = priority_map.get(task2.get('priority', 'medium'), 2)
            priority_similarity = 1 - abs(prio1 - prio2) / 3
            similarity_score += priority_weight * priority_similarity
            
            # Create training example
            text1 = f"{task1['title']} {task1.get('description', '')} {task1.get('type', '')}"
            text2 = f"{task2['title']} {task2.get('description', '')} {task2.get('type', '')}"
            
            # Binary label based on threshold
            label = 1.0 if similarity_score > 0.6 else 0.0
            examples.append(InputExample(texts=[text1, text2], label=label))
            
            # Store for analysis
            dependency_pairs.append((task1['id'], task2['id'], similarity_score))
    
    logger.info(f"Created {len(examples)} training examples")
    return examples, dependency_pairs

def prepare_ml_training_data(tasks: List[Dict]) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Prepare data for ML model training"""
    embedder = TaskEmbedder(AdvancedTrainingConfig.MODEL_NAME)
    
    features = []
    priority_labels = []
    duration_labels = []
    dependency_counts = []
    
    priority_mapping = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
    
    for task in tasks:
        # Extract features
        embedding = embedder.embed_task(task)
        
        # Additional engineered features
        title_length = len(task.get('title', ''))
        desc_length = len(task.get('description', ''))
        has_due_date = 1 if task.get('dueDate') else 0
        
        # Duration buckets
        duration = task.get('estimatedDuration', 60)
        duration_bucket = 0
        if duration <= 60:
            duration_bucket = 1
        elif duration <= 180:
            duration_bucket = 2
        elif duration <= 360:
            duration_bucket = 3
        else:
            duration_bucket = 4
        
        # Type encoding
        type_encoding = [0] * 8
        types = ['work', 'personal', 'learning', 'admin', 'meeting', 'creative', 'communication', 'other']
        task_type = task.get('type', 'other')
        if task_type in types:
            type_encoding[types.index(task_type)] = 1
        
        # Combine all features
        feature_vector = np.concatenate([
            embedding,
            [title_length, desc_length, has_due_date, duration_bucket],
            type_encoding
        ])
        
        features.append(feature_vector)
        priority_labels.append(priority_mapping.get(task.get('priority', 'medium'), 2))
        duration_labels.append(duration)
        dependency_counts.append(len(task.get('dependencies', [])))
    
    return (
        np.array(features),
        np.array(priority_labels),
        np.array(duration_labels),
        np.array(dependency_counts)
    )

def train_advanced_embedding_model(tasks: List[Dict]) -> SentenceTransformer:
    """Train embedding model with advanced techniques"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    model = SentenceTransformer(
        AdvancedTrainingConfig.MODEL_NAME,
        device=AdvancedTrainingConfig.DEVICE
    )
    
    # Create enhanced training examples
    train_examples, _ = create_enhanced_training_examples(tasks)
    
    # Split into train/validation
    train_size = int(len(train_examples) * (1 - AdvancedTrainingConfig.VALIDATION_SPLIT))
    train_examples_split = train_examples[:train_size]
    val_examples = train_examples[train_size:]
    
    logger.info(f"Training on {len(train_examples_split)} examples, validating on {len(val_examples)}")
    
    # Create data loaders
    train_dataloader = DataLoader(
        train_examples_split,
        batch_size=AdvancedTrainingConfig.BATCH_SIZE,
        shuffle=True,
        num_workers=AdvancedTrainingConfig.NUM_WORKERS
    )
    
    val_dataloader = DataLoader(
        val_examples,
        batch_size=AdvancedTrainingConfig.BATCH_SIZE,
        shuffle=False,
        num_workers=AdvancedTrainingConfig.NUM_WORKERS
    )
    
    # Use CosineSimilarityLoss for better semantic understanding
    train_loss = losses.CosineSimilarityLoss(model)
    
    # Training with validation
    logger.info(f"Training advanced embedding model:")
    logger.info(f"- Device: {AdvancedTrainingConfig.DEVICE.upper()}")
    logger.info(f"- Batch size: {AdvancedTrainingConfig.BATCH_SIZE}")
    logger.info(f"- Epochs: {AdvancedTrainingConfig.EPOCHS}")
    logger.info(f"- Learning rate: {AdvancedTrainingConfig.LEARNING_RATE}")
    
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=AdvancedTrainingConfig.EPOCHS,
        warmup_steps=AdvancedTrainingConfig.WARMUP_STEPS,
        optimizer_params={'lr': AdvancedTrainingConfig.LEARNING_RATE},
        show_progress_bar=True,
        use_amp=False,  # Stable training
        evaluator=None,  # Can add custom evaluator here
        evaluation_steps=500,
        save_best_model=True
    )
    
    return model

def train_ml_models(features: np.ndarray, priority_labels: np.ndarray, 
                   duration_labels: np.ndarray, dependency_counts: np.ndarray) -> Dict:
    """Train ML models for priority and duration prediction"""
    
    # Split data
    X_train, X_test, y_prio_train, y_prio_test = train_test_split(
        features, priority_labels, test_size=0.2, random_state=42
    )
    _, _, y_dur_train, y_dur_test = train_test_split(
        features, duration_labels, test_size=0.2, random_state=42
    )
    _, _, y_dep_train, y_dep_test = train_test_split(
        features, dependency_counts, test_size=0.2, random_state=42
    )
    
    models = {}
    
    # Priority prediction model
    logger.info("Training priority prediction model...")
    priority_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        random_state=42
    )
    priority_model.fit(X_train, y_prio_train)
    prio_pred = priority_model.predict(X_test)
    prio_accuracy = accuracy_score(y_prio_test, prio_pred)
    logger.info(f"Priority model accuracy: {prio_accuracy:.3f}")
    models['priority'] = priority_model
    
    # Duration prediction model
    logger.info("Training duration prediction model...")
    duration_model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        random_state=42
    )
    duration_model.fit(X_train, y_dur_train)
    dur_pred = duration_model.predict(X_test)
    dur_mse = mean_squared_error(y_dur_test, dur_pred)
    logger.info(f"Duration model MSE: {dur_mse:.2f}")
    models['duration'] = duration_model
    
    # Dependency count prediction model
    logger.info("Training dependency prediction model...")
    dependency_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=8,
        min_samples_split=3,
        random_state=42
    )
    dependency_model.fit(X_train, y_dep_train)
    dep_pred = dependency_model.predict(X_test)
    dep_accuracy = accuracy_score(y_dep_test, dep_pred)
    logger.info