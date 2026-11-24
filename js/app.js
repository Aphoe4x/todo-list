// ========== STATE & DATA ==========
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentDate = new Date();
let selectedDate = new Date();
let timerInterval = null;
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isRunning = false;
let isWorkTime = true;
let pomodoroStats = JSON.parse(localStorage.getItem('pomodoroStats')) || { sessions: 0, totalMinutes: 0 };
let draggedTodoId = null;
let currentFilter = 'all';

// Load theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Copy shown in the page head, one entry per tab
const TAB_META = {
    'tasks-tab': { title: 'Tasks', eyebrow: 'Workspace', sub: 'A calm place for everything you need to do.' },
    'calendar-tab': { title: 'Calendar', eyebrow: 'Schedule', sub: 'See what is due and when it lands.' },
    'board-tab': { title: 'Board', eyebrow: 'Flow', sub: 'Move work from idea to done.' },
    'timer-tab': { title: 'Timer', eyebrow: 'Focus', sub: 'One focused block at a time.' }
};

// ========== THEME TOGGLE ==========
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ========== TAB NAVIGATION ==========
document.querySelectorAll('.nav-link').forEach(button => {
    button.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active');
    });

    // Mark the matching tab and nav button
    document.querySelectorAll('.nav-link').forEach(link => {
        const isActive = link.getAttribute('data-tab') === tabName;
        link.classList.toggle('active', isActive);
        link.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.getElementById(tabName).classList.add('active');

    const meta = TAB_META[tabName];
    if (meta) {
        document.getElementById('pageTitle').textContent = meta.title;
        document.getElementById('pageEyebrow').textContent = meta.eyebrow;
        document.getElementById('pageSubtitle').textContent = meta.sub;
    }

    // Re-render if needed
    if (tabName === 'tasks-tab') {
        updateTasksSummary();
        renderTodos();
    } else if (tabName === 'calendar-tab') {
        renderCalendar();
    } else if (tabName === 'board-tab') {
        renderKanban();
    }

    // Keep the address in sync so any tab can be linked to directly
    try {
        history.replaceState(null, '', '#' + tabName.replace('-tab', ''));
    } catch (e) {
        // Some file:// contexts refuse history updates; ignore that.
    }
}

function updateTasksSummary() {
    const activePane = document.querySelector('.tab-pane.active');
    if (!activePane || activePane.id !== 'tasks-tab') return;

    const completed = todos.filter(t => t.completed).length;
    const pending = todos.length - completed;
    const today = dateKey(new Date());
    const overdue = todos.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;

    const parts = [];
    parts.push(pending === 1 ? '1 task to do' : pending + ' tasks to do');
    parts.push(completed === 1 ? '1 finished' : completed + ' finished');
    if (overdue > 0) {
        parts.push(overdue === 1 ? '1 overdue' : overdue + ' overdue');
    }

    document.getElementById('pageSubtitle').textContent = parts.join(', ') + '.';
}

// ========== FILTERING ==========
function filterByStatus(status) {
    currentFilter = status;
    showFilterInfo(status);
    renderTodos();
}

function clearFilter() {
    currentFilter = 'all';
    document.getElementById('filterInfo').style.display = 'none';
    renderTodos();
}

function showFilterInfo(status) {
    const filterInfo = document.getElementById('filterInfo');
    const filterText = document.getElementById('filterText');
    
    const filterLabels = {
        'all': 'Showing all tasks',
        'completed': 'Showing finished tasks only',
        'pending': 'Showing to-do tasks only',
        'overdue': 'Showing overdue tasks only'
    };

    filterText.textContent = filterLabels[status];
    filterInfo.style.display = 'flex';
}

function getFilteredTodos() {
    const today = dateKey(new Date());
    
    switch(currentFilter) {
        case 'completed':
            return todos.filter(t => t.completed);
        case 'pending':
            return todos.filter(t => !t.completed);
        case 'overdue':
            return todos.filter(t => !t.completed && t.dueDate && t.dueDate < today);
        default:
            return todos;
    }
}

// ========== TODO MANAGEMENT ==========
function addTodo() {
    const input = document.getElementById('todoInput');
    const dueDate = document.getElementById('dueDateInput').value;
    const priority = document.getElementById('prioritySelect').value;
    const text = input.value.trim();

    if (!text) {
        alert('Please enter a task');
        return;
    }

    const todo = {
        id: Date.now(),
        text: text,
        priority: priority,
        completed: false,
        dueDate: dueDate,
        subtasks: [],
        status: 'backlog',
        createdAt: new Date().toISOString()
    };

    todos.push(todo);
    saveTodos();
    input.value = '';
    document.getElementById('dueDateInput').value = '';
    renderTodos();
    renderKanban();
    renderCalendar();
}

let pendingConfirmId = null;

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    if (!todo.completed) {
        // Show confirmation modal before marking as done
        pendingConfirmId = id;
        document.getElementById('confirmModal').style.display = 'flex';
    } else {
        // Uncheck - move back to backlog
        todo.completed = false;
        todo.status = 'backlog';
        saveTodos();
        renderTodos();
        renderKanban();
    }
}

function confirmDone() {
    if (pendingConfirmId) {
        const todo = todos.find(t => t.id === pendingConfirmId);
        if (todo) {
            todo.completed = true;
            todo.status = 'done';
            saveTodos();
            renderTodos();
            renderKanban();
        }
    }
    pendingConfirmId = null;
    document.getElementById('confirmModal').style.display = 'none';
}

function cancelConfirm() {
    pendingConfirmId = null;
    document.getElementById('confirmModal').style.display = 'none';
    // Re-render to reset the checkbox visual state
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    renderKanban();
    renderCalendar();
}

function addSubtask(parentId) {
    const input = document.getElementById(`subtask-input-${parentId}`);
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    const parent = todos.find(t => t.id === parentId);
    if (parent) {
        parent.subtasks.push({
            id: Date.now(),
            text: text,
            completed: false
        });
        saveTodos();
        renderTodos();
        input.value = '';
    }
}

function toggleSubtask(parentId, subtaskId) {
    const parent = todos.find(t => t.id === parentId);
    if (parent) {
        const subtask = parent.subtasks.find(s => s.id === subtaskId);
        if (subtask) subtask.completed = !subtask.completed;
        saveTodos();
        renderTodos();
    }
}

function deleteSubtask(parentId, subtaskId) {
    const parent = todos.find(t => t.id === parentId);
    if (parent) {
        parent.subtasks = parent.subtasks.filter(s => s.id !== subtaskId);
        saveTodos();
        renderTodos();
    }
}

// ========== RENDERING TODOS ==========
function emptyTextFor(status) {
    switch (status) {
        case 'completed':
            return 'Nothing finished yet.';
        case 'pending':
            return 'Nothing left to do.';
        case 'overdue':
            return 'No overdue tasks.';
        default:
            return 'No tasks yet. Add your first one above.';
    }
}

function renderTodos() {
    const list = document.getElementById('todosList');
    const empty = document.getElementById('emptyMessage');
    const completed = todos.filter(t => t.completed).length;
    const pending = todos.length - completed;
    const today = dateKey(new Date());
    const overdue = todos.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;

    document.getElementById('totalCount').textContent = todos.length;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('overdueCount').textContent = overdue;

    // Progress bar and summary copy
    const percent = todos.length ? Math.round((completed / todos.length) * 100) : 0;
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressLabel').textContent = completed + ' of ' + todos.length + ' done';
    updateTasksSummary();

    // Highlight the stat card that matches the active filter
    document.querySelectorAll('.stat-card[data-stat]').forEach(card => {
        card.classList.toggle('is-active', card.getAttribute('data-stat') === currentFilter);
    });

    // The "all" and "pending" views show open work. "Completed" shows the archive.
    const filteredTodos = currentFilter === 'completed'
        ? getFilteredTodos()
        : getFilteredTodos().filter(t => !t.completed);
    list.innerHTML = '';

    if (filteredTodos.length === 0) {
        document.getElementById('emptyText').textContent = emptyTextFor(currentFilter);
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    filteredTodos.forEach(todo => {
        const dueDateStr = formatDueDate(todo.dueDate);
        const isOverdue = todo.dueDate && todo.dueDate < dateKey(new Date()) && !todo.completed;
        const completedSubtasks = todo.subtasks.filter(s => s.completed).length;

        const item = document.createElement('div');
        item.className = 'todo-item' + (todo.completed ? ' completed' : '');
        item.draggable = true;
        item.id = `todo-${todo.id}`;
        item.ondragstart = () => draggedTodoId = todo.id;
        item.ondragend = () => draggedTodoId = null;

        item.innerHTML = `
            <div class="todo-header">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-label="Mark as done" onchange="toggleTodo(${todo.id})">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <div class="todo-badges">
                    <span class="badge priority-${todo.priority}">${todo.priority}</span>
                    ${dueDateStr ? `<span class="badge badge-date"><svg class="icon"><use href="#i-calendar"></use></svg>${dueDateStr}</span>` : ''}
                    ${isOverdue ? '<span class="badge badge-overdue">Overdue</span>' : ''}
                    ${todo.subtasks.length > 0 ? `<span class="badge badge-count">${completedSubtasks}/${todo.subtasks.length}</span>` : ''}
                </div>
            </div>

            ${todo.subtasks.length > 0 ? `
                <div class="subtasks-container">
                    ${todo.subtasks.map(st => `
                        <div class="subtask-item ${st.completed ? 'completed' : ''}">
                            <input type="checkbox" ${st.completed ? 'checked' : ''} aria-label="Toggle step" onchange="toggleSubtask(${todo.id}, ${st.id})">
                            <span class="subtask-text">${escapeHtml(st.text)}</span>
                            <button class="icon-btn" title="Delete step" onclick="deleteSubtask(${todo.id}, ${st.id})">
                                <svg class="icon icon-sm"><use href="#i-trash"></use></svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="add-subtask-form" id="subtask-form-${todo.id}">
                <input type="text" id="subtask-input-${todo.id}" class="form-control" placeholder="Add a step">
                <button class="icon-btn" title="Add step" onclick="addSubtask(${todo.id})">
                    <svg class="icon icon-sm"><use href="#i-plus"></use></svg>
                </button>
            </div>

            <div class="todo-actions">
                <button class="btn-danger btn-sm" onclick="deleteTodo(${todo.id})">
                    <svg class="icon"><use href="#i-trash"></use></svg>
                    Delete
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// ========== KANBAN BOARD ==========
function renderKanban() {
    const columns = {
        'backlog': document.getElementById('kanban-backlog'),
        'inprogress': document.getElementById('kanban-inprogress'),
        'done': document.getElementById('kanban-done')
    };

    Object.keys(columns).forEach(status => {
        columns[status].innerHTML = '';
        const statusTodos = todos.filter(t => t.status === status);
        statusTodos.forEach(todo => {
            const card = document.createElement('div');
            card.className = `kanban-card ${status === 'inprogress' ? 'working' : ''}`;
            card.draggable = true;
            card.ondragstart = (e) => {
                draggedTodoId = todo.id;
                e.dataTransfer.effectAllowed = 'move';
            };
            card.ondragend = clearDragOver;
            const completedSubtasks = todo.subtasks.filter(s => s.completed).length;
            card.innerHTML = `
                <div class="kanban-top">
                    <span class="todo-text">${escapeHtml(todo.text)}</span>
                    <span class="badge priority-${todo.priority}">${todo.priority}</span>
                </div>
                ${status === 'inprogress' ? '<span class="working-pill"><span class="dot"></span>Working</span>' : ''}
                ${todo.subtasks.length > 0 ? `<span class="kanban-meta">${completedSubtasks}/${todo.subtasks.length} steps</span>` : ''}
            `;
            columns[status].appendChild(card);
        });
    });

    document.getElementById('kanbanCountBacklog').textContent = todos.filter(t => t.status === 'backlog').length;
    document.getElementById('kanbanCountInprogress').textContent = todos.filter(t => t.status === 'inprogress').length;
    document.getElementById('kanbanCountDone').textContent = todos.filter(t => t.status === 'done').length;
}

function clearDragOver() {
    document.querySelectorAll('.kanban-tasks.drag-over').forEach(column => {
        column.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleKanbanDrop(e) {
    e.preventDefault();
    clearDragOver();
    if (!draggedTodoId) return;

    const todo = todos.find(t => t.id === draggedTodoId);
    const targetColumn = e.currentTarget.id;
    const statusMap = {
        'kanban-backlog': 'backlog',
        'kanban-inprogress': 'inprogress',
        'kanban-done': 'done'
    };

    if (todo && statusMap[targetColumn]) {
        todo.status = statusMap[targetColumn];
        if (todo.status === 'done') {
            todo.completed = true;
        } else if (todo.completed) {
            todo.completed = false;
        }
        saveTodos();
        renderKanban();
        renderTodos();
    }
}

// ========== CALENDAR ==========
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    document.getElementById('monthYear').textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        calendarDays.appendChild(day);
    }

    // Current month days
    const selectedStr = dateKey(selectedDate);
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = dateKey(date);
        const tasksOnDate = todos.filter(t => t.dueDate === dateStr);
        const isToday = dateStr === dateKey(new Date());
        const isSelected = dateStr === selectedStr;

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${tasksOnDate.length > 0 ? 'has-tasks' : ''}`;
        dayEl.innerHTML = `<span>${day}</span>`;
        if (tasksOnDate.length > 0) {
            dayEl.innerHTML += `<div class="task-box">${tasksOnDate.length}</div>`;
        }
        dayEl.onclick = () => selectDate(date);
        calendarDays.appendChild(dayEl);
    }

    // Next month days
    const totalCells = calendarDays.children.length;
    for (let day = 1; totalCells + day <= 42; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        calendarDays.appendChild(dayEl);
    }
}

function selectDate(date) {
    selectedDate = date;
    renderCalendar();
    renderCalendarTasks();
}

function renderCalendarTasks() {
    const dateStr = dateKey(selectedDate);
    const tasksForDate = todos.filter(t => t.dueDate === dateStr);
    const display = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    document.getElementById('selectedDateDisplay').textContent = display;
    const tasksList = document.getElementById('calendarTasksList');

    if (tasksForDate.length === 0) {
        tasksList.innerHTML = '<div class="empty-state"><p>No tasks scheduled for this date</p></div>';
        return;
    }

    tasksList.innerHTML = tasksForDate.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}">
            <div class="todo-header">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                <span class="badge priority-${todo.priority}">${todo.priority}</span>
            </div>
        </div>
    `).join('');
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// ========== POMODORO TIMER ==========
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTimerRing() {
    const circle = document.getElementById('timerCircle');
    if (!circle) return;
    const percent = totalTime > 0 ? Math.max(0, Math.min(100, (timeLeft / totalTime) * 100)) : 0;
    circle.style.setProperty('--p', percent.toFixed(2));
}

function getFocusMinutes() {
    const val = parseInt(document.getElementById('focusMinutes')?.value);
    return (val && val > 0 && val <= 120) ? val : 25;
}

function getRestMinutes() {
    const val = parseInt(document.getElementById('restMinutes')?.value);
    return (val && val > 0 && val <= 60) ? val : 5;
}

function startTimer() {
    if (isRunning) return;
    
    // Create a todo from timer task input if provided
    const taskInput = document.getElementById('timerTaskInput');
    const dateInput = document.getElementById('timerDateInput');
    if (taskInput && taskInput.value.trim()) {
        const todo = {
            id: Date.now(),
            text: taskInput.value.trim(),
            priority: 'medium',
            completed: false,
            dueDate: dateInput ? dateInput.value : '',
            subtasks: [],
            status: 'inprogress',
            createdAt: new Date().toISOString()
        };
        todos.push(todo);
        saveTodos();
        renderTodos();
        renderKanban();
        renderCalendar();
        taskInput.value = '';
        if (dateInput) dateInput.value = '';
    }
    
    timeLeft = getFocusMinutes() * 60;
    totalTime = timeLeft;
    document.getElementById('timerDisplay').textContent = formatTime(timeLeft);
    updateTimerRing();
    
    isRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timerDisplay').textContent = formatTime(timeLeft);
        updateTimerRing();

        if (timeLeft === 0) {
            completePomodoro();
        }
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetTimer() {
    pauseTimer();
    isWorkTime = true;
    timeLeft = getFocusMinutes() * 60;
    totalTime = timeLeft;
    document.getElementById('timerDisplay').textContent = formatTime(timeLeft);
    updateTimerRing();
    document.getElementById('timerStatus').textContent = 'Focus Time - Get work done!';
}

function completePomodoro() {
    clearInterval(timerInterval);
    isRunning = false;

    if (isWorkTime) {
        const mins = getFocusMinutes();
        pomodoroStats.sessions++;
        pomodoroStats.totalMinutes += mins;
        localStorage.setItem('pomodoroStats', JSON.stringify(pomodoroStats));
        document.getElementById('sessionsCount').textContent = pomodoroStats.sessions;
        document.getElementById('totalMinutes').textContent = pomodoroStats.totalMinutes;

        alert('Great work! Time to rest for ' + getRestMinutes() + ' minutes.');
        isWorkTime = false;
        timeLeft = getRestMinutes() * 60;
        document.getElementById('timerStatus').textContent = 'Rest Time - Take a break!';
    } else {
        alert('Rest done! Ready to work again?');
        isWorkTime = true;
        timeLeft = getFocusMinutes() * 60;
        document.getElementById('timerStatus').textContent = 'Focus Time - Get work done!';
    }

    document.getElementById('timerDisplay').textContent = formatTime(timeLeft);
    totalTime = timeLeft;
    updateTimerRing();
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
}

// ========== UTILITIES ==========
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// The timer circle shows the time, not an edit box: clicking it focuses the
// duration inputs below, which is where the actual values come from.
function focusTimerInput(id) {
    const el = document.getElementById(id);
    if (el) {
        el.focus();
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

// Date-only helpers. Parsing "YYYY-MM-DD" with new Date() treats it as UTC
// midnight, which shows the day before for anyone west of UTC. Build local dates.
function dateKey(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

function parseDateKey(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatDueDate(dateStr) {
    const date = parseDateKey(dateStr);
    if (!date) return '';
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString('en-US', sameYear
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('todoInput') === document.activeElement) {
        addTodo();
    }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        headerDate.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    updateTimerRing();
    renderTodos();
    renderKanban();
    renderCalendar();
    renderCalendarTasks();
    document.getElementById('sessionsCount').textContent = pomodoroStats.sessions;
    document.getElementById('totalMinutes').textContent = pomodoroStats.totalMinutes;

    // Deep link: /#board, /#calendar and /#timer open that tab directly
    const hashTab = (location.hash || '').replace('#', '');
    const startTab = hashTab ? hashTab + '-tab' : '';
    if (startTab && document.getElementById(startTab)) {
        switchTab(startTab);
    }
});
