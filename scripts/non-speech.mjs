import fs from 'node:fs';
function wav(samples){const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(v,44+2*i));return b;}
let seed=123456;const noise=Array.from({length:48000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.round(((seed/2**32)*2-1)*7000);});
fs.writeFileSync('public/samples/07-silence.wav',wav(Array(48000).fill(0)));
fs.writeFileSync('public/samples/08-noise.wav',wav(noise));
const path='public/samples/manifest.json';let cases=JSON.parse(fs.readFileSync(path,'utf8').replace(/^\uFEFF/,''));cases=cases.filter(c=>!['07-silence','08-noise'].includes(c.id));cases.push({id:'07-silence',text:'',fixture:'Three seconds of digital silence'},{id:'08-noise',text:'',fixture:'Three seconds of deterministic white noise; no speech'});cases.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(path,JSON.stringify(cases,null,2));
