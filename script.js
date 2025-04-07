let timerSeconds = 0;
let timerInterval = null;
let currentFilter = 'all';
let selectedMood = null;
let uploadedImage = null;
let currentSelectedDate = null;
let currentWeekOffset = 0;
let currentSelectedSubject = null;
let lastCheckedDate = new Date().toISOString().split('T')[0];

const today = new Date();
let currentDate = today.toISOString().split('T')[0];

async function loadUserData(userId) {
    window.ddays = window.ddays || []; 
    const userRef = doc(db, "users", userId);
    window.firestoreOnSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            console.log("Firestore에서 가져온 원시 데이터:", data); // 디버깅: Firestore 데이터 확인
            window.subjects = data.subjects || [];
            window.studyData = data.studyData || {};
            window.subjectStudyTime = data.subjectStudyTime || {};
            window.diaryData = data.diaryData || {};
            window.todos = data.todos || [];
            window.ddays = data.ddays || []; // D-Day 데이터 로드
            window.goals = data.goals || { daily: null, weekly: null };
            window.studySessions = data.studySessions || {};
            window.nickname = data.nickname || 'User';
            window.currentGroupCode = data.groupCode || null;

            console.log("로드된 D-Days:", window.ddays); // 디버깅: D-Day 확인

            // 데이터 로드 후 UI 업데이트
            updateSubjectSelect();
            updateSubjectTimes();
            updateStudyTimeDisplay();
            updateGoalsInputs();
            updateGoalsProgress();
            renderHome();
            renderTodos();
            renderDDays(); // D-Day 렌더링
            renderGroupDashboard();
        } else {
            console.log("Firestore에 데이터 없음, 기본값 초기화");
            window.subjects = [];
            window.studyData = {};
            window.subjectStudyTime = {};
            window.diaryData = {};
            window.todos = [];
            window.ddays = [];
            window.goals = { daily: null, weekly: null };
            window.studySessions = {};
            window.currentGroupCode = null;

            // 초기화 후 UI 업데이트
            updateSubjectSelect();
            updateSubjectTimes();
            updateStudyTimeDisplay();
            updateGoalsInputs();
            updateGoalsProgress();
            renderHome();
            renderTodos();
            renderDDays(); // 빈 D-Day 렌더링
            renderGroupDashboard();
        }
    }, (error) => {
        console.error("데이터 로드 실패:", error.code, error.message);
    });
}

window.saveUserData = async function() {
    if (!window.currentUser) return;
    const userId = window.currentUser.uid;
    const dataToSave = {
        subjects: window.subjects || [],
        studyData: window.studyData || {},
        subjectStudyTime: window.subjectStudyTime || {},
        diaryData: window.diaryData || {},
        todos: window.todos || [],
        ddays: window.ddays || [], // Confirm D-Days are saved
        goals: window.goals || { daily: null, weekly: null },
        studySessions: window.studySessions || {},
        nickname: window.nickname || 'User',
        groupCode: window.currentGroupCode || null
    };
    try {
        await window.firestoreSetDoc(window.firestoreDoc(db, "users", userId), dataToSave, { merge: true });
        console.log("Data saved successfully, ddays:", window.ddays); // Debug: Confirm save
    } catch (error) {
        console.error("Save failed:", error.code, error.message);
        alert("Failed to save data: " + error.message);
    }
};

function checkAndResetDailyData() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== lastCheckedDate) {
        currentDate = today;
        window.studyData[currentDate] = 0;
        window.subjects.forEach(subject => {
            if (!window.subjectStudyTime[subject]) {
                window.subjectStudyTime[subject] = {};
            }
            window.subjectStudyTime[subject][currentDate] = 0;
        });
        timerSeconds = 0;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        lastCheckedDate = today;
        updateStudyTimeDisplay();
        updateSubjectTimes();
        updateTimerDisplay();
        renderHome();
        window.saveUserData();
    }
}

checkAndResetDailyData();

setInterval(checkAndResetDailyData, 60000);

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

function toggleDrawer() {
    const navDrawer = document.querySelector('.nav-drawer');
    const overlay = document.querySelector('.overlay');
    navDrawer.classList.toggle('hidden');
    overlay.classList.toggle('hidden');
    overlay.classList.toggle('visible');
}

function closeDrawer() {
    const navDrawer = document.querySelector('.nav-drawer');
    const overlay = document.querySelector('.overlay');
    navDrawer.classList.add('hidden');
    overlay.classList.add('hidden');
    overlay.classList.remove('visible');
}


function showScreen(screen, subTab = null) {
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
        'settings': 'Settings',
        'groups': 'Groups'
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (navMapping[screen] && btn.textContent.trim() === navMapping[screen]) {
            btn.classList.add('active');
        }
    });

    closeDrawer();

    if (screen === 'home') {
        renderHome();
    } else if (screen === 'study') {
        updateStudyTimeDisplay();
        updateSubjectSelect();
        updateSubjectTimes();
        updateTimerDisplay();
        if (currentSelectedSubject) {
            document.getElementById('subjectSelect').value = currentSelectedSubject;
        }
    } else if (screen === 'diary') {
        document.getElementById('diaryDate').value = currentDate;
        document.getElementById('memoInput').value = '';
        document.querySelectorAll('.mood-bean').forEach(bean => bean.classList.remove('selected'));
        selectedMood = null;
        uploadedImage = null;
        document.getElementById('imagePreview').innerHTML = '';
        loadDiaryData(currentDate);
    } else if (screen === 'todo') {
        renderTodos();
        showTodoTab(subTab || 'todo');
    } else if (screen === 'goals') {
        updateGoalsInputs();
        updateGoalsProgress();
    } else if (screen === 'stats') {
        renderStats();
    } else if (screen === 'settings') {
        loadSettings();
        document.getElementById('logout-btn').style.display = window.currentUser ? 'block' : 'none';
    } else if (screen === 'groups') {
        document.getElementById('groupNameInput').value = '';
        document.getElementById('groupCodeInput').value = '';
        document.getElementById('groupPasswordInput').value = '';
        document.getElementById('groupPasswordInputJoin').value = '';
        document.getElementById('groupCreateError').classList.add('hidden');
        document.getElementById('groupJoinError').classList.add('hidden');
        document.getElementById('groupCodeDisplay').classList.add('hidden');
        renderGroupContent();
    }
}

function renderHome() {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    document.getElementById('calendarTitle').textContent = `${year} ${getMonthName(month)} Records`;
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        calendar.innerHTML += `<div class="day-cell"></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasDiary = window.diaryData[dateStr]?.mood ? true : false;
        let dayContent = i;
        
        if (hasDiary) {
            const mood = window.diaryData[dateStr].mood;
            dayContent = `<img src="${getMoodImage(mood)}" alt="${mood}" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
        
        calendar.innerHTML += `
            <div class="day-cell ${hasDiary ? 'sticker' : ''}" onclick="toggleDayDetails('${dateStr}')">
                ${dayContent}
            </div>`;
    }

    const studyTime = (window.studyData && window.studyData[currentDate]) || 0;
    const hours = Math.floor(studyTime / 3600);
    const minutes = Math.floor((studyTime % 3600) / 60);
    const seconds = studyTime % 60;
    document.getElementById('dashboardStudyTime').textContent = `${hours}h ${minutes}m ${seconds}s`;

    const todoPreview = document.getElementById('dashboardTodoPreview');
    todoPreview.innerHTML = '';
    const activeTodos = window.todos.filter(todo => !todo.completed);
    const completedTodos = window.todos.filter(todo => todo.completed);
    const sortedTodos = [...activeTodos, ...completedTodos];
    sortedTodos.slice(0, 5).forEach(todo => {
        const li = document.createElement('li');
        li.textContent = todo.text;
        if (todo.completed) li.classList.add('completed');
        todoPreview.appendChild(li);
    });
    if (sortedTodos.length === 0) {
        todoPreview.innerHTML = '<li>No tasks yet</li>';
    }

    const diaryPreview = document.getElementById('dashboardDiary');
    diaryPreview.innerHTML = '';
    const recentDates = Object.keys(window.diaryData).sort().reverse().slice(0, 1);
    if (recentDates.length > 0) {
        const date = recentDates[0];
        const entry = window.diaryData[date];
        diaryPreview.innerHTML = `
            <p><strong>${date}</strong></p>
            <p>Mood: ${entry.mood}</p>
            <p>${entry.memo.substring(0, 50)}${entry.memo.length > 50 ? '...' : ''}</p>
        `;
    } else {
        diaryPreview.innerHTML = '<p>No recent entries</p>';
    }

    const goalProgress = document.getElementById('dashboardGoalProgress');
    goalProgress.innerHTML = '';
    
    const todayTodos = window.todos.filter(todo => 
        new Date(todo.createdAt).toISOString().split('T')[0] === currentDate);
    const completedTodayTodos = todayTodos.filter(todo => todo.completed).length;
    const totalTodayTodos = todayTodos.length;
    goalProgress.innerHTML += `
        <p>Today's Tasks: ${completedTodayTodos}/${totalTodayTodos} completed</p>
    `;

    if (window.goals.daily !== null) {
        const dailyTime = (window.studyData && window.studyData[currentDate]) || 0;
        const dailyPercentage = Math.min(Math.round((dailyTime / window.goals.daily) * 100), 100);
        const hours = Math.floor(dailyTime / 3600);
        const minutes = Math.floor((dailyTime % 3600) / 60);
        goalProgress.innerHTML += `
            <p>Daily Study: ${hours}h ${minutes}m / ${Math.floor(window.goals.daily / 3600)}h (${dailyPercentage}%)</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${dailyPercentage}%"></div>
            </div>
        `;
    }
    if (window.goals.weekly !== null) {
        const weeklyTime = calculateWeeklyStudyTime();
        const weeklyPercentage = Math.min(Math.round((weeklyTime / window.goals.weekly) * 100), 100);
        const hours = Math.floor(weeklyTime / 3600);
        const minutes = Math.floor((weeklyTime % 3600) / 60);
        goalProgress.innerHTML += `
            <p>Weekly Study: ${hours}h ${minutes}m / ${Math.floor(window.goals.weekly / 3600)}h (${weeklyPercentage}%)</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${weeklyPercentage}%"></div>
            </div>
        `;
    }
    if (window.goals.daily === null && window.goals.weekly === null && totalTodayTodos === 0) {
        goalProgress.innerHTML = '<p>No goals or tasks set</p>';
    }

    const ddayPreview = document.getElementById('dashboardDDayPreview');
    ddayPreview.innerHTML = '';
    const sortedDDays = window.ddays
        .filter(dday => new Date(dday.date) >= new Date(currentDate))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sortedDDays.length > 0) {
        const nearestDDay = sortedDDays[0];
        const daysLeft = Math.ceil((new Date(nearestDDay.date) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
        ddayPreview.innerHTML = `
            <p><strong>${nearestDDay.name}</strong></p>
            <p>${nearestDDay.date} (${daysLeft} days left)</p>
        `;
    } else {
        ddayPreview.innerHTML = '<p>No D-Days set</p>';
    }
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
    selectedDate.setDate(selectedDate.getDate() + 1); // 다음 날로 설정
    const nextDayStr = selectedDate.toISOString().split('T')[0];

    currentSelectedDate = nextDayStr;
    const statsDetails = document.getElementById('statsDetails');
    document.getElementById('statsSelectedDate').textContent = nextDayStr;

    const studyTime = (window.studyData && window.studyData[nextDayStr]) || 0;
    const hours = Math.floor(studyTime / 3600);
    const minutes = Math.floor((studyTime % 3600) / 60);
    const seconds = studyTime % 60;
    document.getElementById('statsStudyTime').textContent = 
        `Total Study Time: ${hours}h ${minutes}m ${seconds}s`;

    const statsSubjects = document.getElementById('statsSubjects');
    statsSubjects.innerHTML = '';

    statsSubjects.innerHTML += '<h4>To-Do Statistics</h4>';
    const dayTodos = window.todos.filter(todo => 
        new Date(todo.createdAt).toISOString().split('T')[0] === nextDayStr);
    const completedTodos = dayTodos.filter(todo => todo.completed).length;
    const totalTodos = dayTodos.length;
    statsSubjects.innerHTML += `
        <div class="subject-stat">
            <span>Completed Tasks</span>
            <span>${completedTodos}/${totalTodos}</span>
        </div>
    `;

    const statsDiary = document.getElementById('statsDiary');
    statsDiary.innerHTML = '<h4>Journal Entry</h4>';
    const diaryEntry = window.diaryData[nextDayStr];
    if (diaryEntry) {
        statsDiary.innerHTML += `
            <p>Mood: ${diaryEntry.mood}</p>
            <p>${diaryEntry.memo}</p>
            ${diaryEntry.image ? `<img src="${diaryEntry.image}" alt="Diary Image">` : ''}
        `;
    } else {
        statsDiary.innerHTML += '<p>No journal entry for this day.</p>';
    }

    statsDetails.classList.remove('hidden');
    document.querySelectorAll('.week-day').forEach(day => {
        day.classList.remove('selected');
        if (day.onclick.toString().includes(`'${dateStr}'`)) day.classList.add('selected');
    });
}

function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
}

function toggleDayDetails(date) {
    const dayDetails = document.getElementById('dayDetails');
    
    if (currentSelectedDate === date && !dayDetails.classList.contains('hidden')) {
        dayDetails.classList.add('hidden');
        currentSelectedDate = null;
        return;
    }

    currentSelectedDate = date;
    const studyTime = (window.studyData && window.studyData[date]) || 0;
    const hours = Math.floor(studyTime / 3600);
    const minutes = Math.floor((studyTime % 3600) / 60);
    const seconds = studyTime % 60;
    const memo = window.diaryData[date]?.memo || '';
    const image = window.diaryData[date]?.image || null;

    document.getElementById('selectedDate').textContent = date;
    document.getElementById('studyTimeDetail').textContent = `${hours}h ${minutes}m ${seconds}s`;
    
    const memoDetail = document.getElementById('memoDetail');
    if (memo) {
        memoDetail.textContent = `Memo: ${memo}`;
        memoDetail.classList.remove('hidden');
    } else {
        memoDetail.classList.add('hidden');
    }

    const imagePreview = document.getElementById('dayImagePreview');
    imagePreview.innerHTML = '';
    if (image) {
        imagePreview.innerHTML = `<img src="${image}" alt="Diary Image">`;
    }
    
    dayDetails.classList.remove('hidden');
}

function updateStudyTimeDisplay() {
    const studyTime = window.studyData[currentDate] || 0;
    const hours = Math.floor(studyTime / 3600);
    const minutes = Math.floor((studyTime % 3600) / 60);
    const seconds = studyTime % 60;
    document.getElementById('dailyStudyTime').textContent = `${hours}h ${minutes}m ${seconds}s`;
    if (document.getElementById('dashboardStudyTime')) {
        document.getElementById('dashboardStudyTime').textContent = `${hours}h ${minutes}m ${seconds}s`;
    }
}

function startTimer() {
    const selectedSubject = document.getElementById('subjectSelect').value;

    if (!timerInterval && !selectedSubject) {
        alert('Please select a subject!');
        return;
    }

    if (!timerInterval && selectedSubject) {
        currentSelectedSubject = selectedSubject;
        const startTime = new Date();
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();

            if (timerSeconds % 1 === 0 && window.currentGroupCode) {
                const groupRef = window.firestoreDoc(window.firestoreDb, "groups", window.currentGroupCode);
                window.firestoreGetDoc(groupRef).then(groupDoc => {
                    if (groupDoc.exists()) {
                        const groupData = groupDoc.data();
                        const tempStudyTime = (window.studyData[currentDate] || 0) + timerSeconds;
                        window.firestoreSetDoc(groupRef, {
                            members: {
                                ...groupData.members,
                                [window.currentUser.uid]: {
                                    nickname: window.nickname,
                                    studyTime: tempStudyTime
                                }
                            }
                        }, { merge: true });
                    }
                });
            }
        }, 1000);

        if (!window.studySessions[currentDate]) {
            window.studySessions[currentDate] = [];
        }
        window.studySessions[currentDate].push({
            subject: selectedSubject,
            startTime: startTime.toISOString(),
            endTime: null,
            duration: 0
        });
    }
}

async function stopTimer() {
    const selectedSubject = document.getElementById('subjectSelect').value;
    if (!selectedSubject || !timerInterval) return;

    clearInterval(timerInterval);
    timerInterval = null;

    if (!window.subjectStudyTime[selectedSubject]) {
        window.subjectStudyTime[selectedSubject] = {};
    }
    window.subjectStudyTime[selectedSubject][currentDate] = 
        (window.subjectStudyTime[selectedSubject][currentDate] || 0) + timerSeconds;

    window.studyData[currentDate] = window.subjects.reduce((total, subject) => {
        return total + (window.subjectStudyTime[subject]?.[currentDate] || 0);
    }, 0);

    const lastSession = window.studySessions[currentDate]?.slice(-1)[0];
    if (lastSession && lastSession.subject === selectedSubject && !lastSession.endTime) {
        lastSession.endTime = new Date().toISOString();
        lastSession.duration = timerSeconds;
    }

    if (window.currentGroupCode) {
        const groupRef = window.firestoreDoc(window.firestoreDb, "groups", window.currentGroupCode);
        const groupDoc = await window.firestoreGetDoc(groupRef);
        if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            const updatedMembers = {
                ...groupData.members,
                [window.currentUser.uid]: {
                    nickname: window.nickname,
                    studyTime: window.studyData[currentDate] || 0
                }
            };
            await window.firestoreSetDoc(groupRef, { members: updatedMembers }, { merge: true });
        }
    }

    timerSeconds = 0;
    await window.saveUserData();
    updateTimerDisplay();
    updateStudyTimeDisplay();
    updateSubjectTimes();
    updateGoalsProgress();
    renderHome();

    document.getElementById('subjectSelect').value = currentSelectedSubject;
}

async function saveDiary() {
    const date = document.getElementById('diaryDate').value;
    const memo = document.getElementById('memoInput').value.trim();
    if (!date || !selectedMood || !memo) {
        if (!selectedMood) alert('Please select your mood for today!');
        if (!memo) alert('Please write a memo for your journal entry!');
        return;
    }

    window.diaryData[date] = { 
        mood: selectedMood,
        memo: memo, 
        image: uploadedImage || window.diaryData[date]?.image || null 
    };
    await window.saveUserData();
    renderHome();
    document.getElementById('memoInput').value = '';
    document.getElementById('diaryImage').value = '';
    document.querySelectorAll('.mood-bean').forEach(bean => bean.classList.remove('selected'));
    selectedMood = null;
    uploadedImage = null;
    document.getElementById('imagePreview').innerHTML = '';
    alert('Journal entry saved!');
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    const todoCount = document.getElementById('todoCount');
    
    let filteredTodos = [];
    if (currentFilter === 'all') filteredTodos = window.todos;
    else if (currentFilter === 'active') filteredTodos = window.todos.filter(todo => !todo.completed);
    else if (currentFilter === 'completed') filteredTodos = window.todos.filter(todo => todo.completed);

    todoList.innerHTML = '';
    
    filteredTodos.forEach(todo => {
        const todoItem = document.createElement('li');
        todoItem.className = 'todo-item';
        todoItem.innerHTML = `
            <input type="checkbox" class="todo-checkbox" 
                   ${todo.completed ? 'checked' : ''} 
                   onclick="toggleTodo(${todo.id})">
            <span class="todo-text ${todo.completed ? 'completed' : ''}">${todo.text}</span>
            <button class="delete-todo" onclick="deleteTodo(${todo.id})">×</button>
        `;
        todoList.appendChild(todoItem);
    });
    
    const activeTodos = window.todos.filter(todo => !todo.completed);
    todoCount.textContent = `${activeTodos.length} task${activeTodos.length !== 1 ? 's' : ''} remaining`;
    renderHome();
}

async function toggleTodo(id) {
    window.todos = window.todos.map(todo => {
        if (todo.id === id) return { ...todo, completed: !todo.completed };
        return todo;
    });
    await window.saveUserData();
    renderTodos();
}

async function deleteTodo(id) {
    window.todos = window.todos.filter(todo => todo.id !== id);
    await window.saveUserData();
    renderTodos();
}

async function saveGoal(type) {
    const input = document.getElementById(`${type}Goal`);
    const value = parseInt(input.value);
    
    if (!isNaN(value) && value >= 0) {
        window.goals[type] = value * 3600;
        await window.saveUserData();
        updateGoalsProgress();
        renderHome();
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} goal saved!`);
    } else {
        alert('Please enter a valid number of hours.');
    }
}

async function addSubject() {
    const subjectInput = document.getElementById('subjectInput');
    const subjectName = subjectInput.value.trim();
    if (subjectName && !window.subjects.includes(subjectName)) {
        window.subjects.push(subjectName);
        if (!window.subjectStudyTime[subjectName]) {
            window.subjectStudyTime[subjectName] = {};
        }
        window.subjectStudyTime[subjectName][currentDate] = 0;
        await window.saveUserData();
        updateSubjectSelect();
        updateSubjectTimes();
        subjectInput.value = '';
    } else if (window.subjects.includes(subjectName)) {
        alert('Subject already exists!');
    } else {
        alert('Please enter a valid subject name!');
    }
}

async function deleteSubject(subjectName) {
    if (window.subjects.includes(subjectName)) {
        window.subjects = window.subjects.filter(subject => subject !== subjectName);
        if (window.subjectStudyTime[subjectName]) delete window.subjectStudyTime[subjectName];
        await window.saveUserData();
        updateSubjectSelect();
        updateSubjectTimes();
    }
}

function updateSubjectSelect() {
    const subjectSelect = document.getElementById('subjectSelect');
    subjectSelect.innerHTML = '<option value="">Select a subject</option>';
    window.subjects.forEach(subject => {
        subjectSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
}

function updateSubjectTimes() {
    const subjectTimesDiv = document.getElementById('subjectTimes');
    subjectTimesDiv.innerHTML = '';
    window.subjects.forEach(subject => {
        const time = window.subjectStudyTime[subject]?.[currentDate] || 0;
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        subjectTimesDiv.innerHTML += `
            <div class="subject-time">
                ${subject}: ${hours}h ${minutes}m ${seconds}s
                <button class="delete-subject-btn" onclick="deleteSubject('${subject}')" title="Delete Subject">×</button>
            </div>
        `;
    });
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function selectMood(mood) {
    document.querySelectorAll('.mood-bean').forEach(bean => bean.classList.remove('selected'));
    document.querySelector(`.mood-bean.${mood}`).classList.add('selected');
    selectedMood = mood;
}

function triggerFileInput() {
    const fileInput = document.getElementById('diaryImage');
    fileInput.click();
}

document.getElementById('diaryImage').addEventListener('change', function() {
    uploadImage();
});

function uploadImage() {
    const fileInput = document.getElementById('diaryImage');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.on = function(e) {
            upedImage = e.target.result;
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${upedImage}" alt="Uped Image">`;
        };
        reader.readAsDataURL(file);
        fileInput.value = '';
    }
}

function DiaryData(selectedDate) {
    const diaryEntry = window.diaryData[selectedDate];
    
    document.querySelectorAll('.mood-bean').forEach(bean => bean.classList.remove('selected'));
    document.getElementById('memoInput').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    selectedMood = null;
    upedImage = null;
    
    if (diaryEntry) {
        const mood = diaryEntry.mood;
        if (mood) {
            document.querySelector(`.mood-bean.${mood}`).classList.add('selected');
            selectedMood = mood;
        }
        
        document.getElementById('memoInput').value = diaryEntry.memo || '';
        if (diaryEntry.image) {
            document.getElementById('imagePreview').innerHTML = `<img src="${diaryEntry.image}" alt="Diary Image">`;
            upedImage = diaryEntry.image;
        }
    }
}

async function addTodo() {
    const todoInput = document.getElementById('todoInput');
    const todoText = todoInput.value.trim();
    
    if (todoText) {
        const newTodo = {
            id: Date.now(),
            text: todoText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        window.todos.push(newTodo);
        await window.saveUserData();
        todoInput.value = '';
        renderTodos();
    }
}

function filterTasks(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.filter-btn[onclick="filterTasks('${filter}')"]`).classList.add('active');
    renderTodos();
}

async function clearCompleted() {
    window.todos = window.todos.filter(todo => !todo.completed);
    await window.saveUserData();
    renderTodos();
}

function updateGoalsInputs() {
    if (window.goals.daily !== null) document.getElementById('dailyGoal').value = Math.floor(window.goals.daily / 3600);
    if (window.goals.weekly !== null) document.getElementById('weeklyGoal').value = Math.floor(window.goals.weekly / 3600);
}

function updateGoalsProgress() {
    const progressDiv = document.getElementById('goalProgress');
    progressDiv.innerHTML = '';
    
    if (window.goals.daily !== null) {
        const dailyTime = (window.studyData && window.studyData[currentDate]) || 0;
        const dailyPercentage = Math.min(Math.round((dailyTime / window.goals.daily) * 100), 100);
        const hours = Math.floor(dailyTime / 3600);
        const minutes = Math.floor((dailyTime % 3600) / 60);
        
        progressDiv.innerHTML += `
            <h4>Daily Goal Progress (${hours}h ${minutes}m of ${Math.floor(window.goals.daily / 3600)}h)</h4>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${dailyPercentage}%"></div>
            </div>
            <p>${dailyPercentage}% Complete</p>
        `;
    }
    
    if (window.goals.weekly !== null) {
        const weeklyTime = calculateWeeklyStudyTime();
        const weeklyPercentage = Math.min(Math.round((weeklyTime / window.goals.weekly) * 100), 100);
        const hours = Math.floor(weeklyTime / 3600);
        const minutes = Math.floor((weeklyTime % 3600) / 60);
        
        progressDiv.innerHTML += `
            <h4 style="margin-top: 20px;">Weekly Goal Progress (${hours}h ${minutes}m of ${Math.floor(window.goals.weekly / 3600)}h)</h4>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${weeklyPercentage}%"></div>
            </div>
            <p>${weeklyPercentage}% Complete</p>
        `;
    }
    
    if (window.goals.daily === null && window.goals.weekly === null) {
        progressDiv.innerHTML = '<p>No goals set yet. Set your daily and weekly goals above.</p>';
    }
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
        const dateString = date.toISOString().split('T')[0];
        totalTime += (window.studyData && window.studyData[dateString]) || 0;
    }
    
    return totalTime;
}

async function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings? This will clear all your data.')) {
        if (window.currentUser) {
            const userRef = window.firestoreDoc(window.firestoreDb, "users", window.currentUser.uid);
            try {
                await window.firestoreSetDoc(userRef, {
                    subjects: [],
                    studyData: {},
                    subjectStudyTime: {},
                    diaryData: {},
                    todos: [],
                    ddays: [], // D-Day 초기화
                    goals: { daily: null, weekly: null },
                    studySessions: {},
                    nickname: window.nickname,
                    groupCode: null
                });
                window.subjects = [];
                window.studyData = {};
                window.subjectStudyTime = {};
                window.diaryData = {};
                window.todos = [];
                window.ddays = [];
                window.goals = { daily: null, weekly: null };
                window.studySessions = {};
                window.currentGroupCode = null;
                timerSeconds = 0;
                if (timerInterval) clearInterval(timerInterval);
                timerInterval = null;
                currentFilter = 'all';
                selectedMood = null;
                uploadedImage = null;
                currentWeekOffset = 0;
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
                document.querySelectorAll('.mood-bean').forEach(bean => bean.classList.remove('selected'));
                showScreen('home');
                alert('All settings have been reset.');
            } catch (error) {
                console.error('데이터 초기화 실패:', error.code, error.message);
            }
        }
    }
}

document.getElementById('ddayNameInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addDDay();
    }
});

function loadSettings() {
    const nicknameInput = document.getElementById('settingsNicknameInput');
    const error = document.getElementById('settingsNicknameError');
    nicknameInput.value = window.nickname || 'User';
    error.classList.add('hidden');
    document.getElementById('logout-btn').style.display = window.currentUser ? 'block' : 'none';
}

async function changeNickname() {
    const nicknameInput = document.getElementById('settingsNicknameInput');
    const error = document.getElementById('settingsNicknameError');
    const newNickname = nicknameInput.value.trim();

    if (newNickname.length < 2 || newNickname.length > 20) {
        error.textContent = 'Nickname must be between 2 and 20 characters.';
        error.classList.remove('hidden');
        return;
    }

    if (!window.currentUser) {
        error.textContent = 'You must be logged in to change your nickname.';
        error.classList.remove('hidden');
        return;
    }

    try {
        const userRef = window.firestoreDoc(window.firestoreDb, "users", window.currentUser.uid);
        await window.firestoreSetDoc(userRef, { nickname: newNickname }, { merge: true });
        window.nickname = newNickname;
        error.classList.add('hidden');
        alert(`Nickname changed to "${newNickname}"!`);
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
        console.error('Nickname change error:', err);
    }
}

document.getElementById('diaryDate').addEventListener('change', function() {
    const selectedDate = this.value;
    loadDiaryData(selectedDate);
});

document.getElementById('subjectInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addSubject();
    }
});

document.getElementById('todoInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        addTodo();
    }
});

document.getElementById('settingsNicknameInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        changeNickname();
    }
});

const style = document.createElement('style');
style.textContent = `
.delete-subject-btn {
    background: none;
    border: none;
    color: #EA4335;
    cursor: pointer;
    font-size: 16px;
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 50%;
}
.delete-subject-btn:hover {
    background-color: rgba(234, 67, 53, 0.1);
}
.subject-time {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
}
`;

function generateGroupCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

async function createGroup() {
    if (!window.currentUser) {
        alert('You must be logged in to create a group.');
        return;
    }

    const groupNameInput = document.getElementById('groupNameInput');
    const groupPasswordInput = document.getElementById('groupPasswordInput');
    const groupName = groupNameInput.value.trim();
    const groupPassword = groupPasswordInput.value.trim();
    const error = document.getElementById('groupCreateError');

    if (!groupName) {
        error.textContent = 'Please enter a group name.';
        error.classList.remove('hidden');
        return;
    }

    const groupCode = generateGroupCode();
    const groupRef = window.firestoreDoc(window.firestoreDb, "groups", groupCode);

    try {
        const groupDoc = await window.firestoreGetDoc(groupRef);
        if (groupDoc.exists()) {
            error.textContent = 'Group code already exists. Try again.';
            error.classList.remove('hidden');
            return;
        }

        await window.firestoreSetDoc(groupRef, {
            name: groupName,
            password: groupPassword || null,
            members: {
                [window.currentUser.uid]: {
                    nickname: window.nickname,
                    studyTime: (window.studyData && window.studyData[currentDate]) || 0
                }
            },
            messages: [],
            createdAt: new Date().toISOString()
        });

        window.currentGroupCode = groupCode;
        groupNameInput.value = '';
        groupPasswordInput.value = '';
        document.getElementById('groupCodeDisplay').textContent = `Group Code: ${groupCode}`;
        document.getElementById('groupCodeDisplay').classList.remove('hidden');
        error.classList.add('hidden');
        await window.saveUserData();
        renderGroupContent();
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
        console.error('Group creation error:', err);
    }
}

async function joinGroup() {
    if (!window.currentUser) {
        alert('You must be logged in to join a group.');
        return;
    }

    const groupCodeInput = document.getElementById('groupCodeInput');
    const groupPasswordInputJoin = document.getElementById('groupPasswordInputJoin');
    const groupCode = groupCodeInput.value.trim().toUpperCase();
    const groupPassword = groupPasswordInputJoin.value.trim();
    const error = document.getElementById('groupJoinError');

    if (groupCode.length !== 6) {
        error.textContent = 'Please enter a valid 6-digit code.';
        error.classList.remove('hidden');
        return;
    }

    const groupRef = window.firestoreDoc(window.firestoreDb, "groups", groupCode);
    try {
        const groupDoc = await window.firestoreGetDoc(groupRef);
        if (!groupDoc.exists()) {
            error.textContent = 'Group not found.';
            error.classList.remove('hidden');
            return;
        }

        const groupData = groupDoc.data();

        if (groupData.password !== null && groupData.password !== groupPassword) {
            error.textContent = 'Incorrect password.';
            error.classList.remove('hidden');
            return;
        }

        await window.firestoreSetDoc(groupRef, {
            members: {
                ...groupData.members,
                [window.currentUser.uid]: {
                    nickname: window.nickname,
                    studyTime: (window.studyData && window.studyData[currentDate]) || 0
                }
            }
        }, { merge: true });

        window.currentGroupCode = groupCode;
        groupCodeInput.value = '';
        groupPasswordInputJoin.value = '';
        error.classList.add('hidden');
        await window.saveUserData();
        renderGroupContent();
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
        console.error('Group join error:', err);
    }
}

async function leaveGroup() {
    if (!window.currentUser || !window.currentGroupCode) return;

    const groupRef = window.firestoreDoc(window.firestoreDb, "groups", window.currentGroupCode);
    const groupDoc = await window.firestoreGetDoc(groupRef);
    if (!groupDoc.exists()) return;

    const groupData = groupDoc.data();
    delete groupData.members[window.currentUser.uid];

    if (Object.keys(groupData.members).length === 0) {
        await window.firestoreDeleteDoc(groupRef);
        console.log(`Group ${window.currentGroupCode} deleted as no members remain.`);
    } else {
        await window.firestoreSetDoc(groupRef, { members: groupData.members }, { merge: true });
    }

    window.currentGroupCode = null;
    await window.saveUserData();
    renderGroupContent();
}

async function sendMessage() {
    if (!window.currentUser || !window.currentGroupCode) return;

    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    const groupRef = window.firestoreDoc(window.firestoreDb, "groups", window.currentGroupCode);
    try {
        const groupDoc = await window.firestoreGetDoc(groupRef);
        if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            const newMessage = {
                senderId: window.currentUser.uid,
                senderNickname: window.nickname,
                text: messageText,
                timestamp: new Date().toISOString()
            };
            const updatedMessages = [...(groupData.messages || []), newMessage];
            await window.firestoreSetDoc(groupRef, { messages: updatedMessages }, { merge: true });
            chatInput.value = '';
        }
    } catch (err) {
        console.error('Message send error:', err);
        alert('Failed to send message: ' + err.message);
    }
}

function renderGroupDashboard() {
    const dashboard = document.querySelector('.group-dashboard');
    const membersDiv = document.getElementById('groupMembers');
    const groupNameDiv = document.getElementById('currentGroupName');

    if (!window.currentGroupCode) {
        dashboard.classList.add('hidden');
        return;
    }

    const groupRef = window.firestoreDoc(window.firestoreDb, "groups", window.currentGroupCode);
    window.firestoreOnSnapshot(groupRef, (doc) => {
        if (doc.exists()) {
            const groupData = doc.data();
            groupNameDiv.textContent = `${groupData.name} (Code: ${window.currentGroupCode})`;

            const membersArray = Object.entries(groupData.members).map(([uid, data]) => ({
                uid,
                nickname: data.nickname,
                studyTime: data.studyTime || 0
            }));

            membersArray.sort((a, b) => b.studyTime - a.studyTime);
            let currentRank = 1;
            for (let i = 0; i < membersArray.length; i++) {
                if (i > 0 && membersArray[i].studyTime < membersArray[i - 1].studyTime) {
                    currentRank = i + 1;
                }
                membersArray[i].rank = currentRank;
            }

            const rankedMembers = [];
            const rankGroups = {};
            membersArray.forEach(member => {
                if (!rankGroups[member.rank]) rankGroups[member.rank] = [];
                rankGroups[member.rank].push(member);
            });
            for (const rank in rankGroups) {
                const group = rankGroups[rank];
                const currentUserIndex = group.findIndex(m => m.uid === window.currentUser.uid);
                let currentUserMember = null;
                if (currentUserIndex !== -1) {
                    currentUserMember = group.splice(currentUserIndex, 1)[0];
                }
                group.sort((a, b) => a.uid.localeCompare(b.uid));
                if (currentUserMember) group.unshift(currentUserMember);
                rankedMembers.push(...group);
            }

            membersDiv.innerHTML = '';
            rankedMembers.forEach(member => {
                const hours = Math.floor(member.studyTime / 3600);
                const minutes = Math.floor((member.studyTime % 3600) / 60);
                const seconds = member.studyTime % 60;
                membersDiv.innerHTML += `
                    <div class="member-card">
                        <div class="rank">#${member.rank}</div>
                        <div class="nickname">${member.nickname}</div>
                        <div class="study-time">${hours}h ${minutes}m ${seconds}s</div>
                    </div>
                `;
            });
        } else {
            window.currentGroupCode = null;
            renderGroupContent();
        }
    }, (error) => {
        console.error('Group dashboard render error:', error);
    });
}
document.getElementById('chatInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});
document.getElementById('groupNameInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        createGroup();
    }
});

document.getElementById('groupCodeInput').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        joinGroup();
    }
});

function renderGroupChat() {
    const chatMessagesDiv = document.getElementById('chatMessages');
    if (!window.currentGroupCode) return;

    const groupRef = window.firestoreDoc(window.firestoreDb, "groups", window.currentGroupCode);
    window.firestoreOnSnapshot(groupRef, (doc) => {
        if (doc.exists()) {
            const groupData = doc.data();
            chatMessagesDiv.innerHTML = '';
            const messages = groupData.messages || [];
            messages.forEach(msg => {
                const date = new Date(msg.timestamp);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                chatMessagesDiv.innerHTML += `
                    <div class="chat-message">
                        <span class="sender">${msg.senderNickname}</span> (${timeStr}): ${msg.text}
                    </div>
                `;
            });
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
        }
    }, (error) => {
        console.error('Group chat render error:', error);
    });
}

function showGroupTab(tab) {
    const dashboard = document.querySelector('.group-dashboard');
    const chat = document.querySelector('.group-chat');
    const dashboardBtn = document.querySelector('.tab-btn[onclick="showGroupTab(\'dashboard\')"]');
    const chatBtn = document.querySelector('.tab-btn[onclick="showGroupTab(\'chat\')"]');

    if (tab === 'dashboard') {
        dashboard.classList.remove('hidden');
        chat.classList.add('hidden');
        dashboardBtn.classList.add('active');
        chatBtn.classList.remove('active');
    } else if (tab === 'chat') {
        dashboard.classList.add('hidden');
        chat.classList.remove('hidden');
        dashboardBtn.classList.remove('active');
        chatBtn.classList.add('active');
    }
}

function showTodoTab(tab) {
    const todoContent = document.getElementById('todoTabContent');
    const ddayContent = document.getElementById('ddayTabContent');
    const todoBtn = document.querySelector('.todo-tabs .tab-btn[onclick="showTodoTab(\'todo\')"]');
    const ddayBtn = document.querySelector('.todo-tabs .tab-btn[onclick="showTodoTab(\'dday\')"]');

    if (tab === 'todo') {
        todoContent.classList.remove('hidden');
        ddayContent.classList.add('hidden');
        todoBtn.classList.add('active');
        ddayBtn.classList.remove('active');
        renderTodos();
    } else if (tab === 'dday') {
        todoContent.classList.add('hidden');
        ddayContent.classList.remove('hidden');
        todoBtn.classList.remove('active');
        ddayBtn.classList.add('active');
        renderDDays();
    }
}

async function addDDay() {
    const nameInput = document.getElementById('ddayNameInput');
    const dateInput = document.getElementById('ddayDateInput');
    const error = document.getElementById('ddayError');
    const name = nameInput.value.trim();
    const date = dateInput.value;

    if (!name || !date) {
        error.textContent = 'Please enter a name and date for the D-Day.';
        error.classList.remove('hidden');
        return;
    }

    const selectedDate = new Date(date);
    const today = new Date(currentDate);
    if (selectedDate < today) {
        error.textContent = 'D-Day date must be today or in the future.';
        error.classList.remove('hidden');
        return;
    }

    const newDDay = {
        id: Date.now(),
        name: name,
        date: date,
        createdAt: new Date().toISOString()
    };

    window.ddays.push(newDDay);
    console.log("추가된 D-Day:", newDDay); // 디버깅
    console.log("현재 D-Days 배열:", window.ddays); // 디버깅

    try {
        await window.saveUserData(); // Firestore에 저장
        console.log("Firestore에 D-Day 저장 완료");
        nameInput.value = '';
        dateInput.value = '';
        error.classList.add('hidden');
        renderDDays(); // 즉시 렌더링
        renderHome(); // 대시보드 업데이트
    } catch (err) {
        console.error("D-Day 저장 실패:", err);
        error.textContent = 'Failed to save D-Day. Please try again.';
        error.classList.remove('hidden');
    }
}

function renderDDays() {
    const ddayList = document.getElementById('ddayList');
    ddayList.innerHTML = '';

    const sortedDDays = window.ddays.sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedDDays.forEach(dday => {
        const daysLeft = Math.ceil((new Date(dday.date) - new Date(currentDate)) / (1000 * 60 * 60 * 24));
        const ddayItem = document.createElement('li');
        ddayItem.className = 'dday-item';
        ddayItem.innerHTML = `
            <span class="dday-text">${dday.name} (${dday.date})</span>
            <span class="dday-days">${daysLeft} days</span>
            <button class="delete-dday" onclick="deleteDDay(${dday.id})">×</button>
        `;
        ddayList.appendChild(ddayItem);
    });

    if (sortedDDays.length === 0) {
        ddayList.innerHTML = '<li>No D-Days set</li>';
    }
}

function renderStats() {
    const weekStart = getWeekStartDate(currentWeekOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekRange = document.getElementById('weekRange');
    weekRange.textContent = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;

    const weekCalendar = document.getElementById('weekCalendar');
    weekCalendar.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const studyTime = (window.studyData && window.studyData[dateStr]) || 0;
        const hours = Math.floor(studyTime / 3600);
        const minutes = Math.floor((studyTime % 3600) / 60);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        weekCalendar.innerHTML += `
            <div class="week-day" onclick="showStatsDetails('${dateStr}')">
                <div>${dayName}</div>
                <div>${date.getDate()}</div>
                <div>${hours}h ${minutes}m</div>
            </div>
        `;
    }
    if (currentSelectedDate) {
        showStatsDetails(currentSelectedDate);
    } else {
        document.getElementById('statsDetails').classList.add('hidden');
    }
}

async function deleteDDay(id) {
    window.ddays = window.ddays.filter(dday => dday.id !== id);
    await window.saveUserData();
    renderDDays();
    renderHome();
}

function renderGroupContent() {
    const joinCreateBox = document.querySelector('.group-join-create-box');
    const contentBox = document.querySelector('.group-content-box');

    if (!joinCreateBox || !contentBox) {
        console.error('Error: .group-join-create-box or .group-content-box not found');
        return;
    }

    console.log('currentGroupCode:', window.currentGroupCode);
    console.log('joinCreateBox hidden:', joinCreateBox.classList.contains('hidden'));
    console.log('contentBox hidden:', contentBox.classList.contains('hidden'));

    if (!window.currentGroupCode) {
        joinCreateBox.classList.remove('hidden');
        joinCreateBox.style.display = 'flex';
        contentBox.classList.add('hidden');
        contentBox.style.display = 'none';
    } else {
        joinCreateBox.classList.add('hidden');
        joinCreateBox.style.display = 'none';
        contentBox.classList.remove('hidden');
        contentBox.style.display = 'block';
        renderGroupDashboard();
        renderGroupChat();
        showGroupTab('dashboard');
    }

    console.log('After update - joinCreateBox hidden:', joinCreateBox.classList.contains('hidden'));
    console.log('After update - contentBox hidden:', contentBox.classList.contains('hidden'));
}
document.head.appendChild(style);

updateSubjectSelect();
updateSubjectTimes();
