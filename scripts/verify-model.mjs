import fs from 'node:fs';
import { pipeline, env } from '@huggingface/transformers';
import { MODEL, REVISION, silence } from '../src/model.js';
import { parseTranscript } from '../src/core.js';
env.cacheDir='./.cache'; env.allowLocalModels=false;
const t=performance.now();
const pipe=await pipeline('automatic-speech-recognition',MODEL,{revision:REVISION,dtype:'q8',device:'cpu'});
const loadMs=Math.round(performance.now()-t);
function readWav(path) {
 const b=fs.readFileSync(path); let p=12;
 while(p<b.length){ const id=b.toString('ascii',p,p+4),len=b.readUInt32LE(p+4); if(id==='data'){const out=new Float32Array(len/2);for(let i=0;i<out.length;i++)out[i]=b.readInt16LE(p+8+i*2)/32768;return out;}p+=8+len+(len%2);}
 throw new Error('No WAV data');
}
const cases=JSON.parse(fs.readFileSync('public/samples/manifest.json','utf8').replace(/^\uFEFF/,''));
const results=[];
for(const c of cases){
 const audio=readWav('public/samples/'+c.id+'.wav');const start=performance.now();
 const result=silence(audio)?{text:''}:await pipe(audio,{return_timestamps:false});
 const text=result.text.trim();const row={...c,observed:text,seconds:audio.length/16000,elapsedMs:Math.round(performance.now()-start),proposal:parseTranscript(text)};results.push(row); console.log(JSON.stringify(row));
}
const evidence={runAt:new Date().toISOString(),runtime:process.version,platform:process.platform,backend:'ONNX Runtime CPU in Node (browser WASM tested separately)',model:MODEL,revision:REVISION,dtype:'q8',fixtures:'Synthetic speech, Microsoft Zira Desktop, 16000Hz mono; not outdoor recordings',loadMs,results};
fs.writeFileSync('evidence/model-run.json',JSON.stringify(evidence,null,2));
