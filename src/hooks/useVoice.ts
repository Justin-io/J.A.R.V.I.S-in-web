import { useState, useCallback, useRef, useEffect } from 'react';
import { kokoroService } from '../services/kokoro';

// Web Speech API interfaces
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(false);
  const isWaitingForCommandRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const [audioAuthorized, setAudioAuthorized] = useState(false);
  const recognitionRef = useRef<any>(null);
  const heartbeatRef = useRef<any>(null);
  const isProcessingWakeWordRef = useRef(false);
  const awaitingTimeoutRef = useRef<any>(null);

  // Initialize Kokoro on mount
  useEffect(() => {
    kokoroService.init();
  }, []);

  // Sync refs with state
  useEffect(() => {
    isWaitingForCommandRef.current = isWaitingForCommand;
  }, [isWaitingForCommand]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const toggleAudio = useCallback(() => {
    setAudioAuthorized(true);
    kokoroService.speak("System Initialized");
  }, []);

  const speakNative = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      const isMalayalam = /[\u0D00-\u0D7F]/.test(text);
      let selectedVoice = null;

      if (isMalayalam) {
        selectedVoice = 
          voices.find(v => v.lang === 'ml-IN') ||
          voices.find(v => v.lang.startsWith('ml')) ||
          voices.find(v => v.name.toLowerCase().includes('malayalam'));
        
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }

      if (!selectedVoice) {
        selectedVoice =
          voices.find(v => v.name === 'Google UK English Male') ||
          voices.find(v => v.name.includes('Google') && v.name.toLowerCase().includes('male')) ||
          voices.find(v => v.name === 'Microsoft David - English (United States)') ||
          voices.find(v => v.name === 'Alex') ||
          voices.find(v => v.name.includes('Daniel') && v.lang.startsWith('en')) ||
          voices.find(v => v.name.includes('Arthur') && v.lang.startsWith('en')) ||
          voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find(v => v.name.includes('Male') && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en-GB')) ||
          voices.find(v => v.lang.startsWith('en')) ||
          voices[0];
        
        utterance.pitch = 0.9;
        utterance.rate = 1.05;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }
      
      utterance.volume = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, []);

  const speak = useCallback(async (text: string) => {
    // Detect if text contains Malayalam characters (Unicode range 0D00-0D7F)
    const isMalayalam = /[\u0D00-\u0D7F]/.test(text);

    if (isMalayalam) {
      speakNative(text);
      return;
    }

    setIsSpeaking(true);
    try {
      const success = await kokoroService.speak(text);
      if (!success) {
        throw new Error("KOKORO_NOT_READY");
      }
    } catch (e) {
      // Silently handle fallback
      speakNative(text);
    } finally {
      setIsSpeaking(false);
    }
  }, [speakNative]);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already running
    }
  }, []);

  const listen = useCallback(() => {
    if (recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';


    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const text = lastResult[0].transcript;
      const isFinal = lastResult.isFinal;
      const trimText = text.trim();
      const upperText = trimText.toUpperCase();

      // Update UI immediately (makes it feel fast and responsive)
      setRawTranscript(trimText);

      // Interrupt JARVIS if speaking and user starts talking loudly
      if (trimText.length > 3 && isSpeakingRef.current) {
        window.speechSynthesis.cancel();
        kokoroService.stop && kokoroService.stop();
        setIsSpeaking(false);
      }

      // Crucial Fix: Don't process wake words or commands until the user finishes the sentence!
      // This prevents chopping off "Jarvis turn on the lights" at "Jarvis".
      if (!isFinal) return;

      const isAwaiting = isWaitingForCommandRef.current;

      // If already awaiting a command, treat the entire transcript as the command and bypass wake word check
      if (isAwaiting) {
        if (trimText.length > 2) {
          const exitWords = ['DONE', 'STOP', 'THAT IS ALL', "THAT'S ALL", 'THANK YOU', 'THANKS', 'EXIT', 'QUIT', 'NEVERMIND', 'DISMISS'];
          const cleanUpper = upperText.replace(/[,\s.!]+$/, '');
          
          if (exitWords.includes(cleanUpper)) {
             try { recognition.stop(); } catch(e) {}
             speak("At your service, Sir.");
             setIsWaitingForCommand(false);
             setRawTranscript('');
             if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
             return;
          }

          setTranscript(trimText);
          // Do NOT set isWaitingForCommand to false here! This makes it a continuous conversation.
          setRawTranscript('');
          
          // Clear timeout while waiting for AI response
          if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
        }
        return;
      }

      const wakeWords = [
        'HEY JARVIS', 'OKAY JARVIS', 'HI JARVIS', 'JARVIS',
        'HEY BUDDY', 'OKAY BUDDY', 'HI BUDDY', 'BUDDY',
        'HEY BUD', 'OKAY BUD', 'HI BUD', 'BUD',
        'HEY BRO', 'OKAY BRO', 'HI BRO', 'BRO',
        'HEY JAY', 'OKAY JAY', 'HI JAY', 'JAY',
        'HEY SYSTEM', 'HI SYSTEM', 'SYSTEM'
      ];
      
      let matchedWord: string | null = null;
      let matchIndex = -1;

      for (const word of wakeWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        const match = upperText.match(regex);
        if (match) {
          matchedWord = word;
          matchIndex = match.index!;
          break;
        }
      }

      if (matchedWord) {
        const textBefore = trimText.substring(0, matchIndex).trim().replace(/[,\s.!]+$/, '');
        const textAfter = trimText.substring(matchIndex + matchedWord.length).trim().replace(/^[,\s.!]+/, '');
        
        // Combine any text spoken before or after the wake word into the actual command
        const commandText = [textBefore, textAfter].filter(Boolean).join(' ');

        if (commandText) {
          // Combined: "Hey Buddy, do X" or "Turn off the lights Jarvis"
          setTranscript(commandText);
          // Set to true to start continuous mode!
          setIsWaitingForCommand(true);
          setRawTranscript('');
          if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
        } else if (!isProcessingWakeWordRef.current) {
          // Pure wake word: "Buddy"
          isProcessingWakeWordRef.current = true;
          try { recognition.stop(); } catch (e) { }

          speak("Sir?");
          setIsWaitingForCommand(true);
          // Highlight the Wake Word so the user SEES it heard them!
          setRawTranscript(`>> ${matchedWord} << // AWAITING COMMAND...`);

          // Clear processing flag after speaking starts or shortly after
          setTimeout(() => { isProcessingWakeWordRef.current = false; }, 2000);

          // The hard-coded 8000ms timeout has been removed. It is now handled by the inactivity timeout!
        }
      }
    };

    recognition.onend = () => {
      // Always restart immediately to keep mic active, unless processing a wake word trigger
      if (!isProcessingWakeWordRef.current) {
        setTimeout(() => startRecognition(), 100);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      console.error('Speech recognition error:', event.error);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);

    // Reduced heartbeat frequency to stop glitching mic symbol in browser
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      startRecognition();
    }, 10000);
  }, [startRecognition, speak]);

  // Restart when speaking ends
  useEffect(() => {
    if (!isSpeaking) {
      startRecognition();
      if (isWaitingForCommandRef.current) {
         if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
         awaitingTimeoutRef.current = setTimeout(() => {
           setIsWaitingForCommand(false);
           setRawTranscript('');
         }, 15000); // 15 seconds of silence exits continuous conversation
      }
    } else {
      if (awaitingTimeoutRef.current) clearTimeout(awaitingTimeoutRef.current);
    }
  }, [isSpeaking, startRecognition]);

  return { listen, speak, isListening, transcript, rawTranscript, isSpeaking, setTranscript, isWaitingForCommand, audioAuthorized, toggleAudio };
};
