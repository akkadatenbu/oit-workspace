import { useState, useEffect, useRef } from 'react';
import { Plus, MessageSquare, LayoutGrid, List, AlignLeft, CheckSquare, Link as LinkIcon, Paperclip, Download, Calendar, Users, X, FolderInput, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Send, Clock, Timer, UserPlus, Shield, Crown, Archive, ArchiveRestore } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import Modal from '../components/Modal';
import Swal from 'sweetalert2';

const columns = ['ToDo', 'InProgress', 'Testing', 'Done'];
const columnLabels: Record<string, string> = { ToDo: 'To Do', InProgress: 'In Progress', Testing: 'Testing', Done: 'Done' };

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Urgent': return 'text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-400/10 border-red-200 dark:border-red-400/20';
    case 'High': return 'text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-400/10 border-orange-200 dark:border-orange-400/20';
    case 'Medium': return 'text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-400/10 border-blue-200 dark:border-blue-400/20';
    case 'Low': return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-400/10 border-gray-200 dark:border-gray-400/20';
    default: return 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-400/10 border-gray-200 dark:border-gray-400/20';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ToDo': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    case 'InProgress': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'Testing': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'Done': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

const getLastUpdated = (task: any): Date => {
  const base = new Date(task.updatedAt || task.createdAt);
  if (!task.comments?.length) return base;
  const latest = task.comments.reduce((a: any, b: any) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
  );
  const commentDate = new Date(latest.createdAt);
  return commentDate > base ? commentDate : base;
};

const formatRelativeTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'lastUpdated' | 'timeEstimate' | 'assignees';
  type SortDir = 'asc' | 'desc';
  const [listSortField, setListSortField] = useState<SortField>('title');
  const [listSortDir, setListSortDir] = useState<SortDir>('asc');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTargetStatus, setTaskTargetStatus] = useState('ToDo');
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium' });
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Edit Task Modal State
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskTimeEstimate, setNewSubtaskTimeEstimate] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Members Modal State
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Member' | 'Guest'>('Member');
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);

  // Move Project Modal State
  const [isMoveProjectModalOpen, setIsMoveProjectModalOpen] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<number | 'none'>('none');
  const [isMovingProject, setIsMovingProject] = useState(false);


  const fetchProject = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/projects/${id}`);
      setProject(data);
      setTasks(data.tasks || []);
      setError(null);
    } catch (err: any) {
      if (err.response && err.response.status === 404) {
        setError('Project not found');
      } else {
        setError('Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  // เปิด task modal อัตโนมัติเมื่อมาจากหน้า My Tasks
  useEffect(() => {
    const openTaskId = searchParams.get('openTask');
    if (!openTaskId || tasks.length === 0) return;
    const task = tasks.find(t => t.id === Number(openTaskId));
    if (task) {
      setSelectedTask(task);
      setIsEditModalOpen(true);
      setSearchParams({}, { replace: true }); // เคลียร์ param ออกจาก URL
    }
  }, [tasks, searchParams]);

  const fetchPendingInvitations = async () => {
    try {
      const { data } = await apiClient.get(`/projects/${id}/invitations`);
      setPendingInvitations(data);
    } catch { /* silent */ }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setIsInviting(true);
      await apiClient.post(`/projects/${id}/invite`, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      await fetchPendingInvitations();
      Swal.fire({ icon: 'success', title: 'ส่งคำเชิญแล้ว!', text: `ส่งลิงก์ยืนยันไปที่ ${inviteEmail.trim()} เรียบร้อย`, timer: 3000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to send invitation', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (invId: number, email: string) => {
    try {
      await apiClient.delete(`/invitations/${invId}`);
      setPendingInvitations(prev => prev.filter(i => i.id !== invId));
    } catch {
      Swal.fire('Error', `Failed to cancel invitation to ${email}`, 'error');
    }
  };


  const handleRemoveMember = async (userId: number, displayName: string) => {
    const result = await Swal.fire({
      title: `Remove "${displayName}"?`,
      text: 'They will no longer have access to this project.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Remove'
    });
    if (!result.isConfirmed) return;
    try {
      await apiClient.delete(`/projects/${id}/members/${userId}`);
      await fetchProject();
    } catch (err) {
      Swal.fire('Error', 'Failed to remove member', 'error');
    }
  };

  const handleOpenMoveProjectModal = async () => {
    setIsMoveProjectModalOpen(true);
    try {
      const { data } = await apiClient.get('/spaces');
      const folders = data.flatMap((s: any) => s.folders || []);
      setAvailableFolders(folders);
      setTargetFolderId(project?.folderId || 'none');
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsMovingProject(true);
      await apiClient.patch(`/projects/${id}`, {
        folderId: targetFolderId === 'none' ? null : Number(targetFolderId)
      });
      setIsMoveProjectModalOpen(false);
      window.location.reload(); // Reload to refresh Sidebar and Project
    } catch (err) {
      Swal.fire('Error', 'Failed to move project', 'error');
    } finally {
      setIsMovingProject(false);
    }
  };

  const handleRenameProject = async () => {
    const { value: newName } = await Swal.fire({
      title: 'Rename Project',
      input: 'text',
      inputValue: project?.name,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'Project name is required!';
      }
    });

    if (newName && newName !== project?.name) {
      try {
        await apiClient.patch(`/projects/${id}`, { name: newName });
        setProject({...project, name: newName});
        // Reload to refresh Sidebar
        window.location.reload();
      } catch (err) {
        Swal.fire('Error', 'Failed to rename project', 'error');
      }
    }
  };

  const handleDeleteProject = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this! All tasks in this project will be deleted.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/projects/${id}`);
        Swal.fire('Deleted!', 'Project has been deleted.', 'success').then(() => {
          navigate('/dashboard');
          window.location.reload();
        });
      } catch (err) {
        Swal.fire('Error', 'Failed to delete project', 'error');
      }
    }
  };

  const handleCreateSample = async () => {
    try {
      setLoading(true);
      const spaceRes = await apiClient.post('/spaces', { name: 'Development Space', description: 'Main space for dev team' });
      const projRes = await apiClient.post('/projects', { spaceId: spaceRes.data.id, name: 'OIT Core System Upgrade', description: 'Sample project' });
      
      // Create some sample tasks
      await apiClient.post('/tasks', { projectId: projRes.data.id, title: 'Setup Server Infrastructure (Ubuntu 24 + Nginx)', status: 'ToDo', priority: 'High' });
      await apiClient.post('/tasks', { projectId: projRes.data.id, title: 'Design Database Schema for OIT WorkSpace', status: 'InProgress', priority: 'Urgent' });
      await apiClient.post('/tasks', { projectId: projRes.data.id, title: 'Implement OAuth Login with Google', status: 'Testing', priority: 'Medium' });
      
      navigate(`/projects/${projRes.data.id}`);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to create sample project', 'error');
      setLoading(false);
    }
  };

  const handleOpenTaskModal = (status: string) => {
    setTaskTargetStatus(status);
    setNewTask({ title: '', priority: 'Medium' });
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      setIsCreatingTask(true);
      const { data } = await apiClient.post('/tasks', {
        projectId: Number(id),
        title: newTask.title.trim(),
        status: taskTargetStatus,
        priority: newTask.priority
      });
      setTasks([...tasks, data]);
      setIsTaskModalOpen(false);
      setNewTask({ title: '', priority: 'Medium' });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to create task', 'error');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = Number(draggableId);
    
    if (destination.droppableId === source.droppableId) {
      // Reorder in the same column
      const colTasks = tasks.filter(t => t.status === source.droppableId);
      const otherTasks = tasks.filter(t => t.status !== source.droppableId);
      
      const newColTasks = Array.from(colTasks);
      const [movedTask] = newColTasks.splice(source.index, 1);
      newColTasks.splice(destination.index, 0, movedTask);
      
      setTasks([...newColTasks, ...otherTasks]);
      // Note: Database order isn't saved yet as there's no order field, but UI will reflect it.
      return;
    }

    const newStatus = destination.droppableId;
    
    // Optimistic UI update for moving across columns
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: newStatus });
    } catch (err) {
      console.error(err);
      // Removed revert on failure since we don't have originalTasks anymore
      Swal.fire('Error', 'Failed to update task status', 'error');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;
    try {
      const { data } = await apiClient.post('/tasks', {
        projectId: Number(id),
        title: newSubtaskTitle.trim(),
        parentTaskId: selectedTask.id,
        ...(newSubtaskDueDate ? { dueDate: newSubtaskDueDate } : {}),
        ...(newSubtaskTimeEstimate.trim() ? { timeEstimate: newSubtaskTimeEstimate.trim() } : {}),
      });
      const updatedTask = { ...selectedTask, subTasks: [...(selectedTask.subTasks || []), data] };
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setNewSubtaskTitle('');
      setNewSubtaskDueDate('');
      setNewSubtaskTimeEstimate('');
    } catch (err) {
      Swal.fire('Error', 'Failed to add subtask', 'error');
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !selectedTask) return;
    try {
      const { data } = await apiClient.post(`/tasks/${selectedTask.id}/links`, {
        title: newLinkTitle.trim() || newLinkUrl.trim(),
        url: newLinkUrl.trim()
      });
      const updatedTask = { ...selectedTask, links: [...(selectedTask.links || []), data] };
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setNewLinkUrl('');
      setNewLinkTitle('');
    } catch (err) {
      Swal.fire('Error', 'Failed to add link', 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    try {
      const { data } = await apiClient.post(`/tasks/${selectedTask.id}/comments`, {
        text: newCommentText.trim()
      });
      const updatedTask = { 
        ...selectedTask, 
        comments: [data, ...(selectedTask.comments || [])] 
      };
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setNewCommentText('');
    } catch (err) {
      Swal.fire('Error', 'Failed to post comment', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedTask) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    try {
      const { data } = await apiClient.post(`/tasks/${selectedTask.id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedTask = { ...selectedTask, attachments: [...(selectedTask.attachments || []), data] };
      setSelectedTask(updatedTask);
      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    } catch (err) {
      Swal.fire('Error', 'Failed to upload file', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // สิทธิ์จัดการ: Admin / เจ้าของ space / project Owner เท่านั้น
  const spaceOwnerId = (project?.space as any)?.ownerId;
  const myProjectRole = project?.members?.find((m: any) => m.userId === user?.id)?.role;
  const canManage = user?.systemRole === 'Admin'
    || spaceOwnerId === null
    || spaceOwnerId === user?.id
    || myProjectRole === 'Owner';

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4 md:p-6">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 animate-pulse">Loading Project Data...</p>
      </div>
    );
  }

  if (error === 'Project not found') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-lg flex flex-col items-center bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-white/5 p-10 text-center shadow-sm">
        <LayoutGrid className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Project Selected</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">It looks like this project doesn't exist yet or you're starting fresh. You can create a sample project to see how everything works.</p>
        <button onClick={handleCreateSample} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5">
          Create Sample Project
        </button>
      </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0 shrink-0">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-2 py-1 rounded-md">{project?.space?.name}</span>
          </div>
          <div className="flex items-center space-x-3">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{project?.name}</h2>
            <button 
              onClick={handleRenameProject}
              title="Rename Project"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button 
              onClick={handleOpenMoveProjectModal}
              title="Move to Folder"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <FolderInput className="w-5 h-5" />
            </button>
            <button 
              onClick={handleDeleteProject}
              title="Delete Project"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm max-w-2xl">{project?.description || 'No description provided.'}</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Members avatars + manage button */}
          <button
            onClick={() => { setIsMembersModalOpen(true); fetchPendingInvitations(); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl hover:border-blue-400 transition-colors text-sm text-gray-600 dark:text-gray-400"
            title="Manage project members"
          >
            <div className="flex -space-x-2">
              {project?.members?.slice(0, 4).map((m: any) => (
                <div key={m.userId} className="w-6 h-6 rounded-full border-2 border-white dark:border-[#121212] overflow-hidden bg-blue-100 flex items-center justify-center shrink-0" title={m.user?.displayName}>
                  {m.user?.avatarUrl
                    ? <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[9px] font-bold text-blue-600">{m.user?.displayName?.charAt(0)}</span>
                  }
                </div>
              ))}
            </div>
            <UserPlus className="w-4 h-4" />
            <span className="text-xs font-medium">{project?.members?.length ?? 0}</span>
          </button>

          {/* Archived toggle */}
          {(() => {
            const archivedCount = tasks.filter(t => t.isArchived && t.parentTaskId === null).length;
            return archivedCount > 0 ? (
              <button
                onClick={() => setShowArchived(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  showArchived
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400'
                    : 'bg-white dark:bg-[#121212] border-gray-200 dark:border-white/10 text-gray-500 hover:border-amber-300 dark:hover:border-amber-500/40'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Archived ({archivedCount})
              </button>
            ) : null;
          })()}

          <div className="bg-white dark:bg-[#121212] rounded-lg p-1 border border-gray-200 dark:border-white/5 flex shadow-sm">
             <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}><LayoutGrid className="w-5 h-5" /></button>
             <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}><List className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 flex gap-4 pb-4 items-start min-h-0">
            {columns.map(columnId => {
              const colTasks = tasks.filter(t => t.status === columnId && t.parentTaskId === null && !t.isArchived);
              return (
                <div key={columnId} className="flex-1 min-w-0 flex flex-col bg-gray-50/80 dark:bg-[#121212]/60 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/5 p-4 h-full">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${columnId === 'ToDo' ? 'bg-gray-400' : columnId === 'InProgress' ? 'bg-blue-400' : columnId === 'Testing' ? 'bg-orange-400' : 'bg-green-400'}`} />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-200">{columnLabels[columnId]}</h3>
                      <span className="bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 text-xs px-2.5 py-1 rounded-full font-medium border border-gray-200 dark:border-white/5">
                        {colTasks.length}
                      </span>
                    </div>
                  </div>

                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps} 
                        className={`flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[150px] ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-white/5 rounded-xl' : ''}`}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => {
                                  setSelectedTask(task);
                                  setIsEditModalOpen(true);
                                }}
                                style={provided.draggableProps.style}
                                className={`mb-2 bg-white dark:bg-[#18181b] p-3 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm group relative overflow-hidden select-none cursor-pointer ${snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-blue-500 opacity-90' : 'hover:border-blue-400'}`}
                              >
                                <div className={`absolute top-0 left-0 w-full h-[2px] ${
                                  task.priority === 'Urgent' ? 'bg-gradient-to-r from-red-500 to-transparent' : 
                                  task.priority === 'High' ? 'bg-gradient-to-r from-orange-500 to-transparent' : 
                                  task.priority === 'Medium' ? 'bg-gradient-to-r from-blue-500 to-transparent' : 'bg-transparent'
                                }`} />
                                
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {task.timeEstimate && (
                                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md border text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20">
                                        <Timer className="w-3 h-3" />{task.timeEstimate}
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20' : 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-gray-400'}`}>
                                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <h4 className="text-gray-800 dark:text-gray-100 font-medium text-sm mb-2 leading-snug">{task.title}</h4>
                                {(task.progressPercent > 0 || task.progressPercent === 0) && (
                                  <div className="mb-2">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                      <span>Progress</span>
                                      <span className="font-semibold text-blue-500">{task.progressPercent ?? 0}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                          width: `${task.progressPercent ?? 0}%`,
                                          background: task.progressPercent === 100
                                            ? '#22c55e'
                                            : task.progressPercent >= 50
                                              ? '#3b82f6'
                                              : '#f97316'
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center space-x-3 text-gray-500">
                                    <div className="flex items-center text-xs">
                                      <CheckSquare className="w-4 h-4 mr-1.5" />
                                      {task.subTasks ? task.subTasks.filter((s:any) => s.status === 'Done').length : 0}/{task.subTasks ? task.subTasks.length : 0}
                                    </div>
                                    <div className="flex items-center text-xs">
                                      <MessageSquare className="w-4 h-4 mr-1.5" /> {task.comments?.length || 0}
                                    </div>
                                    {task.attachments && task.attachments.length > 0 && (
                                      <div className="flex items-center text-xs"><Paperclip className="w-4 h-4 mr-1.5" /> {task.attachments.length}</div>
                                    )}
                                  </div>
                                  <div className="flex items-center -space-x-2">
                                    {task.assignees?.map((assignee: any) => (
                                      <div key={assignee.userId} className="w-6 h-6 rounded-full bg-blue-100 border border-white dark:border-[#18181b] flex items-center justify-center shrink-0 overflow-hidden" title={assignee.user.displayName}>
                                        {assignee.user.avatarUrl ? (
                                          <img src={assignee.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[10px] font-bold text-blue-600">{assignee.user.displayName?.charAt(0)}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 dark:text-gray-500" title={getLastUpdated(task).toLocaleString()}>
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>{formatRelativeTime(getLastUpdated(task))}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        <button onClick={() => handleOpenTaskModal(columnId)} className="w-full py-3.5 flex items-center justify-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 bg-white hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 mt-2">
                          <Plus className="w-4 h-4" />
                          <span>Add Task</span>
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (() => {
        const statusOrder: Record<string, number> = { ToDo: 1, InProgress: 2, Testing: 3, Done: 4 };
        const priorityOrder: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

        const handleSort = (field: SortField) => {
          if (listSortField === field) {
            setListSortDir(d => d === 'asc' ? 'desc' : 'asc');
          } else {
            setListSortField(field);
            setListSortDir('asc');
          }
        };

        const SortIcon = ({ field }: { field: SortField }) => {
          if (listSortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />;
          return listSortDir === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-blue-500" />
            : <ChevronDown className="w-3.5 h-3.5 ml-1 text-blue-500" />;
        };

        const sortedTasks = [...tasks.filter(t => t.parentTaskId === null && !t.isArchived)].sort((a, b) => {
          const dir = listSortDir === 'asc' ? 1 : -1;
          if (listSortField === 'title') return dir * a.title.localeCompare(b.title, 'th');
          if (listSortField === 'status') return dir * ((statusOrder[a.status] || 0) - (statusOrder[b.status] || 0));
          if (listSortField === 'priority') return dir * ((priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0));
          if (listSortField === 'dueDate') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return dir * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          }
          if (listSortField === 'lastUpdated') {
            return dir * (getLastUpdated(a).getTime() - getLastUpdated(b).getTime());
          }
          if (listSortField === 'timeEstimate') {
            return dir * (a.timeEstimate || '').localeCompare(b.timeEstimate || '', 'th');
          }
          if (listSortField === 'assignees') {
            const nameA = a.assignees?.[0]?.user?.displayName || '';
            const nameB = b.assignees?.[0]?.user?.displayName || '';
            return dir * nameA.localeCompare(nameB, 'th');
          }
          return 0;
        });

        return (
        <div className="flex-1 bg-white dark:bg-[#121212]/60 rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                  <th className="px-5 py-2 w-1/3">
                    <button onClick={() => handleSort('title')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Task Name <SortIcon field="title" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('status')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('priority')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Priority <SortIcon field="priority" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('dueDate')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Due Date <SortIcon field="dueDate" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('timeEstimate')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap">
                      Estimate <SortIcon field="timeEstimate" />
                    </button>
                  </th>
                  <th className="px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Progress</th>
                  <th className="px-5 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subtasks</th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('assignees')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      Assignees <SortIcon field="assignees" />
                    </button>
                  </th>
                  <th className="px-5 py-2">
                    <button onClick={() => handleSort('lastUpdated')} className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap">
                      Last Updated <SortIcon field="lastUpdated" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No tasks found in this project.
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => (
                    <tr 
                      key={task.id} 
                      onClick={() => {
                        setSelectedTask(task);
                        setIsEditModalOpen(true);
                      }}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-2">
                        <span className="text-sm font-normal text-gray-900 dark:text-white">
                          {task.title}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {columnLabels[task.status] || task.status}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        {task.timeEstimate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-2 py-0.5 rounded-md">
                            <Timer className="w-3 h-3" />{task.timeEstimate}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        {task.dueDate ? (
                          <span className={`text-xs font-medium ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${task.progressPercent ?? 0}%`,
                                background: task.progressPercent === 100 ? '#22c55e' : task.progressPercent >= 50 ? '#3b82f6' : '#f97316'
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums w-7 text-right">{task.progressPercent ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        {task.subTasks && task.subTasks.length > 0 ? (
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <CheckSquare className="w-4 h-4 mr-1.5" />
                            {task.subTasks.filter((s:any) => s.status === 'Done').length}/{task.subTasks.length}
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center -space-x-2">
                          {task.assignees && task.assignees.length > 0 ? task.assignees.map((assignee: any) => (
                            <div key={assignee.userId} className="w-7 h-7 rounded-full bg-blue-100 border border-white dark:border-[#18181b] flex items-center justify-center shrink-0 overflow-hidden" title={assignee.user.displayName}>
                              {assignee.user.avatarUrl ? (
                                <img src={assignee.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-blue-600">{assignee.user.displayName?.charAt(0)}</span>
                              )}
                            </div>
                          )) : (
                            <span className="text-gray-400 dark:text-gray-600 text-xs ml-2">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap" title={getLastUpdated(task).toLocaleString()}>
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatRelativeTime(getLastUpdated(task))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* ── Archived Tasks Section ── */}
      {showArchived && (() => {
        const archivedTasks = tasks.filter(t => t.isArchived && t.parentTaskId === null);
        return archivedTasks.length > 0 ? (
          <div className="mt-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Archive className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Archived Tasks ({archivedTasks.length})</span>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl overflow-hidden">
              {archivedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-amber-100 dark:border-amber-500/10 last:border-0 group hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span
                    className="flex-1 text-sm text-gray-500 dark:text-gray-400 line-through cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    onClick={() => { setSelectedTask(task); setIsEditModalOpen(true); }}
                  >
                    {task.title}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(task.status)}`}>
                    {columnLabels[task.status]}
                  </span>
                  <button
                    onClick={async () => {
                      const { data } = await apiClient.patch(`/tasks/${task.id}/archive`);
                      setTasks(tasks.map(t => t.id === task.id ? { ...t, isArchived: data.isArchived } : t));
                    }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 transition-opacity"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Create Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={`Create Task in ${columnLabels[taskTargetStatus]}`}>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Task Title</label>
            <input 
              type="text" 
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              placeholder="e.g., Update database schema"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
            >
              <option value="Urgent">🔴 Urgent</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🔵 Medium</option>
              <option value="Low">⚪ Low</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isCreatingTask || !newTask.title.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingTask ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Task Details" maxWidth="max-w-[90rem]" bodyClassName="flex flex-1 min-h-0 overflow-hidden">
        {selectedTask && (
          <div className="flex w-full min-h-0 flex-1">

            {/* ─── LEFT COLUMN 70% ─── */}
            <div className="flex-[13] min-w-0 overflow-y-auto custom-scrollbar p-4 space-y-2">

            {/* Main Form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                setIsUpdatingTask(true);
                const { data } = await apiClient.patch(`/tasks/${selectedTask.id}`, {
                  title: selectedTask.title,
                  description: selectedTask.description,
                  priority: selectedTask.priority,
                  dueDate: selectedTask.dueDate,
                  status: selectedTask.status,
                  timeEstimate: selectedTask.timeEstimate || null,
                  progressPercent: selectedTask.progressPercent ?? 0,
                });
                const mergedData = { ...selectedTask, ...data };
                setTasks(tasks.map(t => t.id === selectedTask.id ? mergedData : t));
                setIsEditModalOpen(false);
              } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Failed to update task', 'error');
              } finally {
                setIsUpdatingTask(false);
              }
            }} className="space-y-2">

              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2 text-blue-500" /> Title
                  </label>
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-normal"
                    required
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <Timer className="w-4 h-4 mr-2 text-blue-500" /> Estimate
                  </label>
                  <input
                    type="text"
                    value={selectedTask.timeEstimate || ''}
                    onChange={(e) => canManage && setSelectedTask({...selectedTask, timeEstimate: e.target.value})}
                    placeholder={canManage ? '1d, 2h...' : '—'}
                    readOnly={!canManage}
                    className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none font-normal ${canManage ? 'focus:ring-2 focus:ring-blue-500/50' : 'cursor-default opacity-75'}`}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => setSelectedTask({...selectedTask, priority: e.target.value})}
                    className="w-full px-2 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-normal"
                  >
                    <option value="Urgent">🔴 Urgent</option>
                    <option value="High">🟠 High</option>
                    <option value="Medium">🔵 Medium</option>
                    <option value="Low">⚪ Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-blue-500" /> Assignees
                  </label>
                  {/* Searchable assignee combobox — owner only */}
                  {canManage && <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                      <Users className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={assigneeSearch}
                        onChange={e => { setAssigneeSearch(e.target.value); setIsAssigneeOpen(true); }}
                        onFocus={() => setIsAssigneeOpen(true)}
                        onBlur={() => setTimeout(() => setIsAssigneeOpen(false), 150)}
                        placeholder="ค้นหาชื่อหรืออีเมล..."
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none font-normal placeholder-gray-400"
                      />
                    </div>
                    {isAssigneeOpen && (
                      <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-[#18181b] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                        {(project?.members?.map((m: any) => m.user) ?? [])
                          .filter((u: any) =>
                            u &&
                            !selectedTask.assignees?.some((a:any) => a.userId === u.id) &&
                            (u.displayName?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                             u.email?.toLowerCase().includes(assigneeSearch.toLowerCase()))
                          )
                          .map((u: any) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={async () => {
                                setAssigneeSearch('');
                                setIsAssigneeOpen(false);
                                try {
                                  const { data } = await apiClient.post(`/tasks/${selectedTask.id}/assignees`, { userId: u.id });
                                  const updatedTask = { ...selectedTask, assignees: [...(selectedTask.assignees || []), data] };
                                  setSelectedTask(updatedTask);
                                  setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                                } catch (err) {
                                  Swal.fire('Error', 'Failed to assign user', 'error');
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                                {u.avatarUrl
                                  ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-[10px] font-bold text-blue-600">{u.displayName?.charAt(0)}</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.displayName}</p>
                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                              </div>
                            </button>
                          ))}
                        {(project?.members?.map((m: any) => m.user) ?? []).filter((u: any) =>
                          u &&
                          !selectedTask.assignees?.some((a:any) => a.userId === u.id) &&
                          (u.displayName?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                           u.email?.toLowerCase().includes(assigneeSearch.toLowerCase()))
                        ).length === 0 && (
                          <p className="px-3 py-3 text-sm text-gray-400 text-center">ไม่พบสมาชิกใน project นี้</p>
                        )}
                      </div>
                    )}
                  </div>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTask.assignees?.map((a:any) => (
                      <span key={a.userId} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium dark:bg-blue-500/10 dark:text-blue-400">
                        {a.user.displayName}
                        {canManage && (
                          <button type="button" onClick={async () => {
                            try {
                              await apiClient.delete(`/tasks/${selectedTask.id}/assignees/${a.userId}`);
                              const updatedTask = { ...selectedTask, assignees: selectedTask.assignees.filter((ass:any) => ass.userId !== a.userId) };
                              setSelectedTask(updatedTask);
                              setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                            } catch (err) {
                              Swal.fire('Error', 'Failed to remove assignee', 'error');
                            }
                          }} className="ml-1.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-40">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-500" /> Due Date
                  </label>
                  <input
                    type="date"
                    value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => canManage && setSelectedTask({...selectedTask, dueDate: e.target.value})}
                    readOnly={!canManage}
                    className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none font-normal ${canManage ? 'focus:ring-2 focus:ring-blue-500/50' : 'cursor-default opacity-75'}`}
                  />
                </div>
                <div className="w-36">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => setSelectedTask({...selectedTask, status: e.target.value})}
                    className="w-full px-2 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none font-normal"
                  >
                    <option value="ToDo">To Do</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Testing">Testing</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                  <AlignLeft className="w-4 h-4 mr-2 text-blue-500" /> Description
                </label>
                <textarea 
                  value={selectedTask.description || ''}
                  onChange={(e) => setSelectedTask({...selectedTask, description: e.target.value})}
                  placeholder="Add a more detailed description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none custom-scrollbar font-normal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2"><AlignLeft className="w-4 h-4 text-blue-500" /> Progress</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold tabular-nums">{selectedTask.progressPercent ?? 0}%</span>
                </label>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={selectedTask.progressPercent ?? 0}
                  onChange={(e) => setSelectedTask({ ...selectedTask, progressPercent: Number(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: 'Are you sure?',
                      text: 'Do you really want to delete this task? This action cannot be undone.',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#ef4444',
                      cancelButtonColor: '#6b7280',
                      confirmButtonText: 'Yes, delete it!'
                    });
                    if (!result.isConfirmed) return;
                    try {
                      await apiClient.delete(`/tasks/${selectedTask.id}`);
                      setTasks(tasks.filter(t => t.id !== selectedTask.id));
                      setIsEditModalOpen(false);
                    } catch (err) {
                      Swal.fire('Error', 'Failed to delete task', 'error');
                    }
                  }}
                  className="text-red-500 hover:text-red-600 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Delete Task
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { data } = await apiClient.patch(`/tasks/${selectedTask.id}/archive`);
                      const updatedTask = { ...selectedTask, isArchived: data.isArchived };
                      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                      setIsEditModalOpen(false);
                    } catch {
                      Swal.fire('Error', 'Failed to archive task', 'error');
                    }
                  }}
                  className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                >
                  {selectedTask.isArchived
                    ? <><ArchiveRestore className="w-4 h-4" />Unarchive</>
                    : <><Archive className="w-4 h-4" />Archive</>
                  }
                </button>
                <div className="flex space-x-3">
                  <button 
                    type="submit" 
                    disabled={isUpdatingTask || !selectedTask.title.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingTask ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>

            <div className="border-t border-gray-100 dark:border-white/5" />

            {/* Subtasks Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center mb-1">
                <CheckSquare className="w-4 h-4 mr-2 text-gray-400" /> Subtasks
              </h4>
              <div className="space-y-1 mb-1.5">
                {selectedTask.subTasks?.map((sub: any) => {
                  const isOverdue = sub.dueDate && new Date(sub.dueDate) < new Date() && sub.status !== 'Done';
                  return (
                  <div key={sub.id} className="flex items-center gap-2 px-2.5 py-1 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5 group hover:border-blue-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={sub.status === 'Done'}
                      onChange={async (e) => {
                        const newStatus = e.target.checked ? 'Done' : 'ToDo';
                        try {
                          await apiClient.patch(`/tasks/${sub.id}/status`, { status: newStatus });
                          const updatedSubTasks = selectedTask.subTasks.map((s:any) => s.id === sub.id ? { ...s, status: newStatus } : s);
                          const updatedTask = { ...selectedTask, subTasks: updatedSubTasks };
                          setSelectedTask(updatedTask);
                          setTasks(tasks.map(t => {
                            if (t.id === selectedTask.id) return updatedTask;
                            if (t.id === sub.id) return { ...t, status: newStatus };
                            return t;
                          }));
                        } catch (err) {
                          Swal.fire('Error', 'Failed to update subtask status', 'error');
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer shrink-0"
                    />
                    {/* Subtask title — แก้ไขได้ inline */}
                    <input
                      key={`title-${sub.id}`}
                      type="text"
                      defaultValue={sub.title}
                      onBlur={async (e) => {
                        const newTitle = e.target.value.trim();
                        if (!newTitle || newTitle === sub.title) return;
                        try {
                          await apiClient.patch(`/tasks/${sub.id}`, { title: newTitle });
                          const updatedSubTasks = selectedTask.subTasks.map((s:any) =>
                            s.id === sub.id ? { ...s, title: newTitle } : s
                          );
                          const updatedTask = { ...selectedTask, subTasks: updatedSubTasks };
                          setSelectedTask(updatedTask);
                          setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                        } catch (err) {
                          Swal.fire('Error', 'Failed to update subtask', 'error');
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className={`flex-1 min-w-0 text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-blue-400 focus:outline-none px-0.5 py-0 transition-colors ${sub.status === 'Done' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}
                    />
                    {/* Time estimate — แก้ไขได้ inline */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Timer className="w-3 h-3 text-purple-400 shrink-0" />
                      <input
                        key={`est-${sub.id}`}
                        type="text"
                        defaultValue={sub.timeEstimate || ''}
                        placeholder="est."
                        onBlur={async (e) => {
                          const newEst = e.target.value.trim();
                          if (newEst === (sub.timeEstimate || '')) return;
                          try {
                            await apiClient.patch(`/tasks/${sub.id}`, { timeEstimate: newEst || null });
                            const updatedSubTasks = selectedTask.subTasks.map((s:any) =>
                              s.id === sub.id ? { ...s, timeEstimate: newEst || null } : s
                            );
                            const updatedTask = { ...selectedTask, subTasks: updatedSubTasks };
                            setSelectedTask(updatedTask);
                            setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                          } catch (err) {
                            Swal.fire('Error', 'Failed to update estimate', 'error');
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-14 text-[10px] bg-transparent border-b border-transparent hover:border-purple-300 dark:hover:border-purple-500/40 focus:border-purple-400 focus:outline-none text-purple-600 dark:text-purple-400 placeholder-gray-300 dark:placeholder-gray-600 px-0.5 py-0 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0" title="Due date">
                      <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`} />
                      <input
                        type="date"
                        value={sub.dueDate ? new Date(sub.dueDate).toISOString().split('T')[0] : ''}
                        onChange={async (e) => {
                          const dueDate = e.target.value || null;
                          try {
                            await apiClient.patch(`/tasks/${sub.id}`, { dueDate });
                            const updatedSubTasks = selectedTask.subTasks.map((s:any) =>
                              s.id === sub.id ? { ...s, dueDate } : s
                            );
                            const updatedTask = { ...selectedTask, subTasks: updatedSubTasks };
                            setSelectedTask(updatedTask);
                            setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                          } catch (err) {
                            Swal.fire('Error', 'Failed to update due date', 'error');
                          }
                        }}
                        className={`text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 cursor-pointer ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
                      />
                    </div>
                    <button
                      type="button"
                      title="Delete subtask"
                      onClick={async () => {
                        try {
                          await apiClient.delete(`/tasks/${sub.id}`);
                          const updatedTask = { ...selectedTask, subTasks: selectedTask.subTasks.filter((s:any) => s.id !== sub.id) };
                          setSelectedTask(updatedTask);
                          setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                        } catch (err) {
                          Swal.fire('Error', 'Failed to delete subtask', 'error');
                        }
                      }}
                      className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  );
                })}
              </div>
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add subtask..."
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newSubtaskTimeEstimate}
                  onChange={e => setNewSubtaskTimeEstimate(e.target.value)}
                  placeholder="1d, 2h..."
                  className="w-24 px-2 py-1.5 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-600 dark:text-gray-400"
                  title="Time estimate (optional)"
                />
                <input
                  type="date"
                  value={newSubtaskDueDate}
                  onChange={e => setNewSubtaskDueDate(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-600 dark:text-gray-400 cursor-pointer"
                  title="Due date (optional)"
                />
                <button type="submit" disabled={!newSubtaskTitle.trim()} className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50 shrink-0">
                  Add
                </button>
              </form>
            </div>

            <div className="border-t border-gray-100 dark:border-white/5" />

            {/* Attachments Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Paperclip className="w-4 h-4 mr-2 text-gray-400" /> Attachments
                </div>
                {(user?.systemRole === 'Admin' || user?.canUploadFiles) && (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      + Add File
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  </>
                )}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {selectedTask.attachments?.map((att: any) => (
                  <div key={att.id} className="relative flex items-center p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors group">
                    <a href={`http://localhost:5525${att.filePath}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center overflow-hidden">
                      <div className="w-7 h-7 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center shrink-0">
                        <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="ml-2 overflow-hidden">
                        <p className="text-xs text-gray-900 dark:text-white truncate">{att.fileName}</p>
                        <p className="text-[10px] text-gray-500">Click to download</p>
                      </div>
                    </a>
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const result = await Swal.fire({
                          title: 'Are you sure?',
                          text: 'Do you really want to delete this attachment?',
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonColor: '#ef4444',
                          cancelButtonColor: '#6b7280',
                          confirmButtonText: 'Yes, delete it!'
                        });
                        if (!result.isConfirmed) return;
                        try {
                          await apiClient.delete(`/tasks/attachments/${att.id}`);
                          const updatedTask = { ...selectedTask, attachments: selectedTask.attachments.filter((a: any) => a.id !== att.id) };
                          setSelectedTask(updatedTask);
                          setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                        } catch (err) {
                          Swal.fire('Error', 'Failed to delete attachment', 'error');
                        }
                      }}
                      className="absolute right-3 top-3 p-1.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-500/40 transition-all"
                      title="Delete Attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {isUploading && <p className="text-sm text-blue-500 mt-2 animate-pulse">Uploading...</p>}
            </div>

            <div className="border-t border-gray-100 dark:border-white/5" />

            {/* Links Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center mb-1">
                <LinkIcon className="w-4 h-4 mr-2 text-gray-400" /> Links
              </h4>
              <div className="space-y-1 mb-1.5">
                {selectedTask.links?.map((link: any) => (
                  <div key={link.id} className="flex items-center gap-1 group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center px-3 py-1.5 bg-blue-50/50 dark:bg-blue-500/5 rounded-lg border border-blue-100 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors min-w-0">
                      <LinkIcon className="w-4 h-4 text-blue-500 mr-3 shrink-0" />
                      <span className="text-sm text-blue-700 dark:text-blue-400 hover:underline truncate">{link.title || link.url}</span>
                    </a>
                    <button
                      type="button"
                      title="Delete link"
                      onClick={async () => {
                        try {
                          await apiClient.delete(`/tasks/links/${link.id}`);
                          const updatedTask = { ...selectedTask, links: selectedTask.links.filter((l:any) => l.id !== link.id) };
                          setSelectedTask(updatedTask);
                          setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
                        } catch (err) {
                          Swal.fire('Error', 'Failed to delete link', 'error');
                        }
                      }}
                      className="shrink-0 p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddLink} className="flex space-x-2">
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={e => setNewLinkTitle(e.target.value)}
                  placeholder="Link Title (optional)"
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
                <button type="submit" disabled={!newLinkUrl.trim()} className="px-3 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50">
                  Add Link
                </button>
              </form>
            </div>

            </div>

            {/* ─── RIGHT COLUMN 30% ─── */}
            <div className="flex-[7] min-w-0 flex flex-col overflow-hidden border-l border-gray-200 dark:border-white/10">
            <div className="overflow-y-auto custom-scrollbar flex-1 p-4 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center mb-2">
                <MessageSquare className="w-4 h-4 mr-2 text-gray-400" /> Activity & Comments
              </h4>

              <form onSubmit={handleAddComment} className="mb-3 flex space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-white dark:border-[#18181b] flex items-center justify-center shrink-0 overflow-hidden">
                  <span className="text-xs font-bold text-blue-600">Me</span>
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={e => setNewCommentText(e.target.value)}
                    placeholder="Ask a question or post an update..."
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Send comment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {selectedTask.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 border border-white dark:border-[#18181b] flex items-center justify-center shrink-0 overflow-hidden" title={comment.user?.displayName}>
                      {comment.user?.avatarUrl ? (
                        <img src={comment.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{comment.user?.displayName?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-white/5 rounded-xl rounded-tl-none p-2.5 border border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{comment.user?.displayName || 'Unknown User'}</span>
                          <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    No comments yet. Be the first to start the discussion!
                  </div>
                )}
              </div>
            </div>
            </div>

          </div>
        )}
      </Modal>

      {/* Members Modal */}
      <Modal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} title="Project Members" maxWidth="max-w-lg">
        {(() => {
          const isSpaceOwner = (project?.space as any)?.ownerId === user?.id || user?.systemRole === 'Admin';
          return (
        <div className="space-y-4">

          {/* ── Confirmed members ── */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">สมาชิก ({project?.members?.length ?? 0})</p>
            {project?.members?.map((m: any) => (
              <div key={m.userId} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center shrink-0">
                  {m.user?.avatarUrl
                    ? <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-blue-600">{m.user?.displayName?.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.user?.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{m.user?.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.role === 'Owner'
                    ? <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" />Owner</span>
                    : m.role === 'Member'
                      ? <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full"><Shield className="w-3 h-3" />Member</span>
                      : <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">Guest</span>}
                  {m.role !== 'Owner' && isSpaceOwner && (
                    <button onClick={() => handleRemoveMember(m.userId, m.user?.displayName)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors" title="Remove">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Pending invitations (owner only) ── */}
          {isSpaceOwner && pendingInvitations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">รอยืนยัน ({pendingInvitations.length})</p>
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-2.5 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                    <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">{inv.email.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">{inv.email}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Pending · {inv.role}</p>
                  </div>
                  <button onClick={() => handleCancelInvitation(inv.id, inv.email)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors" title="Cancel invitation">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Invite by email (owner only) ── */}
          {isSpaceOwner && <div className="border-t border-gray-200 dark:border-white/10 pt-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" /> เชิญด้วย Email
            </p>
            <form onSubmit={handleSendInvite} className="space-y-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@northbkk.ac.th"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-normal"
                required
              />
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'Member' | 'Guest')}
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-normal appearance-none"
                >
                  <option value="Member">Member — แก้ไขได้</option>
                  <option value="Guest">Guest — ดูได้อย่างเดียว</option>
                </select>
                <button type="submit" disabled={isInviting || !inviteEmail.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                  {isInviting ? '...' : <><UserPlus className="w-3.5 h-3.5" />ส่งคำเชิญ</>}
                </button>
              </div>
              <p className="text-xs text-gray-400">ระบบจะส่งลิงก์ยืนยันไปที่ email นั้น · หมดอายุใน 7 วัน</p>
            </form>
          </div>}
        </div>
          );
        })()}
      </Modal>

      {/* Move Project Modal */}
      <Modal isOpen={isMoveProjectModalOpen} onClose={() => setIsMoveProjectModalOpen(false)} title="Move Project to Folder">
        <form onSubmit={handleMoveProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Target Folder</label>
            <select 
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value === 'none' ? 'none' : Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="none">No Folder (Standalone)</option>
              {availableFolders.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsMoveProjectModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isMovingProject}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <FolderInput className="w-4 h-4 mr-2" />
              {isMovingProject ? 'Moving...' : 'Move Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectView;
