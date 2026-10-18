auth.requireAuth();

const currentUser = auth.getUser();
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

if (!projectId) {
  window.location.href = 'index.html';
}

// State
let currentProject = null;
let activeTask = null;

// DOM Elements
const boardTitle = document.getElementById('board-project-title');
const boardDesc = document.getElementById('board-project-desc');
const membersPreview = document.getElementById('board-members-preview');
const membersCountBadge = document.getElementById('members-count-badge');
const kanbanContainer = document.getElementById('kanban-board-container');
const deleteProjectBtn = document.getElementById('delete-project-btn');

// Task Modal Elements
const taskModal = document.getElementById('task-modal');
const closeTaskModalBtn = document.getElementById('close-task-modal-btn');
const modalTaskTitle = document.getElementById('modal-task-title');
const modalTaskPriority = document.getElementById('modal-task-priority');
const editTaskForm = document.getElementById('edit-task-form');
const editTitle = document.getElementById('edit-title');
const editDesc = document.getElementById('edit-desc');
const editColumn = document.getElementById('edit-column');
const editPriority = document.getElementById('edit-priority');
const editAssignee = document.getElementById('edit-assignee');
const editDueDate = document.getElementById('edit-due-date');
const modalDeleteTaskBtn = document.getElementById('modal-delete-task-btn');
const addCommentForm = document.getElementById('add-comment-form');
const commentInput = document.getElementById('comment-input');
const modalCommentsStream = document.getElementById('modal-comments-stream');

// Members Modal Elements
const membersModal = document.getElementById('members-modal');
const openMembersModalBtn = document.getElementById('open-members-modal-btn');
const closeMembersModalBtn = document.getElementById('close-members-modal-btn');
const inviteMemberForm = document.getElementById('invite-member-form');
const projectMembersList = document.getElementById('project-members-list');

// Add Column Modal Elements
const addColumnModal = document.getElementById('add-column-modal');
const openAddColumnBtn = document.getElementById('open-add-column-btn');
const closeColumnModalBtn = document.getElementById('close-column-modal-btn');
const cancelColumnBtn = document.getElementById('cancel-column-btn');
const addColumnForm = document.getElementById('add-column-form');

/**
 * Load project data and initialize real-time WebSocket connection
 */
async function initBoard() {
  try {
    const res = await api.get(`/projects/${projectId}`);
    currentProject = res.data;

    renderProjectInfo();
    renderBoard();
    initWebSocketSync();
  } catch (err) {
    alert(`Failed to load board: ${err.message}`);
    window.location.href = 'index.html';
  }
}

/**
 * Render Project Header Details
 */
function renderProjectInfo() {
  document.title = `${currentProject.name} - PlanAlpha Board`;
  boardTitle.textContent = currentProject.name;
  boardDesc.textContent = currentProject.description || 'Collaborative team board';
  membersCountBadge.textContent = currentProject.members.length;

  // Show delete button only if current user is the owner
  if (currentProject.myRole === 'OWNER') {
    deleteProjectBtn.style.display = 'inline-flex';
    deleteProjectBtn.onclick = handleDeleteProject;
  }

  // Render Member Avatars Preview
  membersPreview.innerHTML = currentProject.members.slice(0, 5).map(m => `
    <img src="${m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(m.user.name)}" class="member-avatar-stacked" title="${escapeHTML(m.user.name)} (${m.role})">
  `).join('');
}

/**
 * Render Kanban Columns and Task Cards
 */
function renderBoard() {
  if (!currentProject.lists || currentProject.lists.length === 0) {
    kanbanContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted); width: 100%;">
        <p>No workflow columns configured. Click <strong>+ Add Column</strong> above to start.</p>
      </div>
    `;
    return;
  }

  kanbanContainer.innerHTML = currentProject.lists.map((list) => {
    const taskCardsHtml = (list.tasks || []).map(task => renderTaskCard(task)).join('');

    return `
      <section class="kanban-column" id="column-${list.id}" ondragover="handleDragOver(event)" ondrop="handleDrop(event, '${list.id}')">
        <div class="column-header">
          <span>${escapeHTML(list.name)}</span>
          <span class="column-counter" id="counter-${list.id}">${list.tasks ? list.tasks.length : 0}</span>
        </div>

        <div class="column-cards-stream" id="cards-stream-${list.id}">
          ${taskCardsHtml}
        </div>

        <!-- Inline Card Creator -->
        <div id="creator-box-${list.id}" style="padding: 0 0.75rem 0.75rem; display: none;">
          <form onsubmit="handleCreateTask(event, '${list.id}')">
            <input type="text" id="input-title-${list.id}" class="form-input" placeholder="Task title..." required maxlength="120" style="margin-bottom: 0.5rem; font-size: 0.85rem;">
            <div style="display: flex; gap: 0.5rem;">
              <button type="submit" class="btn btn-sm">Add</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="toggleInlineCreator('${list.id}', false)">Cancel</button>
            </div>
          </form>
        </div>

        <button class="add-task-btn" id="open-creator-btn-${list.id}" onclick="toggleInlineCreator('${list.id}', true)">
          + Add Card
        </button>
      </section>
    `;
  }).join('');
}

/**
 * Render Single Task Card HTML
 */
function renderTaskCard(task) {
  const priorityClass = `priority-${(task.priority || 'medium').toLowerCase()}`;
  const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  const commentsCount = task._count ? task._count.comments : (task.comments ? task.comments.length : 0);

  return `
    <article 
      class="task-card" 
      id="task-${task.id}" 
      draggable="true" 
      ondragstart="handleDragStart(event, '${task.id}', '${task.listId}')" 
      onclick="openTaskModal('${task.id}')"
    >
      <div class="task-card-header">
        <span class="task-priority-badge ${priorityClass}">${task.priority}</span>
      </div>

      <h4 class="task-card-title">${escapeHTML(task.title)}</h4>
      ${task.description ? `<p class="task-card-desc">${escapeHTML(task.description)}</p>` : ''}

      <div class="task-card-footer">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${dueDateStr ? `<span class="card-due-date" title="Due Date">📅 ${dueDateStr}</span>` : ''}
          <span class="card-comments-count" title="Comments">💬 ${commentsCount}</span>
        </div>

        <div>
          ${task.assignee ? `
            <img src="${task.assignee.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(task.assignee.name)}" class="card-assignee-avatar" title="Assigned to ${escapeHTML(task.assignee.name)}">
          ` : '<span style="color: var(--text-light); font-size: 0.7rem;">Unassigned</span>'}
        </div>
      </div>
    </article>
  `;
}

/**
 * Inline Task Creator Controls
 */
function toggleInlineCreator(listId, show) {
  const box = document.getElementById(`creator-box-${listId}`);
  const btn = document.getElementById(`open-creator-btn-${listId}`);
  if (box && btn) {
    box.style.display = show ? 'block' : 'none';
    btn.style.display = show ? 'none' : 'block';
    if (show) {
      document.getElementById(`input-title-${listId}`)?.focus();
    }
  }
}

async function handleCreateTask(e, listId) {
  e.preventDefault();
  const input = document.getElementById(`input-title-${listId}`);
  const title = input.value.trim();
  if (!title) return;

  try {
    input.disabled = true;
    const res = await api.post(`/projects/${projectId}/tasks`, {
      listId,
      title,
    });
    const newTask = res.data;

    // Insert locally immediately
    addTaskToLocalBoard(newTask);
    toggleInlineCreator(listId, false);
    input.value = '';
  } catch (err) {
    alert(`Failed to create task: ${err.message}`);
  } finally {
    input.disabled = false;
  }
}

/**
 * Task Details Modal Handler
 */
async function openTaskModal(taskId) {
  try {
    const res = await api.get(`/tasks/${taskId}`);
    activeTask = res.data;

    modalTaskTitle.textContent = activeTask.title;
    modalTaskPriority.className = `task-priority-badge priority-${activeTask.priority.toLowerCase()}`;
    modalTaskPriority.textContent = activeTask.priority;

    editTitle.value = activeTask.title;
    editDesc.value = activeTask.description || '';
    editPriority.value = activeTask.priority;
    editDueDate.value = activeTask.dueDate ? activeTask.dueDate.split('T')[0] : '';

    // Populate Columns dropdown
    editColumn.innerHTML = currentProject.lists.map(l => `
      <option value="${l.id}" ${l.id === activeTask.listId ? 'selected' : ''}>${escapeHTML(l.name)}</option>
    `).join('');

    // Populate Assignees dropdown
    editAssignee.innerHTML = `
      <option value="">Unassigned</option>
      ${currentProject.members.map(m => `
        <option value="${m.user.id}" ${activeTask.assigneeId === m.user.id ? 'selected' : ''}>${escapeHTML(m.user.name)} (${m.role})</option>
      `).join('')}
    `;

    renderTaskComments(activeTask.comments || []);
    taskModal.classList.add('active');
  } catch (err) {
    alert(`Could not open task: ${err.message}`);
  }
}

function closeTaskModal() {
  taskModal.classList.remove('active');
  activeTask = null;
}

closeTaskModalBtn.addEventListener('click', closeTaskModal);

/**
 * Save Task Changes from Modal
 */
editTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeTask) return;

  const updatePayload = {
    title: editTitle.value.trim(),
    description: editDesc.value.trim(),
    listId: editColumn.value,
    priority: editPriority.value,
    assigneeId: editAssignee.value || null,
    dueDate: editDueDate.value || null,
  };

  try {
    const res = await api.patch(`/tasks/${activeTask.id}`, updatePayload);
    const updated = res.data;

    updateTaskInLocalBoard(updated);
    closeTaskModal();
    showToast('Task updated successfully');
  } catch (err) {
    alert(`Failed to update task: ${err.message}`);
  }
});

/**
 * Delete Task
 */
modalDeleteTaskBtn.addEventListener('click', async () => {
  if (!activeTask) return;
  if (!confirm(`Are you sure you want to delete "${activeTask.title}"?`)) return;

  try {
    await api.delete(`/tasks/${activeTask.id}`);
    removeTaskFromLocalBoard(activeTask.id);
    closeTaskModal();
    showToast('Task deleted');
  } catch (err) {
    alert(`Failed to delete task: ${err.message}`);
  }
});

/**
 * Task Discussion Comments
 */
function renderTaskComments(comments) {
  if (!comments || comments.length === 0) {
    modalCommentsStream.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">No comments yet. Start the discussion!</p>';
    return;
  }

  modalCommentsStream.innerHTML = comments.map(c => {
    const timeFormatted = new Date(c.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const canDelete = currentUser && (c.authorId === currentUser.id || currentProject.myRole === 'OWNER' || currentProject.myRole === 'ADMIN');

    return `
      <div class="comment-row" id="comment-${c.id}">
        <img src="${c.author.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(c.author.name)}" class="card-assignee-avatar" style="width: 28px; height: 28px;" alt="${c.author.name}">
        <div class="comment-bubble">
          <div class="comment-header">
            <span class="comment-author">${escapeHTML(c.author.name)}</span>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="comment-time">${timeFormatted}</span>
              ${canDelete ? `<button onclick="handleDeleteComment('${c.id}')" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 0.75rem;">✕</button>` : ''}
            </div>
          </div>
          <div class="comment-text">${escapeHTML(c.content)}</div>
        </div>
      </div>
    `;
  }).join('');
}

addCommentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeTask) return;

  const content = commentInput.value.trim();
  if (!content) return;

  try {
    const res = await api.post(`/tasks/${activeTask.id}/comments`, { content });
    const newComment = res.data;

    commentInput.value = '';
    if (!activeTask.comments) activeTask.comments = [];
    activeTask.comments.push(newComment);
    renderTaskComments(activeTask.comments);

    // Update comment counter on card
    updateCardCommentCount(activeTask.id, activeTask.comments.length);
  } catch (err) {
    alert(`Failed to add comment: ${err.message}`);
  }
});

async function handleDeleteComment(commentId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await api.delete(`/comments/${commentId}`);
    if (activeTask && activeTask.comments) {
      activeTask.comments = activeTask.comments.filter(c => c.id !== commentId);
      renderTaskComments(activeTask.comments);
      updateCardCommentCount(activeTask.id, activeTask.comments.length);
    }
  } catch (err) {
    alert(`Failed to delete comment: ${err.message}`);
  }
}

/**
 * Drag and Drop Interactions
 */
let draggedTaskId = null;
let sourceListId = null;

function handleDragStart(e, taskId, listId) {
  draggedTaskId = taskId;
  sourceListId = listId;
  e.dataTransfer.setData('text/plain', taskId);
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e, targetListId) {
  e.preventDefault();
  if (!draggedTaskId || targetListId === sourceListId) return;

  const taskId = draggedTaskId;
  draggedTaskId = null;
  sourceListId = null;

  try {
    const res = await api.patch(`/tasks/${taskId}`, { listId: targetListId });
    updateTaskInLocalBoard(res.data);
  } catch (err) {
    alert(`Failed to move card: ${err.message}`);
    renderBoard(); // Revert
  }
}

/**
 * Local Board State Synchronizers
 */
function addTaskToLocalBoard(task) {
  const list = currentProject.lists.find(l => l.id === task.listId);
  if (list) {
    if (!list.tasks) list.tasks = [];
    // Only add if not already present
    if (!list.tasks.some(t => t.id === task.id)) {
      list.tasks.push(task);
      const stream = document.getElementById(`cards-stream-${list.id}`);
      if (stream) stream.insertAdjacentHTML('beforeend', renderTaskCard(task));
      updateColumnCounter(list.id, list.tasks.length);
    }
  }
}

function updateTaskInLocalBoard(task) {
  removeTaskFromLocalBoard(task.id);
  addTaskToLocalBoard(task);
}

function removeTaskFromLocalBoard(taskId) {
  currentProject.lists.forEach(list => {
    if (list.tasks) {
      const idx = list.tasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        list.tasks.splice(idx, 1);
        const cardElem = document.getElementById(`task-${taskId}`);
        if (cardElem) cardElem.remove();
        updateColumnCounter(list.id, list.tasks.length);
      }
    }
  });
}

function updateColumnCounter(listId, count) {
  const counter = document.getElementById(`counter-${listId}`);
  if (counter) counter.textContent = count;
}

function updateCardCommentCount(taskId, count) {
  const card = document.getElementById(`task-${taskId}`);
  if (card) {
    const commentCountElem = card.querySelector('.card-comments-count');
    if (commentCountElem) commentCountElem.innerHTML = `💬 ${count}`;
  }
}

/**
 * Team Members Modal & Invitations
 */
openMembersModalBtn.addEventListener('click', openMembersModal);
closeMembersModalBtn.addEventListener('click', () => membersModal.classList.remove('active'));

function openMembersModal() {
  renderMembersList();
  membersModal.classList.add('active');
}

function renderMembersList() {
  projectMembersList.innerHTML = currentProject.members.map(m => {
    const isOwner = m.role === 'OWNER';
    const canRemove = (currentProject.myRole === 'OWNER' || currentProject.myRole === 'ADMIN') && !isOwner;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <img src="${m.user.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(m.user.name)}" class="card-assignee-avatar" style="width: 32px; height: 32px;" alt="${m.user.name}">
          <div>
            <div style="font-weight: 700; font-size: 0.9rem;">${escapeHTML(m.user.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(m.user.email)}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="project-role-badge ${m.role === 'OWNER' ? 'role-owner' : m.role === 'ADMIN' ? 'role-admin' : 'role-member'}">${m.role}</span>
          ${canRemove ? `<button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger-bg);" onclick="handleRemoveMember('${m.id}')">Remove</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

inviteMemberForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('invite-email');
  const roleSelect = document.getElementById('invite-role');
  const emailOrUserId = emailInput.value.trim();
  const role = roleSelect.value;

  if (!emailOrUserId) return;

  try {
    const res = await api.post(`/projects/${projectId}/members`, {
      emailOrUserId,
      role,
    });
    const newMember = res.data;

    currentProject.members.push(newMember);
    renderProjectInfo();
    renderMembersList();
    emailInput.value = '';
    showToast(`Teammate invited successfully!`);
  } catch (err) {
    alert(`Failed to invite member: ${err.message}`);
  }
});

async function handleRemoveMember(memberId) {
  if (!confirm('Remove this teammate from the project?')) return;
  try {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
    currentProject.members = currentProject.members.filter(m => m.id !== memberId);
    renderProjectInfo();
    renderMembersList();
    showToast('Teammate removed from project');
  } catch (err) {
    alert(`Failed to remove member: ${err.message}`);
  }
}

/**
 * Add Workflow Column
 */
openAddColumnBtn.addEventListener('click', () => addColumnModal.classList.add('active'));
closeColumnModalBtn.addEventListener('click', () => addColumnModal.classList.remove('active'));
cancelColumnBtn.addEventListener('click', () => addColumnModal.classList.remove('active'));

addColumnForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('column-name');
  const name = nameInput.value.trim();
  if (!name) return;

  try {
    const res = await api.post(`/projects/${projectId}/lists`, { name });
    const newList = res.data;

    currentProject.lists.push(newList);
    renderBoard();
    addColumnModal.classList.remove('active');
    nameInput.value = '';
    showToast(`Column "${name}" added`);
  } catch (err) {
    alert(`Failed to add column: ${err.message}`);
  }
});

/**
 * Delete Project
 */
async function handleDeleteProject() {
  if (!confirm(`Are you sure you want to permanently delete "${currentProject.name}" and all its tasks?`)) return;
  try {
    await api.delete(`/projects/${projectId}`);
    window.location.href = 'index.html';
  } catch (err) {
    alert(`Failed to delete project: ${err.message}`);
  }
}

/**
 * Real-Time WebSocket Synchronization
 */
function initWebSocketSync() {
  socketClient.joinProject(projectId, currentUser, {
    onTaskCreated(task) {
      if (task.creatorId !== currentUser.id) {
        addTaskToLocalBoard(task);
        showToast(`📌 New task added: "${task.title}"`);
      }
    },
    onTaskUpdated(task) {
      updateTaskInLocalBoard(task);
      if (activeTask && activeTask.id === task.id) {
        modalTaskTitle.textContent = task.title;
        editTitle.value = task.title;
        editDesc.value = task.description || '';
      }
    },
    onTaskMoved(task) {
      updateTaskInLocalBoard(task);
      showToast(`🔀 Card "${task.title}" moved`);
    },
    onTaskDeleted({ taskId }) {
      removeTaskFromLocalBoard(taskId);
      if (activeTask && activeTask.id === taskId) {
        closeTaskModal();
      }
    },
    onCommentCreated({ comment, taskId }) {
      if (activeTask && activeTask.id === taskId) {
        if (!activeTask.comments) activeTask.comments = [];
        if (!activeTask.comments.some(c => c.id === comment.id)) {
          activeTask.comments.push(comment);
          renderTaskComments(activeTask.comments);
        }
      }
      const card = document.getElementById(`task-${taskId}`);
      if (card) {
        const commentElem = card.querySelector('.card-comments-count');
        if (commentElem) {
          const currentCount = parseInt(commentElem.textContent.replace(/\D/g, '') || '0', 10);
          commentElem.innerHTML = `💬 ${currentCount + 1}`;
        }
      }
    },
    onMemberAdded(member) {
      if (!currentProject.members.some(m => m.id === member.id)) {
        currentProject.members.push(member);
        renderProjectInfo();
        if (membersModal.classList.contains('active')) renderMembersList();
        showToast(`👥 ${member.user.name} joined the project`);
      }
    },
    onListCreated(list) {
      if (!currentProject.lists.some(l => l.id === list.id)) {
        currentProject.lists.push(list);
        renderBoard();
        showToast(`📋 New column "${list.name}" added`);
      }
    },
  });
}

window.addEventListener('beforeunload', () => {
  socketClient.leaveProject(projectId);
});

document.addEventListener('DOMContentLoaded', initBoard);
