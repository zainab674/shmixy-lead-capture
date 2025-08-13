import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Stethoscope, Clock, MapPin, Calendar, Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const HospitalVoiceAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [appointmentState, setAppointmentState] = useState<'idle' | 'scheduling' | 'department' | 'doctor' | 'date' | 'time' | 'contact' | 'confirming'>('idle');
  const [currentAppointment, setCurrentAppointment] = useState({
    department: '',
    doctor: '',
    date: '',
    time: '',
    contactInfo: '',
    symptoms: ''
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! Welcome to Mercy General Hospital. I'm here to help you schedule appointments, find information about our services, or answer any questions. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [transcript, setTranscript] = useState("");
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastAudioTime, setLastAudioTime] = useState<number>(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number>(30);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Hospital knowledge base
  const hospitalKnowledge = {
    departments: {
      emergency: "Emergency Department - Open 24/7, no appointment needed",
      cardiology: "Cardiology - Heart specialists, appointments available Mon-Fri 8 AM - 5 PM",
      pediatrics: "Pediatrics - Children's care, appointments Mon-Fri 9 AM - 6 PM",
      orthopedics: "Orthopedics - Bone and joint care, appointments Mon-Fri 8 AM - 5 PM",
      neurology: "Neurology - Brain and nervous system care, appointments Mon-Fri 9 AM - 4 PM",
      oncology: "Oncology - Cancer treatment, appointments Mon-Fri 8 AM - 6 PM",
      radiology: "Radiology - Imaging services, appointments Mon-Fri 7 AM - 7 PM"
    },
    doctors: {
      emergency: ["Dr. Smith (Emergency)", "Dr. Johnson (Trauma)", "Dr. Williams (Critical Care)"],
      cardiology: ["Dr. Brown (Cardiologist)", "Dr. Davis (Heart Surgeon)", "Dr. Miller (Cardiac Specialist)"],
      pediatrics: ["Dr. Wilson (Pediatrician)", "Dr. Moore (Child Specialist)", "Dr. Taylor (Pediatric Care)"],
      orthopedics: ["Dr. Anderson (Orthopedic Surgeon)", "Dr. Thomas (Joint Specialist)", "Dr. Jackson (Bone Care)"]
    },
    services: {
      emergency: "Emergency care, trauma treatment, urgent care",
      outpatient: "Scheduled appointments, consultations, follow-ups",
      surgery: "Elective and emergency surgeries, pre-op consultations",
      imaging: "X-rays, MRI, CT scans, ultrasounds",
      lab: "Blood tests, pathology, diagnostic services"
    },
    hours: "Emergency Department: 24/7, Outpatient Services: Mon-Fri 8 AM - 6 PM, Weekend: 9 AM - 3 PM",
    location: "We're located at 123 Medical Center Drive, downtown. Free parking available in the main lot.",
    insurance: "We accept most major insurance plans including Medicare and Medicaid. Please have your insurance card ready.",
    covid: "COVID-19 testing available daily 8 AM - 4 PM. Masks required in all areas. Vaccination appointments available."
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
        .map(msg => `${msg.isUser ? 'Patient' : 'Assistant'}: ${msg.text}`)
        .join('\n');

      const prompt = `You are a helpful hospital assistant at Mercy General Hospital helping patients schedule appointments and get information. 

CONVERSATION HISTORY:
${conversationHistory}

CURRENT PATIENT INPUT: "${userInput}"

IMPORTANT: You must maintain conversation context and continue from where you left off. If the patient is in the middle of scheduling, don't start over - continue with the next logical step.

Mercy General Hospital information:
- Departments: Emergency (24/7), Cardiology, Pediatrics, Orthopedics, Neurology, Oncology, Radiology
- Services: Emergency care, outpatient appointments, surgery, imaging, lab services
- Hours: Emergency 24/7, Outpatient Mon-Fri 8 AM - 6 PM, Weekend 9 AM - 3 PM
- Location: 123 Medical Center Drive, downtown, free parking
- Insurance: Accepts most major plans, Medicare, Medicaid
- COVID: Testing daily 8 AM - 4 PM, masks required, vaccinations available

APPOINTMENT SCHEDULING FLOW:
1. Patient wants appointment → Ask for department preference
2. Patient specifies department → Ask for doctor preference or suggest available doctors
3. Patient specifies doctor → Ask for preferred date
4. Patient specifies date → Ask for preferred time
5. Patient specifies time → Ask for contact information
6. Patient provides contact → Confirm appointment details
7. Patient confirms → Provide confirmation number and instructions

RESPONSE RULES:
- Keep responses under 2 sentences
- Be professional, caring, and reassuring
- Always continue the conversation flow
- Don't repeat previous questions
- Acknowledge what they just said
- Ask the next logical question in the scheduling process
- Provide relevant medical information when appropriate
- Be sensitive to medical concerns and emergencies

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
        "I'm here to help you with your healthcare needs. What department would you like to schedule an appointment with?";

      return geminiResponse.trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fallback to basic responses if Gemini fails
      const input = userInput.toLowerCase();

      if (input.includes("appointment") || input.includes("schedule") || input.includes("book")) {
        return "I'd be happy to help you schedule an appointment. What department are you looking for - emergency, cardiology, pediatrics, orthopedics, or another specialty?";
      }

      if (input.includes("emergency") || input.includes("urgent") || input.includes("trauma")) {
        return "For emergencies, please go directly to our Emergency Department - it's open 24/7 and no appointment is needed. Are you experiencing a medical emergency right now?";
      }

      if (input.includes("cardiology") || input.includes("heart") || input.includes("cardiac")) {
        return "Our cardiology department offers comprehensive heart care. We have Dr. Brown, Dr. Davis, and Dr. Miller available. Which doctor would you prefer, or would you like me to suggest one?";
      }

      if (input.includes("pediatric") || input.includes("child") || input.includes("kid")) {
        return "Our pediatrics department provides excellent care for children. We have Dr. Wilson, Dr. Moore, and Dr. Taylor. Which doctor would you like to see?";
      }

      if (input.includes("orthopedic") || input.includes("bone") || input.includes("joint")) {
        return "Our orthopedics department specializes in bone and joint care. We have Dr. Anderson, Dr. Thomas, and Dr. Jackson available. Which specialist would you prefer?";
      }

      if (input.includes("date") || input.includes("when") || input.includes("day")) {
        return "What date would you prefer for your appointment? We have availability Monday through Friday, and some weekend slots available.";
      }

      if (input.includes("time") || input.includes("hour") || input.includes("morning") || input.includes("afternoon")) {
        return "What time of day works best for you? We have morning appointments starting at 8 AM and afternoon slots until 6 PM.";
      }

      if (input.includes("location") || input.includes("where") || input.includes("address")) {
        return hospitalKnowledge.location;
      }

      if (input.includes("hour") || input.includes("open") || input.includes("close")) {
        return hospitalKnowledge.hours;
      }

      if (input.includes("insurance") || input.includes("payment") || input.includes("cost")) {
        return hospitalKnowledge.insurance;
      }

      if (input.includes("covid") || input.includes("coronavirus") || input.includes("vaccine")) {
        return hospitalKnowledge.covid;
      }

      if (input.includes("symptom") || input.includes("pain") || input.includes("hurt")) {
        return "I understand you're experiencing symptoms. For non-emergency concerns, I can help schedule an appointment. For severe symptoms, please go to our Emergency Department immediately.";
      }

      return "I'm here to help you with your healthcare needs. You can schedule appointments, get information about our departments, or ask about our services. What would you like to know?";
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
          }, 30000);

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
          const fallbackResponse = "I'm here to help you with your healthcare needs. What department would you like to schedule an appointment with?";
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
      updateAppointmentState(text);
    }
  };

  const updateAppointmentState = (userInput: string) => {
    const input = userInput.toLowerCase();

    if (input.includes("appointment") || input.includes("schedule") || input.includes("book")) {
      setAppointmentState('department');
    } else if (appointmentState === 'department' && (input.includes("emergency") || input.includes("cardiology") || input.includes("pediatric") || input.includes("orthopedic"))) {
      setAppointmentState('doctor');
      setCurrentAppointment(prev => ({ ...prev, department: userInput }));
    } else if (appointmentState === 'doctor' && (input.includes("dr") || input.includes("doctor") || input.includes("brown") || input.includes("wilson"))) {
      setAppointmentState('date');
      setCurrentAppointment(prev => ({ ...prev, doctor: userInput }));
    } else if (appointmentState === 'date' && (input.includes("monday") || input.includes("tuesday") || input.includes("wednesday") || input.includes("thursday") || input.includes("friday"))) {
      setAppointmentState('time');
      setCurrentAppointment(prev => ({ ...prev, date: userInput }));
    } else if (appointmentState === 'time' && (input.includes("morning") || input.includes("afternoon") || input.includes("am") || input.includes("pm"))) {
      setAppointmentState('contact');
      setCurrentAppointment(prev => ({ ...prev, time: userInput }));
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
      };
      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
    }
  };

  const quickActions = [
    {
      text: "Schedule Appointment", icon: Calendar, action: async () => {
        setAppointmentState('department');
        setCurrentAppointment({
          department: '',
          doctor: '',
          date: '',
          time: '',
          contactInfo: '',
          symptoms: ''
        });

        addMessage("I'd like to schedule an appointment", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("schedule appointment");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'd be happy to help you schedule an appointment. What department are you looking for?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Find Location", icon: MapPin, action: async () => {
        addMessage("Where is the hospital located?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("hospital location");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you with your healthcare needs. What department would you like to schedule an appointment with?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Check Hours", icon: Clock, action: async () => {
        addMessage("What are your hospital hours?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("hospital hours");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you with your healthcare needs. What department would you like to schedule an appointment with?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Emergency Info", icon: Stethoscope, action: async () => {
        addMessage("What should I know about emergencies?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("emergency information");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you with your healthcare needs. What department would you like to schedule an appointment with?";
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
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSilenceCountdown(30);
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
          <Stethoscope className="h-6 w-6 text-blue-600" />
          Mercy General Hospital Voice Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Powered by Deepgram AI + Gemini AI - Healthcare assistance made easy
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Voice Status Display */}
        <div className="text-center">
          {isListening && (
            <div className="space-y-2">
              <p className="text-sm text-blue-600 animate-pulse">
                🎤 Listening... Speak now!
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(silenceCountdown / 30) * 100}%` }}
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
              disabled={isListening || isProcessing}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.text}
            </Button>
          ))}
        </div>

        {/* Conversation */}
        <div className="border rounded-lg p-4 bg-muted/30 max-h-64 overflow-y-auto">
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
        </div>

        {/* Voice Control - Bottom */}
        <div className="flex justify-center">
          <Button
            onClick={isListening ? stopListening : startListening}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="rounded-full w-16 h-16"
            disabled={isProcessing || isSpeaking}
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

export default HospitalVoiceAgent;
