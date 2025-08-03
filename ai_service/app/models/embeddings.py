from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
import numpy as np
from typing import List, Dict
import pickle
import os

class TaskEmbedder:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
        self.task_embeddings = {}
        self.task_data = {}
        

    def group_similar_tasks(self, tasks: List[Dict], eps: float = 0.5, min_samples: int = 2) -> List[Dict]:
        """Group similar tasks using clustering"""
        # Add all tasks to the embedder
        for task in tasks:
            self.add_task(task)
            
        # Get embeddings for all tasks
        embeddings = np.array([self.task_embeddings[task['id']] for task in tasks])
        
        # Cluster using DBSCAN
        clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(embeddings)
        labels = clustering.labels_
        
        # Create groups
        groups = []
        for label in set(labels):
            if label == -1:  # Skip noise
                continue
                
            group_tasks = [task for task, lbl in zip(tasks, labels) if lbl == label]
            groups.append({
                'name': f"{group_tasks[0]['type']} cluster",
                'taskIds': [t['id'] for t in group_tasks]
            })
            
        return groups
    

    def embed_task(self, task: Dict) -> np.ndarray:
        """Generate embedding for a single task"""
        text = f"{task['title']} {task['description'] or ''} {task['type']}"
        return self.model.encode(text)
    
    def add_task(self, task: Dict):
        """Add a task to the embedding space"""
        embedding = self.embed_task(task)
        self.task_embeddings[task['id']] = embedding
        self.task_data[task['id']] = task
        
    def find_similar_tasks(self, task_id: int, threshold: float = 0.7) -> List[int]:
        """Find similar tasks based on embeddings"""
        if task_id not in self.task_embeddings:
            return []
            
        target_embedding = self.task_embeddings[task_id]
        similarities = []
        
        for other_id, embedding in self.task_embeddings.items():
            if other_id == task_id:
                continue
                
            sim = np.dot(target_embedding, embedding) /(np.linalg.norm(target_embedding) * np.linalg.norm(embedding))
            similarities.append((other_id, sim))
            
        # Sort by similarity and filter by threshold
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [id for id, sim in similarities if sim > threshold]
    
    def save(self, path: str):
        """Save the embedder to disk"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            pickle.dump({
                'embeddings': self.task_embeddings,
                'data': self.task_data
            }, f)
    
    @classmethod
    def load(cls, path: str, model_name: str = 'all-MiniLM-L6-v2'):
        """Load the embedder from disk"""
        embedder = cls(model_name)
        with open(path, 'rb') as f:
            data = pickle.load(f)
            embedder.task_embeddings = data['embeddings']
            embedder.task_data = data['data']
        return embedder