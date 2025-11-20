import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Plus, Users, FolderKanban, BarChart3, Trash2, Edit, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = {
  TODO: "bg-slate-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500"
};

const statusIcons = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  IN_REVIEW: AlertCircle,
  DONE: CheckCircle2
};

const priorityColors = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-amber-500",
  CRITICAL: "text-red-500"
};

function App() {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form states
  const [userForm, setUserForm] = useState({ name: "", email: "", avatar_color: "#3b82f6" });
  const [projectForm, setProjectForm] = useState({ name: "", description: "", owner_id: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", project_id: "", assigned_to: "", priority: "MEDIUM" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes, tasksRes, metricsRes] = await Promise.all([
        axios.get(`${API}/users`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/tasks`),
        axios.get(`${API}/metrics/overview`)
      ]);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    }
  };

  // User operations
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API}/users/${editingItem.id}`, userForm);
        toast.success("User updated successfully");
      } else {
        await axios.post(`${API}/users`, userForm);
        toast.success("User created successfully");
      }
      setShowUserModal(false);
      setUserForm({ name: "", email: "", avatar_color: "#3b82f6" });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save user");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${API}/users/${id}`);
      toast.success("User deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  // Project operations
  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API}/projects/${editingItem.id}`, { name: projectForm.name, description: projectForm.description });
        toast.success("Project updated successfully");
      } else {
        await axios.post(`${API}/projects`, projectForm);
        toast.success("Project created successfully");
      }
      setShowProjectModal(false);
      setProjectForm({ name: "", description: "", owner_id: "" });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save project");
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project? All tasks will be deleted.")) return;
    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Project deleted successfully");
      setSelectedProject(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  // Task operations
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API}/tasks/${editingItem.id}`, taskForm);
        toast.success("Task updated successfully");
      } else {
        await axios.post(`${API}/tasks`, taskForm);
        toast.success("Task created successfully");
      }
      setShowTaskModal(false);
      setTaskForm({ title: "", description: "", project_id: "", assigned_to: "", priority: "MEDIUM" });
      setEditingItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save task");
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.patch(`${API}/tasks/${taskId}/status`, { status: newStatus });
      toast.success("Task status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await axios.delete(`${API}/tasks/${id}`);
      toast.success("Task deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const openUserModal = (user = null) => {
    if (user) {
      setUserForm({ name: user.name, email: user.email, avatar_color: user.avatar_color });
      setEditingItem(user);
    } else {
      setUserForm({ name: "", email: "", avatar_color: "#3b82f6" });
      setEditingItem(null);
    }
    setShowUserModal(true);
  };

  const openProjectModal = (project = null) => {
    if (project) {
      setProjectForm({ name: project.name, description: project.description, owner_id: project.owner_id });
      setEditingItem(project);
    } else {
      setProjectForm({ name: "", description: "", owner_id: users[0]?.id || "" });
      setEditingItem(null);
    }
    setShowProjectModal(true);
  };

  const openTaskModal = (task = null) => {
    if (task) {
      setTaskForm({ title: task.title, description: task.description, project_id: task.project_id, assigned_to: task.assigned_to || "", priority: task.priority });
      setEditingItem(task);
    } else {
      setTaskForm({ title: "", description: "", project_id: selectedProject?.id || projects[0]?.id || "", assigned_to: "", priority: "MEDIUM" });
      setEditingItem(null);
    }
    setShowTaskModal(true);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : "Unknown";
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : "Unknown";
  };

  const renderKanbanBoard = () => {
    const projectTasks = selectedProject ? tasks.filter(t => t.project_id === selectedProject.id) : [];
    const columns = {
      TODO: projectTasks.filter(t => t.status === "TODO"),
      IN_PROGRESS: projectTasks.filter(t => t.status === "IN_PROGRESS"),
      IN_REVIEW: projectTasks.filter(t => t.status === "IN_REVIEW"),
      DONE: projectTasks.filter(t => t.status === "DONE")
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        {Object.entries(columns).map(([status, statusTasks]) => {
          const StatusIcon = statusIcons[status];
          return (
            <div key={status} className="flex flex-col">
              <div className={`flex items-center gap-2 p-3 rounded-lg ${statusColors[status]} text-white mb-3`}>
                <StatusIcon className="w-4 h-4" />
                <h3 className="font-semibold text-sm">{status.replace('_', ' ')}</h3>
                <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">{statusTasks.length}</span>
              </div>
              <div className="space-y-2 flex-1">
                {statusTasks.map(task => (
                  <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`task-card-${task.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-medium leading-tight">{task.title}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTaskModal(task)} data-testid={`edit-task-${task.id}`}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteTask(task.id)} data-testid={`delete-task-${task.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs line-clamp-2">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${priorityColors[task.priority]}`}>{task.priority}</span>
                        {task.assigned_to && (
                          <span className="text-muted-foreground">{getUserName(task.assigned_to)}</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {status !== "TODO" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={() => updateTaskStatus(task.id, "TODO")} data-testid={`move-task-${task.id}-todo`}>
                            To Do
                          </Button>
                        )}
                        {status !== "IN_PROGRESS" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")} data-testid={`move-task-${task.id}-in-progress`}>
                            In Progress
                          </Button>
                        )}
                        {status !== "DONE" && (
                          <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={() => updateTaskStatus(task.id, "DONE")} data-testid={`move-task-${task.id}-done`}>
                            Done
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>TaskMaster</h1>
              <p className="text-sm text-slate-600">Cloud-Powered Project Management</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => openUserModal()} className="bg-blue-600 hover:bg-blue-700" data-testid="create-user-btn">
                <Plus className="w-4 h-4 mr-1" /> User
              </Button>
              <Button onClick={() => openProjectModal()} className="bg-cyan-600 hover:bg-cyan-700" data-testid="create-project-btn">
                <Plus className="w-4 h-4 mr-1" /> Project
              </Button>
              <Button onClick={() => openTaskModal()} className="bg-teal-600 hover:bg-teal-700" data-testid="create-task-btn">
                <Plus className="w-4 h-4 mr-1" /> Task
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6" data-testid="main-tabs">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">
              <FolderKanban className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="projects" data-testid="projects-tab">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="metrics" data-testid="metrics-tab">
              <BarChart3 className="w-4 h-4 mr-2" />
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" data-testid="dashboard-content">
            {selectedProject ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Button variant="ghost" onClick={() => setSelectedProject(null)} className="mb-2" data-testid="back-to-projects-btn">
                      ← Back to Projects
                    </Button>
                    <h2 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{selectedProject.name}</h2>
                    <p className="text-slate-600">{selectedProject.description}</p>
                  </div>
                  <Button onClick={() => openTaskModal()} className="bg-teal-600 hover:bg-teal-700" data-testid="add-task-to-project-btn">
                    <Plus className="w-4 h-4 mr-1" /> Add Task
                  </Button>
                </div>
                {renderKanbanBoard()}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Select a Project</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(project => (
                    <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-all hover:scale-105" onClick={() => setSelectedProject(project)} data-testid={`project-card-${project.id}`}>
                      <CardHeader>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Owner: {getUserName(project.owner_id)}</span>
                          <span className="text-slate-500">{tasks.filter(t => t.project_id === project.id).length} tasks</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {projects.length === 0 && (
                    <Card className="col-span-full">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FolderKanban className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500">No projects yet. Create your first project!</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" data-testid="projects-content">
            <div className="space-y-4">
              {projects.map(project => (
                <Card key={project.id} data-testid={`project-item-${project.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                        <p className="text-sm text-slate-500 mt-2">Owner: {getUserName(project.owner_id)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => openProjectModal(project)} data-testid={`edit-project-${project.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-red-500" onClick={() => deleteProject(project.id)} data-testid={`delete-project-${project.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" data-testid="users-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(user => (
                <Card key={user.id} data-testid={`user-card-${user.id}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user.avatar_color }}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{user.name}</CardTitle>
                        <CardDescription className="text-xs">{user.email}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUserModal(user)} data-testid={`edit-user-${user.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteUser(user.id)} data-testid={`delete-user-${user.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" data-testid="metrics-content">
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-600">Total Projects</CardTitle>
                    <p className="text-3xl font-bold text-blue-600">{metrics.total_projects}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
                    <p className="text-3xl font-bold text-cyan-600">{metrics.total_tasks}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-600">Completed Tasks</CardTitle>
                    <p className="text-3xl font-bold text-emerald-600">{metrics.completed_tasks}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
                    <p className="text-3xl font-bold text-purple-600">{metrics.total_users}</p>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-slate-600">Avg Completion Time</CardTitle>
                    <p className="text-3xl font-bold text-amber-600">
                      {metrics.average_completion_time_days ? `${metrics.average_completion_time_days}d` : "N/A"}
                    </p>
                  </CardHeader>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent data-testid="user-modal">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>Enter user details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required data-testid="user-name-input" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required data-testid="user-email-input" />
              </div>
              <div>
                <Label htmlFor="color">Avatar Color</Label>
                <Input id="color" type="color" value={userForm.avatar_color} onChange={(e) => setUserForm({ ...userForm, avatar_color: e.target.value })} data-testid="user-color-input" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="user-submit-btn">{editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent data-testid="project-modal">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Project" : "Create Project"}</DialogTitle>
            <DialogDescription>Enter project details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProjectSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="project-name">Name</Label>
                <Input id="project-name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required data-testid="project-name-input" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} required data-testid="project-description-input" />
              </div>
              {!editingItem && (
                <div>
                  <Label htmlFor="owner">Owner</Label>
                  <Select value={projectForm.owner_id} onValueChange={(value) => setProjectForm({ ...projectForm, owner_id: value })} required>
                    <SelectTrigger data-testid="project-owner-select">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="project-submit-btn">{editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent data-testid="task-modal">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Task" : "Create Task"}</DialogTitle>
            <DialogDescription>Enter task details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="task-title">Title</Label>
                <Input id="task-title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required data-testid="task-title-input" />
              </div>
              <div>
                <Label htmlFor="task-description">Description</Label>
                <Textarea id="task-description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} required data-testid="task-description-input" />
              </div>
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={taskForm.project_id} onValueChange={(value) => setTaskForm({ ...taskForm, project_id: value })} required>
                  <SelectTrigger data-testid="task-project-select">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assigned">Assigned To (Optional)</Label>
                <Select value={taskForm.assigned_to} onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value })}>
                  <SelectTrigger data-testid="task-assigned-select">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })} required>
                  <SelectTrigger data-testid="task-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="task-submit-btn">{editingItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
