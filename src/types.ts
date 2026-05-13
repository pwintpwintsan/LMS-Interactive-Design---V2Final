export type WidgetType = 'background' | 'character' | 'audio' | 'text' | 'button' | 'image' | 'video' | 'quiz' | 'multiple-choice' | 'sequencing' | 'fill-in-the-blank' | 'checkbox' | 'numberbox' | 'label' | 'label-input' | 'order';

export interface Interaction {
  type: 'click' | 'double-click' | 'drag' | 'hover';
  targetId?: string;
  action: 'success' | 'fail' | 'navigate' | 'play-sound' | 'animate' | 'next-scene' | 'submit-test';
  payload?: any;
}

export interface Choice {
  id: string;
  type: 'icon' | 'image' | 'text';
  content: string;
  isCorrect: boolean;
  src?: string;
  answer?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  orderIndex?: number;
}

export interface Blank {
  id: string;
  answer: string;
  placeholder?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface MatchPair {
  id: string;
  leftType: 'icon' | 'image' | 'text';
  leftContent: string;
  leftSrc?: string;
  
  middleType?: 'icon' | 'image' | 'text';
  middleContent?: string;
  middleSrc?: string;

  rightType: 'icon' | 'image' | 'text';
  rightContent: string;
  rightSrc?: string;

  // State
  isMatched?: boolean;
}

export interface GameElement {
  id: string;
  type: WidgetType;
  name: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  style: {
    backgroundColor?: string;
    borderRadius?: string;
    padding?: string;
    borderColor?: string;
    borderWidth?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
    boxShadow?: string;
    objectFit?: 'contain' | 'cover' | 'fill' | 'none';
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    fontStyle?: 'normal' | 'italic';
    fontVariant?: 'normal' | 'small-caps';
    textDecoration?: 'none' | 'underline';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    color?: string;
    itemPadding?: number;
    choiceWidth?: number;
    choiceHeight?: number;
    rotation?: number;
    scale?: number;
    opacity?: number;
    orientation?: 'horizontal' | 'vertical'; // For pairs
    itemSize?: number; // Deprecated, but keep for compatibility
    itemWidth?: number;
    itemHeight?: number;
    itemSpacing?: number; // Spacing between cards in a column
    pairGap?: number; // Gap between the two matching columns
    choiceLayout?: 'horizontal' | 'vertical' | 'free'; // For multiple choice
    choiceAlign?: 'left' | 'center' | 'right';
    orderingMode?: 'manual' | 'auto';
    layoutMode?: 'grid' | 'free'; 
    textAlign?: 'left' | 'center' | 'right';
    equalSizeItems?: boolean;
    labelPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'free';
    labelSize?: number;
    labelX?: number;
    labelY?: number;
    inputPosition?: 'inside' | 'free';
    inputX?: number;
    inputY?: number;
    inputWidth?: number;
  };
  content?: string;
  src?: string;
  interactions: Interaction[];
  parentId?: string;
  choices?: Choice[];
  pairs?: MatchPair[];
  blanks?: Blank[];
  showLines?: boolean;
  interactionMode?: 'lines' | 'drag';
  linkedElementIds?: string[];
  icon?: string;
  labelId?: string;
}

export interface Scene {
  id: string;
  name: string;
  elements: GameElement[];
  background: {
    color: string;
    image?: string;
  };
  isFinalPage?: boolean;
}

export type AppView = 'dashboard' | 'editor';

export interface PlaySettings {
  barBgColor?: string;
  barBorderColor?: string;
  logoSrc?: string;
  logoLabel?: string;
  logoSubLabel?: string;
  logoColor?: string;
  logoLabelColor?: string;
  logoSubLabelColor?: string;
  barTextColor?: string; // For progress text etc.
  progressBarColor?: string;
  progressBarBgColor?: string;
}

export interface EditorState {
  scenes: Scene[];
  currentSceneId: string;
  selectedElementId: string | null;
  editingElementId?: string | null;
  zoom: number;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  isPlaying: boolean;
  appView: AppView;
  playSettings: PlaySettings;
}
