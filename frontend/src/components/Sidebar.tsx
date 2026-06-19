import { useState, useEffect } from 'react';
import { LayoutDashboard, CheckSquare, LogOut, ChevronLeft, ChevronRight, Plus, Layers, Folder, Pencil, Trash2, Building2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import Modal from './Modal';
import Swal from 'sweetalert2';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [spaces, setSpaces] = useState<any[]>([]);
  
  // Modal State
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFolderIdForProject, setSelectedFolderIdForProject] = useState<number | null>(null);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});

  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);

  const fetchSpaces = async () => {
    try {
      const { data } = await apiClient.get('/spaces');
      setSpaces(data);
    } catch (err) {
      console.error('Failed to fetch spaces', err);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      setIsCreating(true);
      let spaceId = selectedSpaceId ?? spaces[0]?.id;
      if (!spaceId) {
        const spaceRes = await apiClient.post('/spaces', { name: 'My Workspace' });
        spaceId = spaceRes.data.id;
      }
      const projRes = await apiClient.post('/projects', {
        spaceId,
        folderId: selectedFolderIdForProject,
        name: newProjectName.trim()
      });
      await fetchSpaces();
      setIsProjectModalOpen(false);
      setNewProjectName('');
      setSelectedFolderIdForProject(null);
      navigate(`/projects/${projRes.data.id}`);
    } catch (err) {
      Swal.fire('Error', 'Failed to create project', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      setIsCreating(true);
      let spaceId = selectedSpaceId ?? spaces[0]?.id;
      if (!spaceId) {
        const spaceRes = await apiClient.post('/spaces', { name: 'My Workspace' });
        spaceId = spaceRes.data.id;
      }
      const folderRes = await apiClient.post('/folders', { spaceId, name: newFolderName.trim() });
      await fetchSpaces();
      setExpandedFolders({ ...expandedFolders, [folderRes.data.id]: true });
      setIsFolderModalOpen(false);
      setNewFolderName('');
    } catch (err) {
      Swal.fire('Error', 'Failed to create folder', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    try {
      setIsCreating(true);
      await apiClient.post('/spaces', { name: newSpaceName.trim(), description: newSpaceDescription.trim() || undefined });
      await fetchSpaces();
      setIsSpaceModalOpen(false);
      setNewSpaceName('');
      setNewSpaceDescription('');
    } catch (err) {
      Swal.fire('Error', 'Failed to create workspace', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameSpace = async (space: any) => {
    const { value: newName } = await Swal.fire({
      title: 'Rename Workspace',
      input: 'text',
      inputValue: space.name,
      showCancelButton: true,
      inputValidator: (v) => { if (!v) return 'Workspace name is required!'; }
    });
    if (newName && newName !== space.name) {
      try {
        await apiClient.patch(`/spaces/${space.id}`, { name: newName });
        fetchSpaces();
      } catch (err) {
        Swal.fire('Error', 'Failed to rename workspace', 'error');
      }
    }
  };

  const handleDeleteSpace = async (space: any) => {
    const result = await Swal.fire({
      title: `Delete "${space.name}"?`,
      text: 'All folders and projects inside will be permanently deleted.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/spaces/${space.id}`);
        await fetchSpaces();
        navigate('/dashboard');
      } catch (err) {
        Swal.fire('Error', 'Failed to delete workspace', 'error');
      }
    }
  };

  const handleRenameFolder = async (e: React.MouseEvent, folder: any) => {
    e.preventDefault();
    e.stopPropagation();
    const { value: newName } = await Swal.fire({
      title: 'Rename Folder',
      input: 'text',
      inputValue: folder.name,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return 'Folder name is required!';
      }
    });

    if (newName && newName !== folder.name) {
      try {
        await apiClient.patch(`/folders/${folder.id}`, { name: newName });
        fetchSpaces();
      } catch (err) {
        Swal.fire('Error', 'Failed to rename folder', 'error');
      }
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={`
        fixed md:static inset-y-0 left-0 z-30
        ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 md:w-20'}
        bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-white/5 
        h-screen flex flex-col transition-all duration-300 ease-in-out
      `}>
        <div className={`p-6 flex items-center ${isOpen ? 'justify-start space-x-3' : 'justify-center'} relative`}>
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-white font-bold text-lg leading-none">O</span>
          </div>
          {isOpen && <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide whitespace-nowrap overflow-hidden">WorkSpace</h1>}
          
          {/* Collapse button for desktop */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full items-center justify-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 z-40 transition-colors shadow-sm"
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                title={!isOpen ? item.label : undefined}
                className={`flex items-center ${isOpen ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
              </Link>
            );
          })}

          {/* Spaces & Projects Section */}
          <div className="pt-6 pb-2">

            {/* New Workspace button */}
            {isOpen ? (
              <button
                onClick={() => setIsSpaceModalOpen(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 mb-4 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors border border-dashed border-gray-200 dark:border-white/10"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>New Workspace</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSpaceModalOpen(true)}
                title="New Workspace"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors mb-2 mx-auto"
              >
                <Building2 className="w-5 h-5" />
              </button>
            )}

            {spaces.map(space => (
              <div key={space.id} className="mb-6">
                {isOpen ? (
                  <div className="flex items-center justify-between px-4 mb-2 group/space">
                    <span className="text-base font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate max-w-[150px]" title={space.name}>{space.name}</span>
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover/space:opacity-100 transition-opacity">
                      <button onClick={() => handleRenameSpace(space)} title="Rename Workspace" className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteSpace(space)} title="Delete Workspace" className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setSelectedSpaceId(space.id); setIsFolderModalOpen(true); }} title="New Folder" className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10">
                        <Folder className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setSelectedSpaceId(space.id); setSelectedFolderIdForProject(null); setIsProjectModalOpen(true); }} title="New Project" className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 mb-4">
                    <button onClick={() => { setSelectedSpaceId(space.id); setIsFolderModalOpen(true); }} title="New Folder" className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                      <Folder className="w-5 h-5" />
                    </button>
                    <button onClick={() => { setSelectedSpaceId(space.id); setSelectedFolderIdForProject(null); setIsProjectModalOpen(true); }} title="New Project" className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="space-y-1">
                  {/* Folders */}
                  {space.folders?.map((folder: any) => (
                    <div key={folder.id} className="mb-1">
                      <div 
                        className={`group flex items-center justify-between py-2 px-3 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 ${isOpen ? 'mx-2' : 'mx-0 justify-center'}`}
                        onClick={() => setExpandedFolders({...expandedFolders, [folder.id]: !expandedFolders[folder.id]})}
                        title={!isOpen ? folder.name : undefined}
                      >
                        <div className="flex items-center space-x-2 overflow-hidden">
                          {isOpen ? (
                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${expandedFolders[folder.id] ? 'rotate-90' : ''}`} />
                          ) : null}
                          <Folder className="w-4 h-4 shrink-0 text-blue-400" />
                          {isOpen && <span className="font-medium text-sm truncate">{folder.name}</span>}
                        </div>
                        {isOpen && (
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleRenameFolder(e, folder)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md text-gray-500 dark:text-gray-400"
                              title="Rename Folder"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedFolderIdForProject(folder.id); setIsProjectModalOpen(true); }}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md text-gray-500 dark:text-gray-400"
                              title="Add Project to Folder"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Projects inside Folder */}
                      {expandedFolders[folder.id] && folder.projects?.map((project: any) => {
                        const path = `/projects/${project.id}`;
                        const isActive = location.pathname === path;
                        return (
                          <Link
                            key={project.id}
                            to={path}
                            title={!isOpen ? project.name : undefined}
                            className={`flex items-center ${isOpen ? 'space-x-3 px-4 pl-10' : 'justify-center px-0'} py-2 rounded-xl transition-all duration-200 group ${
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                          >
                            <Layers className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-400'}`} />
                            {isOpen && <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">{project.name}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  ))}

                  {/* Standalone Projects */}
                  {space.projects?.map((project: any) => {
                    const path = `/projects/${project.id}`;
                    const isActive = location.pathname === path;
                    return (
                      <Link
                        key={project.id}
                        to={path}
                        title={!isOpen ? project.name : undefined}
                        className={`flex items-center ${isOpen ? 'space-x-3 px-4' : 'justify-center px-0'} py-2.5 rounded-xl transition-all duration-200 group ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        <Layers className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-400'}`} />
                        {isOpen && <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">{project.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-white/5">
          <button 
            onClick={logout}
            title={!isOpen ? 'Logout' : undefined}
            className={`flex items-center ${isOpen ? 'space-x-3 px-4' : 'justify-center px-0'} py-3 w-full rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 group border border-transparent`}
          >
            <LogOut className="w-5 h-5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400" />
            {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden">Logout</span>}
          </button>
        </div>
      </div>

      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Project Name</label>
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g., Q3 Marketing Campaign"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isCreating || !newProjectName.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Create New Folder">
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Folder Name</label>
            <input 
              type="text" 
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g., Design Team"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button 
              type="button" 
              onClick={() => setIsFolderModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isCreating || !newFolderName.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isSpaceModalOpen} onClose={() => { setIsSpaceModalOpen(false); setNewSpaceName(''); setNewSpaceDescription(''); }} title="Create New Workspace">
        <form onSubmit={handleCreateSpace} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Workspace Name</label>
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="e.g., IT Department, HR Team"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={newSpaceDescription}
              onChange={(e) => setNewSpaceDescription(e.target.value)}
              placeholder="Short description of this workspace"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => { setIsSpaceModalOpen(false); setNewSpaceName(''); setNewSpaceDescription(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !newSpaceName.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default Sidebar;
