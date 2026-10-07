export const MODEL = 'Xenova/whisper-tiny.en';
export const REVISION = '79fb389fc764e7c395bd330e9531d9d32ada7049';
export function silence(audio) { let sum=0; for(const value of audio) sum+=value*value; return !audio.length || Math.sqrt(sum/audio.length)<0.002; }
