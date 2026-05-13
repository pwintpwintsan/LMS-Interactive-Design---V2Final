import { Scene, PlaySettings } from '../types';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Published';
  createdAt: string;
  updatedAt: string;
  scenes: Scene[];
  playSettings: PlaySettings;
}

export interface Score {
  id: string;
  projectId: string;
  sceneId: string;
  type?: string;
  totalPairs?: number;
  correctPairs?: number;
  isCorrect?: boolean;
  score?: number;
  max?: number;
  playedAt: string;
}

const PROJECTS_KEY = 'editor_projects';
const CURRENT_PROJECT_ID_KEY = 'current_project_id';
const SCORES_KEY = 'editor_scores';

export const loadProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    if (!data) return [];
    const projects: Project[] = JSON.parse(data);
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('Error loading projects from localStorage', error);
    return [];
  }
};

export const saveProjects = (projects: Project[]) => {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving projects to localStorage', error);
  }
};

export const loadScores = (): Score[] => {
  try {
    const data = localStorage.getItem(SCORES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading scores from localStorage', error);
    return [];
  }
};

export const saveScore = (score: Score) => {
  try {
    const scores = loadScores();
    scores.push(score);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  } catch (error) {
    console.error('Error saving score to localStorage', error);
  }
};

export const saveCurrentProjectId = (id: string | null) => {
  if (id) {
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
  }
};

export const loadCurrentProjectId = (): string | null => {
  return localStorage.getItem(CURRENT_PROJECT_ID_KEY);
};

export const getProjectById = (id: string): Project | undefined => {
  const projects = loadProjects();
  return projects.find(p => p.id === id);
};

export const deleteProject = (projectId: string) => {
  const projects = loadProjects();
  const updatedProjects = projects.filter(p => p.id !== projectId);
  saveProjects(updatedProjects);
  
  const currentId = loadCurrentProjectId();
  if (currentId === projectId) {
    saveCurrentProjectId(null);
  }
};

export const duplicateProject = (projectId: string): Project | null => {
  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  const newProject: Project = {
    ...project,
    id: `project_${Date.now()}`,
    title: `${project.title} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProjects([newProject, ...projects]);
  return newProject;
};
