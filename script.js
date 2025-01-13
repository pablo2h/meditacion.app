let audioContext;
let audioElement;
let timerInterval;
let isAudioStarted = false; // Para asegurarse de que solo se active una vez
let introAudio = new Audio('assets/music/intro.mp3'); // Canción inicial

// Elementos del DOM
const volumeControl = document.getElementById('volume');
const startButton = document.getElementById('start-button');
const togglePlayButton = document.getElementById('toggle-play');
const stopButton = document.getElementById('stop-music');
const configSection = document.getElementById('config-container');
const progressContainer = document.getElementById('progress-container');
const musicControls = document.getElementById('music-controls');
const durationSlider = document.getElementById('duration-slider');
const durationDisplay = document.getElementById('duration-display');
const timerDisplay = document.getElementById('timer');
const styleSelect = document.getElementById('music-style');
const modeSwitch = document.getElementById('mode-switch');
const modeLabel = document.getElementById('mode-label');
const body = document.body;
const html = document.documentElement; // Cambiar clase en <html> para afectar todo
function getCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}
const progresscolorbg = getCSSVariable('--progress-circle-bg');

// Verificar preferencia guardada del modo noche o claro
const savedMode = localStorage.getItem('theme');
if (savedMode === 'dark') {
    body.classList.add('dark-mode');
    html.classList.add('dark-mode');
    modeSwitch.checked = true;
    modeLabel.textContent = "Modo Noche";
} else {
    modeLabel.textContent = "Modo Claro"; // Ajustar texto al modo predeterminado
}

// Ocultar los botones de control al inicio
document.addEventListener('DOMContentLoaded', () => {
    musicControls.classList.add('hidden'); // Asegura que estén ocultos
    progressContainer.classList.add('hidden'); // Oculta el círculo progresivo también
});
// Alternar modos
modeSwitch.addEventListener('change', () => {
    if (modeSwitch.checked) {
        body.classList.add('dark-mode');
        html.classList.add('dark-mode');
        modeLabel.textContent = "Modo Noche"; // Cambiar texto
        localStorage.setItem('theme', 'dark'); // Guardar preferencia
    } else {
        body.classList.remove('dark-mode');
        html.classList.remove('dark-mode');
        modeLabel.textContent = "Modo Claro"; // Cambiar texto
        localStorage.setItem('theme', 'light'); // Guardar preferencia
    }
});

// Configurar evento inicial para la interacción del usuario
window.addEventListener('click', playIntroAudio, { once: true }); // Solo una vez
window.addEventListener('keydown', playIntroAudio, { once: true }); // Alternativa para teclados



// Función genérica para Fade-In
function fadeIn(audio, duration = 2000) {
    let currentVolume = 0;
    audio.volume = 0; // Inicia con volumen 0
    audio.play();
    const step = 1 / (duration / 100); // Incremento de volumen
  
    const fadeInterval = setInterval(() => {
      if (currentVolume < 1) {
        currentVolume += step;
        audio.volume = Math.min(currentVolume, 1); // Limitar al máximo volumen
      } else {
        clearInterval(fadeInterval);
      }
    }, 100); // Actualizar cada 100ms
  }

  // Función genérica para Fade-Out
function fadeOut(audio, duration = 2000, onComplete = () => {}) {
    let currentVolume = audio.volume;
    const step = currentVolume / (duration / 100); // Decremento de volumen
  
    const fadeInterval = setInterval(() => {
      if (currentVolume > 0) {
        currentVolume -= step;
        audio.volume = Math.max(currentVolume, 0); // Limitar al mínimo volumen
      } else {
        clearInterval(fadeInterval);
        audio.pause(); // Pausar audio una vez que el volumen sea 0
        audio.currentTime = 0; // Reiniciar el tiempo
        onComplete();
      }
    }, 100); // Actualizar cada 100ms
  }


// Configuración de la canción inicial
function playIntroAudio() {
    if (!isAudioStarted) {
        introAudio.loop = true; // Repetir en loop
        fadeIn(introAudio); // Aplicar fade-in
        isAudioStarted = true; // Marcar que ya se activó
        };
    }

function stopIntroAudio() {
    fadeOut(introAudio);
  }

// Sistema de gestión de audios
class AudioManager {
    constructor() {
        this.audioTags = null;
        this.currentStyle = null;
        this.intervalTimer = null;
        this.sessionDuration = 0;
        this.currentAudio = null;
    }

    async loadAudioTags() {
        try {
            const response = await fetch('config/audioTags.json');
            this.audioTags = await response.json();
        } catch (error) {
            console.error('Error cargando configuración de audio:', error);
        }
    }

    getAudioByTag(type, style) {
        if (!this.audioTags || !this.audioTags[type]) return null;
        return this.audioTags[type].find(audio => audio.tags.includes(style));
    }

    async playAudioByTag(type, style) {
        const audioConfig = this.getAudioByTag(type, style);
        if (!audioConfig) return;

        if (this.currentAudio) {
            await fadeOut(this.currentAudio);
        }

        const audio = new Audio(`audio-library/${type}/${audioConfig.file}`);
        this.currentAudio = audio;
        await fadeIn(audio);
        
        return new Promise(resolve => {
            audio.onended = () => {
                resolve();
            };
        });
    }

    async startSession(style, duration) {
        this.currentStyle = style;
        this.sessionDuration = duration;

        // Reproducir audio de inicio
        await this.playAudioByTag('start', style);

        // Configurar intervalos
        const intervalMinutes = 10;
        this.intervalTimer = setInterval(() => {
            this.playAudioByTag('interval', style);
        }, intervalMinutes * 60 * 1000);

        // Configurar audio final
        setTimeout(async () => {
            clearInterval(this.intervalTimer);
            await this.playAudioByTag('end', style);
            this.endSession();
        }, duration * 1000);
    }

    endSession() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }
        if (this.currentAudio) {
            fadeOut(this.currentAudio);
        }
    }
}

// Inicializar el gestor de audio
const audioManager = new AudioManager();

// Modificar el evento de inicio de meditación
startButton.addEventListener('click', async () => {
    const selectedStyle = styleSelect.value.split('.')[0]; // Obtener estilo sin extensión
    const duration = parseInt(durationSlider.value, 10) * 60;

    // Detener la canción inicial
    stopIntroAudio();
    
    // Cargar configuración de audio si no está cargada
    if (!audioManager.audioTags) {
        await audioManager.loadAudioTags();
    }

    // Iniciar sesión con el sistema de etiquetas
    audioManager.startSession(selectedStyle, duration);
    
    // Ocultar configuración y mostrar controles
    startButton.classList.add('hidden');
    configSection.classList.add('hidden');
    musicControls.classList.remove('hidden');
    progressContainer.classList.remove('hidden');

    // Iniciar temporizador
    startTimer(duration);
    togglePlayButton.textContent = "⏸ Pausar";
});

// Actualizar la duración tanto en el círculo como en el texto de configuración
durationSlider.addEventListener('input', () => {
    const durationValue = durationSlider.value;
    timerDisplay.textContent = `${durationValue} minutos`;// Actualiza el círculo
    durationDisplay.textContent = `${durationValue} minutos`;// Actualiza el texto en configuración
});
// Temporizador con actualización del círculo progresivo
function startTimer(duration) {
    let remainingTime = duration;
    const totalDuration = duration;

    const updateCircle = () => {
        const percentage = ((totalDuration - remainingTime) / totalDuration) * 100;
        const circleColorStart = getCSSVariable('--progress-circle-bg-start'); // Variable CSS para el color inicial
        const circleColorEnd = getCSSVariable('--progress-circle-bg-end');   // Variable CSS para el color final
        document.getElementById('progress-circle').style.background = `
            conic-gradient(${circleColorStart} ${percentage}%,${circleColorEnd}  ${percentage}%)
        `;
    };

    // Actualizar cada segundo
    timerInterval = setInterval(() => {
        remainingTime--;
        const remainingMinutes = Math.ceil(remainingTime / 60);
        timerDisplay.textContent = `${remainingMinutes} minutos`;
        updateCircle();

        // Detener cuando el temporizador llegue a 0
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            stopMeditation();
        }
    }, 1000);
}

// Alternar entre reproducir y pausar
togglePlayButton.addEventListener('click', () => {
    if (audioElement.paused) {
        audioElement.play();
        togglePlayButton.textContent = "⏸ Pausar";
    } else {
        audioElement.pause();
        togglePlayButton.textContent = "▶ Reproducir";
    }
});

// Detener meditación
stopButton.addEventListener('click', () => {
    fadeOut(audioElement, 2000, () => {
        stopMeditation();
    });
});

function stopMeditation() {
    clearInterval(timerInterval);
    audioManager.endSession();
    location.reload();
}
