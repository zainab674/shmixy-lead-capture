# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/10a36d47-e8b7-406c-a788-2a878135b1a5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/10a36d47-e8b7-406c-a788-2a878135b1a5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Deepgram AI (Voice Recognition)
- Gemini AI (Intelligent Responses)

## Voice Agent Setup

This project includes four industry-specific voice agents powered by Deepgram AI for real-time speech-to-text and Gemini AI for intelligent responses.

### Prerequisites

1. **Deepgram API Key**: Get your free API key from [Deepgram Console](https://console.deepgram.com/)
2. **Gemini API Key**: Get your API key from [Google AI Studio](https://aistudio.google.com/)
3. **Microphone Access**: Ensure your browser has permission to access the microphone

### Environment Setup

Create a `.env` file in your project root with:

```bash
VITE_DEEPGRAM_API_KEY=your_actual_deepgram_api_key_here
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Available Voice Agents

#### 🍕 Pizza Hut Voice Assistant
- **Purpose**: Handle pizza orders and customer support
- **Features**: Menu knowledge, order tracking, delivery options
- **Flow**: Pizza type → Size → Toppings → Sides → Drinks → Delivery

#### 👗 StyleHub Fashion Voice Assistant
- **Purpose**: Fashion shopping and style consultation
- **Features**: Category browsing, style matching, size/color selection
- **Flow**: Category → Style → Size → Color → Fitting → Checkout

#### 🏥 Mercy General Hospital Voice Assistant
- **Purpose**: Medical appointment scheduling and information
- **Features**: Department selection, doctor matching, emergency guidance
- **Flow**: Department → Doctor → Date → Time → Contact → Confirmation

#### ⚖️ Justice & Associates Voice Assistant
- **Purpose**: Legal consultation scheduling and legal information
- **Features**: Practice area selection, case evaluation, consultation booking
- **Flow**: Practice Area → Case Type → Urgency → Contact → Scheduling

### Common Features

- **Real-time Voice Recognition**: Uses Deepgram's Nova-2 model for accurate speech-to-text
- **AI-Powered Responses**: Gemini AI generates intelligent, context-aware responses
- **Conversation Memory**: Maintains context throughout the conversation
- **Smart Silence Detection**: Waits 30 seconds of silence before processing
- **Voice Synthesis**: AI responses are spoken back to the user
- **Industry-Specific Knowledge**: Each agent has specialized domain expertise

### Usage

1. Click the microphone button to start recording
2. Speak naturally about your needs or questions
3. The AI will process your voice and respond intelligently
4. Continue the conversation naturally - each agent remembers context
5. Use quick action buttons for common queries

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/10a36d47-e8b7-406c-a788-2a878135b1a5) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
