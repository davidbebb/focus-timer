// app.js: Main entry point

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => { console.log('Service Worker registered'); })
            .catch(error => { console.error('Service Worker registration failed:', error); });
    });
}

// --- UI Elements ---
const addTimerFormContainer = document.getElementById('addTimerFormContainer');
const hideFormBtn = document.getElementById('hideFormBtn');
const showFormBtn = document.getElementById('showFormBtn');
const addTimerForm = document.getElementById('addTimerForm');
const timersContainer = document.getElementById('timersContainer');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const closeModalBtn = document.getElementById('closeModal');
const customColorDropdown = document.getElementById('customColorDropdown');
const customColorButton = document.getElementById('customColorButton');
const customColorOptions = document.getElementById('customColorOptions');
const hiddenColorInput = document.getElementById('timerColor');
const selectedColorName = document.getElementById('selectedColorName');
const selectedColorSwatch = document.getElementById('selectedColorSwatch');

// --- App State & Constants ---
const LOCAL_STORAGE_KEY = 'digitalTimers';
let timers = {};
const CONFETTI_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ec4899'];
const COLOR_OPTIONS = [
    { name: 'Indigo', value: 'text-indigo-600', swatch: 'bg-indigo-600' },
    { name: 'Green', value: 'text-green-600', swatch: 'bg-green-600' },
    { name: 'Amber', value: 'text-amber-600', swatch: 'bg-amber-600' },
    { name: 'Pink', value: 'text-pink-600', swatch: 'bg-pink-600' },
    { name: 'Sky Blue', value: 'text-sky-600', swatch: 'bg-sky-600' },
];

// --- Form Visibility Logic ---
function showForm(visible) {
    if (visible) {
        addTimerFormContainer.classList.remove('form-hidden');
        showFormBtn.classList.add('hidden');
    } else {
        addTimerFormContainer.classList.add('form-hidden');
        showFormBtn.classList.remove('hidden');
    }
}

hideFormBtn.addEventListener('click', () => showForm(false));
showFormBtn.addEventListener('click', () => showForm(true));

// --- Play/Pause Logic ---
function togglePlayPause(timerId) {
    const timer = timers[timerId];
    if (!timer || timer.data.finished) return;
    const timerWrapper = document.getElementById(`timer-${timerId}`);

    timer.data.isPaused = !timer.data.isPaused;

    if (timer.data.isPaused) {
        timerWrapper.classList.add('paused');
        const elapsedSinceLastStart = (Date.now() - timer.data.lastStartTime) / 1000;
        timer.data.totalElapsedSeconds += elapsedSinceLastStart;
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
        }
    } else {
        timerWrapper.classList.remove('paused');
        timer.data.lastStartTime = Date.now();
        startTimerInterval(timerId);
    }
    updatePlayPauseButton(timerId);
    saveTimers();
}

function updatePlayPauseButton(timerId) {
    const button = document.querySelector(`#timer-${timerId} .play-pause-btn`);
    if (!button) return;
    const use = button.querySelector('use');
    const label = button.querySelector('.sr-only');
    const isPaused = timers[timerId].data.isPaused;
    use.setAttribute('href', isPaused ? '#icon-play' : '#icon-pause');
    label.textContent = isPaused ? 'Play' : 'Pause';
}

function startTimerInterval(timerId) {
    const timer = timers[timerId];
    if (timer.intervalId) clearInterval(timer.intervalId);
    timer.intervalId = setInterval(() => updateTimerDisplay(timerId), 1000);
}

// --- Local Storage Logic ---
function saveTimers() {
    const timersToStore = Object.values(timers).map(timer => {
        const { intervalId, ...dataToSave } = timer;
        return dataToSave.data;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(timersToStore));
}

function loadTimers() {
    const storedTimers = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storedTimers) return [];
    const timersArray = JSON.parse(storedTimers);
    timersArray.forEach(timerData => {
        renderTimer(timerData.id, timerData);
    });
    return timersArray;
}

// --- Form Submission ---
addTimerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = addTimerForm.timerName.value;
    const duration = parseInt(addTimerForm.timerDuration.value, 10);
    const color = hiddenColorInput.value;

    if (!name || !duration || duration <= 0) {
        showErrorModal("Please provide a valid name and duration.");
        return;
    }

    const newTimerData = {
        id: 'timer_' + Date.now(),
        name: name,
        duration: duration,
        color: color || 'text-indigo-600',
        finished: false,
        isPaused: false,
        totalElapsedSeconds: 0,
        lastStartTime: Date.now()
    };

    renderTimer(newTimerData.id, newTimerData);
    saveTimers();
    addTimerForm.reset();
    showForm(false);
});

function deleteTimer(timerId) {
    removeTimerFromUI(timerId);
    saveTimers();
    if (Object.keys(timers).length === 0) {
        showForm(true);
    }
}

// --- UI Rendering and Updates ---
function renderTimer(id, data) {
    if (timers[id]) return;
    const timerWrapper = document.createElement('div');
    timerWrapper.id = `timer-${id}`;
    timerWrapper.className = `timer-card bg-white p-5 rounded-2xl shadow-xl flex flex-col relative`;
    const radius = 85; 
    const strokeWidth = 30;
    const halfCircumference = Math.PI * radius;
    timerWrapper.innerHTML = `
        <div class="flex-grow flex flex-col items-center space-y-4 w-full">
            <div class="relative w-56 h-56">
                <div class="confetti-container"></div>
                <div class="sr-only" aria-live="polite" id="timer-status-${id}"></div>
                <svg class="w-full h-full" viewBox="0 0 200 200" aria-hidden="true">
                    <g class="timer-visuals">
                        <circle cx="100" cy="100" r="${radius}" fill="none" stroke="#e5e7eb" stroke-width="${strokeWidth}"/>
                        <path class="timer-progress-half" d="M 100, ${100 - radius} A ${radius},${radius} 0 0 0 100, ${100 + radius}" 
                            fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>
                        <path class="timer-progress-half" d="M 100, ${100 - radius} A ${radius},${radius} 0 0 1 100, ${100 + radius}" 
                            fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>
                    </g>
                </svg>
                <div id="time-display-${id}" aria-label="Time remaining" class="time-display absolute inset-0 flex items-center justify-center text-5xl font-bold text-slate-800"></div>
            </div>
            <h3 class="timer-name text-xl font-semibold text-slate-700 text-center">${data.name}</h3>
        </div>
        <div class="w-full flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
            <button data-id="${id}" class="action-button play-pause-btn p-2 rounded-full hover:bg-slate-200 text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <svg class="w-6 h-6"><use href="#icon-pause"></use></svg>
                <span class="sr-only">Pause</span>
            </button>
            <button data-id="${id}" class="action-button delete-btn p-2 rounded-full hover:bg-slate-200 text-slate-600 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                <svg class="w-6 h-6"><use href="#icon-trash"></use></svg>
                <span class="sr-only">Delete</span>
            </button>
        </div>
    `;
    const progressHalves = timerWrapper.querySelectorAll('.timer-progress-half');
    progressHalves.forEach(el => {
        el.classList.add(data.color);
        el.style.strokeDasharray = halfCircumference;
        el.style.strokeDashoffset = halfCircumference;
    });
    if (data.isPaused) {
        timerWrapper.classList.add('paused');
    }
    timersContainer.appendChild(timerWrapper);
    const playPauseBtn = timerWrapper.querySelector('.play-pause-btn');
    playPauseBtn.addEventListener('click', () => togglePlayPause(id));
    const deleteBtn = timerWrapper.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTimer(id));
    timers[id] = { data: data, intervalId: null };
    updatePlayPauseButton(id);
    updateTimerDisplay(id); 
    if (!data.isPaused && !data.finished) {
         startTimerInterval(id);
    }
}
function updateTimerDisplay(id) {
    const timer = timers[id];
    if (!timer) return;
    const timeDisplay = document.getElementById(`time-display-${id}`);
    const progressPaths = document.querySelectorAll(`#timer-${id} .timer-progress-half`);
    const setProgress = (progress) => {
        const radius = 85;
        const halfCircumference = Math.PI * radius;
        const offset = halfCircumference * (1 - progress);
        progressPaths.forEach(path => path.style.strokeDashoffset = offset);
    };
    if (timer.data.finished) {
        setTimerToFinishedState(id);
        setProgress(1); 
        return;
    }
    let totalElapsed = timer.data.totalElapsedSeconds;
    if (!timer.data.isPaused) {
        totalElapsed += (Date.now() - timer.data.lastStartTime) / 1000;
    }
    const totalDurationSeconds = timer.data.duration * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - totalElapsed);
    const progress = totalElapsed / totalDurationSeconds;
    setProgress(progress);
    if (remainingSeconds <= 0) {
        timer.data.finished = true;
        setTimerToFinishedState(id);
        saveTimers();
        if (timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
        }
    } else {
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        timeDisplay.textContent = `${remainingMinutes}`;
    }
}
function setTimerToFinishedState(id) {
    const timerElement = document.getElementById(`timer-${id}`);
    const timeDisplay = document.getElementById(`time-display-${id}`);
    const playPauseBtn = timerElement.querySelector('.play-pause-btn');
    const statusAnnouncer = document.getElementById(`timer-status-${id}`);
    if (!timerElement || !timeDisplay) return;
    timeDisplay.textContent = "Done!";
    timeDisplay.classList.remove('text-5xl');
    timeDisplay.classList.add('text-3xl');
    if (playPauseBtn) {
        playPauseBtn.disabled = true;
        playPauseBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (statusAnnouncer && !timerElement.classList.contains('finished')) {
         statusAnnouncer.textContent = `Timer ${timers[id].data.name} has finished.`;
    }
    timerElement.classList.add('finished');
    triggerConfetti(id);
}
function triggerConfetti(id) {
    const container = document.querySelector(`#timer-${id} .confetti-container`);
    if (!container || container.children.length > 0) return;
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        confetti.style.animationDelay = `${Math.random() * 3}s`;
        confetti.style.animationDuration = `${Math.random() * 2 + 3}s`;
        confetti.style.transform = `scale(${Math.random() * 0.8 + 0.5})`;
        container.appendChild(confetti);
    }
}
function showErrorModal(message) { errorMessage.textContent = message; errorModal.classList.remove('hidden'); }
closeModalBtn.addEventListener('click', () => { errorModal.classList.add('hidden'); });

// --- DROPDOWN FUNCTIONS ---
function selectColor(optionElement) {
    hiddenColorInput.value = optionElement.dataset.value;
    selectedColorName.textContent = optionElement.dataset.name;
    selectedColorSwatch.className = `h-4 w-4 flex-shrink-0 rounded-md ${optionElement.dataset.swatch}`;
    const allOptions = customColorOptions.querySelectorAll('[role="option"]');
    allOptions.forEach(opt => opt.setAttribute('aria-selected', 'false'));
    optionElement.setAttribute('aria-selected', 'true');
    toggleDropdown(false);
    customColorButton.focus();
}

function populateColorOptions() {
    customColorOptions.innerHTML = '';
    COLOR_OPTIONS.forEach((color, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'custom-select-option text-gray-900 relative cursor-pointer select-none py-2 pl-3 pr-9';
        optionEl.id = `color-option-${index}`;
        optionEl.setAttribute('role', 'option');
        optionEl.setAttribute('tabindex', '-1');
        optionEl.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        optionEl.dataset.value = color.value;
        optionEl.dataset.swatch = color.swatch;
        optionEl.dataset.name = color.name;
        optionEl.innerHTML = `<div class="flex items-center"><span class="h-4 w-4 rounded-md ${color.swatch}"></span><span class="ml-3 font-normal block truncate">${color.name}</span></div>`;
        optionEl.addEventListener('click', () => selectColor(optionEl));
        customColorOptions.appendChild(optionEl);
    });
}

function toggleDropdown(show) {
    const isVisible = !customColorOptions.classList.contains('hidden');
    if (show === undefined) show = !isVisible;
    customColorOptions.classList.toggle('hidden', !show);
    customColorButton.setAttribute('aria-expanded', show);
}

customColorButton.addEventListener('click', () => toggleDropdown());

customColorDropdown.addEventListener('keydown', (e) => {
    const isVisible = !customColorOptions.classList.contains('hidden');
    if (e.key === 'Escape') { toggleDropdown(false); customColorButton.focus(); return; }
    if (e.target === customColorButton && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        toggleDropdown(true);
        const firstOption = customColorOptions.querySelector('[role="option"]');
        if (firstOption) firstOption.focus();
    } else if (isVisible && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const options = Array.from(customColorOptions.querySelectorAll('[role="option"]'));
        const currentIndex = options.indexOf(document.activeElement);
        let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= options.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = options.length - 1;
        options[nextIndex].focus();
    } else if (isVisible && (e.key === 'Enter' || e.key === ' ')) {
         e.preventDefault();
         if (document.activeElement.getAttribute('role') === 'option') {
             selectColor(document.activeElement);
         }
    }
});

document.addEventListener('click', (e) => {
    if (!customColorDropdown.contains(e.target)) {
        toggleDropdown(false);
    }
});

function removeTimerFromUI(timerId) {
    const timer = timers[timerId];
    if (timer) {
        if (timer.intervalId) clearInterval(timer.intervalId);
        delete timers[timerId];
    }
    const timerElement = document.getElementById(`timer-${timerId}`);
    if (timerElement) {
        timerElement.remove();
    }
}

// --- Initial Application Start ---
document.addEventListener('DOMContentLoaded', () => {
    populateColorOptions();
    const loadedTimers = loadTimers();
    if (loadedTimers.length === 0) {
        showForm(true);
    } else {
        showForm(false);
    }
});
