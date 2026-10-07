import { pipeline, env } from '@huggingface/transformers';
import { MODEL, REVISION, silence } from './model.js';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
let transcriber;
self.onmessage=async ({data}) => {
  try {
    if(data.audio && silence(data.audio)) { self.postMessage({type:'result',id:data.id,text:'',silent:true}); return; }
    transcriber ||= await pipeline('automatic-speech-recognition',MODEL,{revision:REVISION,dtype:'q8',device:'wasm',progress_callback:p=>self.postMessage({type:'progress',...p})});
    if(data.type==='load') { self.postMessage({type:'ready'}); return; }
    const start=performance.now();
    const output=await transcriber(data.audio,{chunk_length_s:30,stride_length_s:5,return_timestamps:false});
    self.postMessage({type:'result',id:data.id,text:output.text.trim(),elapsed:Math.round(performance.now()-start)});
  } catch(error) { self.postMessage({type:'error',id:data.id,message:error.message}); }
};
