export interface TreeNode {
  id: string;
  label: string;
  description: string;
}

export interface Leaf {
  id: string;
  content: string;
  reflection: string;
}

export interface Branch {
  id: string;
  label: string;
  description: string;
  thickness: number;
  period: string;
  children: Branch[];
  leaves: Leaf[];
}

export interface LifeTree {
  roots: TreeNode[];
  trunk: TreeNode;
  branches: Branch[];
  buds: TreeNode[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type AppPhase = 'landing' | 'conversation' | 'tree';
