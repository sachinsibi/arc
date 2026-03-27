'use client';

import { motion } from 'framer-motion';

interface NarrativeReflectionProps {
  narrative: string;
  visible: boolean;
}

export default function NarrativeReflection({ narrative, visible }: NarrativeReflectionProps) {
  const paragraphs = narrative.split('\n\n').filter(Boolean);

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
    </motion.div>
  );
}
