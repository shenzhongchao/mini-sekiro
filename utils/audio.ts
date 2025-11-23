
let audioCtx: AudioContext | null = null;

const FILE_SOUND_MAP = {
  PARRY: new URL('../assets/audio/block.mp3', import.meta.url).href,
  BLOCK: new URL('../assets/audio/ding.mp3', import.meta.url).href
} as const;

type FileSoundType = keyof typeof FILE_SOUND_MAP;

const audioBufferCache = new Map<FileSoundType, AudioBuffer>();
const audioBufferLoading = new Map<FileSoundType, Promise<AudioBuffer>>();

const loadAudioBuffer = (type: FileSoundType): Promise<AudioBuffer> => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return Promise.reject('Audio context unavailable');

  if (audioBufferCache.has(type)) {
    return Promise.resolve(audioBufferCache.get(type)!);
  }

  if (audioBufferLoading.has(type)) {
    return audioBufferLoading.get(type)!;
  }

  const url = FILE_SOUND_MAP[type];
  const loadPromise = fetch(url)
    .then(res => res.arrayBuffer())
    .then(data => audioCtx!.decodeAudioData(data))
    .then(buffer => {
      audioBufferCache.set(type, buffer);
      return buffer;
    })
    .finally(() => {
      audioBufferLoading.delete(type);
    });

  audioBufferLoading.set(type, loadPromise);
  return loadPromise;
};

export const initAudio = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(console.error);
  }
};

export const playCombatSound = (type: 'PARRY' | 'BLOCK' | 'HIT' | 'SWING' | 'PERILOUS' | 'DEATHBLOW' | 'BREAK' | 'HEAL' | 'DASH' | 'THROW' | 'CLINK' | 'FLURRY' | 'CHARGE' | 'THRUST_ATTACK') => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);

  switch (type) {
    case 'PARRY': {
      loadAudioBuffer('BLOCK')
        .then(buffer => {
          if (!audioCtx) return;
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          const now = audioCtx.currentTime;
          gain.gain.setValueAtTime(0.8, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
          source.connect(gain);
          source.start(now);
        })
        .catch(err => console.error('Failed to load parry sound', err));
      return;
    }

    case 'BLOCK': {
      loadAudioBuffer('PARRY')
        .then(buffer => {
          if (!audioCtx) return;
          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          const now = audioCtx.currentTime;
          gain.gain.setValueAtTime(0.9, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
          source.connect(gain);
          source.start(now);
        })
        .catch(err => console.error('Failed to load block sound', err));
      return;
    }

    case 'SWING': {
      const bufferSize = audioCtx.sampleRate * 0.2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1;
      filter.frequency.setValueAtTime(200, t);
      filter.frequency.linearRampToValueAtTime(1000, t + 0.15);

      noise.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);

      noise.start(t);
      break;
    }

    case 'HIT': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.2);
      osc.connect(gain);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.2);
      break;
    }

    case 'PERILOUS': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(200, t + 0.4);
      osc.connect(gain);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.2);
      gain.gain.linearRampToValueAtTime(0, t + 0.6);
      
      osc.start(t);
      osc.stop(t + 0.6);
      break;
    }

    case 'DEATHBLOW': {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(50, t);
      osc.connect(gain);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

      osc.start(t);
      osc.stop(t + 1.0);
      break;
    }
    
    case 'BREAK': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
      osc.connect(gain);
      
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      
      osc.start(t);
      osc.stop(t + 0.4);
      break;
    }
    
    case 'HEAL': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(800, t + 0.5);
      osc.connect(gain);
      
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 10;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 500;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.5);
      
      osc.start(t);
      osc.stop(t + 0.5);
      break;
    }

    case 'DASH': {
      const bufferSize = audioCtx.sampleRate * 0.1;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(100, t + 0.1);

      noise.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.1);
      noise.start(t);
      break;
    }

    case 'THROW': {
      const osc = audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
      osc.connect(gain);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
      break;
    }
    
    case 'CLINK': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3000, t);
      osc.frequency.exponentialRampToValueAtTime(2000, t + 0.05);
      osc.connect(gain);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
      break;
    }

    case 'FLURRY': {
      // Rapid slash noise
      const bufferSize = audioCtx.sampleRate * 0.15;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.8;
      }
      
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(500, t);
      filter.frequency.linearRampToValueAtTime(2000, t + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      noise.start(t);
      break;
    }

    case 'CHARGE': {
      // Rising pitch for charging
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.linearRampToValueAtTime(600, t + 1.0);
      osc.connect(gain);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 1.0);
      osc.start(t);
      osc.stop(t + 1.0); // Max duration check logic handles sound loop manually if needed
      break;
    }

    case 'THRUST_ATTACK': {
      // Sharp whoosh
      const bufferSize = audioCtx.sampleRate * 0.3;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, t);
      filter.frequency.exponentialRampToValueAtTime(500, t + 0.2);

      noise.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      noise.start(t);
      break;
    }
  }
};
