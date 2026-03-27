'use client';

import { motion } from 'framer-motion';
import { Message } from '@/lib/types';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isArc = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-8 max-w-[85%] ${isArc ? 'self-start' : 'self-end text-right'}`}
    >
      <p
        className="leading-[1.6] text-base whitespace-pre-wrap"
        style={{ color: isArc ? 'var(--text-secondary)' : 'var(--text-primary)' }}
      >
        {message.content}
      </p>
    </motion.div>
  );
}
