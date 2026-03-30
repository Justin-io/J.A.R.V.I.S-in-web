import * as ort from 'onnxruntime-web';

class KokoroService {
  private session: ort.InferenceSession | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  stop() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch(e) {}
    }
    this.currentSource = null;
  }

  async init() {
    if (this.session) return;
    try {
      const modelPath = '/models/kokoro-v0.19.onnx';
      const response = await fetch(modelPath);
      
      if (!response.ok) {
        console.info(`Status Info: Neural voice model not found (${response.status}). Using native system voice.`);
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
         console.info("Status Info: Neural voice model 'kokoro-v0.19.onnx' not installed. Defaulting to high-quality native voice.");
         return;
      }
      
      const buffer = await response.arrayBuffer();
      
      this.session = await ort.InferenceSession.create(buffer);
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log("KOKORO_TTS: NEURAL_ENGINE_INITIALIZED");
    } catch (err) {
      console.info("KOKORO_TTS: Running in Native Voice fallback mode.");
    }
  }

  async speak(text: string) {
    if (!this.session || !this.audioContext) {
      return false;
    }

    try {
      const inputs = {
        input: new ort.Tensor('string', [text]),
        speed: new ort.Tensor('float32', [1.0]),
      };

      const output = await this.session.run(inputs);
      const audioData = output.audio.data as Float32Array;

      const buffer = this.audioContext.createBuffer(1, audioData.length, 24000);
      buffer.getChannelData(0).set(audioData);

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      this.currentSource = source;
      source.start();
      
      await new Promise((resolve) => {
        source.onended = resolve;
      });
      return true;
    } catch (err) {
      console.error("KOKORO_TTS: INFERENCE_ERROR", err);
      return false;
    }
  }
}

export const kokoroService = new KokoroService();
