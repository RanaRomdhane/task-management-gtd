from typing import List, Dict, Optional, Tuple
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from .embeddings import TaskEmbedder
import random
from enum import Enum
from datetime import datetime, timedelta
import networkx as nx
from transformers import pipeline
import torch

class TaskModel:
    def __init__(self, embedder: TaskEmbedder):
        self.embedder = embedder
        self.dependency_classifier = None
        self.priority_predictor = None
        self.duration_predictor = None
        self.task_graph = nx.DiGraph()
        
        # Initialize NLP pipeline for advanced understanding
        self.nlp_pipeline = pipeline(
            "text-classification",
            model="microsoft/DialoGPT-medium",
            return_all_scores=True
        )
        
        # Task patterns for dependency inference
        self.dependency_patterns = {
            'contract': ['legal_review', 'template_creation', 'client_approval'],
            'presentation': ['research', 'content_creation', 'design', 'rehearsal'],
            'development': ['requirements', 'design', 'implementation', 'testing', 'deployment'],
            'report': ['data_collection', 'analysis', 'writing', 'review', 'formatting'],
            'meeting': ['agenda_preparation', 'invite_participants', 'book_room', 'follow_up'],
            'marketing': ['strategy', 'content_creation', 'approval', 'distribution', 'analytics']
        }
        
    def train_dependency_model(self, training_data: List[Dict]):
        """Train ML model for dependency prediction"""
        features = []
        labels = []
        
        for item in training_data:
            if 'dependencies' in item:
                task_features = self._extract_task_features(item)
                features.append(task_features)
                labels.append(len(item['dependencies']))
        
        if features:
            self.dependency_classifier = RandomForestClassifier(n_estimators=100)
            self.dependency_classifier.fit(features, labels)
    
    def train_priority_model(self, training_data: List[Dict]):
        """Train ML model for priority prediction"""
        features = []
        priorities = []
        
        priority_mapping = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        
        for item in training_data:
            task_features = self._extract_task_features(item)
            features.append(task_features)
            priorities.append(priority_mapping.get(item.get('priority', 'medium'), 2))
        
        if features:
            self.priority_predictor = GradientBoostingRegressor(n_estimators=100)
            self.priority_predictor.fit(features, priorities)
    
    def _extract_task_features(self, task: Dict) -> List[float]:
        """Extract numerical features from task for ML models"""
        features = []
        
        # Text features via embeddings
        text = f"{task.get('title', '')} {task.get('description', '')}"
        embedding = self.embedder.model.encode(text)
        features.extend(embedding.tolist())
        
        # Categorical features
        type_encoding = self._encode_task_type(task.get('type', 'other'))
        features.extend(type_encoding)
        
        # Temporal features
        due_date = task.get('dueDate')
        if due_date:
            days_until_due = (datetime.fromisoformat(due_date) - datetime.now()).days
            features.append(max(0, days_until_due))
            features.append(1 if days_until_due < 7 else 0)  # Urgent flag
        else:
            features.extend([30, 0])  # Default values
        
        # Duration features
        duration = task.get('estimatedDuration', 60)
        features.append(duration)
        features.append(1 if duration > 120 else 0)  # Long task flag
        
        return features
    
    def _encode_task_type(self, task_type: str) -> List[float]:
        """One-hot encode task type"""
        types = ['work', 'personal', 'learning', 'admin', 'meeting', 'creative', 'communication', 'other']
        encoding = [0.0] * len(types)
        if task_type in types:
            encoding[types.index(task_type)] = 1.0
        return encoding
    
    def group_similar_tasks(self, tasks: List[Dict], adaptive_eps: bool = True) -> List[Dict]:
        """Enhanced task grouping with adaptive clustering"""
        if not tasks:
            return []
            
        # Add all tasks to the embedder
        for task in tasks:
            self.embedder.add_task(task)
            
        # Get embeddings for all tasks
        embeddings = np.array([self.embedder.task_embeddings[task['id']] for task in tasks])
        
        # Adaptive epsilon based on data characteristics
        if adaptive_eps:
            distances = []
            for i in range(len(embeddings)):
                for j in range(i+1, len(embeddings)):
                    dist = np.linalg.norm(embeddings[i] - embeddings[j])
                    distances.append(dist)
            
            eps = np.percentile(distances, 30)  # Use 30th percentile as threshold
        else:
            eps = 0.5
        
        # Cluster using DBSCAN with adaptive parameters
        clustering = DBSCAN(eps=eps, min_samples=max(2, len(tasks) // 10)).fit(embeddings)
        labels = clustering.labels_
        
        # Create enhanced groups with metadata
        groups = {}
        for task, label in zip(tasks, labels):
            if label == -1:  # Noise - create individual groups for important tasks
                if task.get('priority') in ['high', 'critical']:
                    unique_label = f"individual_{task['id']}"
                    groups[unique_label] = {
                        'name': f"Individual: {task['title'][:30]}...",
                        'taskIds': [task['id']],
                        'priority': task.get('priority', 'medium'),
                        'estimatedDuration': task.get('estimatedDuration', 60)
                    }
                continue
                
            if label not in groups:
                groups[label] = {
                    'name': f"Group {label}",
                    'taskIds': [],
                    'priority': 'medium',
                    'estimatedDuration': 0
                }
            
            groups[label]['taskIds'].append(task['id'])
            groups[label]['estimatedDuration'] += task.get('estimatedDuration', 60)
            
            # Upgrade group priority if needed
            task_priority = task.get('priority', 'medium')
            if self._priority_level(task_priority) > self._priority_level(groups[label]['priority']):
                groups[label]['priority'] = task_priority
        
        # Generate intelligent group names
        for group in groups.values():
            if len(group['taskIds']) > 1:
                sample_tasks = [t for t in tasks if t['id'] in group['taskIds'][:3]]
                common_type = self._find_common_type(sample_tasks)
                common_keywords = self._extract_common_keywords(sample_tasks)
                group['name'] = f"{common_type.title()}: {common_keywords}"
            
        return list(groups.values())
    
    def _priority_level(self, priority: str) -> int:
        mapping = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        return mapping.get(priority, 2)
    
    def _find_common_type(self, tasks: List[Dict]) -> str:
        types = [t.get('type', 'other') for t in tasks]
        return max(set(types), key=types.count)
    
    def _extract_common_keywords(self, tasks: List[Dict]) -> str:
        """Extract common keywords from task titles"""
        words = []
        for task in tasks:
            title_words = task.get('title', '').lower().split()
            words.extend([w for w in title_words if len(w) > 3])
        
        if words:
            common_word = max(set(words), key=words.count)
            return common_word.title()
        return "Related Tasks"
    
    def infer_dependencies(self, task: Dict) -> List[Dict]:
        """Advanced dependency inference using patterns and ML"""
        dependencies = []
        
        # Pattern-based inference
        task_title = task.get('title', '').lower()
        task_type = task.get('type', 'other')
        
        # Check for keyword patterns
        for pattern_key, deps in self.dependency_patterns.items():
            if pattern_key in task_title or pattern_key in task.get('description', '').lower():
                for i, dep_type in enumerate(deps):
                    dependencies.append({
                        'title': f"{dep_type.replace('_', ' ').title()} for {task['title']}",
                        'description': f"Required step {i+1} to complete {task['title']}",
                        'type': task_type,
                        'priority': 'high' if i < 2 else 'medium',
                        'estimatedDuration': max(30, task.get('estimatedDuration', 60) // len(deps)),
                        'dependencyType': 'prerequisite'
                    })
                break
        
        # ML-based inference if model is trained
        if self.dependency_classifier:
            features = self._extract_task_features(task)
            predicted_dep_count = self.dependency_classifier.predict([features])[0]
            
            # Generate additional dependencies if ML suggests more
            if predicted_dep_count > len(dependencies):
                additional_deps = self._generate_smart_dependencies(task, predicted_dep_count - len(dependencies))
                dependencies.extend(additional_deps)
        
        # Add temporal dependencies
        if task.get('dueDate'):
            buffer_task = {
                'title': f"Buffer time for {task['title']}",
                'description': f"Buffer time to handle unexpected issues with {task['title']}",
                'type': task_type,
                'priority': 'low',
                'estimatedDuration': 30,
                'dependencyType': 'buffer'
            }
            dependencies.append(buffer_task)
        
        return dependencies
    
    def _generate_smart_dependencies(self, task: Dict, count: int) -> List[Dict]:
        """Generate intelligent dependencies based on task analysis"""
        deps = []
        task_type = task.get('type', 'other')
        
        generic_deps = {
            'work': ['stakeholder_alignment', 'resource_allocation', 'risk_assessment'],
            'learning': ['prerequisite_knowledge', 'practice_materials', 'progress_tracking'],
            'personal': ['time_blocking', 'resource_gathering', 'environment_setup'],
            'creative': ['inspiration_research', 'tool_preparation', 'feedback_planning']
        }
        
        available_deps = generic_deps.get(task_type, generic_deps['work'])
        
        for i in range(min(count, len(available_deps))):
            deps.append({
                'title': f"{available_deps[i].replace('_', ' ').title()} for {task['title']}",
                'description': f"Essential preparation step for {task['title']}",
                'type': task_type,
                'priority': 'medium',
                'estimatedDuration': 45,
                'dependencyType': 'preparation'
            })
        
        return deps
    
    def prioritize_tasks(self, tasks: List[Dict]) -> List[Dict]:
        """Advanced ML-based task prioritization"""
        prioritized = []
        
        for task in tasks:
            # Base priority score
            priority_score = self._calculate_priority_score(task)
            
            # ML prediction if available
            if self.priority_predictor:
                features = self._extract_task_features(task)
                ml_priority = self.priority_predictor.predict([features])[0]
                priority_score = (priority_score + ml_priority) / 2
            
            # Context-aware adjustments
            priority_score = self._apply_context_adjustments(task, tasks, priority_score)
            
            prioritized.append({
                'id': task['id'],
                'priority': self._score_to_priority(priority_score),
                'priorityScore': priority_score,
                'reasoning': self._generate_priority_reasoning(task, priority_score)
            })
        
        return sorted(prioritized, key=lambda x: x['priorityScore'], reverse=True)
    
    def _calculate_priority_score(self, task: Dict) -> float:
        """Calculate base priority score"""
        score = 0.0
        
        # Priority weight
        priority_weights = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        score += priority_weights.get(task.get('priority', 'medium'), 2) * 25
        
        # Due date urgency
        due_date = task.get('dueDate')
        if due_date:
            days_until_due = (datetime.fromisoformat(due_date) - datetime.now()).days
            if days_until_due <= 1:
                score += 50  # Very urgent
            elif days_until_due <= 7:
                score += 30  # Urgent
            elif days_until_due <= 30:
                score += 10  # Moderately urgent
        
        # Status impact
        if task.get('status') == 'blocked':
            score += 40  # Blocked tasks need attention
        elif task.get('status') == 'in_progress':
            score += 20  # Continue current work
        
        # Duration consideration (longer tasks might need more planning)
        duration = task.get('estimatedDuration', 60)
        if duration > 240:  # > 4 hours
            score += 15
        
        return score
    
    def _apply_context_adjustments(self, task: Dict, all_tasks: List[Dict], base_score: float) -> float:
        """Apply context-aware adjustments to priority score"""
        adjusted_score = base_score
        
        # Check for task dependencies
        dependent_tasks = [t for t in all_tasks if self._has_dependency_relationship(task, t)]
        if dependent_tasks:
            adjusted_score += len(dependent_tasks) * 5
        
        # Check for similar tasks (batching opportunity)
        similar_tasks = [t for t in all_tasks if self._are_similar_tasks(task, t)]
        if len(similar_tasks) > 2:
            adjusted_score += 10  # Batching bonus
        
        # Time-of-day considerations
        current_hour = datetime.now().hour
        task_type = task.get('type', 'other')
        
        # Optimal time bonuses
        if task_type == 'creative' and 9 <= current_hour <= 11:
            adjusted_score += 10
        elif task_type == 'admin' and 13 <= current_hour <= 15:
            adjusted_score += 10
        elif task_type == 'communication' and 10 <= current_hour <= 12:
            adjusted_score += 10
        
        return adjusted_score
    
    def _has_dependency_relationship(self, task1: Dict, task2: Dict) -> bool:
        """Check if tasks have dependency relationship"""
        # Simple heuristic - can be enhanced with ML
        title1 = task1.get('title', '').lower()
        title2 = task2.get('title', '').lower()
        
        # Check for common keywords or project names
        words1 = set(title1.split())
        words2 = set(title2.split())
        
        return len(words1.intersection(words2)) >= 2
    
    def _are_similar_tasks(self, task1: Dict, task2: Dict) -> bool:
        """Check if tasks are similar for batching"""
        if task1['id'] == task2['id']:
            return False
        
        # Same type
        if task1.get('type') != task2.get('type'):
            return False
        
        # Similar embeddings (if available)
        if task1['id'] in self.embedder.task_embeddings and task2['id'] in self.embedder.task_embeddings:
            emb1 = self.embedder.task_embeddings[task1['id']]
            emb2 = self.embedder.task_embeddings[task2['id']]
            similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
            return similarity > 0.7
        
        return False
    
    def _score_to_priority(self, score: float) -> str:
        """Convert numerical score to priority string"""
        if score >= 80:
            return 'critical'
        elif score >= 60:
            return 'high'
        elif score >= 40:
            return 'medium'
        else:
            return 'low'
    
    def _generate_priority_reasoning(self, task: Dict, score: float) -> str:
        """Generate human-readable reasoning for priority assignment"""
        reasons = []
        
        if task.get('priority') in ['high', 'critical']:
            reasons.append("high base priority")
        
        due_date = task.get('dueDate')
        if due_date:
            days_until_due = (datetime.fromisoformat(due_date) - datetime.now()).days
            if days_until_due <= 1:
                reasons.append("due tomorrow")
            elif days_until_due <= 7:
                reasons.append("due this week")
        
        if task.get('status') == 'blocked':
            reasons.append("currently blocked")
        
        if not reasons:
            reasons.append("standard prioritization")
        
        return "; ".join(reasons)
    
    def create_pomodoro_schedule(self, tasks: List[Dict]) -> List[Dict]:
        """Enhanced pomodoro scheduling with optimization"""
        # First prioritize and sort
        prioritized = self.prioritize_tasks(tasks)
        task_lookup = {t['id']: t for t in tasks}
        
        # Sort by priority score
        sorted_task_ids = [p['id'] for p in prioritized]
        sorted_tasks = [task_lookup[tid] for tid in sorted_task_ids]
        
        schedule = []
        current_time = datetime.now()
        
        for i, task in enumerate(sorted_tasks):
            duration = task.get('estimatedDuration', 30)
            
            # Calculate optimal pomodoro count (25 min work + 5 min break = 30 min cycle)
            pomodoros = max(1, round(duration / 25))
            
            # Add buffer for complex tasks
            if task.get('type') in ['creative', 'learning', 'development']:
                pomodoros += 1
            
            # Schedule timing
            start_time = current_time + timedelta(minutes=i * 30)
            end_time = start_time + timedelta(minutes=pomodoros * 30)
            
            schedule_item = {
                'taskId': task['id'],
                'pomodoroCount': pomodoros,
                'order': i,
                'startTime': start_time.isoformat(),
                'endTime': end_time.isoformat(),
                'estimatedMinutes': pomodoros * 25,
                'breakMinutes': pomodoros * 5,
                'difficulty': self._assess_task_difficulty(task),
                'energyLevel': self._recommend_energy_level(task, start_time)
            }
            
            schedule.append(schedule_item)
        
        return schedule
    
    def _assess_task_difficulty(self, task: Dict) -> str:
        """Assess task difficulty for scheduling"""
        duration = task.get('estimatedDuration', 30)
        task_type = task.get('type', 'other')
        
        complex_types = ['development', 'creative', 'learning', 'analysis']
        
        if duration > 180 or task_type in complex_types:
            return 'high'
        elif duration > 90:
            return 'medium'
        else:
            return 'low'
    
    def _recommend_energy_level(self, task: Dict, scheduled_time: datetime) -> str:
        """Recommend optimal energy level for task timing"""
        hour = scheduled_time.hour
        task_type = task.get('type', 'other')
        
        # Peak performance hours
        if 9 <= hour <= 11:
            return 'high'
        elif 14 <= hour <= 16:
            return 'medium-high'
        elif 16 <= hour <= 18:
            return 'medium'
        else:
            return 'low'