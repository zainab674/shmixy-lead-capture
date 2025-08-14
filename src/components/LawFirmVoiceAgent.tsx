import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, Scale, Clock, MapPin, Phone, Loader2, Play, Square } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const LawFirmVoiceAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [consultationState, setConsultationState] = useState<'idle' | 'consulting' | 'practice_area' | 'case_type' | 'urgency' | 'contact' | 'scheduling' | 'confirming'>('idle');
  const [currentConsultation, setCurrentConsultation] = useState({
    practiceArea: '',
    caseType: '',
    urgency: '',
    contactInfo: '',
    caseDetails: '',
    preferredDate: ''
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! Welcome to Justice & Associates Law Firm. I'm here to help you schedule consultations, get information about our legal services, or answer any questions. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [transcript, setTranscript] = useState("");
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastAudioTime, setLastAudioTime] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number>(5);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Law firm knowledge base
  const lawFirmKnowledge = {
    practiceAreas: {
      family: "Family Law - Divorce, custody, adoption, prenups, child support",
      criminal: "Criminal Defense - DUI, drug charges, assault, white collar crimes",
      personal: "Personal Injury - Car accidents, medical malpractice, slip and fall",
      business: "Business Law - Contracts, incorporation, employment, intellectual property",
      real: "Real Estate - Property transactions, landlord-tenant, zoning disputes",
      estate: "Estate Planning - Wills, trusts, probate, power of attorney",
      immigration: "Immigration Law - Visas, citizenship, deportation defense, green cards"
    },
    attorneys: {
      family: ["Attorney Sarah Johnson (Family Law Specialist)", "Attorney Michael Chen (Divorce Expert)", "Attorney Lisa Rodriguez (Child Custody)"],
      criminal: ["Attorney David Thompson (Criminal Defense)", "Attorney Jennifer Lee (DUI Specialist)", "Attorney Robert Wilson (White Collar)"],
      personal: ["Attorney Amanda Davis (Personal Injury)", "Attorney James Brown (Medical Malpractice)", "Attorney Patricia Garcia (Accident Law)"],
      business: ["Attorney Christopher Miller (Business Law)", "Attorney Rachel Green (Contract Specialist)", "Attorney Daniel White (IP Law)"]
    },
    services: {
      consultation: "Free initial consultation (30 minutes), case evaluation, legal advice",
      representation: "Full legal representation, court appearances, document preparation",
      mediation: "Alternative dispute resolution, settlement negotiations, mediation services",
      document: "Contract review, legal document preparation, notary services"
    },
    hours: "Office Hours: Mon-Fri 9 AM - 6 PM, Emergency consultations available 24/7",
    location: "We're located at 456 Legal Plaza, downtown business district. Metered street parking and garage parking available.",
    fees: "Initial consultation is free. Hourly rates vary by attorney and case complexity. We offer payment plans and accept major credit cards.",
    emergency: "For legal emergencies outside business hours, call our 24/7 hotline. We have attorneys on call for urgent matters."
  };

  const generateResponse = async (userInput: string): Promise<string> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Build conversation context from previous messages
      const conversationHistory = messages
        .filter(msg => msg.id !== "1")
        .map(msg => `${msg.isUser ? 'Client' : 'Assistant'}: ${msg.text}`)
        .join('\n');

      const prompt = `You are a helpful legal assistant at Justice & Associates Law Firm helping potential clients schedule consultations and get information. 

CONVERSATION HISTORY:
${conversationHistory}

CURRENT CLIENT INPUT: "${userInput}"

IMPORTANT: You must maintain conversation context and continue from where you left off. If the client is in the middle of scheduling, don't start over - continue with the next logical step.

Justice & Associates Law Firm information:
- Practice Areas: Family Law, Criminal Defense, Personal Injury, Business Law, Real Estate, Estate Planning, Immigration
- Services: Free initial consultation, full representation, mediation, document preparation
- Hours: Mon-Fri 9 AM - 6 PM, emergency consultations 24/7
- Location: 456 Legal Plaza, downtown, parking available
- Fees: Free initial consultation, hourly rates vary, payment plans available
- Emergency: 24/7 hotline for urgent legal matters

CONSULTATION SCHEDULING FLOW:
1. Client wants consultation → Ask for practice area preference
2. Client specifies practice area → Ask for specific case type or suggest attorneys
3. Client specifies case type → Ask about urgency level
4. Client specifies urgency → Ask for contact information
5. Client provides contact → Ask for preferred consultation date
6. Client specifies date → Confirm consultation details
7. Client confirms → Provide confirmation and next steps

RESPONSE RULES:
- Keep responses under 2 sentences
- Be professional, knowledgeable, and reassuring
- Always continue the conversation flow
- Don't repeat previous questions
- Acknowledge what they just said
- Ask the next logical question in the scheduling process
- Provide relevant legal information when appropriate
- Be sensitive to legal concerns and urgency
- Use legal terminology appropriately but explain when needed

Response:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API request failed: ${response.status}`);
      }

      const data = await response.json();
      const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to help you with your legal needs. What practice area are you interested in for a consultation?";

      return geminiResponse.trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fallback to basic responses if Gemini fails
      const input = userInput.toLowerCase();

      if (input.includes("consultation") || input.includes("schedule") || input.includes("appointment")) {
        return "I'd be happy to help you schedule a consultation. What practice area are you looking for - family law, criminal defense, personal injury, or another specialty?";
      }

      if (input.includes("family") || input.includes("divorce") || input.includes("custody")) {
        return "Our family law practice handles divorce, custody, adoption, and prenuptial agreements. We have Attorney Johnson, Attorney Chen, and Attorney Rodriguez available. Which area do you need help with?";
      }

      if (input.includes("criminal") || input.includes("dui") || input.includes("charge")) {
        return "Our criminal defense practice covers DUI, drug charges, assault, and white collar crimes. We have Attorney Thompson, Attorney Lee, and Attorney Wilson. What type of case do you have?";
      }

      if (input.includes("personal injury") || input.includes("accident") || input.includes("malpractice")) {
        return "Our personal injury practice handles car accidents, medical malpractice, and slip and fall cases. We have Attorney Davis, Attorney Brown, and Attorney Garcia. Can you tell me about your case?";
      }

      if (input.includes("business") || input.includes("contract") || input.includes("incorporation")) {
        return "Our business law practice covers contracts, incorporation, employment, and intellectual property. We have Attorney Miller, Attorney Green, and Attorney White. What business legal matter do you need help with?";
      }

      if (input.includes("real estate") || input.includes("property") || input.includes("landlord")) {
        return "Our real estate practice handles property transactions, landlord-tenant disputes, and zoning issues. We have several attorneys specializing in real estate law. What's your specific situation?";
      }

      if (input.includes("estate") || input.includes("will") || input.includes("trust")) {
        return "Our estate planning practice covers wills, trusts, probate, and power of attorney documents. We help ensure your assets are protected and distributed according to your wishes. What estate planning do you need?";
      }

      if (input.includes("immigration") || input.includes("visa") || input.includes("citizenship")) {
        return "Our immigration practice handles visas, citizenship applications, deportation defense, and green card processes. We have experienced immigration attorneys. What immigration matter do you need help with?";
      }

      if (input.includes("urgent") || input.includes("emergency") || input.includes("immediate")) {
        return "For urgent legal matters, we have a 24/7 hotline and attorneys on call. What's the nature of your emergency, and when do you need assistance?";
      }

      if (input.includes("cost") || input.includes("fee") || input.includes("price") || input.includes("how much")) {
        return "Your initial consultation is completely free. After that, our hourly rates vary by attorney and case complexity. We offer payment plans and accept major credit cards. Would you like to schedule a free consultation?";
      }

      if (input.includes("location") || input.includes("where") || input.includes("address")) {
        return lawFirmKnowledge.location;
      }

      if (input.includes("hour") || input.includes("open") || input.includes("close")) {
        return lawFirmKnowledge.hours;
      }

      if (input.includes("free") || input.includes("consultation")) {
        return "Yes, we offer a completely free initial consultation for up to 30 minutes. This gives you a chance to discuss your case and see if we're the right fit. Would you like to schedule one?";
      }

      return "I'm here to help you with your legal needs. You can schedule a free consultation, get information about our practice areas, or ask about our services. What would you like to know?";
    }
  };

  const startListening = async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      setTranscript("Listening... Speak now!");
      setLastAudioTime(Date.now());

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          setLastAudioTime(Date.now());

          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }

          const newSilenceTimer = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              console.log('Silence detected for 30 seconds, stopping recording...');
              mediaRecorder.stop();
            }
          }, 5000);

          setSilenceTimer(newSilenceTimer);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            setSilenceTimer(null);
          }

          await processAudio();
        } catch (error) {
          console.error('Error in onstop handler:', error);
        } finally {
          stream.getTracks().forEach(track => track.stop());
          setIsListening(false);
          setTranscript("");
        }
      };

      mediaRecorder.start(100);

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.log('Maximum recording time reached, stopping...');
          mediaRecorder.stop();
        }
      }, 60000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setTranscript("Error accessing microphone. Please check permissions.");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);
    setTranscript("Processing your voice...");

    try {
      const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
      if (!apiKey || apiKey === 'your_deepgram_api_key_here') {
        throw new Error('Deepgram API key not configured. Please add your API key to .env file.');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      const formData = new FormData();
      const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
      formData.append('audio', audioBlob, `recording.${extension}`);

      console.log('Sending audio to Deepgram:', {
        size: audioBlob.size,
        type: audioBlob.type,
        chunks: audioChunksRef.current.length
      });

      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Deepgram API request failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Deepgram response:', data);

      const userText = data.results?.channels[0]?.alternatives[0]?.transcript || "I didn't catch that, could you repeat?";
      console.log('Transcribed text:', userText);

      addMessage(userText, true);
      setTranscript("");

      setTimeout(async () => {
        try {
          const botResponse = await generateResponse(userText);
          console.log('Generated response:', botResponse);
          addMessage(botResponse, false);
          speakText(botResponse);
        } catch (error) {
          console.error('Error generating response:', error);
          const fallbackResponse = "I'm here to help you with your legal needs. What practice area are you interested in for a consultation?";
          addMessage(fallbackResponse, false);
          speakText(fallbackResponse);
        }
      }, 500);

    } catch (error) {
      console.error('Error processing audio:', error);
      let errorMessage = "Sorry, I couldn't process your voice. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes('API key not configured')) {
          errorMessage = "Deepgram API key not configured. Please add VITE_DEEPGRAM_API_KEY to your .env file.";
        } else if (error.message.includes('Deepgram API request failed')) {
          errorMessage = "Voice recognition service temporarily unavailable. Please try again.";
        }
      }

      setTranscript(errorMessage);
      addMessage(errorMessage, false);
    } finally {
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

    if (isUser) {
      updateConsultationState(text);
    }
  };

  const startConversation = () => {
    setIsConversationActive(true);
    setConsultationState('idle');
    setCurrentConsultation({
      practiceArea: '',
      caseType: '',
      urgency: '',
      contactInfo: '',
      caseDetails: '',
      preferredDate: ''
    });
    setMessages([
      {
        id: "1",
        text: "Hello! I'm your legal consultation assistant. I can help you schedule consultations, understand legal processes, or answer questions about our services. How can I assist you today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    // Automatically start listening
    setTimeout(() => {
      startListening();
    }, 1000);
  };

  const endConversation = () => {
    // Stop all speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    // Stop any ongoing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Clear all timers
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }
    
    // Reset all states
    setIsConversationActive(false);
    setIsListening(false);
    setIsProcessing(false);
    setIsSpeaking(false);
    setTranscript("");
    setConsultationState('idle');
    setCurrentConsultation({
      practiceArea: '',
      caseType: '',
      urgency: '',
      contactInfo: '',
      caseDetails: '',
      preferredDate: ''
    });
    setMessages([
      {
        id: "1",
        text: "Hello! I'm your legal consultation assistant. I can help you schedule consultations, understand legal processes, or answer questions about our services. How can I assist you today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    
    // Reset silence countdown
    setSilenceCountdown(5);
  };

  const updateConsultationState = (userInput: string) => {
    const input = userInput.toLowerCase();

    if (input.includes("consultation") || input.includes("schedule") || input.includes("appointment")) {
      setConsultationState('practice_area');
    } else if (consultationState === 'practice_area' && (input.includes("family") || input.includes("criminal") || input.includes("personal") || input.includes("business"))) {
      setConsultationState('case_type');
      setCurrentConsultation(prev => ({ ...prev, practiceArea: userInput }));
    } else if (consultationState === 'case_type' && (input.includes("divorce") || input.includes("dui") || input.includes("accident") || input.includes("contract"))) {
      setConsultationState('urgency');
      setCurrentConsultation(prev => ({ ...prev, caseType: userInput }));
    } else if (consultationState === 'urgency' && (input.includes("urgent") || input.includes("emergency") || input.includes("immediate") || input.includes("soon"))) {
      setConsultationState('contact');
      setCurrentConsultation(prev => ({ ...prev, urgency: userInput }));
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      const voices = speechSynthesis.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

      let selectedVoice = voices.find(voice =>
        voice.lang.startsWith('en') && (
          voice.name.includes('Google') ||
          voice.name.includes('Natural') ||
          voice.name.includes('Premium') ||
          voice.name.includes('US') ||
          voice.name.includes('UK') ||
          voice.name.includes('English')
        )
      );

      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }

      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
      }

      setIsSpeaking(true);

      utterance.onend = () => {
        console.log('Speech finished');
        setIsSpeaking(false);
        // Automatically start listening after AI finishes speaking
        setTimeout(() => {
          if (!isListening && !isProcessing) {
            startListening();
          }
        }, 500); // Small delay to ensure smooth transition
      };
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        setIsSpeaking(false);
        // Also try to start listening on error
        setTimeout(() => {
          if (!isListening && !isProcessing) {
            startListening();
          }
        }, 500);
      };

      speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
    }
  };

  const quickActions = [
    {
      text: "Schedule Consultation", icon: Phone, action: async () => {
        setConsultationState('practice_area');
        setCurrentConsultation({
          practiceArea: '',
          caseType: '',
          urgency: '',
          contactInfo: '',
          caseDetails: '',
          preferredDate: ''
        });

        addMessage("I'd like to schedule a legal consultation", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("schedule consultation");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'd be happy to help you schedule a consultation. What practice area are you looking for?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Find Office", icon: MapPin, action: async () => {
        addMessage("Where is your law office located?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("office location");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you with your legal needs. What practice area are you interested in for a consultation?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Check Hours", icon: Clock, action: async () => {
        addMessage("What are your office hours?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("office hours");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you with your legal needs. What practice area are you interested in for a consultation?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Practice Areas", icon: Scale, action: async () => {
        addMessage("What practice areas do you specialize in?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("practice areas");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you with your legal needs. What practice area are you interested in for a consultation?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
  ];

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

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (isListening && silenceTimer) {
      countdownInterval = setInterval(() => {
        setSilenceCountdown(prev => {
          if (prev <= 1) {
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSilenceCountdown(5);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isListening, silenceTimer]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Scale className="h-6 w-6 text-green-600" />
          Justice & Associates Voice Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Powered by Deepgram AI + Gemini AI - Legal assistance made easy
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Status Display */}
        {/* <div className="text-center">
          {isListening && (
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
          {isProcessing && (
            <p className="text-sm text-orange-600">
              <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
              Processing your voice...
            </p>
          )}
          {isSpeaking && (
            <p className="text-sm text-green-600 animate-pulse">
              🔊 AI is speaking...
            </p>
          )}
          {transcript && (
            <p className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
              {transcript}
            </p>
          )}
        </div> */}

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
        <div className="grid grid-cols-2 gap-2">
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
        </div>

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
                      ? 'bg-green-600 text-white'
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

        {/* Info */}


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

export default LawFirmVoiceAgent;
