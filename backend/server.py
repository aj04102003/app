from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Project Management API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Enums
class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"

class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    avatar_color: str = "#3b82f6"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    avatar_color: Optional[str] = "#3b82f6"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_color: Optional[str] = None

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    owner_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    description: str
    owner_id: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    project_id: str
    assigned_to: Optional[str] = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    title: str
    description: str
    project_id: str
    assigned_to: Optional[str] = None
    priority: Optional[TaskPriority] = TaskPriority.MEDIUM

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None

class TaskStatusUpdate(BaseModel):
    status: TaskStatus

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    user_id: str
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    task_id: str
    user_id: str
    text: str

class ProjectMetrics(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    todo_tasks: int
    average_completion_time_days: Optional[float]
    completion_rate: float

class OverviewMetrics(BaseModel):
    total_projects: int
    total_tasks: int
    total_users: int
    completed_tasks: int
    average_completion_time_days: Optional[float]

# Helper functions
def serialize_datetime(obj):
    """Convert datetime to ISO string for MongoDB"""
    if isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def deserialize_datetime(obj):
    """Convert ISO string back to datetime"""
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if isinstance(v, str) and 'T' in v:
                try:
                    result[k] = datetime.fromisoformat(v)
                except:
                    result[k] = v
            else:
                result[k] = v
        return result
    return obj

# User Endpoints
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(**user_data.model_dump())
    doc = serialize_datetime(user.model_dump())
    await db.users.insert_one(doc)
    return user

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(u) for u in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return deserialize_datetime(user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        user.update(update_data)
    
    return deserialize_datetime(user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

# Project Endpoints
@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate):
    # Check if owner exists
    owner = await db.users.find_one({"id": project_data.owner_id})
    if not owner:
        raise HTTPException(status_code=404, detail="Owner user not found")
    
    project = Project(**project_data.model_dump())
    doc = serialize_datetime(project.model_dump())
    await db.projects.insert_one(doc)
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return deserialize_datetime(project)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in project_data.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.projects.update_one({"id": project_id}, {"$set": update_data})
        project.update(update_data)
    
    return deserialize_datetime(project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Also delete all tasks and comments for this project
    await db.tasks.delete_many({"project_id": project_id})
    return {"message": "Project deleted successfully"}

# Task Endpoints
@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate):
    # Check if project exists
    project = await db.projects.find_one({"id": task_data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if assigned user exists (if provided)
    if task_data.assigned_to:
        user = await db.users.find_one({"id": task_data.assigned_to})
        if not user:
            raise HTTPException(status_code=404, detail="Assigned user not found")
    
    task = Task(**task_data.model_dump())
    doc = serialize_datetime(task.model_dump())
    await db.tasks.insert_one(doc)
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(
    project_id: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    status: Optional[TaskStatus] = Query(None)
):
    filter_query = {}
    if project_id:
        filter_query["project_id"] = project_id
    if assigned_to:
        filter_query["assigned_to"] = assigned_to
    if status:
        filter_query["status"] = status
    
    tasks = await db.tasks.find(filter_query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(t) for t in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return deserialize_datetime(task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_data.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # If status is being changed to DONE, set completed_at
        if 'status' in update_data and update_data['status'] == TaskStatus.DONE:
            update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
        # If status is changed from DONE to something else, clear completed_at
        elif 'status' in update_data and update_data['status'] != TaskStatus.DONE:
            update_data['completed_at'] = None
        
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
        task.update(update_data)
    
    return deserialize_datetime(task)

@api_router.patch("/tasks/{task_id}/status", response_model=Task)
async def update_task_status(task_id: str, status_data: TaskStatusUpdate):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {
        'status': status_data.status,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if status_data.status == TaskStatus.DONE:
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    else:
        update_data['completed_at'] = None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    task.update(update_data)
    
    return deserialize_datetime(task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Also delete all comments for this task
    await db.comments.delete_many({"task_id": task_id})
    return {"message": "Task deleted successfully"}

# Comment Endpoints
@api_router.post("/comments", response_model=Comment)
async def create_comment(comment_data: CommentCreate):
    # Check if task exists
    task = await db.tasks.find_one({"id": comment_data.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user exists
    user = await db.users.find_one({"id": comment_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    comment = Comment(**comment_data.model_dump())
    doc = serialize_datetime(comment.model_dump())
    await db.comments.insert_one(doc)
    return comment

@api_router.get("/comments", response_model=List[Comment])
async def get_comments(task_id: Optional[str] = Query(None)):
    filter_query = {}
    if task_id:
        filter_query["task_id"] = task_id
    
    comments = await db.comments.find(filter_query, {"_id": 0}).to_list(1000)
    return [deserialize_datetime(c) for c in comments]

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    result = await db.comments.delete_one({"id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted successfully"}

# Metrics Endpoints
@api_router.get("/metrics/project/{project_id}", response_model=ProjectMetrics)
async def get_project_metrics(project_id: str):
    # Check if project exists
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all tasks for this project
    tasks = await db.tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get('status') == 'DONE'])
    in_progress_tasks = len([t for t in tasks if t.get('status') == 'IN_PROGRESS'])
    todo_tasks = len([t for t in tasks if t.get('status') == 'TODO'])
    
    # Calculate average completion time
    completion_times = []
    for task in tasks:
        if task.get('completed_at') and task.get('created_at'):
            created = datetime.fromisoformat(task['created_at']) if isinstance(task['created_at'], str) else task['created_at']
            completed = datetime.fromisoformat(task['completed_at']) if isinstance(task['completed_at'], str) else task['completed_at']
            delta = completed - created
            completion_times.append(delta.total_seconds() / 86400)  # Convert to days
    
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else None
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    return ProjectMetrics(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        todo_tasks=todo_tasks,
        average_completion_time_days=round(avg_completion_time, 2) if avg_completion_time else None,
        completion_rate=round(completion_rate, 2)
    )

@api_router.get("/metrics/overview", response_model=OverviewMetrics)
async def get_overview_metrics():
    total_projects = await db.projects.count_documents({})
    total_tasks = await db.tasks.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Get all completed tasks
    completed_tasks_list = await db.tasks.find({"status": "DONE"}, {"_id": 0}).to_list(1000)
    completed_tasks = len(completed_tasks_list)
    
    # Calculate average completion time across all tasks
    completion_times = []
    for task in completed_tasks_list:
        if task.get('completed_at') and task.get('created_at'):
            created = datetime.fromisoformat(task['created_at']) if isinstance(task['created_at'], str) else task['created_at']
            completed = datetime.fromisoformat(task['completed_at']) if isinstance(task['completed_at'], str) else task['completed_at']
            delta = completed - created
            completion_times.append(delta.total_seconds() / 86400)
    
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else None
    
    return OverviewMetrics(
        total_projects=total_projects,
        total_tasks=total_tasks,
        total_users=total_users,
        completed_tasks=completed_tasks,
        average_completion_time_days=round(avg_completion_time, 2) if avg_completion_time else None
    )

# Root endpoint
@api_router.get("/")
async def root():
    return {
        "message": "Project Management API",
        "version": "1.0.0",
        "endpoints": {
            "users": "/api/users",
            "projects": "/api/projects",
            "tasks": "/api/tasks",
            "comments": "/api/comments",
            "metrics": "/api/metrics"
        }
    }

# Include router
app.include_router(api_router)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
