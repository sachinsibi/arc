import { LifeTree } from './types';

export const mockTree: LifeTree = {
  roots: [
    {
      id: 'root-1',
      label: 'Curiosity',
      description: 'A deep, restless need to understand how things work — from taking apart radios as a child to questioning systems as an adult.',
    },
    {
      id: 'root-2',
      label: 'Connection',
      description: 'The thread of wanting to be understood, and to understand others. Present in every chapter.',
    },
    {
      id: 'root-3',
      label: 'Making things',
      description: 'The compulsion to build, to shape raw material into something that did not exist before.',
    },
  ],
  trunk: {
    id: 'trunk',
    label: 'The search for meaningful work',
    description: 'A lifelong tension between security and purpose, between what pays and what matters.',
  },
  branches: [
    {
      id: 'branch-1',
      label: 'The music years',
      description: 'Playing guitar in bedrooms and garages, writing songs nobody heard, learning that creating something from nothing was the point.',
      thickness: 3,
      period: 'Ages 14–19',
      children: [],
      leaves: [
        {
          id: 'leaf-1a',
          content: 'Writing a song at 16 that made a friend cry',
          reflection: 'The first time you realised your inner world could reach someone else.',
        },
        {
          id: 'leaf-1b',
          content: 'Choosing not to pursue music school',
          reflection: 'A door closed not by failure but by a quiet reckoning with practicality.',
        },
        {
          id: 'leaf-1c',
          content: 'Still picking up the guitar at midnight',
          reflection: 'Some things do not need to be a career to be essential.',
        },
      ],
    },
    {
      id: 'branch-2',
      label: 'University and reinvention',
      description: 'Studying something practical while secretly reading philosophy. The split between who you were becoming and who you were expected to be.',
      thickness: 4,
      period: 'Ages 18–22',
      children: [
        {
          id: 'branch-2a',
          label: 'The philosophy detour',
          description: 'An elective that became an obsession. Ethics, meaning, the examined life.',
          thickness: 2,
          period: 'Ages 19–21',
          children: [],
          leaves: [
            {
              id: 'leaf-2a1',
              content: 'A professor who said "the question matters more than the answer"',
              reflection: 'Permission to not have it all figured out — a gift that still resonates.',
            },
          ],
        },
      ],
      leaves: [
        {
          id: 'leaf-2b',
          content: 'Staying up all night building a website for a friend\'s band',
          reflection: 'The first hint that technology could be a creative medium, not just a practical one.',
        },
        {
          id: 'leaf-2c',
          content: 'Graduating feeling less certain than when you started',
          reflection: 'Uncertainty as a sign of growth, not failure.',
        },
      ],
    },
    {
      id: 'branch-3',
      label: 'The first real job',
      description: 'Corporate life. Learning the rules in order to know which ones to break later.',
      thickness: 4,
      period: 'Ages 22–27',
      children: [],
      leaves: [
        {
          id: 'leaf-3a',
          content: 'Being praised for work that felt meaningless',
          reflection: 'Success without satisfaction — the gap that would eventually demand attention.',
        },
        {
          id: 'leaf-3b',
          content: 'Meeting a mentor who left to start something of their own',
          reflection: 'A living example that another path was possible.',
        },
      ],
    },
    {
      id: 'branch-4',
      label: 'Building something of your own',
      description: 'The leap. Leaving stability for uncertainty, trading a salary for the chance to make something that mattered.',
      thickness: 5,
      period: 'Ages 27–present',
      children: [],
      leaves: [
        {
          id: 'leaf-4a',
          content: 'The first project that someone paid for',
          reflection: 'Proof that what you cared about could also sustain you.',
        },
        {
          id: 'leaf-4b',
          content: 'A year of doubt and near-quitting',
          reflection: 'The roots held even when the branches swayed. That is what roots are for.',
        },
        {
          id: 'leaf-4c',
          content: 'Realising the music, the philosophy, and the code were all the same impulse',
          reflection: 'The trunk reveals itself only when you step back far enough to see the whole tree.',
        },
      ],
    },
  ],
  buds: [
    {
      id: 'bud-1',
      label: 'Teaching',
      description: 'A growing pull towards sharing what you have learned — not as an expert, but as a fellow traveller.',
    },
    {
      id: 'bud-2',
      label: 'Writing',
      description: 'The songs became code, but the impulse to write never left. Perhaps it is time to return to words.',
    },
  ],
};

export const mockNarrative = `There is a thread that runs through your story, though it is not always visible from the inside. At fourteen, you were writing songs in your bedroom — not for an audience, but because something inside you needed to be made external. That same impulse showed up again in university, when a philosophy class became the truest thing in your week, and again when you stayed up all night building a website for a friend. The medium changed, but the need did not: to take the raw, unsorted material of experience and give it shape.

The choices that felt like departures — studying something practical, taking the corporate job, stepping away from music — were not departures at all. They were the trunk growing thicker, gathering the strength needed for what came later. The mentor who left, the praise that felt hollow, the late-night restlessness — these were not random. They were the tree telling you which direction to grow.

What you are building now sits at the intersection of everything you have been. The curiosity that took apart radios. The connection you felt when a song landed. The philosophy professor's permission to keep asking. You are not starting over; you are arriving. The buds on your branches — the pull towards teaching, the return to writing — are not new directions. They are the oldest parts of you, finding their way back to the surface.

This is one way to read your arc. You might see it differently. The story is yours to tell.`;
