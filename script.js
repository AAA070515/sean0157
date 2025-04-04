// Firebase 모듈 임포트 (HTML에서 이미 정의되어 있으므로 여기서는 주석 처리)
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
// import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
// import { getFirestore, doc, setDoc, onSnapshot, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// 전역 변수
let currentDate = new Date().toISOString().split('T')[0];
let timerInterval = null;
let timerSeconds = 0;
let currentGroupId = null; // 그룹 ID를 저장하는 전역 변수 추가

window.subjects = [];
window.studyData = {};
window.subjectStudyTime = {};
window.diaryData = {};
window.todos = [];
window.goals = { daily: null, weekly: null };
window.studySessions = {};
window.nickname = '';

// 화면 전환
function showScreen(screen) {
    const screens = ['home', 'study', 'diary', 'todo', 'goals', 'stats', 'settings', 'groups'];
    screens.forEach(s => {
        const el = document.getElementById(`${s}Screen`);
        el.classList.add('hidden');
    });

    const targetScreen = document.getElementById(`${screen}Screen`);
    setTimeout(() => {
        targetScreen.classList.remove('hidden');
    }, 50);

    const navMapping = {
        'home': 'Home',
        'study': 'Study',
        'todo': 'To-Do',
        'diary': 'Journal',
        'goals': 'Goals',
        'stats': 'Statistics',
        'groups': 'Groups'
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (navMapping[screen] && btn.textContent.trim() === navMapping[screen]) {
            btn.classList.add('active');
        }
    });

    closeDrawer();

    if (screen === 'home') renderHome();
    else if (screen === 'study') updateSubjectTimes();
    else if (screen === 'diary') updateDiaryDate();
    else if (screen === 'todo') renderTodos();
    else if (screen === 'goals') updateGoalsProgress();
    else if (screen === 'stats') renderStats();
    else if (screen === 'groups') renderGroups();
}

// 네비게이션 드로어 토글
function toggleDrawer() {
    const drawer = document.querySelector('.drawer-content');
    const overlay = document.querySelector('.overlay');
    drawer.classList.toggle('visible');
    overlay.classList.toggle('visible');
}

function closeDrawer() {
    const drawer = document.querySelector('.drawer-content');
    const overlay = document.querySelector('.overlay');
    drawer.classList.remove('visible');
    overlay.classList.remove('visible');
}

// 타이머 기능
function startTimer() {
    if (timerInterval) return;
    const selectedSubject = document.getElementById('subjectSelect').value;
    if (!selectedSubject) {
        alert('Please select a subject!');
        return;
    }
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
        updateStudyTime(selectedSubject);
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = 0;
    updateTimerDisplay();
    saveUserData();
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateStudyTime(subject) {
    window.studyData[currentDate] = (window.studyData[currentDate] || 0) + 1;
    window.subjectStudyTime[subject] = (window.subjectStudyTime[subject] || 0) + 1;
    updateStudyTimeDisplay();
    updateSubjectTimes();
}

// 과목 관리
function addSubject() {
    const subjectInput = document.getElementById('subjectInput');
    const subject = subjectInput.value.trim();
    if (subject && !window.subjects.includes(subject)) {
        window.subjects.push(subject);
        updateSubjectSelect();
        subjectInput.value = '';
        saveUserData();
    }
}

function deleteSubject(subject) {
    window.subjects = window.subjects.filter(s => s !== subject);
    delete window.subjectStudyTime[subject];
    updateSubjectSelect();
    updateSubjectTimes();
    saveUserData();
}

function updateSubjectSelect() {
    const select = document.getElementById('subjectSelect');
    select.innerHTML = '<option value="">Select a subject</option>';
    window.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        select.appendChild(option);
    });
}

function updateSubjectTimes() {
    const subjectTimes = document.getElementById('subjectTimes');
    subjectTimes.innerHTML = '';
    window.subjects.forEach(subject => {
        const time = window.subjectStudyTime[subject] || 0;
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        const div = document.createElement('div');
        div.className = 'subject-time';
        div.innerHTML = `
            <span>${subject}</span>
            <span>${hours}h ${minutes}m ${seconds}s</span>
            <button class="delete-subject-btn" onclick="deleteSubject('${subject}')">×</button>
        `;
        subjectTimes.appendChild(div);
    });
}

function updateStudyTimeDisplay() {
    const dailyTime = window.studyData[currentDate] || 0;
    const hours = Math.floor(dailyTime / 3600);
    const minutes = Math.floor((dailyTime % 3600) / 60);
    const seconds = dailyTime % 60;
    document.getElementById('dailyStudyTime').textContent = `${hours}h ${minutes}m ${seconds}s`;
    document.getElementById('dashboardStudyTime').textContent = `${hours}h ${minutes}m ${seconds}s`;
}

// 다이어리
let selectedMood = null;
let uploadedImage = null;

function updateDiaryDate() {
    const diaryDate = document.getElementById('diaryDate');
    diaryDate.value = currentDate;
    loadDiaryEntry(currentDate);
}

function selectMood(mood) {
    selectedMood = mood;
    document.querySelectorAll('.mood-bean').forEach(bean => {
        bean.classList.remove('selected');
        if (bean.classList.contains(mood)) bean.classList.add('selected');
    });
}

function triggerFileInput() {
    document.getElementById('diaryImage').click();
}

document.getElementById('diaryImage').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImage = e.target.result;
            document.getElementById('imagePreview').innerHTML = `<img src="${uploadedImage}" alt="Uploaded Image">`;
        };
        reader.readAsDataURL(file);
    }
});

function saveDiary() {
    const date = document.getElementById('diaryDate').value;
    const memo = document.getElementById('memoInput').value.trim();
    window.diaryData[date] = {
        mood: selectedMood,
        memo: memo,
        image: uploadedImage
    };
    saveUserData();
    alert('Journal entry saved!');
    loadDiaryEntry(date);
}

function loadDiaryEntry(date) {
    const entry = window.diaryData[date] || {};
    selectedMood = entry.mood || null;
    document.getElementById('memoInput').value = entry.memo || '';
    uploadedImage = entry.image || null;
    document.getElementById('imagePreview').innerHTML = uploadedImage ? `<img src="${uploadedImage}" alt="Uploaded Image">` : '';
    document.querySelectorAll('.mood-bean').forEach(bean => {
        bean.classList.remove('selected');
        if (entry.mood && bean.classList.contains(entry.mood)) bean.classList.add('selected');
    });
}

// 투두리스트
function addTodo() {
    const todoInput = document.getElementById('todoInput');
    const text = todoInput.value.trim();
    if (text) {
        window.todos.push({ id: Date.now(), text, completed: false });
        todoInput.value = '';
        renderTodos();
        saveUserData();
    }
}

function toggleTodo(id) {
    window.todos = window.todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    renderTodos();
    saveUserData();
}

function deleteTodo(id) {
    window.todos = window.todos.filter(todo => todo.id !== id);
    renderTodos();
    saveUserData();
}

function clearCompleted() {
    window.todos = window.todos.filter(todo => !todo.completed);
    renderTodos();
    saveUserData();
}

function renderTodos(filter = 'all') {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    const filteredTodos = window.todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
            <span class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</span>
            <button class="delete-todo" onclick="deleteTodo(${todo.id})">×</button>
        `;
        todoList.appendChild(li);
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') === `filterTasks('${filter}')`) btn.classList.add('active');
    });

    const remaining = window.todos.filter(todo => !todo.completed).length;
    document.getElementById('todoCount').textContent = `${remaining} tasks remaining`;

    const preview = document.getElementById('dashboardTodoPreview');
    preview.innerHTML = '';
    window.todos.slice(0, 5).forEach(todo => {
        const li = document.createElement('li');
        li.className = todo.completed ? 'completed' : '';
        li.textContent = todo.text;
        preview.appendChild(li);
    });
}

function filterTasks(filter) {
    renderTodos(filter);
}

// 목표 설정
function saveGoal(period) {
    const input = document.getElementById(`${period}Goal`);
    const hours = parseInt(input.value) || 0;
    window.goals[period] = hours * 3600;
    saveUserData();
    updateGoalsProgress();
}

function updateGoalsInputs() {
    document.getElementById('dailyGoal').value = window.goals.daily ? window.goals.daily / 3600 : '';
    document.getElementById('weeklyGoal').value = window.goals.weekly ? window.goals.weekly / 3600 : '';
}

function updateGoalsProgress() {
    const progressDiv = document.getElementById('goalProgress');
    const dashboardProgress = document.getElementById('dashboardGoalProgress');
    progressDiv.innerHTML = '';
    dashboardProgress.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    const dailyTime = window.studyData[today] || 0;
    const dailyGoal = window.goals.daily || 0;
    const dailyPercent = dailyGoal ? Math.min((dailyTime / dailyGoal) * 100, 100) : 0;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekTime = Object.keys(window.studyData)
        .filter(date => new Date(date) >= weekStart)
        .reduce((sum, date) => sum + (window.studyData[date] || 0), 0);
    const weeklyGoal = window.goals.weekly || 0;
    const weeklyPercent = weeklyGoal ? Math.min((weekTime / weeklyGoal) * 100, 100) : 0;

    progressDiv.innerHTML = `
        <h4>Daily Goal</h4>
        <div class="progress-bar"><div class="progress-fill" style="width: ${dailyPercent}%"></div></div>
        <p>${Math.floor(dailyTime / 3600)}h ${Math.floor((dailyTime % 3600) / 60)}m / ${Math.floor(dailyGoal / 3600)}h</p>
        <h4>Weekly Goal</h4>
        <div class="progress-bar"><div class="progress-fill" style="width: ${weeklyPercent}%"></div></div>
        <p>${Math.floor(weekTime / 3600)}h ${Math.floor((weekTime % 3600) / 60)}m / ${Math.floor(weeklyGoal / 3600)}h</p>
    `;
    dashboardProgress.innerHTML = `
        <h4>Daily</h4>
        <div class="progress-bar"><div class="progress-fill" style="width: ${dailyPercent}%"></div></div>
        <h4>Weekly</h4>
        <div class="progress-bar"><div class="progress-fill" style="width: ${weeklyPercent}%"></div></div>
    `;
}

// 홈 화면
function renderHome() {
    const calendar = document.getElementById('calendar');
    const title = document.getElementById('calendarTitle');
    calendar.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    title.textContent = `${year}년 ${month + 1}월`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell';
        calendar.appendChild(emptyCell);
    }

    for (let day = 1; day <= lastDate; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (window.studyData[dateStr] || window.diaryData[dateStr]?.memo || window.diaryData[dateStr]?.image) {
            cell.className += ' sticker';
            cell.textContent = '📘';
        } else {
            cell.textContent = day;
        }
        cell.onclick = () => showDayDetails(dateStr);
        calendar.appendChild(cell);
    }

    const diaryPreview = document.getElementById('dashboardDiary');
    const recentEntry = Object.entries(window.diaryData)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))[0];
    diaryPreview.innerHTML = recentEntry 
        ? `<p>${recentEntry[0]}: ${recentEntry[1].memo || 'No memo'}</p>` 
        : '<p>No recent entries</p>';

    updateStudyTimeDisplay();
    renderTodos();
    updateGoalsProgress();
}

function showDayDetails(date) {
    const details = document.getElementById('dayDetails');
    const selectedDate = document.getElementById('selectedDate');
    const studyTimeDetail = document.getElementById('studyTimeDetail');
    const memoDetail = document.getElementById('memoDetail');
    const imagePreview = document.getElementById('dayImagePreview');

    selectedDate.textContent = date;
    const time = window.studyData[date] || 0;
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    studyTimeDetail.textContent = `${hours}h ${minutes}m ${seconds}s`;

    const entry = window.diaryData[date] || {};
    memoDetail.textContent = entry.memo || 'No memo';
    memoDetail.classList.toggle('hidden', !entry.memo);
    imagePreview.innerHTML = entry.image ? `<img src="${entry.image}" alt="Diary Image">` : '';

    details.classList.remove('hidden');
}

// 통계
let currentWeekOffset = 0;

function renderStats() {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (currentWeekOffset * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    document.getElementById('weekRange').textContent = 
        `${weekStart.toISOString().split('T')[0]} ~ ${weekEnd.toISOString().split('T')[0]}`;

    const weekCalendar = document.getElementById('weekCalendar');
    weekCalendar.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayDiv = document.createElement('div');
        dayDiv.className = 'week-day';
        dayDiv.textContent = `${date.getDate()}일`;
        if (dateStr === currentDate) dayDiv.classList.add('selected');
        dayDiv.onclick = () => showStatsDetails(dateStr);
        weekCalendar.appendChild(dayDiv);
    }

    showStatsDetails(currentDate);
}

function changeWeek(offset) {
    currentWeekOffset += offset;
    renderStats();
}

function showStatsDetails(date) {
    const details = document.getElementById('statsDetails');
    const selectedDate = document.getElementById('statsSelectedDate');
    const studyTime = document.getElementById('statsStudyTime');
    const subjects = document.getElementById('statsSubjects');
    const diary = document.getElementById('statsDiary');

    selectedDate.textContent = date;
    const time = window.studyData[date] || 0;
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    studyTime.textContent = `Study Time: ${hours}h ${minutes}m ${seconds}s`;

    subjects.innerHTML = '';
    window.subjects.forEach(subject => {
        const subjectTime = window.studySessions[date]?.[subject] || 0;
        const sHours = Math.floor(subjectTime / 3600);
        const sMinutes = Math.floor((subjectTime % 3600) / 60);
        const sSeconds = subjectTime % 60;
        if (subjectTime > 0) {
            const div = document.createElement('div');
            div.className = 'subject-stat';
            div.innerHTML = `<span>${subject}</span><span>${sHours}h ${sMinutes}m ${sSeconds}s</span>`;
            subjects.appendChild(div);
        }
    });

    const entry = window.diaryData[date] || {};
    diary.innerHTML = entry.memo ? `<p>${entry.memo}</p>` : '<p>No diary entry</p>';
    if (entry.image) diary.innerHTML += `<img src="${entry.image}" alt="Diary Image">`;

    details.classList.remove('hidden');
    document.querySelectorAll('.week-day').forEach(day => {
        day.classList.toggle('selected', day.textContent.includes(date.split('-')[2].replace(/^0/, '') + '일'));
    });
}

// 설정
function changeNickname() {
    const input = document.getElementById('settingsNicknameInput');
    const nickname = input.value.trim();
    const error = document.getElementById('settingsNicknameError');
    if (nickname.length < 2 || nickname.length > 20) {
        error.textContent = 'Nickname must be between 2 and 20 characters.';
        error.classList.remove('hidden');
        return;
    }
    window.nickname = nickname;
    saveUserData();
    input.value = '';
    error.classList.add('hidden');
    alert('Nickname changed successfully!');
}

function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings? This will clear all your data.')) {
        if (window.currentUser) {
            const userRef = doc(window.db, "users", window.currentUser.uid);
            setDoc(userRef, {
                subjects: [],
                studyData: {},
                subjectStudyTime: {},
                diaryData: {},
                todos: [],
                goals: { daily: null, weekly: null },
                studySessions: {},
                nickname: window.nickname,
                groupId: null // 그룹 정보 초기화
            }).then(() => {
                currentGroupId = null;
                window.subjects = [];
                window.studyData = {};
                window.subjectStudyTime = {};
                window.diaryData = {};
                window.todos = [];
                window.goals = { daily: null, weekly: null };
                window.studySessions = {};
                updateSubjectSelect();
                updateSubjectTimes();
                updateStudyTimeDisplay();
                renderHome();
                renderTodos();
                updateGoalsInputs();
                updateGoalsProgress();
                renderGroups();
                alert('All settings have been reset.');
            }).catch(error => {
                console.error('Reset failed:', error.code, error.message);
            });
        }
    }
}

// 그룹 기능 추가
function generateGroupCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function renderGroups() {
    const groupOptions = document.getElementById('groupOptions');
    const createGroupForm = document.getElementById('createGroupForm');
    const joinGroupForm = document.getElementById('joinGroupForm');
    const groupDashboard = document.getElementById('groupDashboard');

    if (!window.currentUser) {
        groupOptions.classList.remove('hidden');
        createGroupForm.classList.add('hidden');
        joinGroupForm.classList.add('hidden');
        groupDashboard.classList.add('hidden');
        return;
    }

    const userRef = doc(db, "users", window.currentUser.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    currentGroupId = userData.groupId || null;

    if (currentGroupId) {
        groupOptions.classList.add('hidden');
        createGroupForm.classList.add('hidden');
        joinGroupForm.classList.add('hidden');
        groupDashboard.classList.remove('hidden');
        renderGroupDashboard();
    } else {
        groupOptions.classList.remove('hidden');
        createGroupForm.classList.add('hidden');
        joinGroupForm.classList.add('hidden');
        groupDashboard.classList.add('hidden');
    }
}

function showCreateGroup() {
    document.getElementById('groupOptions').classList.add('hidden');
    document.getElementById('createGroupForm').classList.remove('hidden');
    document.getElementById('joinGroupForm').classList.add('hidden');
    document.getElementById('groupNameInput').value = '';
    document.getElementById('groupCodeDisplay').classList.add('hidden');
    document.getElementById('createGroupError').classList.add('hidden');
}

function showJoinGroup() {
    document.getElementById('groupOptions').classList.add('hidden');
    document.getElementById('createGroupForm').classList.add('hidden');
    document.getElementById('joinGroupForm').classList.remove('hidden');
    document.getElementById('groupCodeInput').value = '';
    document.getElementById('joinGroupError').classList.add('hidden');
}

async function createGroup() {
    const groupName = document.getElementById('groupNameInput').value.trim();
    const error = document.getElementById('createGroupError');

    if (!groupName || groupName.length < 2) {
        error.textContent = 'Group name must be at least 2 characters.';
        error.classList.remove('hidden');
        return;
    }

    const groupCode = generateGroupCode();
    try {
        const groupRef = await addDoc(collection(db, "groups"), {
            name: groupName,
            code: groupCode,
            members: [window.currentUser.uid],
            createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, "users", window.currentUser.uid), { groupId: groupRef.id }, { merge: true });
        currentGroupId = groupRef.id;

        document.getElementById('groupCodeDisplay').textContent = `Group Code: ${groupCode}`;
        document.getElementById('groupCodeDisplay').classList.remove('hidden');
        document.getElementById('createGroupError').classList.add('hidden');
        renderGroups();
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
    }
}

async function joinGroup() {
    const groupCode = document.getElementById('groupCodeInput').value.trim().toUpperCase();
    const error = document.getElementById('joinGroupError');

    if (groupCode.length !== 6) {
        error.textContent = 'Please enter a valid 6-digit group code.';
        error.classList.remove('hidden');
        return;
    }

    try {
        const q = query(collection(db, "groups"), where("code", "==", groupCode));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            error.textContent = 'Invalid group code.';
            error.classList.remove('hidden');
            return;
        }

        const groupDoc = querySnapshot.docs[0];
        const groupData = groupDoc.data();

        if (groupData.members.includes(window.currentUser.uid)) {
            error.textContent = 'You are already in this group.';
            error.classList.remove('hidden');
            return;
        }

        const updatedMembers = [...groupData.members, window.currentUser.uid];
        await updateDoc(doc(db, "groups", groupDoc.id), { members: updatedMembers });
        await setDoc(doc(db, "users", window.currentUser.uid), { groupId: groupDoc.id }, { merge: true });

        currentGroupId = groupDoc.id;
        renderGroups();
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
    }
}

async function renderGroupDashboard() {
    const groupRef = doc(db, "groups", currentGroupId);
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();

    document.getElementById('currentGroupName').textContent = groupData.name;

    const membersStudyTime = document.getElementById('groupMembersStudyTime');
    membersStudyTime.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    for (const memberId of groupData.members) {
        const memberRef = doc(db, "users", memberId);
        const memberDoc = await getDoc(memberRef);
        const memberData = memberDoc.data();
        const studyTime = memberData.studyData?.[today] || 0;
        const hours = Math.floor(studyTime / 3600);
        const minutes = Math.floor((studyTime % 3600) / 60);
        const seconds = studyTime % 60;

        membersStudyTime.innerHTML += `
            <div class="member-study-time">
                <span>${memberData.nickname || 'Unknown'}</span>
                <span>${hours}h ${minutes}m ${seconds}s</span>
            </div>
        `;
    }
}

// 이벤트 리스너
document.getElementById('diaryDate').addEventListener('change', (e) => {
    currentDate = e.target.value;
    loadDiaryEntry(currentDate);
});

// 초기화
updateSubjectSelect();
updateStudyTimeDisplay();
renderHome();
renderTodos();
updateGoalsInputs();
updateGoalsProgress();

// HTML에서 정의된 loadUserData와 saveUserData를 여기서 확장
async function loadUserData(userId) {
    const userRef = doc(db, "users", userId);
    onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            window.subjects = data.subjects || [];
            window.studyData = data.studyData || {};
            window.subjectStudyTime = data.subjectStudyTime || {};
            window.diaryData = data.diaryData || {};
            window.todos = data.todos || [];
            window.goals = data.goals || { daily: null, weekly: null };
            window.studySessions = data.studySessions || {};
            window.nickname = data.nickname || 'User';
            currentGroupId = data.groupId || null; // 그룹 ID 로드
            console.log("Loaded data with nickname:", window.nickname);
        } else {
            window.subjects = [];
            window.studyData = {};
            window.subjectStudyTime = {};
            window.diaryData = {};
            window.todos = [];
            window.goals = { daily: null, weekly: null };
            window.studySessions = {};
            currentGroupId = null;
        }
        updateSubjectSelect();
        updateSubjectTimes();
        updateStudyTimeDisplay();
        updateGoalsInputs();
        updateGoalsProgress();
        renderHome();
        renderTodos();
        if (document.getElementById('groupsScreen') && !document.getElementById('groupsScreen').classList.contains('hidden')) {
            renderGroups();
        }
    }, (error) => {
        console.error("Load failed:", error.code, error.message);
    });
}

async function saveUserData() {
    if (!window.currentUser) return;
    const userId = window.currentUser.uid;
    const dataToSave = {
        subjects: window.subjects || [],
        studyData: window.studyData || {},
        subjectStudyTime: window.subjectStudyTime || {},
        diaryData: window.diaryData || {},
        todos: window.todos || [],
        goals: window.goals || { daily: null, weekly: null },
        studySessions: window.studySessions || {},
        nickname: window.nickname || 'User',
        groupId: currentGroupId || null
    };
    try {
        await setDoc(doc(db, "users", userId), dataToSave, { merge: true });
        console.log("Data saved successfully!");
    } catch (error) {
        console.error("Save failed:", error.code, error.message);
        alert("Failed to save data: " + error.message);
    }
}

// 전역 함수로 노출
window.showScreen = showScreen;
window.toggleDrawer = toggleDrawer;
window.closeDrawer = closeDrawer;
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.stopTimer = stopTimer;
window.addSubject = addSubject;
window.deleteSubject = deleteSubject;
window.selectMood = selectMood;
window.triggerFileInput = triggerFileInput;
window.saveDiary = saveDiary;
window.addTodo = addTodo;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.clearCompleted = clearCompleted;
window.filterTasks = filterTasks;
window.saveGoal = saveGoal;
window.changeWeek = changeWeek;
window.changeNickname = changeNickname;
window.resetAllSettings = resetAllSettings;
window.showCreateGroup = showCreateGroup;
window.showJoinGroup = showJoinGroup;
window.createGroup = createGroup;
window.joinGroup = joinGroup;
