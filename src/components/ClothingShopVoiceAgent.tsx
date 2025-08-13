import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, ShoppingBag, Clock, MapPin, Tag, Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ClothingShopVoiceAgent = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [orderState, setOrderState] = useState<'idle' | 'browsing' | 'category' | 'style' | 'size' | 'color' | 'fitting' | 'checkout' | 'delivery'>('idle');
  const [currentOrder, setCurrentOrder] = useState({
    category: '',
    style: '',
    size: '',
    color: '',
    fitting: false,
    deliveryMethod: '',
    address: ''
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! Welcome to StyleHub Fashion. I can help you find the perfect outfit, check our latest collections, or assist with your shopping needs. What would you like to explore today?",
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

  // Clothing shop knowledge base
  const clothingKnowledge = {
    categories: {
      tops: ["T-Shirts ($25-45)", "Blouses ($35-65)", "Sweaters ($45-85)", "Jackets ($60-120)"],
      bottoms: ["Jeans ($50-90)", "Pants ($40-80)", "Skirts ($35-70)", "Shorts ($30-55)"],
      dresses: ["Casual Dresses ($45-75)", "Evening Dresses ($80-150)", "Work Dresses ($60-100)"],
      outerwear: ["Coats ($80-200)", "Blazers ($70-150)", "Cardigans ($50-100)"],
      accessories: ["Bags ($40-120)", "Jewelry ($20-80)", "Scarves ($25-45)", "Belts ($30-60)"]
    },
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "Plus Size"],
    colors: ["Black", "White", "Navy", "Red", "Pink", "Blue", "Green", "Yellow", "Purple", "Brown", "Gray"],
    styles: ["Casual", "Business", "Sporty", "Elegant", "Vintage", "Modern", "Bohemian", "Minimalist"],
    locations: "We have stores in downtown mall, uptown plaza, and the fashion district. What area are you looking for?",
    hours: "We're open Monday-Saturday 10 AM to 9 PM, Sunday 11 AM to 7 PM.",
    delivery: "Free shipping on orders over $75, standard delivery 3-5 business days, express 1-2 days.",
    specials: "New customers get 20% off first purchase! Also, buy 2 get 1 free on all accessories this week."
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
        .map(msg => `${msg.isUser ? 'Customer' : 'Assistant'}: ${msg.text}`)
        .join('\n');

      const prompt = `You are a helpful clothing store assistant at StyleHub Fashion helping customers find the perfect outfit. 

CONVERSATION HISTORY:
${conversationHistory}

CURRENT CUSTOMER INPUT: "${userInput}"

IMPORTANT: You must maintain conversation context and continue from where you left off. If the customer is in the middle of shopping, don't start over - continue with the next logical step.

StyleHub Fashion information:
- Categories: Tops ($25-85), Bottoms ($30-90), Dresses ($45-150), Outerwear ($50-200), Accessories ($20-120)
- Sizes: XS, S, M, L, XL, XXL, Plus Size
- Colors: Black, White, Navy, Red, Pink, Blue, Green, Yellow, Purple, Brown, Gray
- Styles: Casual, Business, Sporty, Elegant, Vintage, Modern, Bohemian, Minimalist
- Hours: Mon-Sat 10 AM - 9 PM, Sun 11 AM - 7 PM
- Special: 20% off first purchase, buy 2 get 1 free on accessories
- Delivery: Free shipping over $75, standard 3-5 days, express 1-2 days

SHOPPING FLOW:
1. Customer wants to shop → Ask for category preference
2. Customer specifies category → Ask for style preference
3. Customer specifies style → Ask for size
4. Customer specifies size → Ask for color preference
5. Customer specifies color → Offer fitting room or continue shopping
6. Customer ready to buy → Ask for delivery/pickup preference
7. Customer specifies delivery → Ask for address details
8. Customer provides details → Confirm order and total

RESPONSE RULES:
- Keep responses under 2 sentences
- Be friendly and fashion-forward
- Always continue the conversation flow
- Don't repeat previous questions
- Acknowledge what they just said
- Ask the next logical question in the shopping process
- Suggest complementary items when appropriate

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
        "I'm here to help you find the perfect outfit! What category are you interested in today?";

      return geminiResponse.trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fallback to basic responses if Gemini fails
      const input = userInput.toLowerCase();

      if (input.includes("shop") || input.includes("buy") || input.includes("clothes")) {
        return "Great! I'd love to help you find the perfect outfit. What category are you looking for - tops, bottoms, dresses, outerwear, or accessories?";
      }

      if (input.includes("top") || input.includes("shirt") || input.includes("blouse")) {
        return "Excellent choice! We have t-shirts from $25, blouses from $35, and sweaters from $45. What style are you looking for - casual, business, or elegant?";
      }

      if (input.includes("bottom") || input.includes("pant") || input.includes("jean")) {
        return "Perfect! Our bottoms range from $30-90. We have jeans, pants, skirts, and shorts. What's your preferred style?";
      }

      if (input.includes("dress")) {
        return "Beautiful! Our dresses range from $45-150. We have casual, work, and evening options. What occasion are you shopping for?";
      }

      if (input.includes("size") || input.includes("small") || input.includes("large")) {
        return `We offer sizes XS through XXL, plus plus sizes. What size are you looking for?`;
      }

      if (input.includes("color") || input.includes("black") || input.includes("blue")) {
        return `We have a great selection of colors including black, white, navy, red, pink, blue, green, and more. What's your favorite?`;
      }

      if (input.includes("price") || input.includes("cost") || input.includes("how much")) {
        return "Our prices range from $20 for accessories to $200 for premium outerwear. Would you like to hear about our current specials?";
      }

      if (input.includes("special") || input.includes("sale") || input.includes("discount")) {
        return "Yes! New customers get 20% off their first purchase, and this week it's buy 2 get 1 free on all accessories!";
      }

      if (input.includes("location") || input.includes("where") || input.includes("store")) {
        return clothingKnowledge.locations;
      }

      if (input.includes("hour") || input.includes("open") || input.includes("close")) {
        return clothingKnowledge.hours;
      }

      if (input.includes("delivery") || input.includes("ship")) {
        return clothingKnowledge.delivery;
      }

      return "I'm here to help you find the perfect outfit! You can ask about our categories, styles, sizes, colors, or current specials. What interests you today?";
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
          const fallbackResponse = "I'm here to help you find the perfect outfit! What category are you interested in today?";
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
      updateOrderState(text);
    }
  };

  const updateOrderState = (userInput: string) => {
    const input = userInput.toLowerCase();

    if (input.includes("shop") || input.includes("buy") || input.includes("clothes")) {
      setOrderState('category');
    } else if (orderState === 'category' && (input.includes("top") || input.includes("bottom") || input.includes("dress") || input.includes("outerwear") || input.includes("accessory"))) {
      setOrderState('style');
      setCurrentOrder(prev => ({ ...prev, category: userInput }));
    } else if (orderState === 'style' && (input.includes("casual") || input.includes("business") || input.includes("sporty") || input.includes("elegant"))) {
      setOrderState('size');
      setCurrentOrder(prev => ({ ...prev, style: userInput }));
    } else if (orderState === 'size' && (input.includes("xs") || input.includes("s") || input.includes("m") || input.includes("l") || input.includes("xl"))) {
      setOrderState('color');
      setCurrentOrder(prev => ({ ...prev, size: userInput }));
    } else if (orderState === 'color' && (input.includes("black") || input.includes("blue") || input.includes("red") || input.includes("white"))) {
      setOrderState('fitting');
      setCurrentOrder(prev => ({ ...prev, color: userInput }));
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
      text: "Shop Clothes", icon: ShoppingBag, action: async () => {
        setOrderState('category');
        setCurrentOrder({
          category: '',
          style: '',
          size: '',
          color: '',
          fitting: false,
          deliveryMethod: '',
          address: ''
        });

        addMessage("I'd like to shop for clothes", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("shop clothes");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you find the perfect outfit! What category are you interested in today?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Find Store", icon: MapPin, action: async () => {
        addMessage("Where are your stores located?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("store location");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you find the perfect outfit! What category are you interested in today?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Check Hours", icon: Clock, action: async () => {
        addMessage("What are your store hours?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("store hours");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you find the perfect outfit! What category are you interested in today?";
            addMessage(fallbackResponse, false);
            speakText(fallbackResponse);
          }
        }, 500);
      }
    },
    {
      text: "Current Deals", icon: Tag, action: async () => {
        addMessage("What specials do you have?", true);
        setTimeout(async () => {
          try {
            const response = await generateResponse("specials deals");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help you find the perfect outfit! What category are you interested in today?";
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
          <ShoppingBag className="h-6 w-6 text-purple-600" />
          StyleHub Fashion Voice Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Powered by Deepgram AI + Gemini AI - Fashion shopping made easy
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
                      ? 'bg-purple-600 text-white'
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

export default ClothingShopVoiceAgent;
