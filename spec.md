# System Specification & Development Plan: In-House Task Management Platform
**Project Name:** NBU IT-Task (ClickUp Clone for IT Department)
**Target Environment:** University IT Department with Google Workspace Integration

---

## 1. System Architecture & Tech Stack
- **Frontend:** Vue.js 3 (Composition API) or React, Tailwind CSS, Lucide Icons
- **Backend:** Python (FastAPI) or Node.js (Express)
- **Database:** PostgreSQL or MySQL (Relational Database)
- **Authentication:** Google OAuth 2.0 (Google Workspace Single Sign-On)
- **File Storage:** Google Drive API Integration (for attachments) & Local Server Storage

---

## 2. Data Hierarchy & Permissions
### Data Structure
`Workspace` (Top Level) -> `Spaces/Departments` (Groups) -> `Projects` -> `Tasks` -> `Subtasks`

### User Roles & ACL (Access Control List)
1. **Admin:** Full system access, workspace management, user role assignments, global dashboard.
2. **Member (Internal IT Staff):** Can create Spaces, Projects, Tasks, and Subtasks. Can assign tasks and manage workflows within their designated Spaces.
3. **Guest (Internal - @northbkk.ac.th):** Read-only access to invited projects. Can comment and update status *only* on tasks specifically assigned to them.
4. **Guest (External - @gmail.com or others):** Strict isolation. Can only see the specific tasks/projects they are invited to. No visibility into the organization's directory or other spaces.

---

## 3. Database Schema (SQL)

```sql
-- Users Table (Synced via Google OAuth)
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    system_role ENUM('Admin', 'Member', 'Guest') DEFAULT 'Member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spaces / Departments Table
CREATE TABLE spaces (
    space_id INT PRIMARY KEY AUTO_INCREMENT,
    space_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    space_id INT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Active', 'Archived') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (space_id) REFERENCES spaces(space_id) ON DELETE CASCADE
);

-- Project Members Bridge Table
CREATE TABLE project_members (
    project_id INT,
    user_id INT,
    role_in_project ENUM('Owner', 'Member', 'Guest') DEFAULT 'Member',
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tasks & Subtasks Table (Self-Referencing)
CREATE TABLE tasks (
    task_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    parent_task_id INT NULL, -- NULL for Main Task, contains Task ID for Subtask
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('To Do', 'In Progress', 'Testing', 'Done') DEFAULT 'To Do',
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    progress_percent INT DEFAULT 0, -- Auto-calculated if it has subtasks
    due_date DATE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Task Assignees Bridge Table (Supports multiple assignees)
CREATE TABLE task_assignees (
    task_id INT,
    user_id INT,
    PRIMARY KEY (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Task Attachments Table
CREATE TABLE task_attachments (
    attachment_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path or Google Drive Link
    source ENUM('Local', 'GoogleDrive') DEFAULT 'Local',
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Task Links Table
CREATE TABLE task_links (
    link_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT,
    link_title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    created_by INT,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Task Comments Table
CREATE TABLE task_comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT,
    user_id INT,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);