import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Pizza, Clock, MapPin, Phone, Loader2, Play, Square } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const VoiceAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [orderState, setOrderState] = useState<'idle' | 'ordering' | 'pizza_type' | 'pizza_size' | 'toppings' | 'sides' | 'drinks' | 'delivery' | 'contact' | 'confirming'>('idle');
  const [currentOrder, setCurrentOrder] = useState({
    pizzaType: '',
    pizzaSize: '',
    toppings: [] as string[],
    sides: [] as string[],
    drinks: [] as string[],
    deliveryMethod: '',
    address: '',
    phone: ''
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [stop, setStop] = useState(true);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastAudioTime, setLastAudioTime] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number>(5);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // session & shutdown controls
  const isActiveRef = useRef(false);
  const isStoppingRef = useRef(false);
  const sessionIdRef = useRef(0);
  const allowMicRef = useRef(false);           // master "may I open mic?"
  const ttsStartedAtRef = useRef<number>(0);   // when TTS began
  const noListenUntilRef = useRef<number>(0);  // don't listen before this time

  // --- MIME being recorded (so we can set Content-Type correctly) ---
  const recorderMimeRef = useRef<string>("");

  // abort controllers
  const dgAbortRef = useRef<AbortController | null>(null);   // Deepgram
  const llmAbortRef = useRef<AbortController | null>(null);  // Gemini

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // keep refs in sync with state
  useEffect(() => { isActiveRef.current = isConversationActive; }, [isConversationActive]);

  // Constants for echo protection
  const ECHO_DEADZONE_MS = 1500;   // 1.5s after TTS start/end
  const RELAUNCH_DELAY_MS = 0;     // rely entirely on guard now

  // --- tiny-audio guards ---
  const MIN_AUDIO_BYTES = 3500;       // ~a few hundred ms of opus
  const MIN_AUDIO_CHUNKS = 2;

  const totalBytes = (blobs: Blob[]) => blobs.reduce((n, b) => n + (b.size || 0), 0);
  const hasUsableAudio = (blobs: Blob[]) =>
    blobs.length >= MIN_AUDIO_CHUNKS && totalBytes(blobs) >= MIN_AUDIO_BYTES;

  // Prefer Deepgram-friendly mime
  const pickMime = () => {
    const cands = ["audio/webm;codecs=opus", "audio/webm"];
    return cands.find(m => MediaRecorder.isTypeSupported(m)) || "";
  };

  // Echo detection helpers
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  const looksLikeEcho = (userText: string) => {
    const lastBot = [...messages].reverse().find(m => !m.isUser)?.text || "";
    if (!lastBot) return false;

    const now = performance.now();
    // only treat as echo if it happens soon after TTS
    const withinEchoTime = now - (ttsStartedAtRef.current || 0) < 4000; // 4s window

    if (!withinEchoTime) return false;

    const a = normalize(userText);
    const b = normalize(lastBot);

    if (!a || !b) return false;

    // quick checks
    if (b.startsWith(a) || a.startsWith(b)) return true;
    if (a.length >= 12 && b.includes(a)) return true;

    // token overlap (Jaccard-ish)
    const A = new Set(a.split(" "));
    const B = new Set(b.split(" "));
    let inter = 0;
    A.forEach(t => { if (B.has(t)) inter++; });
    const union = new Set([...A, ...B]).size;
    const jaccard = union ? inter / union : 0;

    return jaccard >= 0.65; // tweak threshold to taste
  };

  // Pizza Hut knowledge base for responses
  const pizzaKnowledge = {
    menu: {
      pizzas: [
        "Pepperoni Pizza - $12.99",
        "Margherita Pizza - $11.99",
        "Supreme Pizza - $15.99",
        "BBQ Chicken Pizza - $14.99",
        "Veggie Delight - $13.99"
      ],
      sizes: ["Small (10\")", "Medium (12\")", "Large (14\")", "Extra Large (16\")"],
      toppings: ["Pepperoni", "Mushrooms", "Sausage", "Onions", "Bell Peppers", "Olives", "Extra Cheese"],
      sides: ["Garlic Bread", "Chicken Wings", "Pasta", "Salad", "Dessert"]
    },
    locations: "We have locations in downtown, uptown, and the mall area. What's your zip code?",
    hours: "We're open daily from 11 AM to 11 PM, with delivery until 10:30 PM.",
    delivery: "Delivery is available within 5 miles, typically takes 25-35 minutes.",
    specials: "Today's special: 2 Large Pizzas for $25.99! Also, 20% off online orders."
  };

  // --- TTS super-cancel (works around Chrome flakiness) ---
  const killTTS = () => {
    try {
      speechSynthesis.cancel();
      speechSynthesis.pause();
      speechSynthesis.cancel();
      speechSynthesis.resume();
      speechSynthesis.cancel();
    } catch { }
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.onend = null;
      speechSynthesisRef.current.onerror = null;
      speechSynthesisRef.current = null;
    }
  };

  // Stop all active processes
  const stopAllProcesses = () => {
    console.log('Stopping all processes...');
    isStoppingRef.current = true;

    // 1) Kill TTS immediately and prevent callbacks from re-starting listening
    killTTS();

    // 2) Abort any in-flight network requests
    try { dgAbortRef.current?.abort(); } catch { }
    try { llmAbortRef.current?.abort(); } catch { }
    dgAbortRef.current = null;
    llmAbortRef.current = null;

    // 3) Stop MediaRecorder & tracks
    try {
      const mr = mediaRecorderRef.current;
      if (mr) {
        if (mr.state === 'recording') mr.stop();
        mr.ondataavailable = null;
        mr.onstop = null;
        mr.stream?.getTracks()?.forEach(t => t.stop());
      }
    } catch { }
    mediaRecorderRef.current = null;

    // 4) Clear timers/intervals
    if (silenceTimer) { clearTimeout(silenceTimer); setSilenceTimer(null); }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }

    // 5) Reset state
    audioChunksRef.current = []; // 🛑 clear any buffered audio
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setTranscript("");
  };

  const generateResponse = async (userInput: string): Promise<string> => {
    const sid = sessionIdRef.current;
    if (!isActiveRef.current || isStoppingRef.current) return ""; // hard bail

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API key not configured');

      // abort controller with timeout
      llmAbortRef.current?.abort();
      const controller = new AbortController();
      llmAbortRef.current = controller;
      const llmTimeout = setTimeout(() => controller.abort(), 15000); // 15s hard timeout

      const conversationHistory = messages
        .slice(-10)
        .map(msg => `${msg.isUser ? 'Customer' : 'Assistant'}: ${msg.text}`)
        .join('\n');

      const prompt = `You are a helpful Pizza Hut voice assistant taking a customer's order. 

CONVERSATION HISTORY:
${conversationHistory}

CURRENT CUSTOMER INPUT: "${userInput}"

IMPORTANT: You must maintain conversation context and continue from where you left off. If the customer is in the middle of ordering, don't start over - continue with the next logical step.

Pizza Hut information:
- Menu: Pepperoni ($12.99), Margherita ($11.99), Supreme ($15.99), BBQ Chicken ($14.99), Veggie Delight ($13.99)
- Sizes: Small (10"), Medium (12"), Large (14"), Extra Large (16")
- Toppings: Pepperoni, Mushrooms, Sausage, Onions, Bell Peppers, Olives, Extra Cheese
- Sides: Garlic Bread ($4.99), Chicken Wings ($8.99), Pasta ($6.99), Salad ($5.99), Dessert ($3.99)
- Drinks: Soft Drinks ($2.49), Bottled Water ($1.99), Juice ($2.99), Beer ($4.99)
- Hours: Daily 11 AM - 11 PM, delivery until 10:30 PM
- Special: 2 Large Pizzas for $25.99, 20% off online orders
- Delivery: Within 5 miles, 25-35 minutes

ORDERING FLOW:
1. Customer wants to order → Ask for pizza type
2. Customer specifies pizza → Ask for size
3. Customer specifies size → Ask for toppings
4. Customer specifies toppings → Ask for sides
5. Customer specifies sides → Ask for drinks
6. Customer specifies drinks → Ask for delivery/pickup
7. Customer specifies delivery/pickup → Ask for address/phone
8. Customer provides details → Confirm order and total

RESPONSE RULES:
- Keep responses under 2 sentences
- Be friendly and professional
- Always continue the conversation flow
- Don't repeat previous questions
- Acknowledge what they just said
- Ask the next logical question in the ordering process

Response:`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal
        }
      );

      clearTimeout(llmTimeout);
      if (sid !== sessionIdRef.current) return ""; // session changed
      if (!isActiveRef.current || isStoppingRef.current) return "";

      if (!response.ok) throw new Error(`Gemini API request failed: ${response.status}`);

      const data = await response.json();
      if (sid !== sessionIdRef.current) return;

      const geminiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return geminiResponse || "I'm here to help with your Pizza Hut order! What would you like to know?";
    } catch (err: any) {
      if (err?.name === 'AbortError') return ""; // ignore aborted
      console.error('Error calling Gemini API:', err);
      if (!isActiveRef.current || isStoppingRef.current || sid !== sessionIdRef.current) return "";

      const input = userInput.toLowerCase();
      if (input.includes("order") || input.includes("pizza") || input.includes("buy")) {
        return "Great! I'd be happy to help you place an order. What type of pizza would you like? We have pepperoni, margherita, supreme, BBQ chicken, and veggie delight.";
      }
      if (input.includes("menu") || input.includes("what do you have")) {
        return `Here's our menu: ${pizzaKnowledge.menu.pizzas.join(", ")}. What would you like to order?`;
      }
      if (input.includes("size") || input.includes("large") || input.includes("small")) {
        return `We offer ${pizzaKnowledge.menu.sizes.join(", ")}. What size would you prefer?`;
      }
      if (input.includes("topping") || input.includes("extra")) {
        return `Available toppings: ${pizzaKnowledge.menu.toppings.join(", ")}. What would you like to add?`;
      }
      if (input.includes("location") || input.includes("where") || input.includes("near")) {
        return pizzaKnowledge.locations;
      }
      if (input.includes("hour") || input.includes("open") || input.includes("close")) {
        return pizzaKnowledge.hours;
      }
      if (input.includes("delivery") || input.includes("deliver")) {
        return pizzaKnowledge.delivery;
      }
      if (input.includes("special") || input.includes("deal") || input.includes("discount")) {
        return pizzaKnowledge.specials;
      }
      if (input.includes("price") || input.includes("cost") || input.includes("how much")) {
        return "Our pizzas range from $11.99 to $15.99 depending on the type and size. Would you like to hear about our current specials?";
      }
      if (input.includes("thank") || input.includes("thanks")) {
        return "You're welcome! Is there anything else I can help you with today?";
      }
      return "I'm here to help with your Pizza Hut order! What would you like to know?";
    } finally {
      if (llmAbortRef.current) llmAbortRef.current = null;
    }
  };

  const startListening = async () => {
    if (!allowMicRef.current) return;                         // master gate
    if (isSpeaking) return;                                   // no mic while TTS
    if (performance.now() < noListenUntilRef.current) return; // echo guard

    if (!isActiveRef.current || isStoppingRef.current) return;
    isStoppingRef.current = false;
    const sid = sessionIdRef.current;

    try {
      // stronger mic constraints to reduce feedback
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }
      });

      const mimeType = pickMime();
      if (!mimeType) {
        setTranscript("This browser can't record WebM/Opus. Please use Chrome or Edge.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      recorderMimeRef.current = mimeType;

      setIsListening(true);
      setTranscript("Listening... Speak now!");
      setLastAudioTime(Date.now());

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // NOTE: slightly bigger timeslice → fewer micro-chunks
      mediaRecorder.start(250);

      mediaRecorder.ondataavailable = (event) => {
        if (isStoppingRef.current || !isActiveRef.current || sid !== sessionIdRef.current) return;
        if (isSpeaking || performance.now() < noListenUntilRef.current) return;

        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          setLastAudioTime(Date.now());

          if (silenceTimer) clearTimeout(silenceTimer);
          const sidLocal = sessionIdRef.current;

          const newSilenceTimer = setTimeout(() => {
            if (sidLocal !== sessionIdRef.current || isStoppingRef.current || !isActiveRef.current) return;
            if (mediaRecorder.state === "recording") {
              try { mediaRecorder.requestData?.(); } catch { }
              mediaRecorder.stop();
            }
          }, 5000);
          setSilenceTimer(newSilenceTimer);
        }
      };

      mediaRecorder.onstop = async () => {
        if (sid !== sessionIdRef.current || isStoppingRef.current || !isActiveRef.current) {
          audioChunksRef.current = [];
          return;
        }
        if (silenceTimer) { clearTimeout(silenceTimer); setSilenceTimer(null); }

        // ✅ EARLY EXIT: nothing to send
        if (!hasUsableAudio(audioChunksRef.current)) {
          audioChunksRef.current = [];
          setTranscript("I didn't catch that — please speak again.");
          noListenUntilRef.current = performance.now() + 400;
          setIsListening(false);
          mediaRecorder.stream?.getTracks()?.forEach(t => t.stop());
          setTimeout(() => {
            if (isActiveRef.current && !isSpeaking && !isProcessing) startListening();
          }, 300);
          return;
        }

        try {
          if (isActiveRef.current && !isStoppingRef.current && sid === sessionIdRef.current) {
            await processAudio();
          }
        } catch (e) {
          console.error("Error in onstop handler:", e);
        } finally {
          mediaRecorder.stream?.getTracks()?.forEach(t => t.stop());
          setIsListening(false);
          setTranscript("");
        }
      };

      // hard cap
      setTimeout(() => {
        if (sid !== sessionIdRef.current) return;
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 60000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setTranscript("Error accessing microphone. Please check permissions.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    // Clear silence timer if manually stopping
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async () => {
    const sid = sessionIdRef.current;
    if (audioChunksRef.current.length === 0) return;

    // ✅ EARLY EXIT: nothing to send
    if (!hasUsableAudio(audioChunksRef.current)) return;

    // If we happen to get here during/just after TTS, ignore
    if (isSpeaking || performance.now() < noListenUntilRef.current) {
      audioChunksRef.current = []; // drop accidental buffer
      return;
    }

    if (!isActiveRef.current || isStoppingRef.current) return;

    setIsProcessing(true);
    setTranscript("Processing your voice...");

    try {
      const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
      if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
        throw new Error('Deepgram API key not configured. Please add your API key to .env file.');
      }

      const mimeType = recorderMimeRef.current || "audio/webm;codecs=opus";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      // abort controller with timeout
      dgAbortRef.current?.abort();
      const controller = new AbortController();
      dgAbortRef.current = controller;
      const dgTimeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
        {
          method: "POST",
          headers: {
            "Authorization": `Token ${apiKey}`,
            "Content-Type": mimeType,          // 👈 matches the blob we're sending
          },
          body: audioBlob,                      // 👈 RAW bytes, not multipart
          signal: controller.signal
        }
      );

      clearTimeout(dgTimeout);
      if (!isActiveRef.current || isStoppingRef.current || sid !== sessionIdRef.current) return;

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Deepgram API request failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      if (sid !== sessionIdRef.current) return;

      const userText = data.results?.channels[0]?.alternatives[0]?.transcript || "";
      if (!isActiveRef.current || isStoppingRef.current || sid !== sessionIdRef.current) return;

      // 🔇 If it looks like we heard ourselves, ignore it and don't respond
      if (looksLikeEcho(userText)) {
        console.log("Dropped echo transcript:", userText);
        audioChunksRef.current = []; // clear buffer
        setTranscript("");           // clear UI hint, optional
        // re-arm mic safely
        noListenUntilRef.current = performance.now() + ECHO_DEADZONE_MS;
        if (!isListening && !isProcessing && isActiveRef.current && allowMicRef.current) {
          startListening();
        }
        return;
      }

      addMessage(userText, true);
      setTranscript("");

      setTimeout(async () => {
        if (!isActiveRef.current || isStoppingRef.current || sid !== sessionIdRef.current) return;
        try {
          const botResponse = await generateResponse(userText);
          if (!botResponse || !isActiveRef.current || isStoppingRef.current || sid !== sessionIdRef.current) return;
          addMessage(botResponse, false);
          speakText(botResponse);
        } catch (error: any) {
          if (error?.name === 'AbortError') return;
          const fallbackResponse = "I'm here to help with your Pizza Hut order! What would you like to know?";
          addMessage(fallbackResponse, false);
          speakText(fallbackResponse);
        }
      }, 300);

    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error && error.message.includes('API key not configured')
        ? "Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to your .env file."
        : "Voice recognition service temporarily unavailable. Please try again.";

      if (isActiveRef.current && !isStoppingRef.current && sid === sessionIdRef.current) {
        setTranscript(errorMessage);
        addMessage(errorMessage, false);
      }
    } finally {
      dgAbortRef.current = null;
      setIsProcessing(false);
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);

    // Update order state based on conversation
    if (isUser) {
      updateOrderState(text);
    }
  };

  const startConversation = async () => {
    // Reset all state
    stopAllProcesses();
    isStoppingRef.current = false;

    // bump session (invalidate any old callbacks)
    sessionIdRef.current += 1;

    setIsConversationActive(true);
    isActiveRef.current = true;
    allowMicRef.current = true; // ✅ allow mic again
    setOrderState('idle');
    setCurrentOrder({
      pizzaType: '',
      pizzaSize: '',
      toppings: [],
      sides: [],
      drinks: [],
      deliveryMethod: '',
      address: '',
      phone: ''
    });

    // If you want to LISTEN FIRST (no greeting), uncomment:
    // allowMicRef.current = true;
    // startListening();
    // return;

    // Otherwise, keep your greeting and the normal flow:
    const initialMessage: Message = {
      id: "initial",
      text: "Hi! I'm your Pizza Hut voice assistant. I can help you place an order, check menu items, find locations, or answer any questions. What would you like to do today?",
      isUser: false,
      timestamp: new Date(),
    };

    setMessages([initialMessage]);

    // Speak the initial message and then start listening
    setTimeout(() => {
      if (isActiveRef.current && sessionIdRef.current > 0) speakText(initialMessage.text);
      // speakText() will re-enable the mic after TTS ends.
    }, 500);
  };

  const endConversation = () => {
    console.log('Ending conversation...');

    // bump session (invalidates old callbacks)
    sessionIdRef.current += 1;

    setIsConversationActive(false);
    isActiveRef.current = false;
    allowMicRef.current = false;   // 🚫 block any future mic opens
    isStoppingRef.current = true;

    stopAllProcesses(); // cancels TTS, mic, timers, fetches

    // Reset UI state
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setTranscript("");
    setSilenceCountdown(5);

    setOrderState('idle');
    setCurrentOrder({
      pizzaType: '',
      pizzaSize: '',
      toppings: [],
      sides: [],
      drinks: [],
      deliveryMethod: '',
      address: '',
      phone: ''
    });
    setMessages([]);

    console.log('Conversation ended successfully');
  };

  const updateOrderState = (userInput: string) => {
    const input = userInput.toLowerCase();

    if (input.includes("order") || input.includes("pizza") || input.includes("buy")) {
      setOrderState('pizza_type');
    } else if (orderState === 'pizza_type' && (input.includes("pepperoni") || input.includes("margherita") || input.includes("supreme") || input.includes("bbq") || input.includes("veggie"))) {
      setOrderState('pizza_size');
      setCurrentOrder(prev => ({ ...prev, pizzaType: userInput }));
    } else if (orderState === 'pizza_size' && (input.includes("small") || input.includes("medium") || input.includes("large") || input.includes("extra"))) {
      setOrderState('toppings');
      setCurrentOrder(prev => ({ ...prev, pizzaSize: userInput }));
    } else if (orderState === 'toppings' && (input.includes("topping") || input.includes("extra") || input.includes("olive") || input.includes("cheese"))) {
      setOrderState('sides');
      setCurrentOrder(prev => ({ ...prev, toppings: [...prev.toppings, userInput] }));
    } else if (orderState === 'sides' && (input.includes("side") || input.includes("garlic") || input.includes("wing") || input.includes("pasta"))) {
      setOrderState('drinks');
      setCurrentOrder(prev => ({ ...prev, sides: [...prev.sides, userInput] }));
    } else if (orderState === 'drinks' && (input.includes("drink") || input.includes("soda") || input.includes("water") || input.includes("beer"))) {
      setOrderState('delivery');
      setCurrentOrder(prev => ({ ...prev, drinks: [...prev.drinks, userInput] }));
    } else if (orderState === 'delivery' && (input.includes("delivery") || input.includes("pickup") || input.includes("deliver"))) {
      setOrderState('contact');
      setCurrentOrder(prev => ({ ...prev, deliveryMethod: userInput }));
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) { setIsSpeaking(false); return; }
    if (!isActiveRef.current || isStoppingRef.current) return;

    const sid = sessionIdRef.current;

    // --- HARD HALF-DUPLEX ---
    // kill any current listening and block new starts while speaking
    stopListening();
    allowMicRef.current = false;

    // guard: do not accept audio for a short moment even before we speak
    const now = performance.now();
    noListenUntilRef.current = now + ECHO_DEADZONE_MS;
    ttsStartedAtRef.current = now;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; utterance.pitch = 1; utterance.volume = 0.8;

    const voices = speechSynthesis.getVoices();
    utterance.voice =
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('US') || v.name.includes('UK') || v.name.includes('English')))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];

    setIsSpeaking(true);
    speechSynthesisRef.current = utterance;

    // extra safety: when the browser starts speaking
    utterance.onstart = () => {
      // keep mic off and extend deadzone a touch
      const t = performance.now();
      ttsStartedAtRef.current = t;
      noListenUntilRef.current = t + ECHO_DEADZONE_MS;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      if (sid !== sessionIdRef.current) return;

      // Guard ends at now + echo delay
      const guardUntil = performance.now() + ECHO_DEADZONE_MS;
      noListenUntilRef.current = guardUntil;

      // Only restart mic after guard period is over
      setTimeout(() => {
        if (sid !== sessionIdRef.current) return;
        if (isStoppingRef.current || !isActiveRef.current) return;
        if (performance.now() < noListenUntilRef.current) return; // still guarding

        allowMicRef.current = true;
        if (!isListening && !isProcessing) startListening();
      }, ECHO_DEADZONE_MS + 50); // wait full guard period
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      // keep mic blocked until we re-enable below
      setTimeout(() => {
        if (sid !== sessionIdRef.current) return;
        if (isStoppingRef.current || !isActiveRef.current) return;
        if (performance.now() < noListenUntilRef.current) return; // still guarding

        allowMicRef.current = true;
        if (!isListening && !isProcessing) startListening();
      }, ECHO_DEADZONE_MS + 50); // wait full guard period
    };

    speechSynthesis.speak(utterance);
  };

  const quickActions = [
    {
      text: "Order Pizza", icon: Pizza, action: async () => {
        setOrderState('pizza_type');
        setCurrentOrder({
          pizzaType: '',
          pizzaSize: '',
          toppings: [],
          sides: [],
          drinks: [],
          deliveryMethod: '',
          address: '',
          phone: ''
        });

        addMessage("I'd like to place an order", true);
        setTimeout(async () => {
          const sid = sessionIdRef.current;
          try {
            const response = await generateResponse("I'd like to place an order");
            if (sid !== sessionIdRef.current || !response) return;
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            if (sid !== sessionIdRef.current) return;
            console.error('Error generating response:', error);
            const fallbackResponse = "Great! I'd be happy to help you place an order. What type of pizza would you like?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Find Location", icon: MapPin, action: async () => {
        addMessage("Where's the nearest Pizza Hut?", true);
        setTimeout(async () => {
          const sid = sessionIdRef.current;
          try {
            const response = await generateResponse("Where's the nearest Pizza Hut?");
            if (sid !== sessionIdRef.current || !response) return;
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            if (sid !== sessionIdRef.current) return;
            console.error('Error generating response:', error);
            const fallbackResponse = pizzaKnowledge.locations;
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Check Hours", icon: Clock, action: async () => {
        addMessage("What are your hours?", true);
        setTimeout(async () => {
          const sid = sessionIdRef.current;
          try {
            const response = await generateResponse("What are your hours?");
            if (sid !== sessionIdRef.current || !response) return;
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            if (sid !== sessionIdRef.current) return;
            console.error('Error generating response:', error);
            const fallbackResponse = pizzaKnowledge.hours;
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Today's Specials", icon: Phone, action: async () => {
        addMessage("What are your specials?", true);
        setTimeout(async () => {
          const sid = sessionIdRef.current;
          try {
            const response = await generateResponse("What are your specials?");
            if (sid !== sessionIdRef.current || !response) return;
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            if (sid !== sessionIdRef.current) return;
            console.error('Error generating response:', error);
            const fallbackResponse = pizzaKnowledge.specials;
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
  ];

  // Load voices when component mounts
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('Loaded voices:', voices.length);
        if (voices.length === 0) {
          setTimeout(loadVoices, 100);
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Silence countdown effect
  useEffect(() => {
    if (isListening && silenceTimer) {
      countdownIntervalRef.current = setInterval(() => {
        setSilenceCountdown(prev => (prev <= 1 ? 5 : prev - 1));
      }, 1000) as unknown as NodeJS.Timeout;
    } else {
      setSilenceCountdown(5);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [isListening, silenceTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllProcesses();
    };
  }, []);

  // Auto-resume watchdog - keeps mic on whenever it's safe
  useEffect(() => {
    const id = setInterval(() => {
      // must be active and allowed
      if (!isConversationActive || !allowMicRef.current) return;

      // don't start while TTS/processing or already listening
      if (isListening || isSpeaking || isProcessing) return;

      // respect the echo deadzone after TTS
      if (performance.now() < noListenUntilRef.current) return;

      // all good: reopen mic
      startListening();
    }, 800); // check ~1x/second (tweak if you want)

    return () => clearInterval(id);
  }, [isConversationActive, isListening, isSpeaking, isProcessing]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Pizza className="h-6 w-6 text-red-600" />
          Pizza Hut Voice Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Powered by Deepgram AI + Gemini AI - Intelligent voice interaction
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Status Display */}
        <div className="text-center">
          {isConversationActive && isListening && (
            <div className="space-y-2">
              <p className="text-sm text-blue-600 animate-pulse">
                🎤 Listening... Speak now!
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(silenceCountdown / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">
                  {silenceCountdown}s silence
                </span>
              </div>
            </div>
          )}
          {isConversationActive && isProcessing && (
            <p className="text-sm text-orange-600">
              <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
              Processing your voice...
            </p>
          )}
          {isConversationActive && isSpeaking && (
            <p className="text-sm text-green-600 animate-pulse">
              🔊 AI is speaking...
            </p>
          )}
          {isConversationActive && transcript && (
            <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
              {transcript}
            </p>
          )}
        </div>

        {/* Conversation Management */}
        <div className="flex justify-center gap-3">
          {!isConversationActive ? (
            <Button
              onClick={startConversation}
              variant="default"
              size="lg"
              className="px-6"
              disabled={isListening || isProcessing || isSpeaking}
            >
              <Play className="h-5 w-5 mr-2" />
              Start Conversation
            </Button>
          ) : (
            <Button
              onClick={endConversation}
              variant="destructive"
              size="lg"
              className="px-6"
            >
              <Square className="h-5 w-5 mr-2" />
              End Conversation
            </Button>
          )}
        </div>

        {/* Quick Actions */}
        {/* <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              variant="outline"
              size="sm"
              className="h-12"
              disabled={isListening || isProcessing || !isConversationActive}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.text}
            </Button>
          ))}
        </div> */}

        {/* Conversation */}
        <div className="border rounded-lg p-4 bg-muted/30 max-h-64 overflow-y-auto">
          {!isConversationActive ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">Click "Start Conversation" to begin talking with the AI assistant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border text-gray-800'
                      }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice Control - Bottom */}
        <div className="flex justify-center">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="rounded-full w-16 h-16"
            disabled={isProcessing || isSpeaking || !isConversationActive}
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* API Key Setup Info */}
        {(!import.meta.env.VITE_DEEPGRAM_API_KEY || import.meta.env.VITE_DEEPGRAM_API_KEY === 'your_deepgram_api_key_here') && (
          <div className="text-center text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <p className="font-semibold mb-1">🔑 Setup Required</p>
            <p>Create a <code className="bg-amber-100 px-1 rounded">.env</code> file in your project root with:</p>
            <p className="font-mono text-xs mt-1">VITE_DEEPGRAM_API_KEY=your_actual_api_key</p>
            <p className="mt-1">Get your API key from <a href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer" className="underline">Deepgram Console</a></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceAgent;
