import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, Pizza, Clock, MapPin, Phone, Loader2 } from "lucide-react";

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
  const [orderState, setOrderState] = useState<'idle' | 'ordering' | 'pizza_type' | 'pizza_size' | 'toppings' | 'sides' | 'drinks' | 'delivery' | 'contact' | 'confirming'>('idle');
  const [currentOrder, setCurrentOrder] = useState({
    pizzaType: '',
    pizzaSize: '',
    toppings: [],
    sides: [],
    drinks: [],
    deliveryMethod: '',
    address: '',
    phone: ''
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your Pizza Hut voice assistant. I can help you place an order, check menu items, find locations, or answer any questions. What would you like to do today?",
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
  const recognitionRef = useRef<any>(null);

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

  const generateResponse = async (userInput: string): Promise<string> => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Build conversation context from previous messages
      const conversationHistory = messages
        .filter(msg => msg.id !== "1") // Exclude the initial greeting
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
        "I'm here to help with your Pizza Hut order! What would you like to know?";

      return geminiResponse.trim();
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      // Fallback to basic responses if Gemini fails
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

      return "I'm here to help with your Pizza Hut order! You can ask about our menu, place an order, find locations, check hours, or learn about our specials. What would you like to know?";
    }
  };

  const startListening = async () => {
    try {
      // Stop any existing recording first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Clear any existing silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      setTranscript("Listening... Speak now!");
      setLastAudioTime(Date.now());

      // Try to use webm, fallback to default if not supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          // Update last audio time when we receive data
          setLastAudioTime(Date.now());

          // Clear existing silence timer and start a new one
          if (silenceTimer) {
            clearTimeout(silenceTimer);
          }

          const newSilenceTimer = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              console.log('Silence detected for 30 seconds, stopping recording...');
              mediaRecorder.stop();
            }
          }, 30000); // Wait 30 seconds after last audio

          setSilenceTimer(newSilenceTimer);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Clear silence timer
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            setSilenceTimer(null);
          }

          await processAudio();
        } catch (error) {
          console.error('Error in onstop handler:', error);
        } finally {
          // Clean up stream
          stream.getTracks().forEach(track => track.stop());
          setIsListening(false);
          setTranscript("");
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms

      // Fallback: Stop recording after 60 seconds maximum
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
    // Clear silence timer if manually stopping
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      setSilenceTimer(null);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    // Don't set states here - let the onstop handler do it
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

      // Create FormData for Deepgram API (they expect multipart/form-data)
      const formData = new FormData();
      const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
      formData.append('audio', audioBlob, `recording.${extension}`);

      // Call Deepgram API with FormData
      console.log('Sending audio to Deepgram:', {
        size: audioBlob.size,
        type: audioBlob.type,
        chunks: audioChunksRef.current.length
      });

      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          // Don't set Content-Type for FormData, let browser set it with boundary
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

      // Add user message
      addMessage(userText, true);
      setTranscript("");

      // Generate and speak response
      setTimeout(async () => {
        try {
          const botResponse = await generateResponse(userText);
          console.log('Generated response:', botResponse);
          addMessage(botResponse, false);
          speakText(botResponse);
        } catch (error) {
          console.error('Error generating response:', error);
          const fallbackResponse = "I'm here to help with your Pizza Hut order! What would you like to know?";
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

    // Update order state based on conversation
    if (isUser) {
      updateOrderState(text);
    }
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
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Get available voices and prioritize English voices
      const voices = speechSynthesis.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

      // Priority order for English voices
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

      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }

      // Fallback to any available voice
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
      }

      // Track speaking state
      setIsSpeaking(true);

      // Ensure the text is spoken
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
      text: "Order Pizza", icon: Pizza, action: async () => {
        // Reset order state for new order
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
          try {
            const response = await generateResponse("order");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help with your Pizza Hut order! What would you like to know?";
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
          try {
            const response = await generateResponse("location");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help with your Pizza Hut order! What would you like to know?";
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
          try {
            const response = await generateResponse("hours");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help with your Pizza Hut order! What would you like to know?";
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
          try {
            const response = await generateResponse("specials");
            addMessage(response, false);
            speakText(response);
          } catch (error) {
            console.error('Error generating response:', error);
            const fallbackResponse = "I'm here to help with your Pizza Hut order! What would you like to know?";
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
      // Some browsers need a delay to load voices
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('Loaded voices:', voices.length);
        if (voices.length === 0) {
          // Try again after a short delay
          setTimeout(loadVoices, 100);
        }
      };

      loadVoices();

      // Also listen for voices changed event
      speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Silence countdown effect
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (isListening && silenceTimer) {
      countdownInterval = setInterval(() => {
        setSilenceCountdown(prev => {
          if (prev <= 1) {
            return 30; // Reset to 30 when timer expires
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSilenceCountdown(30); // Reset when not listening
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

export default VoiceAgent;
