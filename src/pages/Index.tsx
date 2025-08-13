
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import VoiceAgent from "@/components/VoiceAgent";
// import ClothingShopVoiceAgent from "@/components/ClothingShopVoiceAgent";
// import HospitalVoiceAgent from "@/components/HospitalVoiceAgent";
// import LawFirmVoiceAgent from "@/components/LawFirmVoiceAgent";
// import { useState, useMemo } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
// import { Label } from "@/components/ui/label";
// import { useToast } from "@/components/ui/use-toast";
// import { Bot, Mic, Code2, CheckCircle2 } from "lucide-react";

// const blockedDomains = new Set([
//   "gmail.com",
//   "googlemail.com",
//   "outlook.com",
//   "hotmail.com",
//   "live.com",
//   "yahoo.com",
//   "yahoo.co.uk",
//   "icloud.com",
//   "me.com",
//   "msn.com",
//   "aol.com",
//   "proton.me",
//   "protonmail.com",
//   "gmx.com",
//   "gmx.net",
//   "ymail.com",
//   "zoho.com",
//   "mail.com",
//   "yandex.com",
//   "yandex.ru",
//   "fastmail.com",
// ]);

// function isBusinessEmail(email: string) {
//   const trimmed = email.trim().toLowerCase();
//   const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
//   if (!basic.test(trimmed)) return false;
//   const domain = trimmed.split("@")[1];
//   if (!domain) return false;
//   // Strip subdomains like sub.gmail.com
//   const parts = domain.split(".");
//   const base = parts.slice(-2).join(".");
//   return !blockedDomains.has(base);
// }
// export default function Index() {
//   const { toast } = useToast();
//   const [name, setName] = useState("");
//   const [company, setCompany] = useState("");
//   const [email, setEmail] = useState("");
//   const [message, setMessage] = useState("");
//   const [loading, setLoading] = useState(false);

//   const businessValid = useMemo(() => isBusinessEmail(email), [email]);
//   const [selectedBot, setSelectedBot] = useState<string | null>(null);

//   async function handleSubmit(e: React.FormEvent) {
//   }

//   const voiceAgents = [
//     {
//       id: "pizza-hut",
//       name: "🍕 Pizza Hut Voice Assistant",
//       description: "Order pizzas, ask about menu items, and get delivery information",
//       color: "orange",
//       component: VoiceAgent
//     },
//     {
//       id: "clothing-shop",
//       name: "👗 StyleHub Fashion Voice Assistant",
//       description: "Browse clothing, check sizes, find store locations, and get fashion advice",
//       color: "purple",
//       component: ClothingShopVoiceAgent
//     },
//     {
//       id: "hospital",
//       name: "🏥 Mercy General Hospital Voice Assistant",
//       description: "Schedule appointments, find departments, check hours, and get medical information",
//       color: "blue",
//       component: HospitalVoiceAgent
//     },
//     {
//       id: "law-firm",
//       name: "⚖️ Justice & Associates Voice Assistant",
//       description: "Schedule consultations, learn about practice areas, and get legal information",
//       color: "green",
//       component: LawFirmVoiceAgent
//     }
//   ];

//   const handleBotSelect = (botId: string) => {
//     setSelectedBot(botId);
//   };

//   const handleBackToSelection = () => {
//     setSelectedBot(null);
//   };

//   const getColorClasses = (color: string) => {
//     const colorMap: { [key: string]: string } = {
//       orange: "bg-orange-50 border-orange-200 text-orange-800",
//       purple: "bg-purple-50 border-purple-200 text-purple-800",
//       blue: "bg-blue-50 border-blue-200 text-blue-800",
//       green: "bg-green-50 border-green-200 text-green-800"
//     };
//     return colorMap[color] || "bg-gray-50 border-gray-200 text-gray-800";
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">

//       <header className="border-b border-border">
//         <div className="container mx-auto flex items-center justify-between py-4">
//           <a href="#" className="font-bold text-xl tracking-tight">Shmixi</a>
//           <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
//             <a href="#features" className="hover:text-foreground transition-colors">Solutions</a>
//             <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
//           </nav>
//         </div>
//       </header>
//       {/* Hero Section */}
//       <section className="relative overflow-hidden">
//         <div className="absolute inset-0 bg-hero-gradient opacity-20 pointer-events-none" aria-hidden />
//         <div className="container mx-auto grid md:grid-cols-2 gap-10 items-center py-20">
//           <div>
//             <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
//               Meet Your New Team Member: AI. Always On. Always Selling. Always Supporting.
//             </h1>
//             <p className="mt-4 text-lg text-muted-foreground max-w-prose">
//               Boost sales, wow customers, and never miss a beat — with AI tailored to your essential needs.
//             </p>
//             <ul className="mt-6 space-y-2 text-muted-foreground">
//               <li className="flex items-center gap-2"><CheckCircle2 className="text-primary opacity-90" /><span>Smarter Sales</span></li>
//               <li className="flex items-center gap-2"><CheckCircle2 className="text-primary opacity-90" /><span>Better Customer Support</span></li>
//               <li className="flex items-center gap-2"><CheckCircle2 className="text-primary opacity-90" /><span>Real Results — Fast</span></li>
//             </ul>
//             <div className="mt-8 flex flex-wrap gap-4">
//               <Button asChild variant="hero" size="lg">
//                 <a href="#contact" aria-label="Schedule a meeting with Shmixi">Schedule a meeting</a>
//               </Button>
//               <Button asChild variant="outline" size="lg">
//                 <a href="#features">Explore solutions</a>
//               </Button>
//             </div>
//             <p className="mt-3 text-sm text-muted-foreground">
//               See what success can look like in just 60 days.
//             </p>
//           </div>
//           <div className="relative">
//             <img
//               src="/shimixi.png"
//               loading="lazy"
//               alt="Shmixi hero illustration – AI and code lines with gradient glow"
//               className="rounded-lg shadow-elevated border border-border"
//             />
//           </div>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section id="features" className="container mx-auto py-16">
//         <div className="text-center mb-12">
//           <h2 className="text-3xl font-bold mb-4">AI Voice Agent Solutions</h2>
//           <p className="text-muted-foreground text-lg">
//             Experience the future of customer interaction with our intelligent voice agents
//           </p>
//         </div>

//         {selectedBot ? (
//           // Show selected bot
//           <div className="max-w-4xl mx-auto">
//             <div className="flex items-center justify-between mb-6">
//               <Button
//                 variant="outline"
//                 onClick={handleBackToSelection}
//                 className="mb-4"
//               >
//                 ← Back to Bot Selection
//               </Button>
//             </div>
//             <div className="border rounded-lg p-6 bg-white shadow-lg">
//               {(() => {
//                 const bot = voiceAgents.find(b => b.id === selectedBot);
//                 if (bot) {
//                   const BotComponent = bot.component;
//                   return (
//                     <div>
//                       <h3 className={`text-2xl font-semibold mb-4 text-center ${getColorClasses(bot.color)} p-3 rounded-lg`}>
//                         {bot.name}
//                       </h3>
//                       <BotComponent />
//                     </div>
//                   );
//                 }
//                 return null;
//               })()}
//             </div>
//           </div>
//         ) : (
//           // Show bot selection
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
//             {voiceAgents.map((bot) => (
//               <Card
//                 key={bot.id}
//                 className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:scale-105 ${getColorClasses(bot.color)}`}
//                 onClick={() => handleBotSelect(bot.id)}
//               >
//                 <CardHeader>
//                   <CardTitle className="text-xl text-center">{bot.name}</CardTitle>
//                   <CardDescription className="text-center text-gray-700">
//                     {bot.description}
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="text-center">
//                   <Button
//                     className={`w-full text-white ${bot.color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
//                       bot.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
//                         bot.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
//                           bot.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
//                             'bg-gray-600 hover:bg-gray-700'
//                       }`}
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       handleBotSelect(bot.id);
//                     }}
//                   >
//                     Try This Bot
//                   </Button>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         )}


//       </section>

//       <section id="contact" className="border-t border-border bg-muted/30">
//         <div className="container mx-auto py-16">
//           <div className="max-w-2xl mx-auto">
//             <h2 className="text-3xl font-bold">Get a Free Consultation</h2>
//             <p className="mt-2 text-muted-foreground">
//               Tell us about your goals. Business emails only; free providers like Gmail/Outlook are blocked.
//             </p>
//             <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
//               <div className="grid gap-2">
//                 <Label htmlFor="name">Full name</Label>
//                 <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="company">Company</Label>
//                 <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Acme Inc." />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="email">Business email</Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                   placeholder="you@company.com"
//                 />
//                 {email && !businessValid && (
//                   <p className="text-sm text-destructive">Please use your business email address.</p>
//                 )}
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="message">What can we automate or build for you?</Label>
//                 <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Describe your processes, tools, and desired outcome..." />
//               </div>
//               <div className="flex items-center justify-between gap-4">
//                 <Button type="submit" size="lg" variant="hero" disabled={loading || !businessValid}>
//                   {loading ? "Sending..." : "Request consultation"}
//                 </Button>

//               </div>
//             </form>
//           </div>
//         </div>
//       </section>
//       <footer className="border-t border-border">
//         <div className="container mx-auto py-6 text-sm text-muted-foreground flex flex-col md:flex-row gap-2 items-center justify-between">
//           <span>© {new Date().getFullYear()} Shmixy</span>
//           <a href="#contact" className="hover:text-foreground">Get a free consultation</a>
//         </div>
//       </footer>
//     </div>
//   );
// }



import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VoiceAgent from "@/components/VoiceAgent";
import ClothingShopVoiceAgent from "@/components/ClothingShopVoiceAgent";
import HospitalVoiceAgent from "@/components/HospitalVoiceAgent";
import LawFirmVoiceAgent from "@/components/LawFirmVoiceAgent";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Bot, Mic, Code2, CheckCircle2, ArrowLeft, Sparkles, Target, Clock, Shield } from "lucide-react";

const blockedDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "msn.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "ymail.com",
  "zoho.com",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
]);

function isBusinessEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const basic = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!basic.test(trimmed)) return false;
  const domain = trimmed.split("@")[1];
  if (!domain) return false;
  // Strip subdomains like sub.gmail.com
  const parts = domain.split(".");
  const base = parts.slice(-2).join(".");
  return !blockedDomains.has(base);
}

export default function Index() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const businessValid = useMemo(() => isBusinessEmail(email), [email]);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
  }

  const voiceAgents = [
    {
      id: "pizza-hut",
      name: "🍕 Pizza Hut Voice Assistant",
      description: "Order pizzas, ask about menu items, and get delivery information",
      color: "orange",
      component: VoiceAgent
    },
    {
      id: "clothing-shop",
      name: "👗 StyleHub Fashion Voice Assistant",
      description: "Browse clothing, check sizes, find store locations, and get fashion advice",
      color: "purple",
      component: ClothingShopVoiceAgent
    },
    {
      id: "hospital",
      name: "🏥 Mercy General Hospital Voice Assistant",
      description: "Schedule appointments, find departments, check hours, and get medical information",
      color: "blue",
      component: HospitalVoiceAgent
    },
    {
      id: "law-firm",
      name: "⚖️ Justice & Associates Voice Assistant",
      description: "Schedule consultations, learn about practice areas, and get legal information",
      color: "green",
      component: LawFirmVoiceAgent
    }
  ];

  const handleBotSelect = (botId: string) => {
    setSelectedBot(botId);
  };

  const handleBackToSelection = () => {
    setSelectedBot(null);
  };

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-900",
      purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-900",
      blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
      green: "from-green-50 to-green-100 border-green-200 text-green-900"
    };
    return colorMap[color] || "from-gray-50 to-gray-100 border-gray-200 text-gray-900";
  };

  const getButtonClasses = (color: string) => {
    const buttonMap: { [key: string]: string } = {
      orange: "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-lg shadow-orange-500/25",
      purple: "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/25",
      blue: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25",
      green: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/25"
    };
    return buttonMap[color] || "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Enhanced Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <a href="#" className="font-bold text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Shmixi
            </a>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors duration-200">Solutions</a>
            <a href="#contact" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200">Contact</a>
          </nav>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 pointer-events-none" />
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center py-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium border border-blue-200">
              <Sparkles className="w-4 h-4" />
              AI-Powered Customer Engagement
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Meet Your New Team Member:
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
              Always On. Always Selling. Always Supporting. Boost sales, wow customers, and never miss a beat with AI tailored to your business needs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <span className="font-medium text-slate-700">Smarter Sales</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-slate-700">Better Support</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-slate-700">Real Results</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200">
                <a href="#contact">Schedule a Meeting</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 font-medium px-8 py-3 rounded-xl transition-all duration-200">
                <a href="#features">Explore Solutions</a>
              </Button>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              See measurable results in just 60 days
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-3xl" />
            <img
              src="/shimixi.png"
              loading="lazy"
              alt="Shmixi AI Voice Agent Platform"
              className="relative rounded-2xl shadow-2xl border border-white/20 bg-white"
            />
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="container mx-auto px-6 py-24">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium border border-purple-200">
            <Mic className="w-4 h-4" />
            Voice AI Technology
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900">AI Voice Agent Solutions</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Experience the future of customer interaction with our intelligent voice agents designed for your industry
          </p>
        </div>

        {selectedBot ? (
          // Enhanced Bot Display
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <Button
                variant="outline"
                onClick={handleBackToSelection}
                className="flex items-center gap-2 border-2 hover:bg-slate-50 font-medium px-6 py-3 rounded-xl transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Solutions
              </Button>
            </div>
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {(() => {
                const bot = voiceAgents.find(b => b.id === selectedBot);
                if (bot) {
                  const BotComponent = bot.component;
                  return (
                    <div>
                      <div className={`bg-gradient-to-r ${getColorClasses(bot.color)} p-8 text-center border-b`}>
                        <h3 className="text-3xl font-bold mb-2">{bot.name}</h3>
                        <p className="text-lg opacity-80">{bot.description}</p>
                      </div>
                      <div className="p-8">
                        <BotComponent />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        ) : (
          // Enhanced Bot Selection Grid
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {voiceAgents.map((bot) => (
              <Card
                key={bot.id}
                className={`group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:-translate-y-1 bg-gradient-to-br ${getColorClasses(bot.color)} overflow-hidden`}
                onClick={() => handleBotSelect(bot.id)}
              >
                <CardHeader className="p-8 pb-4">
                  <div className="w-16 h-16 bg-white/80 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                    <Mic className="w-8 h-8 text-slate-700" />
                  </div>
                  <CardTitle className="text-2xl text-center font-bold">{bot.name}</CardTitle>
                  <CardDescription className="text-center text-lg leading-relaxed opacity-80 mt-2">
                    {bot.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <Button
                    className={`w-full text-white font-medium py-3 rounded-xl transition-all duration-200 ${getButtonClasses(bot.color)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBotSelect(bot.id);
                    }}
                  >
                    Try This Assistant
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Enhanced Contact Section */}
      <section id="contact" className="bg-gradient-to-br from-slate-50 to-blue-50 border-t border-slate-200">
        <div className="container mx-auto px-6 py-24">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium border border-blue-200">
                <Code2 className="w-4 h-4" />
                Free Consultation
              </div>
              <h2 className="text-4xl font-bold text-slate-900">Ready to Transform Your Business?</h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Tell us about your goals and we'll show you how AI can revolutionize your customer experience
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                      className="border-2 border-slate-200 focus:border-blue-500 rounded-lg px-4 py-3 transition-colors duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium text-slate-700">Company</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                      placeholder="Acme Inc."
                      className="border-2 border-slate-200 focus:border-blue-500 rounded-lg px-4 py-3 transition-colors duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className={`border-2 rounded-lg px-4 py-3 transition-colors duration-200 ${email && !businessValid ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                      }`}
                  />
                  {email && !businessValid && (
                    <p className="text-sm text-red-600 flex items-center gap-2 mt-2">
                      <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center text-xs">!</span>
                      Please use your business email address (personal emails are not accepted)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-slate-700">What can we automate or build for you?</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Describe your current processes, tools, and desired outcomes..."
                    className="border-2 border-slate-200 focus:border-blue-500 rounded-lg px-4 py-3 transition-colors duration-200 resize-none"
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || !businessValid}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium py-4 rounded-xl shadow-lg transition-all duration-200"
                    onClick={handleSubmit}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending Request...
                      </div>
                    ) : (
                      "Request Free Consultation"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Shmixi</span>
            </div>
            <div className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Shmixi. Transforming business with AI.
            </div>
            <Button asChild variant="outline" className="border-slate-600 text-slate-900 hover:bg-slate-800 hover:text-white">
              <a href="#contact">Get Started Today</a>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}