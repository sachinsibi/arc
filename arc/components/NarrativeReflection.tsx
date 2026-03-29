'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useArcStore } from '@/lib/store';

interface NarrativeReflectionProps {
  narrative: string;
  visible: boolean;
}

export default function NarrativeReflection({ narrative, visible }: NarrativeReflectionProps) {
  const paragraphs = narrative.split('\n\n').filter(Boolean);
  const { intention, setIntention, feedbackGiven, setFeedbackGiven } = useArcStore();
  const [inputValue, setInputValue] = useState('');
  const [feedbackResponse, setFeedbackResponse] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      setIntention(trimmed);
    }
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(true);
    setFeedbackResponse(helpful ? 'thank you' : 'thank you');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="mx-auto px-6 py-12"
      style={{ maxWidth: '680px', lineHeight: 1.7 }}
    >
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-6 text-text-primary text-base">
          {paragraph}
        </p>
      ))}

      {/* Divider */}
      <hr
        className="border-0 my-12"
        style={{ borderTop: '1px solid var(--border)' }}
      />

      {/* Intention section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        {intention ? (
          <div className="text-center">
            <span
              className="font-ui text-text-muted uppercase tracking-wide"
              style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}
            >
              Your intention
            </span>
            <p
              className="mt-3 text-text-primary text-base italic"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              &ldquo;{intention}&rdquo;
            </p>

            {/* Feedback prompt */}
            {!feedbackGiven && !feedbackResponse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="mt-8"
              >
                <p className="font-ui text-text-muted" style={{ fontSize: '0.75rem' }}>
                  did this reflection help you see things differently?{' '}
                  <button
                    onClick={() => handleFeedback(true)}
                    className="text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
                    style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    [yes]
                  </button>{' '}
                  <button
                    onClick={() => handleFeedback(false)}
                    className="text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer"
                    style={{ background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    [no]
                  </button>
                </p>
              </motion.div>
            )}
            {feedbackResponse && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-8 font-ui text-text-muted"
                style={{ fontSize: '0.75rem' }}
              >
                {feedbackResponse}
              </motion.p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p
              className="text-text-secondary text-base mb-6"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              What is one thing you want to carry forward?
            </p>
            <div className="flex items-center gap-3 mx-auto" style={{ maxWidth: '480px' }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="An intention for what comes next..."
                className="flex-1 bg-transparent border-0 border-b border-arc-border outline-none py-2 text-base text-text-primary placeholder:text-text-muted"
                style={{ fontFamily: 'Georgia, serif' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
              <button
                onClick={handleSave}
                disabled={!inputValue.trim()}
                className="px-4 py-1 border border-accent bg-transparent text-text-primary cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent hover:text-white disabled:opacity-30 disabled:cursor-default"
                style={{ fontFamily: 'Georgia, serif', fontSize: '0.85rem' }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
