import React, { useState, useEffect, useRef } from 'react';
import { Cross, Star, MessageCircle } from 'lucide-react';
import { getSpiritualGuidance } from './services/openai';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import type { Message } from './types';

// === CONFIG ===
const RAILWAY_BASE = 'https://TUAPP.up.railway.app'; // <-- pon tu dominio real
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';     // opcional: tu voz ElevenLabs

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasStartedConversation, setHasStartedConversation] = useState<boolean>(false);

  // Estado y referencia del audio
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const [isNightMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (text: string, isUser: boolean, verse?: string, reference?: string, isAudio?: boolean) => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      verse,
      reference,
      isUser,
      timestamp: new Date(),
      isAudio
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // === Reproducir TTS: fetch -> blob -> Audio (evita NotSupportedError) ===
  const handlePlayAudio = async (text: string) => {
    if (!text || !text.trim()) return;

    // Detener audio previo
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = '';
      audioElRef.current = null;
      setIsPlayingAudio(false);
    }

    const url = `${RAILWAY_BASE}/tts-stream?text=${encodeURIComponent(text)}&voice_id=${encodeURIComponent(DEFAULT_VOICE_ID)}`;

    try {
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) {
        const errTxt = await resp.text();
        console.error('TTS error:', errTxt);
        alert('Error de TTS: ' + errTxt);
        return;
      }

      const ct = resp.headers.get('content-type') || '';
      if (!ct.startsWith('audio/')) {
        const txt = await resp.text();
        console.error('Respuesta no-audio:', txt);
        alert('La respuesta no es audio. Revisa CORS/MIME en el servidor.');
        return;
      }

      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);

      const el = new Audio();
      audioElRef.current = el;
      el.src = objUrl;
      el.onplaying = () => setIsPlayingAudio(true);
      el.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(objUrl);
      };
      el.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(objUrl);
        console.error('Audio element error', el.error);
        alert('No se pudo reproducir el audio (ver consola).');
      };

      await el.play();
    } catch (e) {
      console.error('Fallo al iniciar reproducción:', e);
      setIsPlayingAudio(false);
      alert('No se pudo iniciar reproducción: ' + String(e));
    }
  };

  const handleSendMessage = async (messageText: string, isAudio: boolean = false) => {
    addMessage(messageText, true, undefined, undefined, isAudio);
    setIsLoading(true);
    try {
      const response = await getSpiritualGuidance(userName, messageText);
      addMessage(response.message, false, response.verse, response.reference);

      const fullResponse = [response.message, response.verse, response.reference]
        .filter(Boolean)
        .join('. ');

      // pequeño delay para iOS
      setTimeout(() => { void handlePlayAudio(fullResponse); }, 1200);
    } catch (error) {
      console.error('Error getting spiritual guidance:', error);
      addMessage(
        `${userName}, hijo amado, aunque no puedo responder en este momento, recuerda que mi amor por ti es eterno y mi paz está siempre contigo.`,
        false,
        "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.",
        "Juan 14:27"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async () => {
    if (!hasStartedConversation) {
      setHasStartedConversation(true);
      setIsLoading(true);
      try {
        const response = await getSpiritualGuidance(userName);
        addMessage(response.message, false, response.verse, response.reference);

        const fullResponse = [response.message, response.verse, response.reference]
          .filter(Boolean)
          .join('. ');
        setTimeout(() => { void handlePlayAudio(fullResponse); }, 1500);
      } catch (error) {
        console.error('Error starting conversation:', error);
        addMessage(
          `${userName}, hijo amado, paz sea contigo. Yo estoy aquí para escucharte y acompañarte en tu caminar espiritual. Mi corazón está abierto para ti.`,
          false,
          "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.",
          "Mateo 11:28"
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setShowNameInput(false);
      setTimeout(startConversation, 500);
    }
  };

  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-all duration-1000 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-md w-full mx-4">
          <div className="p-8 rounded-2xl shadow-2xl backdrop-blur-sm border transition-all duration-500 bg-white/80 border-white/50 text-gray-800">
            <div className="text-center mb-6">
              <Cross className="w-12 h-12 mx-auto mb-4 text-amber-600" />
              <h1 className="text-2xl font-light mb-2">Bienvenido, hijo amado</h1>
              <p className="text-sm text-gray-600">
                Comparte tu nombre para comenzar una conversación espiritual
              </p>
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Tu nombre..."
                className="w-full px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-amber-400 outline-none transition-all duration-300 bg-white/70 text-gray-800 placeholder-gray-500"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg hover:shadow-xl"
              >
                Comenzar conversación
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-all duration-1000 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="p-4 backdrop-blur-sm border-b bg-white/50 border-white/20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cross className="w-8 h-8 text-amber-600" />
            <div>
              <h1 className="text-lg font-light text-gray-800">Conversación Espiritual</h1>
              <p className="text-sm text-gray-600">Conversando con {userName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <p className="text-lg text-gray-600">Iniciando conversación espiritual...</p>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <Star className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-gray-500">Un espacio seguro para compartir tu corazón</p>
                <Star className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isNightMode={isNightMode}
              onPlayAudio={handlePlayAudio}
              isPlayingAudio={isPlayingAudio}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-2xl bg-white/80 text-gray-800 border border-white/50 shadow-lg backdrop-blur-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce bg-amber-500" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce bg-amber-500" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce bg-amber-500" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm">Reflexionando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isPlayingAudio={isPlayingAudio}
        isNightMode={isNightMode}
      />
    </div>
  );
}

export default App;
