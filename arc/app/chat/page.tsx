'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useArcStore } from '@/lib/store';
import { Message } from '@/lib/types';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';

const OPENING_QUESTION =
  'Think back to when you were around 14 or 15. What did you spend your time on, not because anyone told you to, but because you genuinely wanted to?';

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    addMessage,
    updateLastMessage,
    exchangeCount,
    incrementExchange,
    isLoading,
    setLoading,
  } = useArcStore();

  // Seed Arc's opening question on first mount
  const hasSeeded = useRef(false);
  useEffect(() => {
    if (messages.length === 0 && !hasSeeded.current) {
      hasSeeded.current = true;
      addMessage({
        id: 'opening',
        role: 'assistant',
        content: OPENING_QUESTION,
        timestamp: Date.now(),
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect transition to tree
  const checkForTreeTransition = useCallback(
    (userText: string) => {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === 'assistant');
      if (!lastAssistant) return false;

      const arcSuggestedTree =
        /your tree|show you|see your|shall (i|we)/i.test(lastAssistant.content);
      const userConfirmed = /yes|sure|please|let'?s|show me|okay|ok|yeah|absolutely/i.test(
        userText,
      );

      return arcSuggestedTree && userConfirmed;
    },
    [messages],
  );

  const handleSend = async (text: string) => {
    // Check if user is confirming tree transition
    if (checkForTreeTransition(text)) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
      // Small delay so the message appears before navigating
      setTimeout(() => router.push('/tree'), 600);
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    incrementExchange();
    setLoading(true);

    const allMessages = [...messages, userMsg];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = crypto.randomUUID();

      addMessage({
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value);
        updateLastMessage(assistantContent);
      }
    } catch {
      // If API is unavailable, show a fallback message
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'I seem to have lost my train of thought for a moment. Could you tell me a bit more about that?',
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress indicator */}
      <div className="flex justify-center pt-6 pb-2">
        <span
          className="font-ui text-text-muted"
          style={{ fontSize: '0.75rem' }}
        >
          {exchangeCount} of ~10
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="flex flex-col mx-auto w-full" style={{ maxWidth: '680px' }}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div
        className="px-6 py-5"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: '680px' }}>
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
