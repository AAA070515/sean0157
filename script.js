// Firebase SDK 임포트
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDHiMXnBYgYDV1d7K_aFEb3u9jLWNVNpxw",
  authDomain: "yoonsarang0157.firebaseapp.com",
  projectId: "yoonsarang0157",
  storageBucket: "yoonsarang0157.firebasestorage.app",
  messagingSenderId: "366190146125",
  appId: "1:366190146125:web:d46bf198139ea1a6bae204",
  measurementId: "G-1KLQLPFY0D"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 전역 변수
let timerSeconds = 0;
let timerInterval = null;
let subjects = [];
let studyData = {};
let subjectStudyTime = {};
let diaryData = {};
let todos = [];
let goals = { daily: null, weekly: null };
let studySessions = {};
let currentFilter = 'all';
let selectedMood = null;
let uploadedImage = null;
let currentSelectedDate = null;
let currentWeekOffset = 0;
let currentUser = null;

const today = new Date();
let currentDate = today.toISOString().split('T')[0];

// 유틸리티 함수
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
}

function getMoodImage(mood) {
    const moodImages = {
        'happy': 'very_happy.png',
        'calm': 'happy.png',
        'neutral': 'calm.png',
        'sad': 'sad.png',
        'angry': 'angry.png'
    };
    return moodImages[mood] || 'very_happy.png';
}

// Firebase 데이터 로드 및 저장 함수
async function loadUserData() {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    const data = userDoc.exists() ? userDoc.data() : {};
    subjects = data.subjects || [];
    studyData = data.studyData || {};
    subjectStudyTime = data.subjectStudyTime || {};
    diaryData = data.diaryData || {};
    todos = data.todos || [];
    goals = data.goals || { daily: null, weekly: null };
    studySessions = data.studySessions || {};
    updateStudyTimeDisplay();
    renderHome();
    renderTodos();
    updateGoalsProgress();
    updateSubjectSelect();
    updateSubjectTimes();
}

async function saveUserData() {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, {
        subjects,
        studyData,
        subjectStudyTime,
        diaryData,
        todos,
        goals,
        studySessions
    }, { merge: true });
}

// 로그인/회원가입 함수
function login() {
    const email = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const message = document.getElementById('loginMessage');

    if (!email || !password) {
        message.textContent = 'Please enter both email and password.';
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            document.getElementById('loginScreen').classList.add('hidden');
            document.querySelector('.nav-drawer').classList.remove('hidden');
            loadUserData();
            showScreen('home');
            message.textContent = '';
        })
        .catch(error => {
            message.textContent = error.message;
        });
}

function register() {
    const email = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const message = document.getElementById('loginMessage');

    if (!email || !password) {
        message.textContent = 'Please enter both email and password.';
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            document.getElementById('loginScreen').classList.add('hidden');
            document.querySelector('.nav-drawer').classList.remove('hidden');
            saveUserData();
            showScreen('home');
            message.textContent = '';
        })
        .catch(error => {
            message.textContent = error.message;
        });
}

function logout() {
    signOut(auth).then(() => {
        currentUser = null;
        document.querySelector('.nav-drawer').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        showScreen('login');
        if (timerInterval) clearInterval(timerInterval);
        timerSeconds = 0;
        updateTimerDisplay();
    });
}

// 인증 상태 감지
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        document.getElementById('loginScreen').classList.add('hidden');
        document.querySelector('.nav-drawer').classList.remove('hidden');
        loadUserData();
        showScreen('home');
    } else {
        currentUser = null;
        document.querySelector('.nav-drawer').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        showScreen('login');
    }
});

// 네비게이션 함수
function toggleDrawer() {
    const drawerContent = document.querySelector('.drawer-content');
    const overlay = document.querySelector('.overlay');
    drawerContent.classList.toggle('hidden');
    drawerContent.classList.toggle('visible');
    overlay.classList.toggle('hidden');
    overlay.classList.toggle('visible');
}

function closeDrawer() {
    const drawerContent = document.querySelector('.drawer-content');
    const overlay = document.querySelector('.overlay');
    drawerContent.classList.add('hidden');
    drawerContent.classList.remove('visible');
    overlay.classList.add('hidden');
    overlay.classList.remove('visible');
}

function showScreen(screen) {
    const screens = ['login', 'home', 'study', 'diary', 'todo', 'goals', 'stats'];
    screens.forEach(s => document.getElementById(`${s}Screen`).classList.add('hidden'));

    const targetScreen = document.getElementById(`${screen}Screen`);
    setTimeout(() => targetScreen.classList.remove('hidden'), 50);

    const navMapping = {
        'home': 'Home',
        'study': 'Study',
        'todo': 'To-Do',
        'diary': 'Journal',
        'goals': 'Goals',
        'stats': 'Statistics'
    };

    if (screen !== 'login') {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.trim() === navMapping[screen]) btn.classList.add('active');
        });
        closeDrawer();
    }

    if (screen === 'home') renderHome();
    else if (screen === 'study') {
        updateStudyTimeDisplay();
        updateSubjectSelect();
        updateSubjectTimes();
        if (timerInterval) clearInterval(timerInterval);
        timerSeconds = 0;
        updateTimerDisplay();
    } else if (screen === 'diary') {
        document.getElementById('diaryDate').value = currentDate;
        loadDiaryData(currentDate);
    } else if (screen === 'todo') renderTodos();
    else if (screen === 'goals') {
        updateGoalsInputs();
        updateGoalsProgress();
    } else if (screen === 'stats') renderStats();
}

// 홈 화면 렌더링
function renderHome() {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    document.getElementById('calendarTitle').textContent = `${year} ${getMonthName(month)} Records`;
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    for (let i = 0; i < firstDay; i++) calendar.innerHTML += `<div class="day-cell"></div>`;
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasDiary = diaryData[dateStr]?.mood;
        const dayContent = hasDiary ? `<img src="${getMoodImage(diaryData[dateStr].mood)}" alt="${diaryData[dateStr].mood}" style="width: 100%; height: 100%; object-fit: contain;">` : i;
        calendar.innerHTML += `<div class="day-cell ${hasDiary ? 'sticker' : ''}" onclick="toggleDayDetails('${dateStr}')">${dayContent}</div>`;
    }

    document.getElementById('dashboardStudyTime').textContent = formatTime(studyData[currentDate] || 0);

    const todoPreview = document.getElementById('dashboardTodoPreview');
    todoPreview.innerHTML = '';
    const sortedTodos = [...todos.filter(t => !t.completed), ...todos.filter(t => t.completed)].slice(0, 5);
    sortedTodos.forEach(todo => {
        const li = document.createElement('li');
        li.textContent = todo.text;
        if (todo.completed) li.classList.add('completed');
        todoPreview.appendChild(li);
    });
    if (!sortedTodos.length) todoPreview.innerHTML = '<li>No tasks yet</li>';

    const diaryPreview = document.getElementById('dashboardDiary');
    diaryPreview.innerHTML = '';
    const recentDates = Object.keys(diaryData).sort().reverse().slice(0, 1);
    if (recentDates.length) {
        const date = recentDates[0];
        const entry = diaryData[date];
        diaryPreview.innerHTML = `<p><strong>${date}</strong></p><p>Mood: ${entry.mood}</p><p>${entry.memo.substring(0, 50)}${entry.memo.length > 50 ? '...' : ''}</p>`;
    } else {
        diaryPreview.innerHTML = '<p>No recent entries</p>';
    }

    const goalProgress = document.getElementById('dashboardGoalProgress');
    goalProgress.innerHTML = '';
    const todayTodos = todos.filter(t => new Date(t.createdAt).toISOString().split('T')[0] === currentDate);
    goalProgress.innerHTML += `<p>Today's Tasks: ${todayTodos.filter(t => t.completed).length}/${todayTodos.length} completed</p>`;
    if (goals.daily !== null) {
        const dailyTime = studyData[currentDate] || 0;
        const dailyPercentage = Math.min(Math.round((dailyTime / goals.daily) * 100), 100);
        goalProgress.innerHTML += `<p>Daily Study: ${formatTime(dailyTime)} / ${formatTime(goals.daily)} (${dailyPercentage}%)</p><div class="progress-bar"><div class="progress-fill" style="width: ${dailyPercentage}%"></div></div>`;
    }
    if (goals.weekly !== null) {
        const weeklyTime = calculateWeeklyStudyTime();
        const weeklyPercentage = Math.min(Math.round((weeklyTime / goals.weekly) * 100), 100);
        goalProgress.innerHTML += `<p>Weekly Study: ${formatTime(weeklyTime)} / ${formatTime(goals.weekly)} (${weeklyPercentage}%)</p><div class="progress-bar"><div class="progress-fill" style="width: ${weeklyPercentage}%"></div></div>`;
    }
    if (!goals.daily && !goals.weekly && !todayTodos.length) goalProgress.innerHTML = '<p>No goals or tasks set</p>';
}

// 통계 화면 렌더링
function renderStats() {
    const weekStart = getWeekStartDate(currentWeekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    document.getElementById('weekRange').textContent = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    const weekCalendar = document.getElementById('weekCalendar');
    weekCalendar.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const hasData = studyData[dateStr] || diaryData[dateStr];
        weekCalendar.innerHTML += `<div class="week-day ${hasData ? 'sticker' : ''}" onclick="showStatsDetails('${dateStr}')"><div>${dayName}</div><div>${dayNum}</div></div>`;
    }

    document.getElementById('statsDetails').classList.add('hidden');
}

function getWeekStartDate(offset) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (offset * 7);
    const weekStart = new Date(today.getFullYear(), today.getMonth(), diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

function changeWeek(offset) {
    currentWeekOffset += offset;
    renderStats();
}

function showStatsDetails(dateStr) {
    const selectedDate = new Date(dateStr);
    selectedDate.setDate(selectedDate.getDate() + 1);
    const nextDateStr = selectedDate.toISOString().split('T')[0];
    
    currentSelectedDate = nextDateStr;
    const statsDetails = document.getElementById('statsDetails');
    document.getElementById('statsSelectedDate').textContent = nextDateStr;
    document.getElementById('statsStudyTime').textContent = `Total Study Time: ${formatTime(studyData[nextDateStr] || 0)}`;

    const statsSubjects = document.getElementById('statsSubjects');
    statsSubjects.innerHTML = '<h4>To-Do Statistics</h4>';
    const dayTodos = todos.filter(t => new Date(t.createdAt).toISOString().split('T')[0] === nextDateStr);
    statsSubjects.innerHTML += `<div class="subject-stat"><span>Completed Tasks</span><span>${dayTodos.filter(t => t.completed).length}/${dayTodos.length}</span></div>`;

    const statsDiary = document.getElementById('statsDiary');
    statsDiary.innerHTML = '<h4>Journal Entry</h4>';
    const diaryEntry = diaryData[nextDateStr];
    statsDiary.innerHTML += diaryEntry ? `<p>Mood: ${diaryEntry.mood}</p><p>${diaryEntry.memo}</p>${diaryEntry.image ? `<img src="${diaryEntry.image}" alt="Diary Image">` : ''}` : '<p>No journal entry for this day.</p>';

    statsDetails.classList.remove('hidden');
    document.querySelectorAll('.week-day').forEach(day => {
        day.classList.remove('selected');
        if (day.onclick.toString().includes(`'${dateStr}'`)) day.classList.add('selected');
    });
}

function getMonthName(month) {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month];
}

function toggleDayDetails(date) {
    const dayDetails = document.getElementById('dayDetails');
    if (currentSelectedDate === date && !dayDetails.classList.contains('hidden')) {
        dayDetails.classList.add('hidden');
        currentSelectedDate = null;
        return;
    }

    currentSelectedDate = date;
    document.getElementById('selectedDate').textContent = date;
    document.getElementById('studyTimeDetail').textContent = formatTime(studyData[date] || 0);
    
    const memoDetail = document.getElementById('memoDetail');
    const memo = diaryData[date]?.memo || '';
    memo ? (memoDetail.textContent = `Memo: ${memo}`, memoDetail.classList.remove('hidden')) : memoDetail.classList.add('hidden');

    const imagePreview = document.getElementById('dayImagePreview');
    imagePreview.innerHTML = diaryData[date]?.image ? `<img src="${diaryData[date].image}" alt="Diary Image">` : '';
    
    dayDetails.classList.remove('hidden');
}

// 공부 타이머 함수
function updateStudyTimeDisplay() {
    const studyTime = studyData[currentDate] || 0;
    document.getElementById('dailyStudyTime').textContent = formatTime(studyTime);
    if (document.getElementById('dashboardStudyTime')) document.getElementById('dashboardStudyTime').textContent = formatTime(studyTime);
}

function startTimer() {
    const subjectSelect = document.getElementById('subjectSelect');
    const selectedSubject = subjectSelect.value;
    if (!selectedSubject) {
        alert('Please select a subject!');
        subjectSelect.style.borderColor = '#EA4335';
        setTimeout(() => subjectSelect.style.borderColor = '#ddd', 2000);
        return;
    }
    if (timerInterval) clearInterval(timerInterval);
    const startTime = new Date();
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    
    if (!studySessions[currentDate]) studySessions[currentDate] = [];
    studySessions[currentDate].push({ subject: selectedSubject, startTime: startTime.toISOString(), endTime: null, duration: 0 });
}

function stopTimer() {
    const selectedSubject = document.getElementById('subjectSelect').value;
    if (!selectedSubject || !timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;

    studyData[currentDate] = (studyData[currentDate] || 0) + timerSeconds;
    if (!subjectStudyTime[selectedSubject]) subjectStudyTime[selectedSubject] = {};
    subjectStudyTime[selectedSubject][currentDate] = (subjectStudyTime[selectedSubject][currentDate] || 0) + timerSeconds;

    const lastSession = studySessions[currentDate].slice(-1)[0];
    if (lastSession && lastSession.subject === selectedSubject && !lastSession.endTime) {
        lastSession.endTime = new Date().toISOString();
        lastSession.duration = timerSeconds;
    }

    timerSeconds = 0;
    updateTimerDisplay();
    updateStudyTimeDisplay();
    updateSubjectTimes();
    updateGoalsProgress();
    renderHome();
    saveUserData();
}

function saveDiary() {
    const date = document.getElementById('diaryDate').value;
    const memo = document.getElementById('memoInput').value.trim();
    if (!date || !selectedMood || !memo) {
        if (!selectedMood) alert('Please select your mood for today!');
        if (!memo) alert('Please write a memo for your journal entry!');
        return;
    }

    diaryData[date] = { mood: selectedMood, memo, image: uploadedImage || diaryData[date]?.image || null };
    saveUserData();
    renderHome();
    document.getElementById('memoInput').value = '';
    document.getElementById('diaryImage').value = '';
    document.querySelectorAll('.mood-bean').forEach(bean => bean.classList.remove('selected'));
    selectedMood = null;
    uploadedImage = null;
    document.getElementById('imagePreview').innerHTML = '';
    alert('Journal entry saved!');
}

// 투두 리스트 함수
function renderTodos() {
    const todoList = document.getElementById('todoList');
    const todoCount = document.getElementById('todoCount');
    
    const filteredTodos = currentFilter === 'all' ? todos : todos.filter(t => currentFilter === 'active' ? !t.completed : t.completed);
    todoList.innerHTML = filteredTodos.map(todo => `
        <li class="todo-item">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onclick="toggleTodo(${todo.id})">
            <span class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</span>
            <button class="delete-todo" onclick="deleteTodo(${todo.id})">×</button>
        </li>
    `).join('');
    
    const activeTodos = todos.filter(t => !t.completed);
    todoCount.textContent = `${activeTodos.length} task${activeTodos.length !== 1 ? 's' : ''} remaining`;
    renderHome();
}

function toggleTodo(id) {
    todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveUserData();
    renderTodos();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveUserData();
    renderTodos();
}

// 목표 설정 함수
function saveGoal(type) {
    const input = document.getElementById(`${type}Goal`);
    const value = parseInt(input.value);
    
    if (!isNaN(value) && value >= 0) {
        goals[type] = value * 3600;
        saveUserData();
        updateGoalsProgress();
        renderHome();
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} goal saved!`);
    } else {
        alert('Please enter a valid number of hours.');
    }
}

// 과목 관리 함수
function addSubject() {
    const subjectInput = document.getElementById('subjectInput');
    const subjectName = subjectInput.value.trim();
    if (subjectName && !subjects.includes(subjectName)) {
        subjects.push(subjectName);
        if (!subjectStudyTime[subjectName]) subjectStudyTime[subjectName] = {};
        subjectStudyTime[subjectName][currentDate] = subjectStudyTime[subjectName][currentDate] || 0;
        saveUserData();
        updateSubjectSelect();
        updateSubjectTimes();
        subjectInput.value = '';
    }
}

function deleteSubject(subjectName) {
    subjects = subjects.filter(s => s !== subjectName);
    if (subjectStudyTime[subjectName]) delete subjectStudyTime[subjectName];
    saveUserData();
    updateSubjectSelect();
    updateSubjectTimes();
}

function updateSubjectSelect() {
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select a subject</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function updateSubjectTimes() {
    const subjectTimesDiv = document.getElementById('subjectTimes');
    subjectTimesDiv.innerHTML = subjects.map(s => `
        <div class="subject-time">
            ${s}: ${formatTime(subjectStudyTime[s][currentDate] || 0)}
            <button class="delete-subject-btn" onclick="deleteSubject('${s}')" title="Delete Subject">×</button>
        </div>
    `).join('');
}

// 타이머 관련 함수
function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (timerInterval) {
        timerDisplay.classList.add('pulse');
        setTimeout(() => timerDisplay.classList.remove('pulse'), 200);
    }
}

// 다이어리 관련 함수
function selectMood(mood) {
    document.querySelectorAll('.mood-bean').forEach(b => b.classList.remove('selected'));
    document.querySelector(`.mood-bean.${mood}`).classList.add('selected');
    selectedMood = mood;
}

function triggerFileInput() {
    document.getElementById('diaryImage').click();
}

document.getElementById('diaryImage').addEventListener('change', uploadImage);

function uploadImage() {
    const fileInput = document.getElementById('diaryImage');
    const file = fileInput.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size should be less than 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            uploadedImage = e.target.result;
            document.getElementById('imagePreview').innerHTML = `<img src="${uploadedImage}" alt="Uploaded Image">`;
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    }
}

function loadDiaryData(selectedDate) {
    const diaryEntry = diaryData[selectedDate];
    document.querySelectorAll('.mood-bean').forEach(b => b.classList.remove('selected'));
    document.getElementById('memoInput').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    selectedMood = null;
    uploadedImage = null;
    
    if (diaryEntry) {
        if (diaryEntry.mood) {
            document.querySelector(`.mood-bean.${diaryEntry.mood}`).classList.add('selected');
            selectedMood = diaryEntry.mood;
        }
        document.getElementById('memoInput').value = diaryEntry.memo || '';
        if (diaryEntry.image) {
            document.getElementById('imagePreview').innerHTML = `<img src="${diaryEntry.image}" alt="Diary Image">`;
            uploadedImage = diaryEntry.image;
        }
    }
}

// 투두 추가 및 필터링
function addTodo() {
    const todoInput = document.getElementById('todoInput');
    const todoText = todoInput.value.trim();
    if (todoText) {
        todos.push({ id: Date.now(), text: todoText, completed: false, createdAt: new Date().toISOString() });
        saveUserData();
        todoInput.value = '';
        renderTodos();
    }
}

function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[onclick="filterTasks('${filter}')"]`).classList.add('active');
    renderTodos();
}

function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    saveUserData();
    renderTodos();
}

// 목표 진행 상황
function updateGoalsInputs() {
    if (goals.daily !== null) document.getElementById('dailyGoal').value = Math.floor(goals.daily / 3600);
    if (goals.weekly !== null) document.getElementById('weeklyGoal').value = Math.floor(goals.weekly / 3600);
}

function updateGoalsProgress() {
    const progressDiv = document.getElementById('goalProgress');
    progressDiv.innerHTML = '';
    
    if (goals.daily !== null) {
        const dailyTime = studyData[currentDate] || 0;
        const dailyPercentage = Math.min(Math.round((dailyTime / goals.daily) * 100), 100);
        progressDiv.innerHTML += `<h4>Daily Goal Progress (${formatTime(dailyTime)} of ${formatTime(goals.daily)})</h4><div class="progress-bar"><div class="progress-fill" style="width: ${dailyPercentage}%"></div></div><p>${dailyPercentage}% Complete</p>`;
    }
    
    if (goals.weekly !== null) {
        const weeklyTime = calculateWeeklyStudyTime();
        const weeklyPercentage = Math.min(Math.round((weeklyTime / goals.weekly) * 100), 100);
        progressDiv.innerHTML += `<h4 style="margin-top: 20px;">Weekly Goal Progress (${formatTime(weeklyTime)} of ${formatTime(goals.weekly)})</h4><div class="progress-bar"><div class="progress-fill" style="width: ${weeklyPercentage}%"></div></div><p>${weeklyPercentage}% Complete</p>`;
    }
    
    if (!goals.daily && !goals.weekly) progressDiv.innerHTML = '<p>No goals set yet. Set your daily and weekly goals above.</p>';
}

function calculateWeeklyStudyTime() {
    const currentDay = new Date(currentDate);
    let totalTime = 0;
    const dayOfWeek = currentDay.getDay();
    const startDate = new Date(currentDay);
    startDate.setDate(currentDay.getDate() - dayOfWeek);
    
    for (let i = 0; i <= 6; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        totalTime += studyData[date.toISOString().split('T')[0]] || 0;
    }
    return totalTime;
}

// 리셋 함수
function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings? This will clear all your data.')) {
        subjects = [];
        studyData = {};
        subjectStudyTime = {};
        diaryData = {};
        todos = [];
        goals = { daily: null, weekly: null };
        studySessions = {};
        currentFilter = 'all';
        selectedMood = null;
        uploadedImage = null;
        timerSeconds = 0;
        currentWeekOffset = 0;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        saveUserData();
        updateSubjectSelect();
        updateSubjectTimes();
        updateStudyTimeDisplay();
        updateTimerDisplay();
        updateGoalsInputs();
        updateGoalsProgress();
        renderHome();
        renderTodos();
        document.getElementById('dayDetails').classList.add('hidden');
        document.getElementById('subjectInput').value = '';
        document.getElementById('todoInput').value = '';
        document.getElementById('diaryDate').value = currentDate;
        document.getElementById('memoInput').value = '';
        document.getElementById('diaryImage').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.querySelectorAll('.mood-bean').forEach(b => b.classList.remove('selected'));
        showScreen('home');
        alert('All settings have been reset.');
    }
}

// 이벤트 리스너
document.getElementById('diaryDate').addEventListener('change', function() {
    currentDate = this.value;
    loadDiaryData(this.value);
});

document.getElementById('subjectInput').addEventListener('keypress', e => e.key === 'Enter' && (e.preventDefault(), addSubject()));
document.getElementById('todoInput').addEventListener('keypress', e => e.key === 'Enter' && (e.preventDefault(), addTodo()));

// 동적 스타일 추가
const style = document.createElement('style');
style.textContent = `
    .delete-subject-btn { background: none; border: none; color: #EA4335; cursor: pointer; font-size: 16px; margin-left: 8px; padding: 2px 6px; border-radius: 50%; }
    .delete-subject-btn:hover { background-color: rgba(234, 67, 53, 0.1); transform: scale(1.2); }
    .subject-time { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; }
    .pulse { animation: pulse 0.2s ease-in-out; }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
`;
document.head.appendChild(style);