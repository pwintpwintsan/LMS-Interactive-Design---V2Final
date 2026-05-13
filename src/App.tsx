import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy,
  Layers, 
  Play, 
  Edit3, 
  Settings, 
  Smile, 
  Type, 
  Image as ImageIcon, 
  MousePointer2, 
  Grid3X3, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Save, 
  Undo, 
  Redo, 
  ChevronRight,
  ChevronDown,
  Box,
  Palette,
  Zap,
  Music,
  X,
  Check,
  Search,
  Eye,
  Download,
  Share2,
  LogIn,
  ArrowLeftRight,
  CheckSquare,
  Hash,
  ListOrdered,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Maximize,
  Bold,
  Italic,
  Underline,
  ALargeSmall,
  Video,
  ChevronUp,
  ChevronsUp,
  ChevronsDown,
  Upload,
  ChevronLeft,
  RefreshCw,
  RotateCw,
  Flag,
  Globe,
  Cloud,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Tag,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  EditorState, 
  Scene, 
  GameElement, 
  WidgetType, 
  Interaction, 
  Choice,
  PlaySettings 
} from './types';
import { 
  Project, 
  Score,
  loadProjects as loadProjectsFromStorage, 
  saveProjects as saveProjectsToStorage,
  saveCurrentProjectId,
  loadCurrentProjectId,
  saveScore,
  loadScores as loadScoresFromStorage
} from './lib/storage';

// Firebase logic removed - using localStorage persistence

// Mock Assets
const UI_ELEMENTS: { type: WidgetType; name: string; icon: any }[] = [
  { type: 'text', name: 'Text Label', icon: Type },
  { type: 'button', name: 'Action Button', icon: MousePointer2 },
  { type: 'image', name: 'Decoration', icon: ImageIcon },
  { type: 'video', name: 'Video Content', icon: Video },
  { type: 'quiz', name: 'Matching Pair', icon: Grid3X3 },
  { type: 'multiple-choice', name: 'Interactive Question', icon: Layers },
  { type: 'fill-in-the-blank', name: 'Fill the Blank', icon: Edit3 },
  { type: 'sequencing', name: 'Ordering', icon: ListOrdered },
  { type: 'label', name: 'Point Label', icon: Tag },
  { type: 'label-input', name: 'Label Quiz', icon: HelpCircle },
  { type: 'order', name: 'Order Text/Image', icon: Hash },
];

const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  barBgColor: '#ffedd5',
  barBorderColor: '#fed7aa',
  logoLabel: 'CourseCraft',
  logoSubLabel: 'Interactive Learning',
  logoColor: '#f97316',
  logoLabelColor: '#7c2d12',
  logoSubLabelColor: '#7c2d1299',
  barTextColor: '#9a3412',
  progressBarColor: '#f97316',
  progressBarBgColor: '#fed7aa',
};

const INITIAL_SCENE: Scene = {
  id: 'scene-1',
  name: 'Intro Scene',
  background: { color: '#f0f9ff' },
  elements: [
    {
      id: 'el-1',
      name: 'Welcome Text',
      type: 'text',
      x: 100,
      y: 100,
      z: 1,
      width: 400,
      height: 60,
      style: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1e293b',
        textAlign: 'center',
      },
      content: 'Welcome to your AI Game!',
      interactions: [],
    },
    {
      id: 'el-2',
      name: 'Hero Character',
      type: 'character',
      x: 250,
      y: 200,
      z: 2,
      width: 120,
      height: 120,
      style: {
        scale: 1,
      },
      content: '🤖',
      interactions: [
        { type: 'click', action: 'animate', payload: { type: 'bounce' } }
      ],
    },
    {
      id: 'el-matching',
      name: 'Match the Colors',
      type: 'quiz',
      x: 100,
      y: 350,
      z: 3,
      width: 600,
      height: 200,
      style: {
        orientation: 'horizontal',
        itemSize: 100,
        itemSpacing: 40,
        layoutMode: 'grid',
        backgroundColor: '#ffffff80',
        borderRadius: '16px',
        padding: '20px'
      },
      pairs: [
        { id: 'p1', leftType: 'text', leftContent: 'Red', rightType: 'icon', rightContent: '🍎' },
        { id: 'p2', leftType: 'text', leftContent: 'Blue', rightType: 'icon', rightContent: '🦋' }
      ],
      interactions: [],
    }
  ],
};

// --- Element Renderers ---
const MatchingPairRenderer = ({ 
  element, 
  isPlaying,
  projectId,
  onComplete
}: { 
  element: GameElement; 
  isPlaying: boolean;
  projectId: string | null;
  onComplete?: (score: number, max: number) => void;
}) => {
  const isHorizontal = element.style.orientation === 'horizontal';
  const spacing = element.style.itemSpacing || 20;
  const pairGap = element.style.pairGap || 60;
  const itemWidth = element.style.itemWidth || element.style.itemSize || 100;
  const itemHeight = element.style.itemHeight || element.style.itemSize || 80;

  // Detect Triple Mode
  const isTriple = element.pairs?.some(p => p.middleContent || p.middleSrc) || false;

  // Game state
  const [matches, setMatches] = useState<{leftId: string, rightId: string}[]>([]); 
  const [middleMatches, setMiddleMatches] = useState<{middleId: string, rightId: string}[]>([]); // For triples: Left matches to Middle, Middle matches to Right
  
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedMiddle, setSelectedMiddle] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLeftClick = (id: string) => {
    if (!isPlaying) return;
    
    if (selectedLeft === id) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(id);
      // In triple mode, Left matches to Middle
      const targetSelection = isTriple ? selectedMiddle : selectedRight;
      if (targetSelection !== null) {
        if (isTriple) {
          setMatches(prev => {
            const filtered = prev.filter(m => m.leftId !== id && m.rightId !== targetSelection);
            return [...filtered, { leftId: id, rightId: targetSelection }];
          });
          setSelectedMiddle(null);
        } else {
          setMatches(prev => {
            const filtered = prev.filter(m => m.leftId !== id && m.rightId !== targetSelection);
            return [...filtered, { leftId: id, rightId: targetSelection }];
          });
          setSelectedRight(null);
        }
        setSelectedLeft(null);
      }
    }
  };

  const handleMiddleClick = (id: string) => {
    if (!isPlaying || !isTriple) return;
    
    if (selectedMiddle === id) {
      setSelectedMiddle(null);
    } else {
      setSelectedMiddle(id);
      
      if (selectedLeft !== null) {
        // Complete the L-M pair
        setMatches(prev => {
          const filtered = prev.filter(m => m.rightId !== id && m.leftId !== selectedLeft);
          return [...filtered, { leftId: selectedLeft, rightId: id }];
        });
        setSelectedLeft(null);
        setSelectedMiddle(null);
      } else if (selectedRight !== null) {
        // Complete the M-R pair
        setMiddleMatches(prev => {
          const filtered = prev.filter(m => m.middleId !== id && m.rightId !== selectedRight);
          return [...filtered, { middleId: id, rightId: selectedRight }];
        });
        setSelectedRight(null);
        setSelectedMiddle(null);
      }
    }
  };

  const handleRightClick = (id: string) => {
    if (!isPlaying) return;
    
    if (selectedRight === id) {
      setSelectedRight(null);
    } else {
      setSelectedRight(id);
      
      const targetSelection = isTriple ? selectedMiddle : selectedLeft;
      if (targetSelection !== null) {
        if (isTriple) {
          // Complete the M-R pair
          setMiddleMatches(prev => {
            const filtered = prev.filter(m => m.rightId !== id && m.middleId !== targetSelection);
            return [...filtered, { middleId: targetSelection, rightId: id }];
          });
          setSelectedMiddle(null);
        } else {
          // Complete the L-R pair
          setMatches(prev => {
            const filtered = prev.filter(m => m.rightId !== id && m.leftId !== targetSelection);
            return [...filtered, { leftId: targetSelection, rightId: id }];
          });
          setSelectedLeft(null);
        }
        setSelectedRight(null);
      }
    }
  };

  useEffect(() => {
    const totalPairs = element.pairs?.length || 0;
    const isLMDone = matches.length === totalPairs;
    const isMRDone = middleMatches.length === totalPairs;
    const isDone = isTriple ? (isLMDone && isMRDone) : isLMDone;

    if (totalPairs > 0 && isDone && isPlaying) {
      // Calculate score
      let correct = 0;
      if (isTriple) {
        element.pairs?.forEach(pair => {
          const lmMatch = matches.find(m => m.leftId === pair.id);
          const mrMatch = middleMatches.find(m => m.middleId === pair.id);
          if (lmMatch?.rightId === pair.id && mrMatch?.rightId === pair.id) {
            correct++;
          }
        });
      } else {
        matches.forEach(m => {
          if (m.leftId === m.rightId) correct++;
        });
      }
      
      if (isPlaying) {
        saveScore({
          id: `score_${Date.now()}`,
          projectId: projectId || 'anonymous',
          sceneId: element.id,
          type: isTriple ? 'triple-match' : 'pair-match',
          totalPairs: totalPairs,
          correctPairs: correct,
          playedAt: new Date().toISOString()
        });
        onComplete?.(correct, totalPairs);
      }
    }
  }, [matches, middleMatches, element.pairs, isPlaying, onComplete, isTriple]);

  const renderContent = (type: string, content: string, src?: string) => {
    if (type === 'image' && src) {
      return (
        <img 
          src={src} 
          alt="" 
          className="w-full h-full object-cover rounded-md pointer-events-none"
          referrerPolicy="no-referrer"
        />
      );
    }
    if (type === 'icon') {
      return <span className="text-2xl">{content}</span>;
    }
    const align = element.style.textAlign || 'center';
    return (
      <div className={`flex items-center p-2 leading-tight ${align === 'left' ? 'justify-start text-left' : align === 'right' ? 'justify-end text-right' : 'justify-center text-center'} w-full h-full`}>
        <span 
          className="break-words whitespace-pre-wrap"
          style={{
            textAlign: align as any,
            fontSize: (element.style as any).fontSize || '14px',
            fontWeight: (element.style as any).fontWeight || '700',
            fontFamily: (element.style as any).fontFamily || 'inherit',
            fontStyle: (element.style as any).fontStyle || 'normal',
            fontVariant: (element.style as any).fontVariant || 'normal',
            textDecoration: (element.style as any).textDecoration || 'none',
            textTransform: (element.style as any).textTransform || 'none',
            color: (element.style as any).color || 'inherit'
          }}
        >
          {content}
        </span>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative"
      style={{ 
        backgroundColor: element.style.backgroundColor,
        borderRadius: element.style.borderRadius,
        padding: element.style.padding
      }}
    >
      {/* SVG Container for Lines */}
      {isPlaying && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
          {/* Left-Middle / Left-Right Lines */}
          {matches.map((match, idx) => {
            const leftIndex = element.pairs?.findIndex(p => p.id === match.leftId) ?? -1;
            const rightIndex = element.pairs?.findIndex(p => p.id === match.rightId) ?? -1;
            
            if (leftIndex === -1 || rightIndex === -1) return null;
            
            const total = element.pairs?.length || 1;
            const leftPos = (100 / total) * (leftIndex + 0.5);
            const rightPos = (100 / total) * (rightIndex + 0.5);

            // If triple, Right is actually Middle
            const x1 = isTriple ? (isHorizontal ? '20%' : leftPos + '%') : (isHorizontal ? '35%' : leftPos + '%');
            const y1 = isTriple ? (isHorizontal ? leftPos + '%' : '20%') : (isHorizontal ? leftPos + '%' : '35%');
            const x2 = isTriple ? (isHorizontal ? '50%' : rightPos + '%') : (isHorizontal ? '65%' : rightPos + '%');
            const y2 = isTriple ? (isHorizontal ? rightPos + '%' : '50%') : (isHorizontal ? rightPos + '%' : '65%');

            return (
              <motion.line
                key={`lm-${match.leftId}-${match.rightId}-${idx}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#FF6B6B"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="8 4"
              />
            );
          })}

          {/* Middle-Right Lines */}
          {isTriple && middleMatches.map((match, idx) => {
            const middleIndex = element.pairs?.findIndex(p => p.id === match.middleId) ?? -1;
            const rightIndex = element.pairs?.findIndex(p => p.id === match.rightId) ?? -1;
            
            if (middleIndex === -1 || rightIndex === -1) return null;
            
            const total = element.pairs?.length || 1;
            const middlePos = (100 / total) * (middleIndex + 0.5);
            const rightPos = (100 / total) * (rightIndex + 0.5);

            return (
              <motion.line
                key={`mr-${match.middleId}-${match.rightId}-${idx}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                x1={isHorizontal ? '50%' : middlePos + '%'}
                y1={isHorizontal ? middlePos + '%' : '50%'}
                x2={isHorizontal ? '80%' : rightPos + '%'}
                y2={isHorizontal ? rightPos + '%' : '80%'}
                stroke="#4ECDC4"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="8 4"
              />
            );
          })}
        </svg>
      )}

      <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center justify-center h-full w-full relative z-10`} style={{ gap: pairGap }}>
        {/* Left Column/Row */}
        <div className={`flex ${isHorizontal ? 'flex-col' : 'flex-row'} items-center gap-4`}>
          {element.pairs?.map((pair) => (
            <motion.div 
              key={`${pair.id}-left`}
              onClick={() => handleLeftClick(pair.id)}
              whileTap={{ scale: 0.95 }}
              className={`relative bg-white rounded-xl shadow-sm border-2 flex items-center justify-center p-3 text-center transition-all cursor-pointer ${selectedLeft === pair.id ? 'border-brand-primary ring-4 ring-brand-primary/20 bg-brand-primary/5' : matches.some(m => m.leftId === pair.id) ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-100 hover:border-brand-primary/50'}`}
              style={{ 
                minWidth: itemWidth, 
                minHeight: itemHeight,
                width: element.style.itemWidth ? 'fit-content' : 'max-content',
                height: 'auto',
                padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : '12px',
                maxWidth: '350px',
                marginBottom: isHorizontal ? spacing : 0,
                marginRight: isHorizontal ? 0 : spacing
              }}
            >
              <div className="flex items-center justify-center">
                {renderContent(pair.leftType, pair.leftContent, pair.leftSrc)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Middle Column/Row (Optional) */}
        {isTriple && (
          <div className={`flex ${isHorizontal ? 'flex-col' : 'flex-row'} items-center gap-4`}>
            {element.pairs?.map((pair) => (
              <motion.div 
                key={`${pair.id}-middle`}
                onClick={() => handleMiddleClick(pair.id)}
                whileTap={{ scale: 0.95 }}
                className={`relative bg-white rounded-xl shadow-sm border-2 flex items-center justify-center p-3 text-center transition-all cursor-pointer ${selectedMiddle === pair.id ? 'border-blue-400 ring-4 ring-blue-400/20 bg-blue-50' : (matches.some(m => m.rightId === pair.id) || middleMatches.some(m => m.middleId === pair.id)) ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-blue-400/50'}`}
                style={{ 
                  minWidth: itemWidth, 
                  minHeight: itemHeight,
                  width: element.style.itemWidth ? 'fit-content' : 'max-content',
                  height: 'auto',
                  padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : '12px',
                  maxWidth: '350px',
                  marginBottom: isHorizontal ? spacing : 0,
                  marginRight: isHorizontal ? 0 : spacing
                }}
              >
                <div className="flex items-center justify-center">
                  {renderContent(pair.middleType || 'text', pair.middleContent || '', pair.middleSrc)}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Right Column/Row */}
        <div className={`flex ${isHorizontal ? 'flex-col' : 'flex-row'} items-center gap-4`}>
          {element.pairs?.map((pair) => (
            <motion.div 
              key={`${pair.id}-right`}
              onClick={() => handleRightClick(pair.id)}
              whileTap={{ scale: 0.95 }}
              className={`relative bg-white rounded-xl shadow-sm border-2 flex items-center justify-center p-3 text-center transition-all cursor-pointer ${selectedRight === pair.id ? 'border-brand-secondary ring-4 ring-brand-secondary/20 bg-brand-secondary/5' : (isTriple ? middleMatches.some(m => m.rightId === pair.id) : matches.some(m => m.rightId === pair.id)) ? 'border-brand-secondary bg-brand-secondary/5' : 'border-gray-100 hover:border-brand-secondary/50'}`}
              style={{ 
                minWidth: itemWidth, 
                minHeight: itemHeight,
                width: element.style.itemWidth ? 'fit-content' : 'max-content',
                height: 'auto',
                padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : '12px',
                maxWidth: '350px',
                marginBottom: isHorizontal ? spacing : 0,
                marginRight: isHorizontal ? 0 : spacing
              }}
            >
              <div className="flex items-center justify-center">
                {renderContent(pair.rightType, pair.rightContent, pair.rightSrc)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Fill In The Blank Renderer ---
const FillInTheBlankRenderer = ({ 
  element, 
  isPlaying, 
  projectId,
  onComplete 
}: { 
  element: GameElement; 
  isPlaying: boolean; 
  projectId: string | null;
  onComplete?: (score: number, max: number) => void;
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, boolean>>({});

  const content = element.content || '';
  const parts = content.split(/\[blank\]/g);
  const blanks = element.blanks || [];

    const handleCheckInternal = (currentAnswers: Record<string, string>) => {
      if (!isPlaying || isAnswered) return;
      
      let correctCount = 0;
      const newFeedbacks: Record<string, boolean> = {};
      
      blanks.forEach((blank) => {
        const isCorrect = (currentAnswers[blank.id] || '').trim().toLowerCase() === (blank.answer || '').trim().toLowerCase();
        if (isCorrect) correctCount++;
        newFeedbacks[blank.id] = isCorrect;
      });

      setFeedbacks(newFeedbacks);
      setIsAnswered(true);

      if (isPlaying) {
        onComplete?.(correctCount, blanks.length);
      }
    };

    const handleCheck = () => handleCheckInternal(answers);

  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center p-8 rounded-2xl ${!element.style.backgroundColor ? 'bg-white/80 backdrop-blur-sm shadow-xl border border-white/50' : ''}`}
      style={{
        backgroundColor: element.style.backgroundColor,
        borderRadius: element.style.borderRadius,
      }}
    >
      <div className="mb-6 w-full text-center">
        {element.src ? (
          <img 
            src={element.src} 
            alt="Question" 
            className="max-h-24 object-contain mx-auto rounded-lg mb-4"
            referrerPolicy="no-referrer"
          />
        ) : null}
      </div>

       <div 
         className={`leading-relaxed text-gray-800 flex flex-wrap items-center gap-y-4 ${element.style.textAlign === 'left' ? 'justify-start text-left' : element.style.textAlign === 'right' ? 'justify-end text-right' : 'justify-center text-center'}`}
         style={{
           textAlign: element.style.textAlign || 'center',
           fontSize: element.style.fontSize || '20px',
           fontWeight: element.style.fontWeight || '500',
           fontFamily: element.style.fontFamily || 'inherit',
           fontStyle: element.style.fontStyle || 'normal',
           fontVariant: element.style.fontVariant || 'normal',
           textDecoration: element.style.textDecoration || 'none',
           textTransform: element.style.textTransform || 'none',
           color: element.style.color || '#1f2937'
         }}
       >
         {parts.map((part, idx) => (
           <React.Fragment key={idx}>
             {part}
             {idx < parts.length - 1 && (
               <input
                 type="text"
                 value={answers[blanks[idx]?.id] || ''}
                 onChange={(e) => {
                    const newAnswers = { ...answers, [blanks[idx].id]: e.target.value };
                    setAnswers(newAnswers);
                    if (blanks.every(b => (newAnswers[b.id] || '').trim() !== '')) {
                      setTimeout(() => handleCheckInternal(newAnswers), 500);
                    }
                  }}
                 disabled={isAnswered}
                 placeholder={blanks[idx]?.placeholder || '...'}
                 style={{ 
                   width: `${Math.max(6, (blanks[idx]?.answer?.length || 0)) * 1.2}em`,
                   fontFamily: element.style.fontFamily || 'inherit',
                   fontSize: 'inherit',
                   fontWeight: 'inherit'
                 }}
                 className={`mx-2 px-3 py-1 border-b-4 outline-none transition-all duration-300 inline-block text-center rounded-t-lg ${
                   isAnswered 
                     ? feedbacks[blanks[idx].id] 
                       ? 'border-green-500 bg-green-50 text-green-700' 
                       : 'border-red-500 bg-red-50 text-red-700'
                     : 'border-brand-primary/30 focus:border-brand-primary focus:bg-white bg-gray-100/50'
                 }`}
               />
             )}
           </React.Fragment>
         ))}
       </div>

       {isPlaying && !isAnswered && (
         <button 
           onClick={handleCheck}
           className="hidden"
         >
           {/* Hidden */}
         </button>
       )}
    </div>
  );
};

// --- Sequencing Renderer ---
const SequencingRenderer = ({ 
  element, 
  isPlaying, 
  projectId,
  onComplete,
  onUpdateChoice 
}: { 
  element: GameElement; 
  isPlaying: boolean; 
  projectId: string | null;
  onComplete?: (score: number, max: number) => void;
  onUpdateChoice?: (choiceId: string, updates: Partial<Choice>) => void;
}) => {
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const mode = element.style.orderingMode || 'auto';
  const layout = element.style.layoutMode || 'grid';

  const choices = element.choices || [];
  
  // Sort choices by orderIndex for checking if not auto-calculating
  const sortedChoices = [...choices].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

   const handleChoiceClick = (id: string) => {
    if (!isPlaying || isAnswered || mode === 'manual') return;
    
    let newOrder: string[];
    if (selectedOrder.includes(id)) {
      newOrder = selectedOrder.filter(i => i !== id);
    } else {
      newOrder = [...selectedOrder, id];
    }
    setSelectedOrder(newOrder);

    // Auto check if all choices are ordered
    if (newOrder.length === choices.length) {
      setTimeout(() => {
        handleCheckInternal(newOrder, manualValues);
      }, 500);
    }
  };

  const handleCheckInternal = (currentOrder: string[], currentManual: Record<string, string>) => {
    if (!isPlaying || isAnswered) return;
    
    let score = 0;
    if (mode === 'auto') {
      score = currentOrder.length === choices.length && currentOrder.every((id, idx) => id === sortedChoices[idx].id) ? 1 : 0;
    } else {
      score = choices.every((c) => {
        const expectedOrder = (c.orderIndex !== undefined ? c.orderIndex : choices.indexOf(c) + 1).toString();
        return currentManual[c.id] === expectedOrder;
      }) ? 1 : 0;
    }

    setIsAnswered(true);
    onComplete?.(score, 1);
  };

  const handleCheck = () => handleCheckInternal(selectedOrder, manualValues);

  return (
    <div 
      className={`w-full h-full p-6 relative overflow-hidden ${!element.style.backgroundColor ? 'backdrop-blur-sm bg-white/20' : ''} ${layout === 'free' ? '' : 'flex flex-col items-center justify-center'}`}
      style={{
        backgroundColor: element.style.backgroundColor,
        borderRadius: element.style.borderRadius,
      }}
    >
      {element.src && (
        <img 
          src={element.src} 
          alt="Question" 
          className="max-h-40 object-contain mx-auto rounded-xl mb-6 shadow-sm ring-4 ring-white"
          referrerPolicy="no-referrer"
        />
      )}
      <h3 
        className={`mb-6 whitespace-pre-wrap ${layout === 'free' ? 'absolute top-4 left-4 z-10' : 'text-center'}`}
        style={{
          fontSize: element.style.fontSize || '18px',
          fontWeight: element.style.fontWeight || '700',
          fontFamily: element.style.fontFamily || 'inherit',
          fontStyle: element.style.fontStyle || 'normal',
          fontVariant: element.style.fontVariant || 'normal',
          textDecoration: element.style.textDecoration || 'none',
          textTransform: element.style.textTransform || 'none',
          color: element.style.color || '#1f2937'
        }}
      >
        {element.content}
      </h3>
      
      <div className={layout === 'free' ? 'w-full h-full relative mt-10' : 'flex flex-wrap gap-4 justify-center items-center'}>
        {choices.map((choice, idx) => {
          const itemOrder = selectedOrder.indexOf(choice.id);
          const isCorrect = mode === 'auto' 
            ? itemOrder === sortedChoices.indexOf(choice)
            : manualValues[choice.id] === (choice.orderIndex !== undefined ? choice.orderIndex : choices.indexOf(choice) + 1).toString();

          return (
            <motion.div 
              key={choice.id} 
              drag={!isPlaying && layout === 'free'}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (onUpdateChoice) {
                  const snap = 10;
                  const newX = (choice.x || 0) + info.offset.x;
                  const newY = (choice.y || 0) + info.offset.y;
                  onUpdateChoice(choice.id, {
                    x: Math.round(newX / snap) * snap,
                    y: Math.round(newY / snap) * snap
                  });
                }
              }}
              className={`relative flex flex-col items-center gap-2 ${layout === 'free' ? 'absolute cursor-move' : ''}`}
              style={layout === 'free' ? { left: choice.x || 0, top: choice.y || 0 } : {}}
            >
              <motion.div
                onClick={() => handleChoiceClick(choice.id)}
                whileHover={isPlaying && !isAnswered && mode === 'auto' ? { scale: 1.05 } : {}}
                className={`
                  rounded-xl border-2 flex items-center justify-center bg-white shadow-sm transition-all overflow-hidden
                  ${selectedOrder.includes(choice.id) ? 'border-brand-primary ring-2 ring-brand-primary/20' : 'border-gray-100'}
                  ${isAnswered ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : ''}
                `}
              style={{
                ...(layout === 'free' ? {
                  position: 'absolute' as any,
                  left: choice.x || 0,
                  top: choice.y || 0
                } : {}),
                minWidth: element.style.equalSizeItems ? (element.style.choiceWidth || element.style.itemWidth || 160) : (element.style.choiceWidth || element.style.itemWidth || (choice.type === 'text' ? '120px' : 'none')),
                minHeight: element.style.equalSizeItems ? (element.style.choiceHeight || element.style.itemHeight || 160) : (element.style.choiceHeight || element.style.itemHeight || '48px'),
                width: element.style.equalSizeItems ? (element.style.choiceWidth || element.style.itemWidth || 160) : ((choice.width || element.style.choiceWidth || element.style.itemWidth) ? 'fit-content' : 'auto'),
                height: element.style.equalSizeItems ? (element.style.choiceHeight || element.style.itemHeight || 160) : 'auto',
                padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : (choice.type === 'text' ? '16px' : '0'),
                maxWidth: '350px',
                transform: `scale(${element.style.scale || 1})`,
              }}
            >
                {choice.type === 'image' && choice.src ? (
                  <img src={choice.src} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : choice.type === 'icon' ? (
                  <span className="text-3xl">{choice.content}</span>
                ) : (
                  <span 
                    className={`leading-tight break-words px-2 w-full ${element.style.textAlign === 'left' ? 'text-left' : element.style.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                    style={{
                      textAlign: element.style.textAlign || 'center',
                      fontSize: element.style.fontSize || '14px',
                      fontWeight: element.style.fontWeight || '700',
                      fontFamily: element.style.fontFamily || 'inherit',
                      fontStyle: element.style.fontStyle || 'normal',
                      fontVariant: element.style.fontVariant || 'normal',
                      textDecoration: element.style.textDecoration || 'none',
                      textTransform: element.style.textTransform || 'none',
                      color: element.style.color || 'inherit'
                    }}
                  >
                    {choice.content}
                  </span>
                )}

                {/* Index Overlay for Auto Mode */}
                {mode === 'auto' && selectedOrder.includes(choice.id) && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-brand-primary text-white rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white shadow-lg z-20">
                    {itemOrder + 1}
                  </div>
                )}
              </motion.div>

              {/* Input Box for Manual Mode */}
              {mode === 'manual' && (
                <input
                  type="text"
                  maxLength={2}
                  disabled={isAnswered}
                  value={manualValues[choice.id] || ''}
                  onChange={(e) => {
                    const newManual = { ...manualValues, [choice.id]: e.target.value };
                    setManualValues(newManual);

                    // Auto check if all are filled in manual mode
                    if (choices.every(c => (newManual[c.id] || '').trim() !== '')) {
                      setTimeout(() => {
                        handleCheckInternal(selectedOrder, newManual);
                      }, 500);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCheckInternal(selectedOrder, manualValues);
                    }
                  }}
                  placeholder="#"
                  className={`w-10 h-10 text-center border-2 rounded-xl font-black focus:border-brand-primary outline-none transition-all shadow-sm ${isAnswered ? (isCorrect ? 'border-green-500 bg-green-50 text-green-600' : 'border-red-500 bg-red-50 text-red-600') : 'border-gray-100 bg-white'}`}
                />
              )}
            </motion.div>
          );
        })}
      </div>

       {/* Removed Check Sequence Button (Auto checks when complete) */}
     </div>
   );
 };

// --- Checkbox Renderer ---
const CheckboxRenderer = ({ element, isPlaying }: { element: GameElement, isPlaying: boolean }) => {
  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const choices = element.choices || [];
  
  const toggleChecked = (id: string) => {
    if (!isPlaying || isSubmitted) return;
    setCheckedStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCheck = () => {
    setIsSubmitted(true);
  };

  const isAllCorrect = choices.every(c => {
    const isChecked = !!checkedStates[c.id];
    return isChecked === !!c.isCorrect;
  });

  return (
    <div 
      className="w-full h-full flex flex-col p-6 overflow-y-auto relative"
      style={{
        backgroundColor: element.style.backgroundColor,
        borderRadius: element.style.borderRadius,
      }}
    >
      {element.src && (
        <img 
          src={element.src} 
          alt="Question" 
          className="max-h-40 object-contain mx-auto rounded-xl mb-6 shadow-sm ring-4 ring-white"
          referrerPolicy="no-referrer"
        />
      )}
      {element.content && (
        <h3 
          className={`mb-6 tracking-tight leading-tight whitespace-pre-wrap w-full ${element.style.textAlign === 'left' ? 'text-left' : element.style.textAlign === 'right' ? 'text-right' : 'text-center'}`}
          style={{
            textAlign: element.style.textAlign || 'left',
            fontSize: element.style.fontSize || '18px',
            fontWeight: element.style.fontWeight || '900',
            fontFamily: element.style.fontFamily || 'inherit',
            fontStyle: element.style.fontStyle || 'normal',
            fontVariant: element.style.fontVariant || 'normal',
            textDecoration: element.style.textDecoration || 'none',
            textTransform: element.style.textTransform || 'none',
            color: element.style.color || '#1f2937'
          }}
        >
          {element.content}
        </h3>
      )}
      
      <div 
        className="space-y-3 flex-1"
        style={{ gap: `${element.style.itemSpacing || 12}px`, display: 'flex', flexDirection: 'column' }}
      >
        {choices.length > 0 ? (
          choices.map((choice) => {
            const isChecked = !!checkedStates[choice.id];
            const showFeedback = isSubmitted;
            const isChoiceCorrect = isChecked === !!choice.isCorrect;

            return (
              <div 
                key={choice.id} 
                className={`flex items-center gap-4 rounded-xl border-2 transition-all group ${
                  showFeedback 
                    ? (isChoiceCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')
                    : 'bg-white/50 border-white/20 hover:bg-white'
                }`}
                style={{ 
                  padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : '12px',
                  minWidth: element.style.itemWidth ? `${element.style.itemWidth}px` : '160px',
                  minHeight: element.style.itemHeight ? `${element.style.itemHeight}px` : 'auto',
                  width: 'fit-content',
                  height: 'auto',
                  maxWidth: '100%',
                  marginBottom: 0 
                }}
              >
                <button 
                  disabled={!isPlaying || isSubmitted}
                  onClick={() => toggleChecked(choice.id)}
                  className={`shrink-0 w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                    isChecked 
                      ? 'bg-brand-primary border-brand-primary text-white shadow-lg scale-110' 
                      : 'bg-white border-gray-200 group-hover:border-brand-primary/50'
                  }`}
                >
                  {isChecked && <Check size={20} strokeWidth={4} />}
                </button>
                <div className="flex items-center gap-3 flex-1">
                   {choice.type === 'image' && choice.src && (
                     <img src={choice.src} alt="" className="h-12 w-12 object-contain rounded-lg" referrerPolicy="no-referrer" />
                   )}
                   {choice.type === 'icon' && (
                     <span className="text-2xl">{choice.content}</span>
                   )}
                   <span 
                     className={`tracking-tight flex-1 ${element.style.textAlign === 'left' ? 'text-left' : element.style.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                     style={{
                       textAlign: element.style.textAlign || 'left',
                       fontSize: element.style.fontSize || '14px',
                       fontWeight: element.style.fontWeight || '700',
                       fontFamily: element.style.fontFamily || 'inherit',
                       fontStyle: element.style.fontStyle || 'normal',
                       fontVariant: element.style.fontVariant || 'normal',
                       textDecoration: element.style.textDecoration || 'none',
                       textTransform: element.style.textTransform || 'none',
                       color: element.style.color || '#374151'
                     }}
                   >
                     {choice.type === 'text' ? choice.content : (choice.content || 'Select Item')}
                   </span>
                </div>
                {showFeedback && (
                  <div className="ml-auto">
                    {isChoiceCorrect ? (
                      <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center animate-bounce-short">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center animate-shake">
                        <X size={14} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-20 text-gray-400 italic text-sm">
            No items added yet.
          </div>
        )}
      </div>

      {isPlaying && choices.length > 0 && !isSubmitted && (
        <button 
          onClick={handleCheck}
          className="mt-6 w-full py-3 bg-brand-primary text-white font-black uppercase tracking-widest rounded-xl shadow-[0_4px_0_0_#904ed9] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
        >
          <Play size={18} fill="currentColor" />
          Check Selection
        </button>
      )}

      {isSubmitted && (
        <div className={`mt-6 p-4 rounded-xl flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300 ${isAllCorrect ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-red-100 text-red-700 border-2 border-red-200'}`}>
          {isAllCorrect ? (
            <>
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <Check size={18} strokeWidth={4} />
              </div>
              <span className="font-black tracking-tight">Great Job! Everything is correct!</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X size={18} strokeWidth={4} />
              </div>
              <span className="font-black tracking-tight">Oops! Check your answers again.</span>
              <button 
                onClick={() => setIsSubmitted(false)}
                className="ml-auto px-4 py-1.5 bg-white/50 hover:bg-white rounded-lg text-[10px] font-black tracking-widest transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- NumberBox Renderer ---
const NumberBoxRenderer = ({ element, isPlaying }: { element: GameElement, isPlaying: boolean }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const choices = element.choices || [];

  const handleCheck = () => {
    setIsSubmitted(true);
  };

  const isAllCorrect = choices.every(c => {
    if (!c.answer) return true; // If no answer specified, it's whatever
    return values[c.id] === c.answer;
  });

  return (
    <div 
      className="w-full h-full flex flex-col p-6 overflow-y-auto relative"
      style={{
        backgroundColor: element.style.backgroundColor,
        borderRadius: element.style.borderRadius,
      }}
    >
      {element.src && (
        <img 
          src={element.src} 
          alt="Question" 
          className="max-h-40 object-contain mx-auto rounded-xl mb-6 shadow-sm ring-4 ring-white"
          referrerPolicy="no-referrer"
        />
      )}
      {element.content && (
        <h3 
          className={`mb-6 tracking-tight leading-tight whitespace-pre-wrap w-full ${element.style.textAlign === 'left' ? 'text-left' : element.style.textAlign === 'right' ? 'text-right' : 'text-center'}`}
          style={{
            textAlign: element.style.textAlign || 'left',
            fontSize: element.style.fontSize || '18px',
            fontWeight: element.style.fontWeight || '900',
            fontFamily: element.style.fontFamily || 'inherit',
            fontStyle: element.style.fontStyle || 'normal',
            fontVariant: element.style.fontVariant || 'normal',
            textDecoration: element.style.textDecoration || 'none',
            textTransform: element.style.textTransform || 'none',
            color: element.style.color || '#1f2937'
          }}
        >
          {element.content}
        </h3>
      )}

      <div 
        className="space-y-4 flex-1"
        style={{ gap: `${element.style.itemSpacing || 16}px`, display: 'flex', flexDirection: 'column' }}
      >
        {choices.length > 0 ? (
          choices.map((choice) => {
            const val = values[choice.id] || '';
            const showFeedback = isSubmitted && choice.answer;
            const isCorrect = val.toLowerCase().trim() === (choice.answer || '').toLowerCase().trim();

            return (
              <div 
                key={choice.id} 
                className={`flex flex-col gap-2 rounded-2xl border-2 transition-all ${
                  showFeedback 
                    ? (isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200')
                    : 'bg-white/30 border-white/20'
                }`}
                style={{ 
                  padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : '16px',
                  minWidth: element.style.itemWidth ? `${element.style.itemWidth}px` : '200px',
                  minHeight: element.style.itemHeight ? `${element.style.itemHeight}px` : 'auto',
                  width: 'fit-content',
                  height: 'auto',
                  maxWidth: '100%',
                  marginBottom: 0 
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {choice.type === 'image' && choice.src && (
                      <img src={choice.src} alt="" className="h-10 w-10 object-contain rounded-lg" referrerPolicy="no-referrer" />
                    )}
                    {choice.type === 'icon' && (
                      <span className="text-xl">{choice.content}</span>
                    )}
                    <span 
                      className={`tracking-widest leading-none flex-1 ${element.style.textAlign === 'left' ? 'text-left' : element.style.textAlign === 'right' ? 'text-right' : 'text-center'}`}
                      style={{
                        textAlign: element.style.textAlign || 'left',
                        fontSize: element.style.fontSize || '10px',
                        fontWeight: element.style.fontWeight || '900',
                        fontFamily: element.style.fontFamily || 'inherit',
                        fontStyle: element.style.fontStyle || 'normal',
                        fontVariant: element.style.fontVariant || 'normal',
                        textDecoration: element.style.textDecoration || 'none',
                        textTransform: element.style.textTransform || 'none',
                        color: element.style.color || '#6b7280'
                      }}
                    >
                      {choice.type === 'text' ? choice.content : (choice.content || 'Enter Value')}
                    </span>
                  </div>
                  {showFeedback && (
                    <div>
                      {isCorrect ? (
                        <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center animate-bounce-short">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center animate-shake">
                          <X size={14} strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <input 
                  type="text"
                  disabled={!isPlaying || isSubmitted}
                  value={val}
                  onChange={(e) => setValues(prev => ({ ...prev, [choice.id]: e.target.value }))}
                  className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-mono text-lg font-black ${
                    showFeedback
                      ? (isCorrect ? 'border-green-300' : 'border-red-300')
                      : 'border-gray-100 focus:border-brand-primary'
                  }`}
                  placeholder="..."
                />
              </div>
            );
          })
        ) : (
          <div className="text-gray-400 italic text-xs text-center py-10">
            No input fields added yet.
          </div>
        )}
      </div>

      {isPlaying && choices.length > 0 && !isSubmitted && (
        <button 
          onClick={handleCheck}
          className="mt-6 w-full py-3 bg-brand-primary text-white font-black uppercase tracking-widest rounded-xl shadow-[0_4px_0_0_#904ed9] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
        >
          <Play size={18} fill="currentColor" />
          Verify Answers
        </button>
      )}

      {isSubmitted && (
        <div className={`mt-6 p-4 rounded-xl flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-300 ${isAllCorrect ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-red-100 text-red-700 border-2 border-red-200'}`}>
          {isAllCorrect ? (
            <>
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                <Check size={18} strokeWidth={4} />
              </div>
              <span className="font-black tracking-tight">Correct! You got them all right!</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">
                <X size={18} strokeWidth={4} />
              </div>
              <span className="font-black tracking-tight">Some answers are wrong. Try again!</span>
              <button 
                onClick={() => setIsSubmitted(false)}
                className="ml-auto px-4 py-1.5 bg-white/50 hover:bg-white rounded-lg text-[10px] font-black tracking-widest transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- Label Renderer ---
const LabelRenderer = ({ element }: { element: GameElement }) => {
  const align = element.style.textAlign || 'center';
  const badgeSize = element.style.labelSize || 32;
  const badgePos = element.style.labelPosition || 'top-left';

  const getBadgePosition = () => {
    if (badgePos === 'free') {
      return {
        left: `${element.style.labelX || 0}%`,
        top: `${element.style.labelY || 0}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    const offset = -badgeSize / 4;
    switch (badgePos) {
      case 'top-right': return { top: offset, right: offset };
      case 'bottom-left': return { bottom: offset, left: offset };
      case 'bottom-right': return { bottom: offset, right: offset };
      default: return { top: offset, left: offset };
    }
  };
  
  return (
    <div 
      className={`w-full h-full flex items-center p-0 leading-none relative ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}
      style={{
        backgroundColor: element.style.backgroundColor || '#FF6B6B',
        borderRadius: element.style.borderRadius || '50%',
        borderWidth: element.style.borderWidth || '0px',
        borderColor: element.style.borderColor || 'transparent',
        borderStyle: element.style.borderStyle || 'solid',
        color: element.style.color || '#ffffff',
        boxShadow: element.style.boxShadow || '0 2px 8px rgba(0,0,0,0.15)',
        transform: `scale(${element.style.scale || 1})`,
        overflow: 'visible'
      }}
    >
      {element.src && (
        <img 
          src={element.src} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ borderRadius: element.style.borderRadius || 'inherit' }}
          referrerPolicy="no-referrer"
        />
      )}
      {element.content && (
        <span 
          className={`break-words font-black select-none pointer-events-none z-10 ${element.src ? 'absolute bottom-2 right-2 bg-black/50 text-white px-2 py-0.5 rounded text-[10px] backdrop-blur-sm' : 'w-full px-2'}`}
          style={{
            fontSize: element.style.fontSize || (element.src ? '10px' : '14px'),
            fontWeight: element.style.fontWeight || '900',
            fontFamily: element.style.fontFamily || 'inherit',
            textAlign: (element.src ? 'right' : align) as any,
            color: element.src ? '#ffffff' : (element.style.color || '#ffffff'),
          }}
        >
          {element.content}
        </span>
      )}
      {element.labelId && (
        <div 
          className="absolute bg-brand-primary text-white font-black shadow-lg border-2 border-white flex items-center justify-center rounded-full z-30"
          style={{
            ...getBadgePosition(),
            width: badgeSize,
            height: badgeSize,
            fontSize: Math.max(10, badgeSize * 0.45),
            backgroundColor: element.style.backgroundColor === '#fb7185' ? '#000000' : '#fb7185'
          }}
        >
          {element.labelId}
        </div>
      )}
    </div>
  );
};

// --- Order Renderer ---
const OrderRenderer = ({ 
  element, 
  isPlaying,
  onAnswer 
}: { 
  element: GameElement; 
  isPlaying: boolean;
  onAnswer?: (correct: boolean) => void;
}) => {
  const [value, setValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const answers = (element.labelId || '').split(',').map(a => a.trim().toLowerCase());
  const isCorrect = answers.includes(value.trim().toLowerCase());

  const handleSubmit = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    if (onAnswer) onAnswer(isCorrect);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      handleSubmit();
    }
  };

  const inputPos = element.style.inputPosition || 'inside';
  const inputX = element.style.inputX ?? 50;
  const inputY = element.style.inputY ?? 100;
  const inputWidth = element.style.inputWidth ?? 100;

  return (
    <div 
      className="w-full h-full relative"
      style={{
        transform: `scale(${element.style.scale || 1})`,
      }}
    >
      <div 
        className="w-full h-full flex flex-col p-6 bg-white rounded-[2rem] shadow-2xl transition-all overflow-hidden"
        style={{
          backgroundColor: element.style.backgroundColor || '#ffffff',
          borderRadius: element.style.borderRadius || '2rem',
          borderWidth: element.style.borderWidth || '0px',
          borderColor: element.style.borderColor || '#eee',
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-0">
          {element.src ? (
            <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-gray-50 shadow-inner group">
              <img 
                src={element.src} 
                alt="" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                referrerPolicy="no-referrer" 
              />
            </div>
          ) : (
            <div className="text-2xl font-black text-center text-gray-800 leading-tight" style={{ fontFamily: element.style.fontFamily }}>
              {element.content}
            </div>
          )}
        </div>

        {inputPos === 'inside' && (
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex gap-3">
              <input 
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={!isPlaying || isSubmitted}
                onKeyDown={handleKeyDown}
                placeholder="Answer..."
                className={`flex-1 px-6 py-4 rounded-2xl border-4 outline-none font-black text-lg transition-all shadow-sm ${
                  isSubmitted 
                    ? (isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-700')
                    : 'border-gray-100 focus:border-brand-primary bg-gray-50'
                }`}
              />
              {isPlaying && !isSubmitted && (
                <button 
                  onClick={handleSubmit}
                  className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
                >
                  Check
                </button>
              )}
            </div>
            {isSubmitted && (
              <div className={`text-center text-sm font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-500' : 'text-red-500 animate-bounce'}`}>
                {isCorrect ? '🌟 CORRECT! 🌟' : 'TRY AGAIN!'}
              </div>
            )}
          </div>
        )}
      </div>

      {inputPos === 'free' && (
        <div 
          className="absolute z-50 flex flex-col gap-3"
          style={{
            left: `${inputX}%`,
            top: `${inputY}%`,
            width: `${inputWidth}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex gap-3">
            <input 
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!isPlaying || isSubmitted}
              onKeyDown={handleKeyDown}
              placeholder="Answer..."
              className={`flex-1 px-6 py-4 rounded-2xl border-4 outline-none font-black text-lg transition-all shadow-[0_10px_30px_rgba(0,0,0,0.2)] ${
                isSubmitted 
                  ? (isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-red-400 bg-red-50 text-red-700')
                  : 'border-white focus:border-brand-primary bg-white/95 backdrop-blur-sm'
              }`}
            />
            {isPlaying && !isSubmitted && (
              <button 
                onClick={handleSubmit}
                className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
              >
                Check
              </button>
            )}
          </div>
          {isSubmitted && (
            <div className={`text-center py-2 px-4 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-sm font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-500' : 'text-red-500 animate-bounce'}`}>
              {isCorrect ? '🌟 CORRECT! 🌟' : 'TRY AGAIN!'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Label Input Renderer ---
const LabelInputRenderer = ({ 
  element, 
  isPlaying, 
  state, 
  onAnswer 
}: { 
  element: GameElement, 
  isPlaying: boolean, 
  state: EditorState,
  onAnswer?: (isCorrect: boolean) => void
}) => {
  const [value, setValue] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const answers = (element.labelId || '').split(',').map(a => a.trim().toLowerCase());
  const isCorrect = answers.includes(value.trim().toLowerCase());

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      setIsSubmitted(true);
      onAnswer?.(isCorrect);
    }
  };

  const badgeSize = element.style.labelSize || 48; // Default bigger
  const badgePos = element.style.labelPosition || 'top-left';

  const getBadgePosition = () => {
    if (badgePos === 'free') {
      return {
        left: `${element.style.labelX || 0}%`,
        top: `${element.style.labelY || 0}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    const offset = -badgeSize / 4;
    switch (badgePos) {
      case 'top-right': return { top: offset, right: offset };
      case 'bottom-left': return { bottom: offset, left: offset };
      case 'bottom-right': return { bottom: offset, right: offset };
      default: return { top: offset, left: offset };
    }
  };

  return (
    <div 
      className="w-full h-full flex flex-col relative"
      style={{
        transform: `scale(${element.style.scale || 1})`,
        zIndex: 10
      }}
    >
      {/* Main Container */}
      <div 
        className="w-full flex-1 flex items-center justify-center p-0 relative overflow-visible"
        style={{
          backgroundColor: element.style.backgroundColor || '#ffffff',
          borderRadius: element.style.borderRadius || '24px',
          borderWidth: element.style.borderWidth || '2px',
          borderColor: isSubmitted 
            ? (isCorrect ? '#10b981' : '#ef4444') 
            : (element.style.borderColor || '#e5e7eb'),
          borderStyle: element.style.borderStyle || 'solid',
          boxShadow: element.style.boxShadow || '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {element.src ? (
          <img 
            src={element.src} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
             <ImageIcon size={40} strokeWidth={1} />
             <span className="text-[10px] uppercase font-black tracking-widest">Image Content Missing</span>
          </div>
        )}

        {/* Badge ID / Input Position - Floating outside/inside */}
        <div 
          className={`absolute rounded-full font-black flex items-center justify-center shadow-2xl border-4 z-30 transition-all ${
            isSubmitted 
              ? (isCorrect ? 'bg-emerald-500 border-emerald-100 text-white' : 'bg-red-500 border-red-100 text-white')
              : 'bg-brand-primary border-white text-white'
          }`}
          style={{
            ...getBadgePosition(),
            width: badgeSize,
            height: badgeSize,
            fontSize: Math.max(12, badgeSize * 0.4),
          }}
        >
          {isPlaying && !isSubmitted ? (
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (val.length <= 10) {
                  setValue(val);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder=""
              className="w-full h-full bg-transparent border-none text-center outline-none text-white placeholder:text-gray-200/50 p-0 font-black"
              autoFocus
            />
          ) : (
            isSubmitted ? value : (element.labelId || '?')
          )}
        </div>
      </div>
    </div>
  );
};

// --- Multiple Choice Renderer ---
const MultipleChoiceRenderer = ({ 
  element, 
  isPlaying,
  projectId,
  onComplete,
  onUpdateChoice
}: { 
  element: GameElement; 
  isPlaying: boolean;
  projectId: string | null;
  onComplete?: (score: number, max: number) => void;
  onUpdateChoice?: (choiceId: string, updates: Partial<Choice>) => void;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const layout = element.style.choiceLayout || 'vertical';
  const spacing = element.style.itemSpacing || 12;

  const handleChoiceClick = (choiceId: string, isCorrect: boolean) => {
    if (!isPlaying || isAnswered) return;
    
    setSelectedId(choiceId);
    setIsAnswered(true);

    if (isPlaying) {
      saveScore({
        id: `score_${Date.now()}`,
        projectId: projectId || 'anonymous',
        sceneId: element.id,
        type: 'multiple-choice',
        isCorrect: isCorrect,
        playedAt: new Date().toISOString()
      });
      onComplete?.(isCorrect ? 1 : 0, 1);
    }
  };

  const renderChoiceContent = (choice: Choice) => {
    const align = element.style.textAlign || element.style.choiceAlign || 'center';
    
    if (choice.type === 'image' && choice.src) {
      return (
        <img 
          src={choice.src} 
          alt="" 
          className="max-w-full max-h-full object-contain rounded-lg pointer-events-none"
          referrerPolicy="no-referrer"
        />
      );
    }
    if (choice.type === 'icon') {
      return <span className="text-3xl">{choice.content}</span>;
    }
    return (
      <span 
        className={`tracking-tight w-full ${align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center'}`}
        style={{
          fontSize: (element.style as any).fontSize || '14px',
          fontWeight: (element.style as any).fontWeight || '700',
          fontFamily: (element.style as any).fontFamily || 'inherit',
          fontStyle: (element.style as any).fontStyle || 'normal',
          fontVariant: (element.style as any).fontVariant || 'normal',
          textDecoration: (element.style as any).textDecoration || 'none',
          textTransform: (element.style as any).textTransform || 'none',
          color: (element.style as any).color || 'inherit'
        }}
      >
        {choice.content}
      </span>
    );
  };

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center p-6 relative"
      style={{ 
        backgroundColor: element.style.backgroundColor,
        borderRadius: element.style.borderRadius,
      }}
    >
      {/* Question / Prompt Area */}
      <div className={`mb-8 w-full text-center ${layout === 'free' ? 'absolute top-6 left-0 right-0' : ''}`}>
        {element.src ? (
          <img 
            src={element.src} 
            alt="Question" 
            className="max-h-32 object-contain mx-auto rounded-lg mb-4"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <h3 
          className="leading-tight whitespace-pre-wrap"
          style={{
            fontSize: element.style.fontSize || '20px',
            fontWeight: element.style.fontWeight || '700',
            fontFamily: element.style.fontFamily || 'inherit',
            fontStyle: element.style.fontStyle || 'normal',
            fontVariant: element.style.fontVariant || 'normal',
            textDecoration: element.style.textDecoration || 'none',
            textTransform: element.style.textTransform || 'none',
            color: element.style.color || '#1f2937'
          }}
        >
          {element.content}
        </h3>
      </div>

      {/* Choices Grid */}
      <div 
        className={`${layout === 'free' ? 'w-full h-full relative' : `flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'} flex-wrap items-center justify-center`}`}
        style={{ gap: spacing }}
      >
        {element.choices?.map((choice) => (
          <motion.button
            key={choice.id}
            drag={!isPlaying && layout === 'free'}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (onUpdateChoice) {
                const snap = 10;
                const newX = (choice.x || 0) + info.offset.x;
                const newY = (choice.y || 0) + info.offset.y;
                onUpdateChoice(choice.id, {
                  x: Math.round(newX / snap) * snap,
                  y: Math.round(newY / snap) * snap
                });
              }
            }}
            onClick={() => handleChoiceClick(choice.id, choice.isCorrect)}
            whileHover={!isAnswered ? { scale: 1.02 } : {}}
            whileTap={!isAnswered ? { scale: 0.98 } : {}}
            style={{
              ...(layout === 'free' ? {
                position: 'absolute' as any,
                left: choice.x || 0,
                top: choice.y || 0,
              } : {}),
              minWidth: element.style.equalSizeItems ? (element.style.choiceWidth || element.style.itemWidth || 180) : (element.style.choiceWidth || element.style.itemWidth || (choice.type === 'image' ? 140 : 'auto')),
              minHeight: element.style.equalSizeItems ? (element.style.choiceHeight || element.style.itemHeight || 180) : (element.style.choiceHeight || element.style.itemHeight || (choice.type === 'image' ? 140 : 'auto')),
              width: element.style.equalSizeItems ? (element.style.choiceWidth || element.style.itemWidth || 180) : ((element.style.choiceWidth || element.style.itemWidth) ? 'fit-content' : 'auto'),
              height: element.style.equalSizeItems ? (element.style.choiceHeight || element.style.itemHeight || 180) : 'auto',
              padding: element.style.itemPadding !== undefined ? `${element.style.itemPadding}px` : undefined,
              maxWidth: '350px',
              transform: `scale(${element.style.scale || 1})`,
            }}
            className={`
              relative rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2
              ${!element.style.itemWidth && choice.type === 'text' && !element.style.equalSizeItems ? 'min-w-[140px]' : ''}
              ${element.style.itemPadding === undefined ? 'px-6 py-4' : ''}
              ${layout === 'free' && !isPlaying ? 'cursor-move' : ''}
              ${!isAnswered 
                ? 'bg-white border-gray-100 hover:border-brand-primary hover:shadow-lg shadow-sm' 
                : selectedId === choice.id 
                  ? choice.isCorrect 
                    ? 'bg-green-50 border-green-500 shadow-green-100' 
                    : 'bg-red-50 border-red-500 shadow-red-100'
                  : choice.isCorrect 
                    ? 'bg-green-50/50 border-green-200 opacity-80' 
                    : 'bg-white border-gray-50 opacity-40'
              }
            `}
          >
            {isAnswered && (
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-300">
                {choice.isCorrect ? (
                  <div className="bg-green-500 text-white p-1 rounded-full"><Check size={16} strokeWidth={4} /></div>
                ) : selectedId === choice.id ? (
                  <div className="bg-red-500 text-white p-1 rounded-full"><X size={16} strokeWidth={4} /></div>
                ) : null}
              </div>
            )}
            
            <div className={`flex items-center w-full min-h-[3rem] ${element.style.choiceAlign === 'left' ? 'justify-start' : element.style.choiceAlign === 'right' ? 'justify-end' : 'justify-center'}`}>
              {renderChoiceContent(choice)}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// --- Smart Transform Tool ---
const TransformTool = ({ 
  element, 
  onTransform,
  onDelete,
  onDuplicate,
  onMoveLayer
}: { 
  element: GameElement; 
  onTransform: (updates: Partial<GameElement>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveLayer: (id: string, action: 'front' | 'back' | 'forward' | 'backward') => void;
}) => {
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  const handleResizeStart = (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    setIsResizing(type);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startXPos = element.x;
    const startYPos = element.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;
      let newY = startYPos;

      if (type.includes('e')) newWidth = Math.max(50, startWidth + deltaX);
      if (type.includes('s')) newHeight = Math.max(50, startHeight + deltaY);
      if (type.includes('w')) {
        const potentialWidth = Math.max(50, startWidth - deltaX);
        if (potentialWidth !== startWidth) {
          newWidth = potentialWidth;
          newX = startXPos + (startWidth - newWidth);
        }
      }
      if (type.includes('n')) {
        const potentialHeight = Math.max(50, startHeight - deltaY);
        if (potentialHeight !== startHeight) {
          newHeight = potentialHeight;
          newY = startYPos + (startHeight - newHeight);
        }
      }

      onTransform({ width: newWidth, height: newHeight, x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);

    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      onTransform({ style: { ...element.style, rotation: angle + 90 } });
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Highlight Border */}
      <div className="absolute pointer-events-none border-2 border-brand-primary" 
        style={{ 
          top: -4, left: -4, 
          width: element.width + 8, 
          height: element.height + 8,
          borderRadius: element.style.borderRadius
        }} 
      />
      
      {/* Main Control Toolbar (Floating Top) */}
      <div 
        className="absolute bottom-[calc(100%+16px)] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center bg-white shadow-2xl border border-gray-100 rounded-2xl p-1.5 gap-1.5 ring-4 ring-black/5"
      >
        {/* Layer Controls */}
        <div className="flex items-center gap-1 pr-2 border-r border-gray-100">
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveLayer(element.id, 'back'); }}
            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-gray-50 rounded-xl transition-all"
            title="Send to Back"
          >
            <ChevronsDown size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveLayer(element.id, 'backward'); }}
            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-gray-50 rounded-xl transition-all"
            title="Move Backward"
          >
            <ChevronDown size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveLayer(element.id, 'forward'); }}
            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-gray-50 rounded-xl transition-all"
            title="Move Forward"
          >
            <ChevronUp size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveLayer(element.id, 'front'); }}
            className="p-2 text-gray-400 hover:text-brand-primary hover:bg-gray-50 rounded-xl transition-all"
            title="Bring to Front"
          >
            <ChevronsUp size={16} />
          </button>
        </div>

        {/* Action Tools */}
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(element.id); }}
          className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm"
          title="Duplicate"
        >
          <Copy size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
          className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Resize Handles */}
      {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((pos) => (
        <div
          key={pos}
          onMouseDown={(e) => handleResizeStart(e, pos)}
          className={`absolute w-4 h-4 bg-white border-2 border-brand-primary rounded-full z-30 pointer-events-auto shadow-md hover:scale-125 transition-transform cursor-${pos === 'n' || pos === 's' ? 'ns' : pos === 'e' || pos === 'w' ? 'ew' : pos === 'nw' || pos === 'se' ? 'nwse' : 'nesw'}-resize`}
          style={{
            top: pos.includes('n') ? -8 : pos.includes('s') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
            left: pos.includes('w') ? -8 : pos.includes('e') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
          }}
        />
      ))}

      {/* Rotation Handle (Bottom Bar) */}
      <div 
        onMouseDown={handleRotateStart}
        className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-10 h-10 bg-white border-2 border-brand-primary rounded-full z-30 flex items-center justify-center cursor-pointer pointer-events-auto hover:bg-brand-primary transition-all shadow-xl group hover:scale-110 active:scale-95"
      >
        <RotateCw size={18} className="text-brand-primary group-hover:text-white" />
      </div>
    </>
  );
};

const FAMOUS_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Playfair Display', 
  'Merriweather', 'Space Grotesk', 'Comic Sans MS', 'Arial', 'Times New Roman', 'Courier New'
];

export default function App() {
  const [state, setState] = useState<EditorState>({
    scenes: [INITIAL_SCENE],
    currentSceneId: 'scene-1',
    selectedElementId: null,
    editingElementId: null,
    zoom: 1,
    viewMode: 'desktop',
    isPlaying: false,
    appView: 'dashboard',
    playSettings: DEFAULT_PLAY_SETTINGS,
  });

  const [history, setHistory] = useState<EditorState[]>([]);
  const [redoStack, setRedoStack] = useState<EditorState[]>([]);
  const [user, setUser] = useState<any>({ displayName: 'Local Designer', uid: 'local_user' });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('My AI Course');
  const [projectDescription, setProjectDescription] = useState('Interactive learning module');
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ title: '', pageCount: 1 });

  // Required Utility Functions
  const loadProjects = useCallback(() => {
    setIsLoadingProjects(true);
    const projects = loadProjectsFromStorage();
    setProjectsList(projects);
    const savedScores = loadScoresFromStorage();
    setScores(savedScores);
    setIsLoadingProjects(false);
  }, []);

  const saveProjects = useCallback((projects: Project[]) => {
    saveProjectsToStorage(projects);
    setProjectsList(projects);
  }, []);

  const saveCurrentProject = useCallback(async (status: 'Draft' | 'Published' = 'Draft') => {
    setIsSaving(true);
    try {
      const projects = loadProjectsFromStorage();
      const now = new Date().toISOString();
      const existingProjectIndex = projects.findIndex(p => p.id === currentProjectId);

      const projectData: Project = {
        id: currentProjectId || `project_${Date.now()}`,
        title: projectName,
        description: projectDescription,
        status: status,
        createdAt: existingProjectIndex >= 0 ? projects[existingProjectIndex].createdAt : now,
        updatedAt: now,
        scenes: state.scenes,
        playSettings: state.playSettings,
      };

      let updatedProjects: Project[];
      if (existingProjectIndex >= 0) {
        updatedProjects = [...projects];
        updatedProjects[existingProjectIndex] = projectData;
      } else {
        updatedProjects = [projectData, ...projects];
        setCurrentProjectId(projectData.id);
        saveCurrentProjectId(projectData.id);
      }

      saveProjects(updatedProjects);
      setHasUnsavedChanges(false);
      
      if (status === 'Draft') {
        setState(prev => ({ ...prev, appView: 'dashboard' }));
      }
    } catch (error) {
      console.error("Error saving project", error);
    } finally {
      setIsSaving(false);
    }
  }, [currentProjectId, projectName, projectDescription, state.scenes, state.playSettings, saveProjects]);

  const createNewProject = useCallback((title: string, count: number) => {
    setCurrentProjectId(null);
    saveCurrentProjectId(null);
    setProjectName(title || 'New Course Module');
    setProjectDescription('Interactive learning module');
    
    const initialScenes = Array.from({ length: Math.max(1, count) }, (_, i) => ({
      ...INITIAL_SCENE,
      id: `scene-${Date.now()}-${i}`,
      name: `Test Page ${i + 1}`
    }));

    setState({
      scenes: initialScenes,
      currentSceneId: initialScenes[0].id,
      selectedElementId: null,
      editingElementId: null,
      zoom: 1,
      viewMode: 'desktop',
      isPlaying: false,
      appView: 'editor',
      playSettings: DEFAULT_PLAY_SETTINGS,
    });
    setHistory([]);
    setRedoStack([]);
    setShowNewProjectModal(false);
    setNewProjectForm({ title: '', pageCount: 1 });
    setHasUnsavedChanges(true);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    const projects = loadProjectsFromStorage();
    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveProjects(updatedProjects);
    
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
      saveCurrentProjectId(null);
      setState({
        scenes: [INITIAL_SCENE],
        currentSceneId: 'scene-1',
        selectedElementId: null,
        editingElementId: null,
        zoom: 1,
        viewMode: 'desktop',
        isPlaying: false,
        appView: 'dashboard',
        playSettings: DEFAULT_PLAY_SETTINGS,
      });
    }
  }, [currentProjectId, saveProjects]);

  const duplicateProject = useCallback((projectId: string) => {
    const projects = loadProjectsFromStorage();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newProject: Project = {
      ...project,
      id: `project_${Date.now()}`,
      title: `${project.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProjects([newProject, ...projects]);
  }, [saveProjects]);

  const handleSyncToRepo = async () => {
    setIsSaving(true);
    try {
      const resp = await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: projectsList, scores })
      });
      const data = await resp.json();
      if (data.success) {
        alert('Module data synced to project files! Go to Settings -> Export to GitHub to push your changes.');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      // 1. Load from storage
      const projects = loadProjectsFromStorage();
      const savedScores = loadScoresFromStorage();
      
      // 2. Check if we should seed from backend (only if storage is empty)
      if (projects.length === 0) {
        try {
          const resp = await fetch('/api/seed-data');
          const seed = await resp.json();
          if (seed.projects && seed.projects.length > 0) {
            saveProjectsToStorage(seed.projects);
            setProjectsList(seed.projects);
            if (seed.scores) setScores(seed.scores);
          } else {
            setProjectsList(projects);
            setScores(savedScores);
          }
        } catch (e) {
          setProjectsList(projects);
          setScores(savedScores);
        }
      } else {
        setProjectsList(projects);
        setScores(savedScores);
      }
      
      const savedId = loadCurrentProjectId();
      if (savedId) {
        handleLoadProject(savedId);
      }
    };

    initData();
  }, []);

  // Auto Save Logic
  useEffect(() => {
    if (!state.isPlaying && state.appView === 'editor' && hasUnsavedChanges && currentProjectId) {
      const timer = setInterval(() => {
        console.log('Auto-saving...');
        // We can't easily call saveCurrentProject here without dependency issues or re-renders
        // But we can trigger a silent save
        const silentSave = () => {
          const projects = loadProjectsFromStorage();
          const existingProjectIndex = projects.findIndex(p => p.id === currentProjectId);
          if (existingProjectIndex >= 0) {
            const projectData: Project = {
              ...projects[existingProjectIndex],
              title: projectName,
              description: projectDescription,
              updatedAt: new Date().toISOString(),
              scenes: state.scenes,
              playSettings: state.playSettings,
            };
            const updatedProjects = [...projects];
            updatedProjects[existingProjectIndex] = projectData;
            saveProjectsToStorage(updatedProjects);
            setProjectsList(updatedProjects);
            setHasUnsavedChanges(false);
          }
        };
        silentSave();
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [state.isPlaying, state.appView, hasUnsavedChanges, currentProjectId, projectName, projectDescription, state.scenes, state.playSettings]);

  const handleLoadProject = (id: string) => {
    const projects = loadProjectsFromStorage();
    const project = projects.find(p => p.id === id);
    if (project) {
      setState(prev => ({
        ...prev,
        scenes: project.scenes,
        currentSceneId: project.scenes[0]?.id || 'scene-1',
        selectedElementId: null,
        playSettings: project.playSettings || DEFAULT_PLAY_SETTINGS
      }));
      setHistory([]);
      setRedoStack([]);
      setCurrentProjectId(id);
      saveCurrentProjectId(id);
      setProjectName(project.title || 'Untitled Project');
      setProjectDescription(project.description || '');
      setHasUnsavedChanges(false);
    }
  };

  const handleSaveProject = async () => {
    await saveCurrentProject('Draft');
  };

  const handlePublishProject = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project title before publishing.');
      return;
    }
    await saveCurrentProject('Published');
    alert('Project published successfully!');
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
  };

  const handleLogin = async () => {
    // Simulated login for UI consistency
    setUser({ displayName: 'Local Designer', uid: 'local_user' });
  };

  const handleLogout = async () => {
    setUser(null);
    setCurrentProjectId(null);
    saveCurrentProjectId(null);
    setState({
      scenes: [INITIAL_SCENE],
      currentSceneId: 'scene-1',
      selectedElementId: null,
      editingElementId: null,
      zoom: 1,
      viewMode: 'desktop',
      isPlaying: false,
      appView: 'dashboard',
      playSettings: DEFAULT_PLAY_SETTINGS,
    });
  };

  const handleNewProject = (title: string, count: number) => {
    createNewProject(title, count);
  };

  const handleOpenProject = (id: string, startPlaying = false) => {
    handleLoadProject(id);
    setState(prev => ({ ...prev, appView: 'editor', isPlaying: startPlaying }));
  };

  const [gameTime, setGameTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [totalScores, setTotalScores] = useState<{sceneId: string, score: number, max: number}[]>([]);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (state.isPlaying && !showResults) {
      interval = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    } else if (!state.isPlaying) {
      setGameTime(0);
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Wrap state updates with history tracking
  const pushToHistory = useCallback((newState: EditorState) => {
    setHistory(prev => [...prev, state].slice(-50)); // Keep last 50 steps
    setRedoStack([]); // Clear redo stack on new action
    setState(newState);
    setHasUnsavedChanges(true);
  }, [state]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack(r => [state, ...r]);
    setHistory(h => h.slice(0, -1));
    setState(prev);
  }, [history, state]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(h => [...h, state]);
    setRedoStack(r => r.slice(1));
    setState(next);
  }, [redoStack, state]);

  // Keyboard support for Deletion and Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElementId) {
        handleDeleteElement(state.selectedElementId);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElementId, handleUndo, handleRedo]);

  const [activeTab, setActiveTab] = useState<'elements' | 'scenes' | 'projects'>('elements');
  const [searchTerm, setSearchTerm] = useState('');

  const currentScene = state.scenes.find(s => s.id === state.currentSceneId) || state.scenes[0];
  const selectedElement = currentScene.elements.find(e => e.id === state.selectedElementId);

  // --- Handlers ---
  const handleAddElement = (type: WidgetType, icon?: string) => {
    const newElement: GameElement = {
      id: `el-${Date.now()}`,
      name: `New ${type}`,
      type,
      x: 100,
      y: 100,
      z: currentScene.elements.length + 1,
      width: type === 'character' ? 80 : 200,
      height: type === 'character' ? 80 : 60,
      style: {
        fontSize: '16px',
        color: '#000',
        backgroundColor: type === 'button' ? '#FF6B6B' : 'transparent',
        borderRadius: '8px',
        rotation: 0,
      },
      content: type === 'character' ? (icon || '❓') : (type === 'text' ? 'New Text' : 'Click Me'),
      interactions: [],
    };

    if (type === 'quiz') {
      newElement.width = 600;
      newElement.height = 300;
      newElement.style = {
        orientation: 'horizontal',
        itemWidth: 120,
        itemHeight: 80,
        itemSpacing: 20,
        layoutMode: 'grid',
        backgroundColor: '#ffffff80',
        borderRadius: '16px',
        padding: '20px',
        rotation: 0,
      };
      newElement.pairs = [
        { id: `p-${Date.now()}`, leftType: 'text', leftContent: 'Question', rightType: 'text', rightContent: 'Answer' }
      ];
    } else if (type === 'multiple-choice') {
      newElement.width = 500;
      newElement.height = 400;
      newElement.content = 'Select the correct answer:';
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        choiceLayout: 'vertical',
        itemSpacing: 12,
      };
      newElement.choices = [
        { id: `c-${Date.now()}-1`, type: 'text', content: 'Correct Answer', isCorrect: true },
        { id: `c-${Date.now()}-2`, type: 'text', content: 'Wrong Answer', isCorrect: false },
      ];
    } else if (type === 'fill-in-the-blank') {
      newElement.width = 600;
      newElement.height = 300;
      newElement.content = 'We are learning [blank] (fill in the blank).';
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        padding: '20px',
      };
      newElement.blanks = [
        { id: `b-${Date.now()}`, answer: 'everything', placeholder: 'Type here...' }
      ];
    } else if (type === 'order') {
      newElement.width = 400;
      newElement.height = 300;
      newElement.content = 'What order is this?';
      newElement.labelId = '1';
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#ffffff',
        borderRadius: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        padding: '24px',
      };
      newElement.src = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400&h=400&fit=crop';
    } else if (type === 'sequencing') {
      newElement.width = 600;
      newElement.height = 350;
      newElement.content = 'Put these in order:';
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        orderingMode: 'auto',
      };
      newElement.choices = [
        { id: `c-${Date.now()}-1`, type: 'icon', content: '🥚', isCorrect: true },
        { id: `c-${Date.now()}-2`, type: 'icon', content: '🐣', isCorrect: true },
        { id: `c-${Date.now()}-3`, type: 'icon', content: '🐥', isCorrect: true },
      ];
    } else if (type === 'checkbox') {
      newElement.width = 150;
      newElement.height = 40;
      newElement.content = 'Checkbox Label';
    } else if (type === 'image') {
      newElement.width = 200;
      newElement.height = 200;
      newElement.src = 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400&h=400&fit=crop';
      newElement.style = {
        ...newElement.style,
        objectFit: 'cover',
        borderRadius: '12px',
      };
    } else if (type === 'video') {
      newElement.width = 400;
      newElement.height = 225;
      newElement.src = ''; // User will provide URL
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#000000',
        borderRadius: '12px',
      };
    } else if (type === 'numberbox') {
      newElement.width = 100;
      newElement.height = 60;
      newElement.content = 'Count';
    } else if (type === 'label') {
      newElement.width = 40;
      newElement.height = 40;
      newElement.content = '1';
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#FF6B6B',
        borderRadius: '50%',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '900',
        textAlign: 'center',
      };
    } else if (type === 'label-input') {
      newElement.width = 120;
      newElement.height = 40;
      newElement.content = 'Answer'; // The correct answer
      newElement.labelId = '1';
      newElement.style = {
        ...newElement.style,
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        borderColor: '#e5e7eb',
        borderWidth: '2px',
        fontSize: '14px',
        fontWeight: 'bold',
      };
    }

    pushToHistory({
      ...state,
      scenes: state.scenes.map(s => s.id === state.currentSceneId 
        ? { ...s, elements: [...s.elements, newElement] } 
        : s),
      selectedElementId: newElement.id,
    });
  };

  const updateElement = (id: string, updates: Partial<GameElement>) => {
    pushToHistory({
      ...state,
      scenes: state.scenes.map(s => s.id === state.currentSceneId 
        ? { ...s, elements: s.elements.map(e => e.id === id ? { ...e, ...updates } : e) } 
        : s)
    });
  };

  const updatePlaySettings = (settings: Partial<PlaySettings>) => {
    pushToHistory({
      ...state,
      playSettings: { ...state.playSettings, ...settings }
    });
  };

  const handleReorderElements = (newElements: GameElement[]) => {
    // Photoshop order: Top in list is on top of canvas. 
    // This means the first item in the reorder list should have the highest Z.
    const updatedElements = [...newElements].reverse().map((el, idx) => ({
      ...el,
      z: idx
    })).reverse();
    
    // Actually, simply reverse back isn't needed if we mapping correctly.
    // Let's just do: index 0 (top of list) is highest z.
    const reindexed = newElements.map((el, idx) => ({
      ...el,
      z: newElements.length - idx
    }));

    pushToHistory({
      ...state,
      scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, elements: reindexed } : s)
    });
  };

  const handleUpdateChoice = (elementId: string, choiceId: string, updates: Partial<Choice>) => {
    const el = currentScene.elements.find(e => e.id === elementId);
    if (!el || !el.choices) return;
    
    const newChoices = el.choices.map(c => 
      c.id === choiceId ? { ...c, ...updates } : c
    );
    
    updateElement(elementId, { choices: newChoices });
  };

  const handleCenterElement = (id: string, axis: 'x' | 'y' | 'both') => {
    const el = currentScene.elements.find(e => e.id === id);
    if (!el) return;
    
    const containerWidth = 1024; // Base canvas width
    const containerHeight = 576; // Base canvas height
    
    const updates: Partial<GameElement> = {};
    if (axis === 'x' || axis === 'both') updates.x = (containerWidth - el.width) / 2;
    if (axis === 'y' || axis === 'both') updates.y = (containerHeight - el.height) / 2;
    
    updateElement(id, updates);
  };

  const updateStyle = (id: string, updates: Partial<GameElement['style']>) => {
    const el = currentScene.elements.find(e => e.id === id);
    if (el) {
      updateElement(id, { style: { ...el.style, ...updates } });
    }
  };

  const handleDuplicateElement = (id: string) => {
    const el = currentScene.elements.find(e => e.id === id);
    if (!el) return;
    
    const newElement: GameElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: `el-${Date.now()}`,
      name: `${el.name} (Copy)`,
      x: el.x + 20,
      y: el.y + 20,
    };

    pushToHistory({
      ...state,
      selectedElementId: newElement.id,
      scenes: state.scenes.map(s => s.id === state.currentSceneId 
        ? { ...s, elements: [...s.elements, newElement] } 
        : s)
    });
  };

  const moveElementLayer = (id: string, action: 'front' | 'back' | 'forward' | 'backward') => {
    const scene = state.scenes.find(s => s.id === state.currentSceneId);
    if (!scene) return;
    
    let elements = [...scene.elements].sort((a, b) => a.z - b.z);
    const index = elements.findIndex(e => e.id === id);
    if (index === -1) return;

    const el = elements[index];
    
    if (action === 'front') {
      elements.splice(index, 1);
      elements.push(el);
    } else if (action === 'back') {
      elements.splice(index, 1);
      elements.unshift(el);
    } else if (action === 'forward') {
      if (index === elements.length - 1) return;
      elements[index] = elements[index + 1];
      elements[index + 1] = el;
    } else if (action === 'backward') {
      if (index === 0) return;
      elements[index] = elements[index - 1];
      elements[index - 1] = el;
    }

    const updatedElements = elements.map((e, idx) => ({ ...e, z: idx + 1 }));
    
    pushToHistory({
      ...state,
      scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, elements: updatedElements } : s)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        if (uploadTargetId === 'background') {
          pushToHistory({
            ...state,
            scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, background: { ...s.background, image: src } } : s)
          });
        } else {
          const img = new Image();
          img.onload = () => {
            const updates: Partial<GameElement> = { src };
            const el = currentScene.elements.find(e => e.id === uploadTargetId);
            if (el && (el.type === 'image' || !el.width)) {
              // Auto adjust size for images or if size not set
              const maxDim = 400;
              let w = img.width;
              let h = img.height;
              if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
              }
              updates.width = w;
              updates.height = h;
            }
            updateElement(uploadTargetId as string, updates);
          };
          img.src = src;
        }
        setUploadTargetId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDuplicateChoice = (elementId: string, choiceId: string) => {
    const el = currentScene.elements.find(e => e.id === elementId);
    if (!el || !el.choices) return;
    
    const choice = el.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const newChoice = {
      ...JSON.parse(JSON.stringify(choice)),
      id: `c-copy-${Date.now()}`
    };

    const choiceIndex = el.choices.findIndex(c => c.id === choiceId);
    const newChoices = [...el.choices];
    newChoices.splice(choiceIndex + 1, 0, newChoice);

    updateElement(elementId, { choices: newChoices });
  };

  const handleDeleteElement = (id: string) => {
    pushToHistory({
      ...state,
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      scenes: state.scenes.map(s => s.id === state.currentSceneId 
        ? { ...s, elements: s.elements.filter(e => e.id !== id) } 
        : s)
    });
  };

  // Expose for TransformTool
  useEffect(() => {
    (window as any).handleDeleteElement = handleDeleteElement;
    (window as any).handleDuplicateElement = handleDuplicateElement;
    return () => {
      delete (window as any).handleDeleteElement;
      delete (window as any).handleDuplicateElement;
    };
  }, [handleDeleteElement, handleDuplicateElement]);

  const handleAddScene = () => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${state.scenes.length + 1}`,
      background: { color: '#ffffff' },
      elements: [],
    };
    pushToHistory({
      ...state,
      scenes: [...state.scenes, newScene],
      currentSceneId: newScene.id,
    });
  };

  const handleNextScene = useCallback(() => {
    const currentIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
    if (currentIndex < state.scenes.length - 1) {
      setState(p => ({ ...p, currentSceneId: state.scenes[currentIndex + 1].id }));
    }
  }, [state.scenes, state.currentSceneId]);

  const handlePrevScene = useCallback(() => {
    const currentIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
    if (currentIndex > 0) {
      setState(p => ({ ...p, currentSceneId: state.scenes[currentIndex - 1].id }));
    }
  }, [state.scenes, state.currentSceneId]);

  const handleSceneComplete = (score: number, max: number) => {
    const currentScene = state.scenes.find(s => s.id === state.currentSceneId);
    if (currentScene?.isFinalPage) return; // Don't score final page

    setTotalScores(prev => {
      const filtered = prev.filter(s => s.sceneId !== state.currentSceneId);
      return [...filtered, { sceneId: state.currentSceneId, score, max }];
    });
    
    // Auto proceed to next scene or end game
    setTimeout(() => {
      const currentIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);
      const nextScene = state.scenes[currentIndex + 1];
      
      if (nextScene) {
        setState(p => ({ ...p, currentSceneId: nextScene.id }));
      } else {
        setShowResults(true);
      }
    }, 1000);
  };

  const resetGame = () => {
    setTotalScores([]);
    setShowResults(false);
    setState(p => ({ ...p, currentSceneId: state.scenes[0].id, isPlaying: true }));
  };
  const currentSceneIndex = state.scenes.findIndex(s => s.id === state.currentSceneId);

  if (state.appView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Dashboard Header */}
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/20">C</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-orange-950 tracking-tight">CourseCraft</h1>
              <p className="text-xs font-bold text-orange-700/50 uppercase tracking-widest">Learning Management Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Search className="text-gray-300" size={20} />
              <input 
                type="text" 
                placeholder="Search courses..." 
                className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 ring-orange-100 outline-none w-64"
              />
            </div>
            
            {user ? (
              <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-black text-gray-800 leading-none">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[10px] font-bold text-red-400 hover:text-red-500 uppercase tracking-widest mt-1 transition-colors">Sign Out</button>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-black text-lg border-2 border-orange-200">
                  {user.displayName?.[0] || 'U'}
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
              >
                <LogIn size={16} /> Login to Create
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">My Learning Modules</h2>
              <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[9px]">Total {projectsList.length} modules</p>
            </div>
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20 group"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform" /> New Module
            </button>
          </div>

          <AnimatePresence>
            {showNewProjectModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowNewProjectModal(false)}
                  className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative z-10 border border-orange-100"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                      <Plus size={24} />
                    </div>
                    <button onClick={() => setShowNewProjectModal(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-2">New Module Test</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Configure your interactive course</p>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-2 px-1">Module Test Title</label>
                      <input 
                        type="text"
                        value={newProjectForm.title}
                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Science Quiz - Level 1"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-orange-500 outline-none transition-all placeholder:text-gray-300"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-2 px-1">Number of Test Pages</label>
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        value={newProjectForm.pageCount}
                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, pageCount: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) }))}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:border-orange-500 outline-none transition-all"
                      />
                      <p className="text-[9px] font-bold text-gray-400 mt-2 italic px-1">You can add more pages later in the editor</p>
                    </div>

                    <div className="pt-4">
                      <button 
                        onClick={() => handleNewProject(newProjectForm.title, newProjectForm.pageCount)}
                        className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl active:scale-95"
                      >
                        Launch Editor
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {!user ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-orange-50/30 to-transparent pointer-events-none" />
              
              <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                <LogIn size={40} />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight text-center">Ready to build?</h3>
              <p className="text-gray-500 font-bold mb-8 text-center max-w-sm px-6 leading-relaxed uppercase text-[10px] tracking-[0.2em]">
                Securely sign in with Google to create, save, and manage your interactive learning modules.
              </p>
              
              <button 
                onClick={handleLogin}
                className="flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-gray-200 hover:shadow-orange-500/20 active:scale-95 group/btn"
              >
                <div className="flex items-center justify-center w-6 h-6 bg-white rounded-md">
                   <span className="text-gray-900 text-[10px]">G</span>
                </div>
                Sign in with Google
              </button>
              
              <div className="mt-8 flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <Check size={12} className="text-green-500" /> Auto-save enabled
                <span className="mx-2 text-gray-200">|</span>
                <Check size={12} className="text-green-500" /> Cloud sync active
              </div>
            </div>
          ) : isLoadingProjects ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="text-orange-500 animate-spin mb-4" size={32} />
              <p className="text-gray-400 font-black uppercase tracking-widest text-[9px]">Syncing...</p>
            </div>
          ) : projectsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-orange-100 shadow-sm">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-200 mb-4">
                <Box size={32} />
              </div>
              <h3 className="text-lg font-black text-gray-800 mb-2 tracking-tight">No courses found</h3>
              <p className="text-gray-400 font-bold mb-6 text-[9px] uppercase tracking-widest">Create your first lesson to see it here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-12 max-w-4xl">
              {/* Modules List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-gray-400 font-mono tracking-widest uppercase">My Learning Inventory</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSyncToRepo}
                      disabled={isSaving}
                      className="px-3 py-1 bg-black text-white hover:bg-gray-800 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Cloud size={10} className={isSaving ? 'animate-spin' : ''} />
                      Sync to Repository (GitHub)
                    </button>
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      {projectsList.length} Modules Total
                    </div>
                  </div>
                </div>
                {projectsList.map(p => (
                  <div 
                    key={p.id} 
                    className="group bg-white rounded-2xl p-3 border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-lg hover:shadow-orange-500/5 transition-all cursor-pointer flex items-center gap-4 relative"
                    onClick={() => handleOpenProject(p.id)}
                  >
                    {/* Left: Thumbnail Icon */}
                    <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center text-orange-200 group-hover:bg-orange-100 transition-colors shrink-0 overflow-hidden relative">
                      <Box size={24} className="group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 backdrop-blur-sm bg-white/40 transition-all">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProject(p.id, true);
                          }}
                          className="p-1.5 bg-green-500 text-white rounded-lg shadow-md hover:scale-110 active:scale-95 transition-all"
                          title="Play"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProject(p.id, false);
                          }}
                          className="p-1.5 bg-orange-500 text-white rounded-lg shadow-md hover:scale-110 active:scale-95 transition-all"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Center: Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors tracking-tight line-clamp-1">{p.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Play size={10} className="text-orange-400" />
                          <span className="text-gray-400 font-bold text-[8px] uppercase tracking-widest">{p.status}</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-200 rounded-full" />
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-bold text-[8px] uppercase tracking-widest">{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 pr-2">
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateProject(p.id);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenProject(p.id, false);
                          }}
                          className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                          title="Quick Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(p.id);
                        }}
                        className="p-2 text-gray-200 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={18} className="text-gray-200 group-hover:text-orange-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Test Activities */}
              {scores.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-gray-400 font-mono tracking-widest uppercase">Learner Performance Logs</h3>
                    <div className="px-3 py-1 bg-green-50 rounded-full text-[9px] font-black text-green-600 uppercase tracking-widest">
                      {scores.length} Records Verified
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50">
                      {scores.slice().reverse().slice(0, 5).map(score => {
                        const project = projectsList.find(p => p.id === score.projectId);
                        return (
                          <div key={score.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${score.isCorrect !== false ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                                {score.type === 'multiple-choice' ? <CheckSquare size={18} /> : <Layers size={18} />}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-gray-900 tracking-tight uppercase">{project?.title || 'Archived Module'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{score.type?.replace('-', ' ')}</span>
                                  <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                  <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{new Date(score.playedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {score.isCorrect !== undefined ? (
                                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${score.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {score.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="text-[14px] font-black text-orange-500 leading-none">{Math.round((score.correctPairs! / score.totalPairs!) * 100)}%</span>
                                  <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter mt-1">{score.correctPairs}/{score.totalPairs} Points</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="py-12 px-8 flex flex-col items-center border-t border-gray-100 bg-white">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">Powered by CourseCraft LMS Engine</p>
          <div className="flex gap-8 text-[10px] font-bold text-gray-400 tracking-widest uppercase">
            <a href="#" className="hover:text-orange-500 transition-colors">Documentation</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Support</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Terms of Use</a>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden text-gray-800 ${state.isPlaying ? 'bg-black' : 'bg-gray-100'}`}>
      {/* Top Navigation - Only in Editor */}
      {!state.isPlaying && (
        <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold shadow-soft">C</div>
            <div className="flex flex-col">
              <span className="text-sm font-black leading-tight text-orange-900 tracking-tight">CourseCraft</span>
              <span className="text-[10px] text-gray-400 font-medium">V1.4 PRO LMS</span>
            </div>
            <div className="ml-4 flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button 
                onClick={() => setState(p => ({ ...p, appView: 'dashboard' }))}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-gray-500 hover:bg-white hover:shadow-sm hover:text-orange-600 transition-all"
              >
                <Monitor size={14} /> Dashboard
              </button>
              <div className="h-4 w-px bg-gray-200 mx-1" />
              <button 
                onClick={() => setState(p => ({ ...p, isPlaying: false }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${!state.isPlaying ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500'}`}
              >
                <Edit3 size={14} /> Design
              </button>
              <button 
                onClick={() => setState(p => ({ ...p, isPlaying: true }))}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${state.isPlaying ? 'bg-white shadow-sm text-green-500' : 'text-gray-500'}`}
              >
                <Play size={14} /> Play
              </button>
            </div>
            
            {user ? (
              <div className="ml-2 flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                <div 
                  onClick={handleLogout}
                  className="w-5 h-5 bg-brand-secondary rounded-full flex items-center justify-center text-[10px] text-white font-bold cursor-pointer hover:bg-red-500 transition-colors"
                  title="Click to Logout"
                >
                  {user.displayName?.[0] || 'U'}
                </div>
                <span className="text-[10px] font-bold text-gray-500 truncate max-w-[100px]">{user.displayName}</span>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="ml-2 flex items-center gap-1.5 px-3 py-1 bg-brand-secondary text-white rounded-full text-xs font-bold hover:bg-opacity-90 transition-all"
              >
                <LogIn size={14} /> Login
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-4">
              <button 
                onClick={() => setState(p => ({ ...p, viewMode: 'desktop' }))}
                className={`p-1.5 rounded-md transition-all ${state.viewMode === 'desktop' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
              >
                <Monitor size={16} />
              </button>
              <button 
                onClick={() => setState(p => ({ ...p, viewMode: 'tablet' }))}
                className={`p-1.5 rounded-md transition-all ${state.viewMode === 'tablet' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
              >
                <Tablet size={16} />
              </button>
              <button 
                onClick={() => setState(p => ({ ...p, viewMode: 'mobile' }))}
                className={`p-1.5 rounded-md transition-all ${state.viewMode === 'mobile' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
              >
                <Smartphone size={16} />
              </button>
            </div>
            <button 
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${history.length === 0 ? 'opacity-30' : 'text-gray-500'}`}
            >
              <Undo size={18} />
            </button>
            <button 
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${redoStack.length === 0 ? 'opacity-30' : 'text-gray-500'}`}
            >
              <Redo size={18} />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2" />
            <button 
              onClick={handleSaveProject}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold shadow-sm transition-all transform active:scale-95 ${isSaving ? 'opacity-50' : ''}`}
            >
              <Save size={16} className={isSaving && !currentProjectId?.includes('pub') ? 'animate-spin' : ''} />
              {isSaving && !currentProjectId?.includes('pub') ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
              onClick={handlePublishProject}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-1.5 bg-brand-primary hover:bg-opacity-90 text-white rounded-lg text-sm font-bold shadow-md transition-all transform active:scale-95 ${isSaving ? 'opacity-50' : ''}`}
            >
              <Globe size={16} className={isSaving && currentProjectId?.includes('pub') ? 'animate-spin' : ''} />
              {isSaving && currentProjectId?.includes('pub') ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </nav>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Only in Editor */}
        {!state.isPlaying && (
          <aside className="w-72 bg-white border-r border-gray-200 flex flex-col z-40">
            <div className="flex p-2 border-b border-gray-100">
              {(['elements', 'scenes', 'projects'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-bold capitalize transition-all border-b-2 ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'elements' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={12} className="text-brand-primary" /> Core Components
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {UI_ELEMENTS.map(el => (
                        <button
                          key={el.type}
                          onClick={() => handleAddElement(el.type)}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 hover:border-brand-primary hover:bg-red-50 group transition-all"
                        >
                          <el.icon size={20} className="text-gray-400 group-hover:text-brand-primary mb-1.5" />
                          <span className="text-[10px] font-bold text-gray-500 group-hover:text-brand-primary">{el.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <Layers size={12} className="text-brand-secondary" /> Scene Layers
                    </h3>
                    <Reorder.Group 
                      axis="y" 
                      values={[...currentScene.elements].sort((a, b) => b.z - a.z)} 
                      onReorder={handleReorderElements}
                      className="space-y-2"
                    >
                      {[...currentScene.elements].sort((a, b) => b.z - a.z).map(el => (
                        <Reorder.Item
                          key={el.id}
                          value={el}
                          className={`p-3 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing group transition-all ${state.selectedElementId === el.id ? 'bg-brand-primary text-white shadow-lg ring-2 ring-brand-primary/20' : 'bg-white border border-gray-100 hover:border-gray-200 shadow-sm'}`}
                          onClick={() => setState(p => ({ ...p, selectedElementId: el.id }))}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Layers size={14} className={state.selectedElementId === el.id ? 'text-white/80' : 'text-gray-400'} />
                            <span className="text-[11px] font-bold truncate">{el.name}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={12} className={state.selectedElementId === el.id ? 'text-white/80' : 'text-gray-400'} />
                            <Trash2 
                              size={12} 
                              className={state.selectedElementId === el.id ? 'text-white hover:text-red-200' : 'text-gray-400 hover:text-red-500'} 
                              onClick={(e) => { e.stopPropagation(); handleDeleteElement(el.id); }}
                            />
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                    
                    {currentScene.elements.length === 0 && (
                      <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                        <Layers size={24} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No elements yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'scenes' && (
                <div className="space-y-3">
                  {state.scenes.map((scene, idx) => (
                    <div key={scene.id} className="relative group">
                      <button
                        onClick={() => setState(p => ({ ...p, currentSceneId: scene.id }))}
                        className={`w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${state.currentSceneId === scene.id ? 'border-brand-primary bg-red-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${state.currentSceneId === scene.id ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${state.currentSceneId === scene.id ? 'text-brand-primary/60' : 'text-gray-300'}`}>Page</span>
                          <span className={`text-xs font-bold leading-none ${state.currentSceneId === scene.id ? 'text-brand-primary' : 'text-gray-600'}`}>{scene.name}</span>
                        </div>
                      </button>
                      
                      {state.scenes.length > 1 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newScenes = state.scenes.filter(s => s.id !== scene.id);
                            pushToHistory({
                              ...state,
                              scenes: newScenes,
                              currentSceneId: state.currentSceneId === scene.id ? newScenes[0].id : state.currentSceneId
                            });
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-100 text-gray-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-500 shadow-md transition-all scale-75 group-hover:scale-100"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={handleAddScene}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-brand-primary hover:text-brand-primary hover:bg-red-50/50 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    <Plus size={16} /> Add Page
                  </button>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-4">
                  <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10 border-dashed">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Active Project Info</h4>
                      {hasUnsavedChanges && <span className="text-[9px] font-black text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Modified</span>}
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="text"
                        value={projectName}
                        onChange={(e) => { setProjectName(e.target.value); setHasUnsavedChanges(true); }}
                        placeholder="Enter project name..."
                        className="w-full text-xs font-bold p-2 bg-white border border-brand-primary/20 rounded-lg focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                      <textarea 
                        value={projectDescription}
                        onChange={(e) => { setProjectDescription(e.target.value); setHasUnsavedChanges(true); }}
                        placeholder="Project description..."
                        className="w-full text-[10px] font-medium p-2 bg-white border border-brand-primary/20 rounded-lg focus:ring-1 focus:ring-brand-primary outline-none h-16 resize-none"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 mx-2" />

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">My Saved Courses</h4>
                    {isLoadingProjects ? (
                      <div className="flex justify-center p-4">
                        <RefreshCw size={16} className="animate-spin text-gray-400" />
                      </div>
                    ) : projectsList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 font-bold text-center p-4 italic">No projects saved yet</p>
                    ) : (
                      projectsList.map(p => (
                        <div key={p.id} className="relative group">
                          <button
                            onClick={() => handleLoadProject(p.id)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${currentProjectId === p.id ? 'border-brand-primary bg-red-50' : 'border-gray-50 hover:border-gray-200 bg-white shadow-sm'}`}
                          >
                            <Box size={14} className={currentProjectId === p.id ? 'text-brand-primary' : 'text-gray-400'} />
                            <span className={`text-xs font-bold truncate pr-6 ${currentProjectId === p.id ? 'text-brand-primary' : 'text-gray-600'}`}>{p.title}</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteProject(p.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}


            </div>
          </aside>
        )}

        {/* Center Canvas */}
        <main className={`flex-1 relative flex items-center justify-center transition-colors duration-500 ${state.isPlaying ? 'bg-[#0f172a]' : 'bg-gray-200'}`}>
          {/* Results Screen Overlay */}
          {showResults && (
            <div className="absolute inset-0 z-[100] bg-brand-primary/95 flex items-center justify-center p-6 text-white backdrop-blur-lg">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center text-gray-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]"
              >
                <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center text-white text-5xl mx-auto mb-8 shadow-lg ring-8 ring-yellow-400/20">🏆</div>
                <h2 className="text-4xl font-black mb-2 italic tracking-tight uppercase">Test Submitted!</h2>
                <p className="text-gray-400 font-bold mb-10 uppercase tracking-[0.2em] text-[10px]">Your Learning Journey Continues</p>
                
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={resetGame}
                    className="w-full py-5 bg-brand-primary text-white rounded-[1.25rem] font-black text-lg shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-95 transition-all outline-none"
                  >
                    Play Again
                  </button>
                  <button 
                    onClick={() => { 
                      setShowResults(false); 
                      setState(p => ({ ...p, isPlaying: false, appView: 'editor' })); 
                    }}
                    className="w-full py-3 bg-gray-100 text-gray-600 rounded-[1.25rem] font-bold hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest"
                  >
                    Back to Editor
                  </button>
                  <button 
                    onClick={() => { 
                      setShowResults(false); 
                      setState(p => ({ ...p, isPlaying: false, appView: 'dashboard' })); 
                    }}
                    className="w-full py-2 text-gray-400 font-bold hover:text-orange-500 transition-colors uppercase text-[10px] tracking-widest"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Play Mode HUD */}
          <AnimatePresence>
            {state.isPlaying && (
              <motion.div 
                initial={{ opacity: 0, y: -64 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -64 }}
                className="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-6 z-[100] border-b shadow-sm"
                style={{ 
                  backgroundColor: state.playSettings.barBgColor,
                  borderColor: state.playSettings.barBorderColor 
                }}
              >
                {/* Left: Logo */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black shadow-md overflow-hidden"
                    style={{ backgroundColor: state.playSettings.logoColor }}
                  >
                    {state.playSettings.logoSrc ? (
                      <img src={state.playSettings.logoSrc} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      state.playSettings.logoLabel?.[0] || 'C'
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span 
                      className="text-sm font-black tracking-tight leading-none"
                      style={{ color: state.playSettings.logoLabelColor }}
                    >
                      {state.playSettings.logoLabel}
                    </span>
                    <span 
                      className="text-[9px] font-bold uppercase tracking-widest mt-1"
                      style={{ color: state.playSettings.logoSubLabelColor }}
                    >
                      {state.playSettings.logoSubLabel}
                    </span>
                  </div>
                </div>

                {/* Center: Progress info */}
                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                   <div 
                    className="h-1.5 w-48 rounded-full overflow-hidden"
                    style={{ backgroundColor: state.playSettings.progressBarBgColor }}
                   >
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentSceneIndex + 1) / state.scenes.length) * 100}%` }}
                        className="h-full"
                        style={{ backgroundColor: state.playSettings.progressBarColor }}
                     />
                   </div>
                   <span 
                    className="text-[10px] font-bold mt-1 uppercase tracking-widest"
                    style={{ color: state.playSettings.barTextColor }}
                   >
                    Page {currentSceneIndex + 1} of {state.scenes.length}
                   </span>
                </div>

                {/* Right: Circle Buttons */}
                <div className="flex items-center gap-3">
                  {[
                    { icon: Check, onClick: () => {}, color: 'bg-green-500', text: 'text-white', title: 'Check' },
                    { icon: ChevronLeft, onClick: handlePrevScene, disabled: currentSceneIndex === 0, color: 'bg-white', text: 'text-orange-500', title: 'Back' },
                    { icon: ChevronRight, onClick: handleNextScene, disabled: currentSceneIndex === state.scenes.length - 1, color: 'bg-white', text: 'text-orange-500', title: 'Next' },
                    { icon: Flag, onClick: () => setShowResults(true), color: 'bg-orange-500', text: 'text-white', title: 'End' },
                    { icon: X, onClick: () => setState(p => ({ ...p, isPlaying: false })), color: 'bg-red-500', text: 'text-white', title: 'Close' }
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={btn.onClick}
                      disabled={btn.disabled}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${btn.color} ${btn.text} ${btn.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 hover:shadow-lg'}`}
                      title={btn.title}
                    >
                      <btn.icon size={18} strokeWidth={3} />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canvas Wrapper */}
          <motion.div 
            layout
            className={`relative transition-all duration-500 bg-white overflow-hidden shadow-2xl ${state.isPlaying ? 'z-10 rounded-[3rem] border-[12px] border-white ring-1 ring-black/5 shadow-black/50' : 'z-0 border border-gray-300 rounded-lg'}`}
            style={{
              width: state.viewMode === 'desktop' ? 'min(1024px, 95vw)' : state.viewMode === 'tablet' ? 'min(768px, 90vw)' : 'min(375px, 85vw)',
              height: state.viewMode === 'desktop' ? 'min(576px, 80vh)' : state.viewMode === 'tablet' ? 'min(1024px, 85vh)' : 'min(667px, 80vh)',
              backgroundColor: currentScene.background.color,
              backgroundImage: currentScene.background.image ? `url(${currentScene.background.image})` : 'none',
              backgroundSize: 'cover',
              transform: `scale(${state.zoom * (state.isPlaying && state.viewMode === 'mobile' ? 0.8 : 1)})`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Elements */}
            {currentScene.elements.map(el => (
              <motion.div
                key={el.id}
                drag={!state.isPlaying}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  const snap = 10;
                  const newX = el.x + info.offset.x / state.zoom;
                  const newY = el.y + info.offset.y / state.zoom;
                  updateElement(el.id, { 
                    x: Math.round(newX / snap) * snap,
                    y: Math.round(newY / snap) * snap 
                  });
                }}
                onMouseDown={() => !state.isPlaying && setState(p => ({ ...p, selectedElementId: el.id }))}
                onDoubleClick={() => {
                  if (!state.isPlaying && (el.type === 'text' || el.type === 'button' || el.type === 'character')) {
                    setState(p => ({ ...p, editingElementId: el.id }));
                  }
                }}
                className={`absolute ${!state.isPlaying ? 'cursor-move' : 'cursor-default'} select-none`}
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  zIndex: el.z,
                  transform: `rotate(${el.style.rotation || 0}deg) scale(${el.style.scale || 1})`,
                  borderColor: el.style.borderColor,
                  borderWidth: el.style.borderWidth,
                  borderStyle: el.style.borderStyle || 'none',
                  borderRadius: el.style.borderRadius,
                  boxShadow: el.style.boxShadow,
                  overflow: (el.type === 'image' || el.type === 'video') ? 'hidden' : 'visible',
                }}
              >
                {/* Visual Content */}
                {state.editingElementId === el.id ? (
                  <textarea
                    autoFocus
                    className="w-full h-full p-2 bg-white/90 border-2 border-brand-primary rounded-lg focus:outline-none resize-none font-inherit text-inherit z-50"
                    value={el.content || ''}
                    onChange={(e) => updateElement(el.id, { content: e.target.value })}
                    onBlur={() => setState(p => ({ ...p, editingElementId: null }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        setState(p => ({ ...p, editingElementId: null }));
                      }
                    }}
                    style={{
                      fontSize: el.style.fontSize,
                      fontWeight: el.style.fontWeight,
                      fontFamily: el.style.fontFamily,
                      textAlign: (el.style.textAlign || 'center') as any,
                      color: el.style.color,
                    }}
                  />
                ) : el.type === 'quiz' ? (
                  <MatchingPairRenderer 
                    element={el} 
                    isPlaying={state.isPlaying} 
                    projectId={currentProjectId}
                    onComplete={handleSceneComplete}
                  />
                ) : el.type === 'multiple-choice' ? (
                  <MultipleChoiceRenderer 
                    element={el} 
                    isPlaying={state.isPlaying} 
                    projectId={currentProjectId}
                    onComplete={handleSceneComplete}
                    onUpdateChoice={(choiceId, updates) => handleUpdateChoice(el.id, choiceId, updates)}
                  />
                ) : el.type === 'fill-in-the-blank' ? (
                  <FillInTheBlankRenderer 
                    element={el} 
                    isPlaying={state.isPlaying} 
                    projectId={currentProjectId}
                    onComplete={handleSceneComplete}
                  />
                ) : el.type === 'sequencing' ? (
                  <SequencingRenderer 
                    element={el} 
                    isPlaying={state.isPlaying} 
                    projectId={currentProjectId}
                    onComplete={handleSceneComplete}
                    onUpdateChoice={(choiceId, updates) => handleUpdateChoice(el.id, choiceId, updates)}
                  />
                ) : el.type === 'checkbox' ? (
                  <CheckboxRenderer 
                    element={el} 
                    isPlaying={state.isPlaying} 
                  />
                ) : el.type === 'numberbox' ? (
                  <NumberBoxRenderer 
                    element={el} 
                    isPlaying={state.isPlaying} 
                  />
                ) : el.type === 'label' ? (
                  <LabelRenderer 
                    element={el} 
                  />
                ) : el.type === 'label-input' ? (
                  <LabelInputRenderer 
                    element={el}
                    isPlaying={state.isPlaying}
                    state={state}
                    onAnswer={(correct) => {
                      if (correct) {
                        // Optional: play success sound or trigger sequence logic
                        console.log('Correct Label!');
                      }
                    }}
                  />
                ) : el.type === 'order' ? (
                  <OrderRenderer 
                    element={el}
                    isPlaying={state.isPlaying}
                    onAnswer={(correct) => {
                       if (correct) handleSceneComplete(1, 1);
                    }}
                  />
                ) : el.type === 'image' ? (
                  <div 
                    className="w-full h-full relative group cursor-pointer"
                    onClick={() => {
                      if (!state.isPlaying) {
                        setUploadTargetId(el.id);
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <img 
                      src={el.src} 
                      alt="" 
                      className="w-full h-full pointer-events-none select-none"
                      style={{ 
                        objectFit: el.style.objectFit || 'contain',
                      }}
                      referrerPolicy="no-referrer"
                    />
                    {!state.isPlaying && (
                      <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Upload size={24} className="text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                ) : el.type === 'video' ? (
                  <div 
                    className="w-full h-full relative group cursor-pointer bg-black flex items-center justify-center overflow-hidden"
                    onClick={() => {
                      if (!state.isPlaying) {
                        const url = window.prompt('Enter Video URL (YouTube or Vimeo):', el.src || '');
                        if (url !== null) updateElement(el.id, { src: url });
                      }
                    }}
                  >
                    {el.src ? (
                      <iframe
                        src={
                          el.src.includes('youtube.com') 
                            ? el.src.replace('watch?v=', 'embed/').split('&')[0]
                            : el.src.includes('youtu.be')
                            ? `https://www.youtube.com/embed/${el.src.split('/').pop()}`
                            : el.src.includes('vimeo.com')
                            ? `https://player.vimeo.com/video/${el.src.split('/').pop()}`
                            : el.src
                        }
                        className="w-full h-full pointer-events-none"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Video size={32} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Click to set URL</span>
                      </div>
                    )}
                    {!state.isPlaying && (
                      <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Video size={24} className="text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                ) : el.type === 'button' ? (
                  <button 
                    className={`w-full h-full rounded-xl font-bold flex items-center p-4 transition-all shadow-md active:scale-95 ${el.style.textAlign === 'left' ? 'justify-start text-left' : el.style.textAlign === 'right' ? 'justify-end text-right' : 'justify-center text-center'} ${state.isPlaying ? 'hover:scale-105 hover:brightness-110' : 'cursor-move'}`}
                    style={{
                      fontSize: el.style.fontSize,
                      fontWeight: el.style.fontWeight,
                      fontFamily: el.style.fontFamily,
                      color: el.style.color || '#ffffff',
                      backgroundColor: el.style.backgroundColor || '#fb7185',
                      borderRadius: el.style.borderRadius,
                      textAlign: (el.style.textAlign || 'center') as any,
                    }}
                    onClick={() => {
                      if (state.isPlaying) {
                        const submitAction = el.interactions?.find(i => i.action === 'submit-test');
                        const nextSceneAction = el.interactions?.find(i => i.action === 'next-scene');
                        
                        if (submitAction) {
                          setShowResults(true);
                        } else if (nextSceneAction) {
                          handleNextScene();
                        } else if (currentSceneIndex === state.scenes.length - 1) {
                          setShowResults(true);
                        } else {
                          handleNextScene();
                        }
                      }
                    }}
                  >
                    <span className="whitespace-pre-wrap select-none truncate">{el.content || 'Button'}</span>
                  </button>
                ) : el.type === 'character' ? (
                  <div 
                    className={`w-full h-full flex items-center p-2 pointer-events-none ${el.style.textAlign === 'left' ? 'justify-start' : el.style.textAlign === 'right' ? 'justify-end' : 'justify-center'}`}
                    style={{
                      fontSize: el.style.fontSize,
                      fontWeight: el.style.fontWeight,
                      fontFamily: el.style.fontFamily,
                      color: el.style.color,
                      textAlign: (el.style.textAlign || 'center') as any,
                    }}
                  >
                    <span className="text-6xl select-none">{el.content}</span>
                  </div>
                ) : (
                  <div 
                    className={`w-full h-full flex items-center p-2 pointer-events-none ${el.style.textAlign === 'left' ? 'justify-start text-left' : el.style.textAlign === 'right' ? 'justify-end text-right' : 'justify-center text-center'}`}
                    style={{
                      fontSize: el.style.fontSize,
                      fontWeight: el.style.fontWeight,
                      fontFamily: el.style.fontFamily,
                      fontStyle: el.style.fontStyle,
                      fontVariant: el.style.fontVariant,
                      textDecoration: el.style.textDecoration,
                      textTransform: el.style.textTransform,
                      color: el.style.color,
                      backgroundColor: el.style.backgroundColor,
                      borderRadius: el.style.borderRadius,
                      textAlign: (el.style.textAlign || 'center') as any,
                      lineHeight: 1.2
                    }}
                  >
                    <span className="whitespace-pre-wrap select-none">{el.content}</span>
                  </div>
                )}

                {/* Transform Tool */}
                {!state.isPlaying && state.selectedElementId === el.id && (
                  <TransformTool 
                    element={el} 
                    onTransform={(updates) => updateElement(el.id, updates)} 
                    onDelete={handleDeleteElement}
                    onDuplicate={handleDuplicateElement}
                    onMoveLayer={moveElementLayer}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom Scene Navigator Bar (Canva Style) */}
          {!state.isPlaying && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] border border-gray-100 flex items-center px-6 gap-6 z-40 max-w-[90vw] min-w-[400px]">
              <div className="flex-1 flex gap-4 overflow-x-auto py-2 px-1 custom-scrollbar no-scrollbar scroll-smooth">
                {state.scenes.map((scene, idx) => (
                  <div key={scene.id} className="relative group shrink-0">
                    <div className="absolute -top-5 left-0 text-[10px] font-black text-gray-300 uppercase tracking-widest">{idx + 1}</div>
                    <button 
                      onClick={() => setState(p => ({ ...p, currentSceneId: scene.id, selectedElementId: null }))}
                      className={`h-12 w-24 rounded-xl border-2 transition-all flex flex-col items-center justify-center shadow-sm relative ${state.currentSceneId === scene.id ? 'border-brand-primary ring-4 ring-brand-primary/10 bg-brand-primary/5' : 'border-gray-100 hover:border-gray-300 bg-white group-hover:bg-gray-50'}`}
                    >
                      <span className={`text-[9px] font-bold truncate w-full px-2 text-center transition-colors ${state.currentSceneId === scene.id ? 'text-brand-primary' : 'text-gray-400'}`}>{scene.name}</span>
                    </button>
                    {state.scenes.length > 1 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newScenes = state.scenes.filter(s => s.id !== scene.id);
                          pushToHistory({
                            ...state,
                            scenes: newScenes,
                            currentSceneId: state.currentSceneId === scene.id ? newScenes[0].id : state.currentSceneId
                          });
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-gray-100 text-gray-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md hover:text-red-500 transition-all scale-75 group-hover:scale-100"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleAddScene}
                className="shrink-0 h-10 w-10 bg-brand-primary text-white rounded-full shadow-lg hover:rotate-90 hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-50 ml-2"
                title="Add New Page"
              >
                <Plus size={24} strokeWidth={3} />
              </button>

              <div className="h-10 w-px bg-gray-100 mx-2" />
              
              <div className="flex items-center gap-3">
                <div className="flex bg-gray-100 rounded-xl p-1 items-center">
                  <button onClick={() => setState(p => ({...p, zoom: Math.max(0.3, p.zoom - 0.1)}))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-primary font-bold transition-colors">−</button>
                  <span className="px-1 flex items-center justify-center text-[10px] font-black text-gray-500 min-w-[45px] select-none">{Math.round(state.zoom * 100)}%</span>
                  <button onClick={() => setState(p => ({...p, zoom: Math.min(2.5, p.zoom + 0.1)}))} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-brand-primary font-bold transition-colors">+</button>
                </div>
              </div>
            </div>
          )}

          {/* Zoom Controls - Hidden in Play Mode */}
          {!state.isPlaying && (
            <div className="absolute bottom-6 right-6 flex items-center bg-white rounded-full shadow-lg border border-gray-100 p-1">
              <button onClick={() => setState(p => ({ ...p, zoom: Math.max(0.2, p.zoom - 0.1) }))} className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center">-</button>
              <span className="text-[10px] font-bold w-12 text-center text-gray-400">{Math.round(state.zoom * 100)}%</span>
              <button onClick={() => setState(p => ({ ...p, zoom: Math.min(2, p.zoom + 0.1) }))} className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center">+</button>
            </div>
          )}
        </main>

        {/* Right Sidebar - Only in Editor */}
        {!state.isPlaying && (
          <aside className="w-80 bg-white border-l border-gray-200 flex flex-col z-40 overflow-y-auto custom-scrollbar">
          {!selectedElement ? (
             <div className="flex-1 flex flex-col p-5">
              <header className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                <div className="flex flex-col">
                  <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Grid3X3 size={14} className="text-brand-primary" /> Page Settings
                  </h2>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Configuring current page canvas</span>
                </div>
              </header>

              <div className="space-y-8">
                {/* Full App Design Section */}
                <section className="mb-4 pb-6 border-b border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 flex items-center gap-2">
                    <Palette size={12} className="text-brand-primary" /> Play Mode Design (Global)
                  </label>
                  
                  <div className="space-y-6">
                    {/* Bar Background */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 font-bold">Top Bar Style</span>
                        <span className="text-[9px] font-mono text-gray-400 uppercase">{state.playSettings.barBgColor}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 font-bold uppercase">Background</span>
                          <input 
                            type="color"
                            value={state.playSettings.barBgColor}
                            onChange={(e) => updatePlaySettings({ barBgColor: e.target.value })}
                            className="w-full h-8 bg-white border border-gray-200 rounded-lg cursor-pointer p-0.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 font-bold uppercase">Border</span>
                          <input 
                            type="color"
                            value={state.playSettings.barBorderColor}
                            onChange={(e) => updatePlaySettings({ barBorderColor: e.target.value })}
                            className="w-full h-8 bg-white border border-gray-200 rounded-lg cursor-pointer p-0.5"
                            title="Border Color"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Logo Label */}
                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-500 font-bold block">Logo & Titles</span>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                        <div className="space-y-1">
                          <span className="text-[9px] text-gray-400 uppercase font-black">Main Title</span>
                          <input 
                            type="text"
                            value={state.playSettings.logoLabel}
                            onChange={(e) => updatePlaySettings({ logoLabel: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                            placeholder="CourseCraft..."
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-gray-400 uppercase font-black">Sub Label</span>
                          <input 
                            type="text"
                            value={state.playSettings.logoSubLabel}
                            onChange={(e) => updatePlaySettings({ logoSubLabel: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px]"
                            placeholder="Interactive..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 pt-1">
                           <div className="space-y-1">
                             <span className="text-[8px] text-gray-400 uppercase font-bold text-center block leading-tight">Logo Circle</span>
                             <input type="color" value={state.playSettings.logoColor} onChange={(e) => updatePlaySettings({ logoColor: e.target.value })} className="w-full h-6 rounded cursor-pointer border border-gray-200" />
                           </div>
                           <div className="space-y-1">
                             <span className="text-[8px] text-gray-400 uppercase font-bold text-center block leading-tight">Title Color</span>
                             <input type="color" value={state.playSettings.logoLabelColor} onChange={(e) => updatePlaySettings({ logoLabelColor: e.target.value })} className="w-full h-6 rounded cursor-pointer border border-gray-200" />
                           </div>
                           <div className="space-y-1">
                             <span className="text-[8px] text-gray-400 uppercase font-bold text-center block leading-tight">Sub Color</span>
                             <input type="color" value={state.playSettings.logoSubLabelColor} onChange={(e) => updatePlaySettings({ logoSubLabelColor: e.target.value })} className="w-full h-6 rounded cursor-pointer border border-gray-200" />
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Logo Image */}
                    <div className="space-y-2">
                       <span className="text-[10px] text-gray-500 font-bold block">Logo Icon URL (Optional)</span>
                       <div className="flex gap-2">
                         <input 
                           type="text"
                           value={state.playSettings.logoSrc || ''}
                           onChange={(e) => updatePlaySettings({ logoSrc: e.target.value })}
                           className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-mono"
                           placeholder="https://..."
                         />
                         <label className="shrink-0">
                           <div className="p-2 bg-white border border-gray-200 hover:border-brand-primary rounded-lg cursor-pointer transition-colors shadow-sm">
                             <Upload size={14} className="text-gray-400" />
                           </div>
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.onloadend = () => updatePlaySettings({ logoSrc: reader.result as string });
                               reader.readAsDataURL(file);
                             }
                           }} />
                         </label>
                       </div>
                    </div>

                    {/* Progress Bar Colors */}
                    <div className="space-y-2">
                       <span className="text-[10px] text-gray-500 font-bold block">Status & Text Styles</span>
                       <div className="grid grid-cols-3 gap-2">
                         <div className="space-y-1">
                           <span className="text-[8px] text-gray-400 uppercase font-bold text-center block leading-tight">Progress Bar</span>
                           <input type="color" value={state.playSettings.progressBarColor} onChange={(e) => updatePlaySettings({ progressBarColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer border border-gray-200" />
                         </div>
                         <div className="space-y-1">
                           <span className="text-[8px] text-gray-400 uppercase font-bold text-center block leading-tight">Track Bg</span>
                           <input type="color" value={state.playSettings.progressBarBgColor} onChange={(e) => updatePlaySettings({ progressBarBgColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer border border-gray-200" />
                         </div>
                         <div className="space-y-1">
                           <span className="text-[8px] text-gray-400 uppercase font-bold text-center block leading-tight">Bar Text</span>
                           <input type="color" value={state.playSettings.barTextColor} onChange={(e) => updatePlaySettings({ barTextColor: e.target.value })} className="w-full h-8 rounded-lg cursor-pointer border border-gray-200" />
                         </div>
                       </div>
                    </div>
                  </div>
                </section>

                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">General Info</label>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-500 font-bold block">Page Name</span>
                      <input 
                        type="text"
                        value={currentScene.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          pushToHistory({
                            ...state,
                            scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, name } : s)
                          });
                        }}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        placeholder="Scene Name..."
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-brand-primary/[0.03] border border-brand-primary/10 rounded-xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-tight">Final Page</span>
                        <span className="text-[9px] text-gray-400 font-medium whitespace-pre-wrap">Treat as completion screen</span>
                      </div>
                      <button 
                        onClick={() => {
                          pushToHistory({
                            ...state,
                            scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, isFinalPage: !s.isFinalPage } : s)
                          });
                        }}
                        className={`w-10 h-5 rounded-full transition-all relative ${currentScene.isFinalPage ? 'bg-brand-primary' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${currentScene.isFinalPage ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </section>

                {/* Background Styling */}
                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Atmosphere</label>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] text-gray-500 font-bold block">Background Color</span>
                        <span className="text-[9px] font-mono text-gray-400 capitalize">{currentScene.background.color === 'transparent' ? 'Transparent' : currentScene.background.color}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['transparent', '#f0f9ff', '#fdf2f8', '#f0fdf4', '#fffbeb', '#ffffff'].map(c => (
                           <button
                             key={c}
                             onClick={() => {
                               pushToHistory({
                                 ...state,
                                 scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, background: { ...s.background, color: c } } : s)
                               });
                             }}
                             className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center ${currentScene.background.color === c ? 'ring-2 ring-brand-primary ring-offset-2 border-brand-primary' : 'border-gray-200 hover:border-gray-300'}`}
                             style={{ 
                               backgroundColor: c === 'transparent' ? 'transparent' : c,
                               backgroundImage: c === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)' : 'none',
                               backgroundSize: c === 'transparent' ? '8px 8px' : 'auto'
                             }}
                             title={c === 'transparent' ? 'Transparent' : c}
                           >
                             {c === 'transparent' && <X size={12} className="text-gray-400" />}
                           </button>
                        ))}
                        <input 
                          type="color"
                          value={currentScene.background.color && currentScene.background.color !== 'transparent' ? currentScene.background.color : '#ffffff'}
                          onChange={(e) => {
                            const color = e.target.value;
                            pushToHistory({
                              ...state,
                              scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, background: { ...s.background, color } } : s)
                            });
                          }}
                          className="w-8 h-8 bg-white border border-gray-200 rounded-lg cursor-pointer p-0.5"
                          title="Custom Color"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-500 font-bold block">Background Image URL</span>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={currentScene.background.image || ''}
                          onChange={(e) => {
                            const image = e.target.value;
                            pushToHistory({
                              ...state,
                              scenes: state.scenes.map(s => s.id === state.currentSceneId ? { ...s, background: { ...s.background, image } } : s)
                            });
                          }}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          placeholder="https://..."
                        />
                        <button
                          onClick={() => {
                            setUploadTargetId('background');
                            fileInputRef.current?.click();
                          }}
                          className="px-3 bg-brand-primary text-white rounded-xl hover:bg-brand-primary/90 transition-colors flex items-center justify-center"
                          title="Upload Background Photo"
                        >
                          <Upload size={14} />
                        </button>
                      </div>
                      <p className="text-[9px] text-gray-400 font-medium italic mt-1 px-1 line-clamp-2">Use high-quality PNG or JPG for backgrounds</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="flex flex-col p-5">
              <header className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Box size={14} className="text-brand-primary" /> {selectedElement.name}
                  </h2>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedElement.type}</span>
                </div>
                <button 
                  onClick={() => setState(p => ({ ...p, selectedElementId: null }))}
                  className="p-1 hover:bg-gray-100 rounded-md text-gray-400"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="space-y-6">
                {/* Properties Section */}
                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Content & Appearance</label>
                  <div className="space-y-4">
                    {selectedElement.type !== 'quiz' && selectedElement.type !== 'image' && selectedElement.type !== 'video' && 
                     !(selectedElement.type === 'label-input' && selectedElement.src) && 
                     !(selectedElement.type === 'order' && selectedElement.src) && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">
                          {selectedElement.type === 'label-input' ? 'Label Caption (Hint)' : (selectedElement.type === 'label' ? 'Badge Text (ID)' : (selectedElement.type === 'order' ? 'Instruction / Text' : 'Label / Text Content'))}
                        </span>
                        <textarea 
                          value={selectedElement.content || ''}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary min-h-[80px] resize-y"
                          placeholder={selectedElement.type === 'label-input' ? "" : "Enter text content..."}
                        />
                        <div className="mt-2">
                           <label className="block">
                              <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                <ImageIcon size={12} /> Upload Image
                              </div>
                              <input 
                                type="file" className="hidden" accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const img = new Image();
                                      img.onload = () => {
                                        const updates: any = { src: reader.result as string };
                                        if (selectedElement.type === 'label' || selectedElement.type === 'label-input' || selectedElement.type === 'order') {
                                           const maxDim = 1200;
                                           let w = img.width;
                                           let h = img.height;
                                           if (w > maxDim || h > maxDim) {
                                              const ratio = Math.min(maxDim / w, maxDim / h);
                                              w = Math.round(w * ratio);
                                              h = Math.round(h * ratio);
                                           }
                                           updates.width = w;
                                           updates.height = h;
                                        }
                                        updateElement(selectedElement.id, updates);
                                      };
                                      img.src = reader.result as string;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                           </label>
                           {selectedElement.src && (
                             <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                               <img src={selectedElement.src} alt="" className="h-8 w-8 object-contain rounded" referrerPolicy="no-referrer" />
                               <button onClick={() => updateElement(selectedElement.id, { src: '' })} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {(selectedElement.type === 'image' || selectedElement.type === 'video') && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wider">{selectedElement.type === 'image' ? 'Image URL' : 'Video URL (YouTube/Vimeo)'}</span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={selectedElement.src || ''}
                            onChange={(e) => updateElement(selectedElement.id, { src: e.target.value })}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            placeholder="https://..."
                          />
                          {selectedElement.type === 'image' && (
                            <button
                              onClick={() => {
                                setUploadTargetId(selectedElement.id);
                                fileInputRef.current?.click();
                              }}
                              className="px-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors flex items-center justify-center"
                              title="Upload Local Photo"
                            >
                              <Upload size={14} />
                            </button>
                          )}
                        </div>
                        {selectedElement.type === 'video' && (
                          <p className="text-[9px] text-gray-400 font-medium italic mt-1">Paste a YouTube or Vimeo link to embed</p>
                        )}
                      </div>
                    )}

                    {/* Smart Positioning Tools */}
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wider">Positioning & Alignment</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCenterElement(selectedElement.id, 'x')}
                          className="flex-1 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-tight hover:bg-white hover:border-brand-primary transition-all flex flex-col items-center gap-1"
                        >
                          <AlignHorizontalJustifyCenter size={14} className="text-gray-400" />
                          Center H
                        </button>
                        <button 
                          onClick={() => handleCenterElement(selectedElement.id, 'y')}
                          className="flex-1 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-tight hover:bg-white hover:border-brand-primary transition-all flex flex-col items-center gap-1"
                        >
                          <AlignVerticalJustifyCenter size={14} className="text-gray-400" />
                          Center V
                        </button>
                        <button 
                          onClick={() => handleCenterElement(selectedElement.id, 'both')}
                          className="flex-1 py-2 bg-brand-primary/5 border border-brand-primary/20 rounded-lg text-[10px] text-brand-primary font-black uppercase tracking-tight hover:bg-brand-primary hover:text-white transition-all flex flex-col items-center gap-1"
                        >
                          <Maximize size={14} />
                          Perfect Center
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="relative group">
                          <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase">X Coordinate</span>
                          <input 
                            type="number" 
                            value={Math.round(selectedElement.x)}
                            onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>
                        <div className="relative group">
                          <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase">Y Coordinate</span>
                          <input 
                            type="number" 
                            value={Math.round(selectedElement.y)}
                            onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {['multiple-choice', 'checkbox', 'sequencing', 'matching', 'numberbox'].includes(selectedElement.type as any) && (
                      <div className="pt-4 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Item Scaling & Sizing</span>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Item Width (px)</span>
                            <input 
                              type="number" 
                              value={selectedElement.style.itemWidth || ''}
                              onChange={(e) => updateStyle(selectedElement.id, { itemWidth: parseInt(e.target.value) || undefined })}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono"
                              placeholder="Auto"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Item Height (px)</span>
                            <input 
                              type="number" 
                              value={selectedElement.style.itemHeight || ''}
                              onChange={(e) => updateStyle(selectedElement.id, { itemHeight: parseInt(e.target.value) || undefined })}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono"
                              placeholder="Auto"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1 block flex justify-between">
                              Inner Padding <span>{selectedElement.style.itemPadding ?? (selectedElement.type === 'multiple-choice' ? 24 : 16)}px</span>
                            </span>
                            <input 
                              type="range" min="0" max="100" step="2"
                              value={selectedElement.style.itemPadding ?? (selectedElement.type === 'multiple-choice' ? 24 : 16)}
                              onChange={(e) => updateStyle(selectedElement.id, { itemPadding: parseInt(e.target.value) })}
                              className="w-full accent-brand-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1 block flex justify-between">
                              Gap Spacing <span>{selectedElement.style.itemSpacing || 16}px</span>
                            </span>
                            <input 
                              type="range" min="0" max="100" step="2"
                              value={selectedElement.style.itemSpacing || 16}
                              onChange={(e) => updateStyle(selectedElement.id, { itemSpacing: parseInt(e.target.value) })}
                              className="w-full accent-brand-secondary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Image specific style */}
                    {selectedElement.type === 'image' && (
                      <div className="pt-4 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Image Composition</span>
                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1.5 block">Object Scaling</span>
                          <div className="flex p-0.5 bg-gray-100 rounded-lg">
                            {(['contain', 'cover', 'fill'] as const).map(fit => (
                              <button 
                                key={fit}
                                onClick={() => updateStyle(selectedElement.id, { objectFit: fit })}
                                className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded ${selectedElement.style.objectFit === fit ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                              >
                                {fit}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Badge Controls */}
                    {(selectedElement.type === 'label' || selectedElement.type === 'label-input') && (
                      <div className="pt-4 border-t border-gray-100 space-y-4">
                        <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Badge Details</span>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] text-gray-500 font-bold mb-1.5 block">Label ID / Badge Text</span>
                          <input 
                            type="text" 
                            value={selectedElement.labelId || ''}
                            onChange={(e) => updateElement(selectedElement.id, { labelId: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary outline-none"
                            placeholder="e.g. 1, A, ?"
                          />
                          {selectedElement.type === 'label-input' && (
                            <p className="text-[8px] text-gray-400 font-medium">Use commas for multiple correct answers</p>
                          )}
                        </div>

                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wider">Badge Position</span>
                          <div className="grid grid-cols-2 gap-2">
                            {(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'free'] as const).map(p => (
                              <button 
                                key={p}
                                onClick={() => updateStyle(selectedElement.id, { labelPosition: p })}
                                className={`py-1.5 text-[9px] font-black uppercase rounded border transition-all ${selectedElement.style.labelPosition === p ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:border-brand-primary/30'}`}
                              >
                                {p.replace('-', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {selectedElement.style.labelPosition === 'free' && (
                          <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                               <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase">Offset X ({selectedElement.style.labelX ?? 0}%)</span>
                               <input 
                                 type="range" min="-100" max="250" step="1"
                                 value={selectedElement.style.labelX ?? 0}
                                 onChange={(e) => updateStyle(selectedElement.id, { labelX: parseInt(e.target.value) })}
                                 className="w-full accent-brand-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                               />
                            </div>
                            <div>
                               <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase">Offset Y ({selectedElement.style.labelY ?? 0}%)</span>
                               <input 
                                 type="range" min="-100" max="250" step="1"
                                 value={selectedElement.style.labelY ?? 0}
                                 onChange={(e) => updateStyle(selectedElement.id, { labelY: parseInt(e.target.value) })}
                                 className="w-full accent-brand-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                               />
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1 block flex justify-between uppercase tracking-wider">
                            Badge size <span>{selectedElement.style.labelSize || 32}px</span>
                          </span>
                          <input 
                            type="range" min="16" max="150" step="2"
                            value={selectedElement.style.labelSize || 32}
                            onChange={(e) => updateStyle(selectedElement.id, { labelSize: parseInt(e.target.value) })}
                            className="w-full accent-brand-primary h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'order' && (
                      <div className="pt-4 border-t border-gray-100 space-y-4">
                        <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Problem Details</span>
                        <div className="space-y-1">
                          <span className="text-[9px] text-gray-500 font-bold mb-1.5 block">Correct Answer</span>
                          <input 
                            type="text" 
                            value={selectedElement.labelId || ''}
                            onChange={(e) => updateElement(selectedElement.id, { labelId: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary outline-none font-bold"
                            placeholder="e.g. apple, orange, banana"
                          />
                          <p className="text-[8px] text-gray-400 font-medium">Use commas for multiple correct answers</p>
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'order' && (
                      <div className="pt-4 border-t border-gray-100 space-y-4">
                        <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Answer Box Layout</span>
                        <div className="flex gap-2">
                          {(['inside', 'free'] as const).map(p => (
                            <button 
                              key={p}
                              onClick={() => updateStyle(selectedElement.id, { inputPosition: p })}
                              className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded border transition-all ${selectedElement.style.inputPosition === p ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-white text-gray-400 border-gray-100 hover:border-brand-primary/30'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        {selectedElement.style.inputPosition === 'free' && (
                          <div className="space-y-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                   <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase tracking-tighter">Pos X ({selectedElement.style.inputX ?? 50}%)</span>
                                   <input 
                                     type="range" min="-100" max="250" step="1"
                                     value={selectedElement.style.inputX ?? 50}
                                     onChange={(e) => updateStyle(selectedElement.id, { inputX: parseInt(e.target.value) })}
                                     className="w-full accent-brand-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                   />
                                 </div>
                                 <div>
                                   <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase tracking-tighter">Pos Y ({selectedElement.style.inputY ?? 100}%)</span>
                                   <input 
                                     type="range" min="-100" max="250" step="1"
                                     value={selectedElement.style.inputY ?? 100}
                                     onChange={(e) => updateStyle(selectedElement.id, { inputY: parseInt(e.target.value) })}
                                     className="w-full accent-brand-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                   />
                                 </div>
                             </div>
                             <div>
                                <span className="text-[9px] text-gray-400 font-bold mb-1 block uppercase tracking-tighter">Box Width ({selectedElement.style.inputWidth ?? 100}%)</span>
                                <input 
                                  type="range" min="10" max="300" step="1"
                                  value={selectedElement.style.inputWidth ?? 100}
                                  onChange={(e) => updateStyle(selectedElement.id, { inputWidth: parseInt(e.target.value) })}
                                  className="w-full accent-brand-primary h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                             </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Border & Styling Section */}
                    <div className="pt-4 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Borders & Decoration</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1 block">Border Width</span>
                          <input 
                            type="text" 
                            value={selectedElement.style.borderWidth || '0px'}
                            onChange={(e) => updateStyle(selectedElement.id, { borderWidth: e.target.value })}
                            className="w-full bg-gray-100 border border-transparent rounded-lg px-2 py-1.5 text-xs font-mono focus:bg-white focus:border-brand-primary/20"
                            placeholder="2px"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1 block">Border Style</span>
                          <select 
                            value={selectedElement.style.borderStyle || 'none'}
                            onChange={(e) => updateStyle(selectedElement.id, { borderStyle: e.target.value as any })}
                            className="w-full bg-gray-100 border border-transparent rounded-lg px-2 py-1.5 text-xs focus:bg-white focus:border-brand-primary/20"
                          >
                            <option value="none">None</option>
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1 block flex justify-between">
                            Border Color
                            {(selectedElement.style.borderColor) && (
                              <button onClick={() => updateStyle(selectedElement.id, { borderColor: undefined })} className="text-[8px] text-brand-primary hover:underline">Clear</button>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={selectedElement.style.borderColor || '#000000'}
                              onChange={(e) => updateStyle(selectedElement.id, { borderColor: e.target.value })}
                              className="w-full h-8 bg-gray-100 border border-transparent rounded-lg px-1 py-1 cursor-pointer focus:bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 font-bold mb-1 block">Corner Radius</span>
                          <input 
                            type="text" 
                            value={selectedElement.style.borderRadius || '12px'}
                            onChange={(e) => updateStyle(selectedElement.id, { borderRadius: e.target.value })}
                            className="w-full bg-gray-100 border border-transparent rounded-lg px-2 py-1.5 text-xs font-mono focus:bg-white focus:border-brand-primary/20"
                            placeholder="12px"
                          />
                        </div>
                      </div>
                    </div>

                    {selectedElement.type === 'quiz' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Item Layout</span>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                              {['grid', 'free'].map(mode => (
                                <button
                                  key={mode}
                                  onClick={() => updateStyle(selectedElement.id, { layoutMode: mode as any })}
                                  className={`flex-1 py-1 rounded-md text-[10px] uppercase font-black ${selectedElement.style.layoutMode === mode ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Orientation</span>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                              {['horizontal', 'vertical'].map(o => (
                                <button
                                  key={o}
                                  onClick={() => updateStyle(selectedElement.id, { orientation: o as any })}
                                  className={`flex-1 py-1 rounded-md text-[10px] uppercase font-black ${selectedElement.style.orientation === o ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                                >
                                  {o[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Pair Gap ({selectedElement.style.pairGap || 60}px)</span>
                          <input 
                            type="range" min="20" max="300" step="10"
                            value={selectedElement.style.pairGap || 60}
                            onChange={(e) => updateStyle(selectedElement.id, { pairGap: parseInt(e.target.value) })}
                            className="w-full accent-brand-primary"
                          />
                        </div>

                        {/* List of Pairs */}
                        <div className="space-y-4 mt-4">
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Manage Pairs</span>
                          {selectedElement.pairs?.map((pair, pIdx) => (
                            <div key={pair.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-3 relative">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pair #{pIdx + 1}</span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => {
                                      const newPairs = [...(selectedElement.pairs || [])];
                                      const p = newPairs[pIdx];
                                      const tempType = p.leftType;
                                      const tempContent = p.leftContent;
                                      const tempSrc = p.leftSrc;
                                      
                                      p.leftType = p.rightType;
                                      p.leftContent = p.rightContent;
                                      p.leftSrc = p.rightSrc;
                                      
                                      p.rightType = tempType;
                                      p.rightContent = tempContent;
                                      p.rightSrc = tempSrc;
                                      
                                      updateElement(selectedElement.id, { pairs: newPairs });
                                    }}
                                    className="p-1 text-gray-400 hover:text-brand-primary"
                                    title="Swap Left/Right"
                                  >
                                    <ArrowLeftRight size={12} />
                                  </button>
                                  {pIdx > 0 && (
                                    <button 
                                      onClick={() => {
                                        const newPairs = [...(selectedElement.pairs || [])];
                                        const temp = newPairs[pIdx];
                                        newPairs[pIdx] = newPairs[pIdx - 1];
                                        newPairs[pIdx - 1] = temp;
                                        updateElement(selectedElement.id, { pairs: newPairs });
                                      }}
                                      className="p-1 text-gray-400 hover:text-brand-primary"
                                    >
                                      <Plus size={12} className="rotate-180" style={{ transform: 'rotate(180deg) translateY(-1px)' }} />
                                    </button>
                                  )}
                                  {pIdx < (selectedElement.pairs?.length || 0) - 1 && (
                                    <button 
                                      onClick={() => {
                                        const newPairs = [...(selectedElement.pairs || [])];
                                        const temp = newPairs[pIdx];
                                        newPairs[pIdx] = newPairs[pIdx + 1];
                                        newPairs[pIdx + 1] = temp;
                                        updateElement(selectedElement.id, { pairs: newPairs });
                                      }}
                                      className="p-1 text-gray-400 hover:text-brand-primary"
                                    >
                                      <ChevronDown size={12} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => {
                                      const newPairs = selectedElement.pairs?.filter(p => p.id !== pair.id);
                                      updateElement(selectedElement.id, { pairs: newPairs });
                                    }}
                                    className="text-red-400 hover:text-red-600 p-1"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Left Side */}
                                <div className="flex-1 p-2 border border-gray-100 rounded-lg bg-white space-y-2">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Left Item</span>
                                  <select 
                                    value={pair.leftType}
                                    onChange={(e) => {
                                      const newPairs = [...(selectedElement.pairs || [])];
                                      newPairs[pIdx].leftType = e.target.value as any;
                                      updateElement(selectedElement.id, { pairs: newPairs });
                                    }}
                                    className="w-full text-[10px] p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-brand-primary outline-none"
                                  >
                                    <option value="text">Text</option>
                                    <option value="image">Image</option>
                                    <option value="icon">Icon</option>
                                  </select>
                                  {pair.leftType === 'image' ? (
                                    <div className="space-y-1">
                                      <textarea 
                                        value={pair.leftSrc || ''} 
                                        placeholder="Image URL"
                                        onChange={(e) => {
                                          const newPairs = [...(selectedElement.pairs || [])];
                                          newPairs[pIdx].leftSrc = e.target.value;
                                          updateElement(selectedElement.id, { pairs: newPairs });
                                        }}
                                        className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded mb-1 min-h-[34px] resize-none"
                                      />
                                      <label className="block">
                                        <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                          <Download size={10} /> Upload
                                        </div>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                const newPairs = [...(selectedElement.pairs || [])];
                                                newPairs[pIdx].leftSrc = reader.result as string;
                                                updateElement(selectedElement.id, { pairs: newPairs });
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <textarea 
                                      value={pair.leftContent || ''} 
                                      placeholder={pair.leftType === 'icon' ? 'Select Emoji' : 'Enter Text'}
                                      onChange={(e) => {
                                        const newPairs = [...(selectedElement.pairs || [])];
                                        newPairs[pIdx].leftContent = e.target.value;
                                        updateElement(selectedElement.id, { pairs: newPairs });
                                      }}
                                      className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded min-h-[50px] resize-none"
                                    />
                                  )}
                                </div>

                                {/* Plus / Middle Side */}
                                {!(pair.middleContent || pair.middleSrc || pair.middleType) ? (
                                  <button 
                                    onClick={() => {
                                      const newPairs = [...(selectedElement.pairs || [])];
                                      newPairs[pIdx].middleType = 'text';
                                      newPairs[pIdx].middleContent = 'New Link';
                                      updateElement(selectedElement.id, { pairs: newPairs });
                                    }}
                                    className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors shrink-0"
                                    title="Add Middle Item (Triple Match)"
                                  >
                                    <Plus size={14} />
                                  </button>
                                ) : (
                                  <div className="flex-1 p-2 border border-blue-50 rounded-lg bg-blue-50/30 space-y-2">
                                    <div className="flex items-center justify-between pl-1">
                                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Middle</span>
                                      <button 
                                        onClick={() => {
                                          const newPairs = [...(selectedElement.pairs || [])];
                                          newPairs[pIdx].middleContent = '';
                                          newPairs[pIdx].middleSrc = '';
                                          newPairs[pIdx].middleType = undefined;
                                          updateElement(selectedElement.id, { pairs: newPairs });
                                        }}
                                        className="text-[14px] text-red-300 hover:text-red-500"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <select 
                                      value={pair.middleType || 'text'}
                                      onChange={(e) => {
                                        const newPairs = [...(selectedElement.pairs || [])];
                                        newPairs[pIdx].middleType = e.target.value as any;
                                        updateElement(selectedElement.id, { pairs: newPairs });
                                      }}
                                      className="w-full text-[10px] p-1.5 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                                    >
                                      <option value="text">Text</option>
                                      <option value="image">Image</option>
                                      <option value="icon">Icon</option>
                                    </select>
                                    {pair.middleType === 'image' ? (
                                      <div className="space-y-1">
                                        <textarea 
                                          value={pair.middleSrc || ''} 
                                          placeholder="URL"
                                          onChange={(e) => {
                                            const newPairs = [...(selectedElement.pairs || [])];
                                            newPairs[pIdx].middleSrc = e.target.value;
                                            updateElement(selectedElement.id, { pairs: newPairs });
                                          }}
                                          className="w-full text-[10px] p-2 bg-white border border-gray-200 rounded mb-1 min-h-[34px] resize-none"
                                        />
                                        <label className="block">
                                          <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                            <Download size={10} /> Upload
                                          </div>
                                          <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                  const newPairs = [...(selectedElement.pairs || [])];
                                                  newPairs[pIdx].middleSrc = reader.result as string;
                                                  updateElement(selectedElement.id, { pairs: newPairs });
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>
                                    ) : (
                                      <textarea 
                                        value={pair.middleContent || ''} 
                                        placeholder="Text"
                                        onChange={(e) => {
                                          const newPairs = [...(selectedElement.pairs || [])];
                                          newPairs[pIdx].middleContent = e.target.value;
                                          updateElement(selectedElement.id, { pairs: newPairs });
                                        }}
                                        className="w-full text-[10px] p-2 bg-white border border-gray-200 rounded min-h-[50px] resize-none"
                                      />
                                    )}
                                  </div>
                                )}

                                {/* Right Side */}
                                <div className="flex-1 p-2 border border-gray-100 rounded-lg bg-white space-y-2">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Right Item</span>
                                  <select 
                                    value={pair.rightType}
                                    onChange={(e) => {
                                      const newPairs = [...(selectedElement.pairs || [])];
                                      newPairs[pIdx].rightType = e.target.value as any;
                                      updateElement(selectedElement.id, { pairs: newPairs });
                                    }}
                                    className="w-full text-[10px] p-1.5 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-brand-primary outline-none"
                                  >
                                    <option value="text">Text</option>
                                    <option value="image">Image</option>
                                    <option value="icon">Icon</option>
                                  </select>
                                  {pair.rightType === 'image' ? (
                                    <div className="space-y-1">
                                      <textarea 
                                        value={pair.rightSrc || ''} 
                                        placeholder="Image URL"
                                        onChange={(e) => {
                                          const newPairs = [...(selectedElement.pairs || [])];
                                          newPairs[pIdx].rightSrc = e.target.value;
                                          updateElement(selectedElement.id, { pairs: newPairs });
                                        }}
                                        className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded mb-1 min-h-[34px] resize-none"
                                      />
                                      <label className="block">
                                        <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                          <Download size={10} /> Upload
                                        </div>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                const newPairs = [...(selectedElement.pairs || [])];
                                                newPairs[pIdx].rightSrc = reader.result as string;
                                                updateElement(selectedElement.id, { pairs: newPairs });
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <textarea 
                                      value={pair.rightContent || ''} 
                                      placeholder={pair.rightType === 'icon' ? 'Select Emoji' : 'Enter Text'}
                                      onChange={(e) => {
                                        const newPairs = [...(selectedElement.pairs || [])];
                                        newPairs[pIdx].rightContent = e.target.value;
                                        updateElement(selectedElement.id, { pairs: newPairs });
                                      }}
                                      className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded min-h-[50px] resize-none"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newPair = { id: `p-${Date.now()}`, leftType: 'text' as const, leftContent: 'Question', rightType: 'text' as const, rightContent: 'Answer' };
                              updateElement(selectedElement.id, { pairs: [...(selectedElement.pairs || []), newPair] });
                            }}
                            className="w-full py-2 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-lg border border-dashed border-brand-primary hover:bg-brand-primary/20 transition-all"
                          >
                            + Add Another Pair
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'sequencing' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Order Mode</span>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                              {['auto', 'manual'].map(m => (
                                <button
                                  key={m}
                                  onClick={() => updateStyle(selectedElement.id, { orderingMode: m as any })}
                                  className={`flex-1 py-1 rounded-md text-[10px] uppercase font-black ${selectedElement.style.orderingMode === m ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Layout Mode</span>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                              {['grid', 'free'].map(l => (
                                <button
                                  key={l}
                                  onClick={() => updateStyle(selectedElement.id, { layoutMode: l as any })}
                                  className={`flex-1 py-1 rounded-md text-[10px] uppercase font-black ${selectedElement.style.layoutMode === l ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                                >
                                  {l}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Question Text</span>
                          <textarea 
                            value={selectedElement.content || ''}
                            onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                            className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[60px] resize-none focus:ring-1 focus:ring-brand-primary outline-none"
                            placeholder="Example: Put these in correct order"
                          />
                          <div className="mt-2">
                             <label className="block">
                                <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                  <ImageIcon size={12} /> Upload Question Image
                                </div>
                                <input 
                                  type="file" className="hidden" accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => updateElement(selectedElement.id, { src: reader.result as string });
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                             </label>
                             {selectedElement.src && (
                               <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                                 <img src={selectedElement.src} alt="" className="h-8 w-8 object-contain rounded" referrerPolicy="no-referrer" />
                                 <button onClick={() => updateElement(selectedElement.id, { src: '' })} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                               </div>
                             )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Step Sequence Details</span>
                          {selectedElement.choices?.map((choice, cIdx) => (
                            <div key={choice.id} className="p-3 rounded-lg border-2 bg-gray-50 border-gray-100 flex flex-col gap-3 relative">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Step #{cIdx + 1}</span>
                                  <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                                    <span className="text-[9px] text-gray-400 font-bold">Pos:</span>
                                    <input 
                                      type="number"
                                      value={choice.orderIndex || (cIdx + 1)}
                                      onChange={(e) => {
                                        const newChoices = [...(selectedElement.choices || [])];
                                        newChoices[cIdx].orderIndex = parseInt(e.target.value);
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="w-8 text-[10px] font-bold text-brand-primary outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    onClick={() => handleDuplicateChoice(selectedElement.id, choice.id)}
                                    className="text-blue-400 hover:text-blue-600 p-1"
                                    title="Duplicate"
                                  >
                                    <Copy size={12} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newChoices = selectedElement.choices?.filter(c => c.id !== choice.id);
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="text-red-400 hover:text-red-600 p-1"
                                    title="Delete"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                  <select 
                                    value={choice.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as any;
                                      const newChoices = [...(selectedElement.choices || [])];
                                      newChoices[cIdx].type = newType;
                                      
                                      // Default sizes if in free layout
                                      if (selectedElement.style.layoutMode === 'free' || selectedElement.style.choiceLayout === 'free') {
                                        if (newType === 'icon') {
                                          newChoices[cIdx].width = 60;
                                          newChoices[cIdx].height = 60;
                                        } else if (newType === 'text') {
                                          newChoices[cIdx].width = 120;
                                          newChoices[cIdx].height = 48;
                                        }
                                      }
                                      
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="w-full text-[10px] p-1.5 bg-white border border-gray-200 rounded"
                                  >
                                  <option value="text">Text Step</option>
                                  <option value="image">Image Step</option>
                                  <option value="icon">Icon Step</option>
                                </select>

                                {choice.type === 'image' ? (
                                  <div className="space-y-1">
                                    <input 
                                      type="text" 
                                      value={choice.src || ''} 
                                      placeholder="Image URL"
                                      onChange={(e) => {
                                        const newChoices = [...(selectedElement.choices || [])];
                                        newChoices[cIdx].src = e.target.value;
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="w-full text-[10px] p-1.5 bg-white border border-gray-200 rounded"
                                    />
                                    <label className="block">
                                      <div className="w-full py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors">
                                        <Download size={10} /> Upload
                                      </div>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                const img = new Image();
                                                img.onload = () => {
                                                  const newChoices = [...(selectedElement.choices || [])];
                                                  newChoices[cIdx].src = reader.result as string;
                                                  
                                                  // Auto adjust dimensions if in free layout
                                                  if (selectedElement.style.layoutMode === 'free') {
                                                    const maxDim = 200;
                                                    let w = img.width;
                                                    let h = img.height;
                                                    if (w > maxDim || h > maxDim) {
                                                      const ratio = Math.min(maxDim / w, maxDim / h);
                                                      w = Math.round(w * ratio);
                                                      h = Math.round(h * ratio);
                                                    }
                                                    newChoices[cIdx].width = w;
                                                    newChoices[cIdx].height = h;
                                                  }
                                                  
                                                  updateElement(selectedElement.id, { choices: newChoices });
                                                };
                                                img.src = reader.result as string;
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                    </label>
                                  </div>
                                ) : (
                                  <textarea 
                                    value={choice.content || ''} 
                                    placeholder={choice.type === 'icon' ? 'Enter Emoji' : 'Enter Text Content'}
                                    onChange={(e) => {
                                      const newChoices = [...(selectedElement.choices || [])];
                                      newChoices[cIdx].content = e.target.value;
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="w-full text-[10px] p-2 bg-white border border-gray-200 rounded min-h-[40px] resize-none"
                                  />
                                )}

                                {selectedElement.style.layoutMode === 'free' && (
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase">X Pos</span>
                                      <input 
                                        type="number"
                                        value={choice.x || 0}
                                        onChange={(e) => {
                                          const newChoices = [...(selectedElement.choices || [])];
                                          newChoices[cIdx].x = parseInt(e.target.value);
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className="w-full text-[10px] p-1.5 border border-gray-200 rounded"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase">Y Pos</span>
                                      <input 
                                        type="number"
                                        value={choice.y || 0}
                                        onChange={(e) => {
                                          const newChoices = [...(selectedElement.choices || [])];
                                          newChoices[cIdx].y = parseInt(e.target.value);
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className="w-full text-[10px] p-1.5 border border-gray-200 rounded"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase">Width</span>
                                      <input 
                                        type="number"
                                        value={choice.width || (choice.type === 'image' ? 120 : 0)}
                                        placeholder="Auto"
                                        onChange={(e) => {
                                          const newChoices = [...(selectedElement.choices || [])];
                                          newChoices[cIdx].width = parseInt(e.target.value);
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className="w-full text-[10px] p-1.5 border border-gray-200 rounded"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase">Height</span>
                                      <input 
                                        type="number"
                                        value={choice.height || (choice.type === 'image' ? 120 : 0)}
                                        placeholder="Auto"
                                        onChange={(e) => {
                                          const newChoices = [...(selectedElement.choices || [])];
                                          newChoices[cIdx].height = parseInt(e.target.value);
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className="w-full text-[10px] p-1.5 border border-gray-200 rounded"
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Choice Size Presets */}
                                <div className="flex gap-1 mt-1">
                                  <button 
                                    onClick={() => {
                                      const newChoices = [...(selectedElement.choices || [])];
                                      newChoices[cIdx].width = 64;
                                      newChoices[cIdx].height = 64;
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-black hover:border-brand-primary transition-all uppercase"
                                  >
                                    Icon
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newChoices = [...(selectedElement.choices || [])];
                                      // Toggle between landscape and portrait if it's an image
                                      const isLandscape = choice.type === 'image' ? (choice.width === 160) : false;
                                      newChoices[cIdx].width = isLandscape ? 120 : 160;
                                      newChoices[cIdx].height = isLandscape ? 160 : 120;
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-black hover:border-brand-primary transition-all uppercase"
                                  >
                                    Item
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newChoices = [...(selectedElement.choices || [])];
                                      newChoices[cIdx].width = undefined;
                                      newChoices[cIdx].height = undefined;
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-black hover:border-brand-primary transition-all uppercase"
                                  >
                                    Auto
                                  </button>
                                </div>

                                {/* Choice Size Presets */}
                                {selectedElement.style.layoutMode === 'free' && (
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => {
                                        const newChoices = [...(selectedElement.choices || [])];
                                        newChoices[cIdx].width = 64;
                                        newChoices[cIdx].height = 64;
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-bold hover:border-brand-primary transition-all uppercase"
                                    >
                                      Icon
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newChoices = [...(selectedElement.choices || [])];
                                        const isLandscape = choice.type === 'text' ? false : true;
                                        newChoices[cIdx].width = isLandscape ? 160 : 120;
                                        newChoices[cIdx].height = isLandscape ? 120 : 160;
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-bold hover:border-brand-primary transition-all uppercase"
                                    >
                                      Medium
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newChoices = [...(selectedElement.choices || [])];
                                        newChoices[cIdx].width = 240;
                                        newChoices[cIdx].height = 180;
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-bold hover:border-brand-primary transition-all uppercase"
                                    >
                                      Large
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const newChoice = { id: `c-${Date.now()}`, type: 'text' as const, content: 'New Step', isCorrect: true, x: 0, y: 0 };
                              updateElement(selectedElement.id, { choices: [...(selectedElement.choices || []), newChoice] });
                            }}
                            className="w-full py-2 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-lg border border-dashed border-brand-primary hover:bg-brand-primary/20 transition-all"
                          >
                            + Add Step Item
                          </button>
                        </div>
                      </div>
                    )}
                    {['multiple-choice', 'checkbox', 'numberbox'].includes(selectedElement.type) && (
                      <div className="space-y-4">
                        <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/20">
                          <span className="text-[10px] text-brand-primary font-black mb-2 block uppercase tracking-wider">Widget Type</span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { id: 'multiple-choice', label: 'Choices', icon: Layers },
                              { id: 'checkbox', label: 'Checks', icon: CheckSquare },
                              { id: 'numberbox', label: 'Num Inputs', icon: Hash }
                            ].map(t => (
                              <button
                                key={t.id}
                                onClick={() => updateElement(selectedElement.id, { type: t.id as any })}
                                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${selectedElement.type === t.id ? 'bg-white shadow-sm ring-1 ring-brand-primary' : 'hover:bg-white/50 text-gray-400'}`}
                              >
                                <t.icon size={14} className={selectedElement.type === t.id ? 'text-brand-primary' : 'text-gray-400'} />
                                <span className={`text-[8px] font-bold uppercase ${selectedElement.type === t.id ? 'text-brand-primary' : 'text-gray-400'}`}>{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Common Logic for all three */}
                        <div className="space-y-4">
                          {/* Layout & Spacing Controls */}
                          <div className="grid grid-cols-2 gap-3">
                            {selectedElement.type === 'multiple-choice' && (
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Choice Layout</span>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                  {['horizontal', 'vertical', 'free'].map(o => (
                                    <button
                                      key={o}
                                      onClick={() => updateStyle(selectedElement.id, { choiceLayout: o as any })}
                                      className={`flex-1 py-1 rounded-md text-[10px] uppercase font-black ${selectedElement.style.choiceLayout === o ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                                    >
                                      {o === 'free' ? 'F' : o[0]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className={selectedElement.type !== 'multiple-choice' ? 'col-span-2' : ''}>
                              <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Item Spacing ({selectedElement.style.itemSpacing || 12}px)</span>
                              <input 
                                type="range" min="0" max="100" step="2"
                                value={selectedElement.style.itemSpacing || 12}
                                onChange={(e) => updateStyle(selectedElement.id, { itemSpacing: parseInt(e.target.value) })}
                                className="w-full accent-brand-primary"
                              />
                            </div>
                          </div>

                          {/* Question Content */}
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Question / Heading Text</span>
                            <textarea 
                              value={selectedElement.content || ''}
                              onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[60px] resize-none focus:ring-1 focus:ring-brand-primary outline-none"
                              placeholder="Enter your question or heading here..."
                            />
                            <div className="mt-2">
                               <label className="block">
                                  <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                    <ImageIcon size={12} /> Upload Question Image
                                  </div>
                                  <input 
                                    type="file" className="hidden" accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => updateElement(selectedElement.id, { src: reader.result as string });
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                               </label>
                               {selectedElement.src && (
                                 <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                                   <img src={selectedElement.src} alt="" className="h-8 w-8 object-contain rounded" referrerPolicy="no-referrer" />
                                   <button onClick={() => updateElement(selectedElement.id, { src: '' })} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                                 </div>
                               )}
                            </div>
                          </div>

                          {selectedElement.type === 'multiple-choice' && (
                            <div className="space-y-4">
                              {/* Quick Templates */}
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Quick Templates</span>
                                <div className="grid grid-cols-3 gap-2">
                                  <button 
                                    onClick={() => {
                                      updateElement(selectedElement.id, {
                                        choices: [
                                          { id: `c-yes-${Date.now()}`, type: 'text', content: 'Yes', isCorrect: true },
                                          { id: `c-no-${Date.now()}`, type: 'text', content: 'No', isCorrect: false }
                                        ]
                                      });
                                    }}
                                    className="py-1.5 px-2 bg-white border border-gray-200 rounded text-[9px] font-bold hover:border-brand-primary transition-all"
                                  >
                                    Yes / No
                                  </button>
                                  <button 
                                    onClick={() => {
                                      updateElement(selectedElement.id, {
                                        choices: [
                                          { id: `c-right-${Date.now()}`, type: 'icon', content: '✅', isCorrect: true },
                                          { id: `c-wrong-${Date.now()}`, type: 'icon', content: '❌', isCorrect: false }
                                        ]
                                      });
                                    }}
                                    className="py-1.5 px-2 bg-white border border-gray-200 rounded text-[9px] font-bold hover:border-brand-primary transition-all"
                                  >
                                    Icons (✓/✗)
                                  </button>
                                  <button 
                                    onClick={() => {
                                      updateElement(selectedElement.id, {
                                        choices: [
                                          { id: `c-happy-${Date.now()}`, type: 'icon', content: '😊', isCorrect: true },
                                          { id: `c-sad-${Date.now()}`, type: 'icon', content: '☹️', isCorrect: false }
                                        ]
                                      });
                                    }}
                                    className="py-1.5 px-2 bg-white border border-gray-200 rounded text-[9px] font-bold hover:border-brand-primary transition-all"
                                  >
                                    Mood (😊/☹️)
                                  </button>
                                </div>
                              </div>

                              {/* Choice Alignment */}
                              <div>
                                <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Choice Alignment</span>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                  {['left', 'center', 'right'].map(a => (
                                    <button
                                      key={a}
                                      onClick={() => updateStyle(selectedElement.id, { choiceAlign: a as any })}
                                      className={`flex-1 py-1 rounded-md text-[10px] uppercase font-black ${selectedElement.style.choiceAlign === a ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                                    >
                                      {a[0]}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* List of Choices/Items */}
                          <div className="space-y-4">
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Manage Items</span>
                            {selectedElement.choices?.map((choice, cIdx) => (
                              <div key={choice.id} className={`p-3 rounded-lg border-2 flex flex-col gap-3 relative transition-all ${choice.isCorrect ? 'border-green-200 bg-green-50/30' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Item #{cIdx + 1}</span>
                                    {selectedElement.type === 'multiple-choice' && (
                                      <button 
                                        onClick={() => {
                                          const newChoices = selectedElement.choices?.map(c => ({
                                            ...c,
                                            isCorrect: c.id === choice.id
                                          }));
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${choice.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                      >
                                        {choice.isCorrect ? 'Correct' : 'Mark Correct'}
                                      </button>
                                    )}
                                    {selectedElement.type === 'checkbox' && (
                                      <button 
                                        onClick={() => {
                                          const newChoices = selectedElement.choices?.map(c => 
                                            c.id === choice.id ? { ...c, isCorrect: !c.isCorrect } : c
                                          );
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${choice.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                      >
                                        {choice.isCorrect ? 'Correct' : 'Mark Correct'}
                                      </button>
                                    )}
                                    {selectedElement.type === 'numberbox' && (
                                      <div className="flex items-center gap-1">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${choice.answer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                          {choice.answer ? 'Has Answer' : 'No Answer'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button 
                                      onClick={() => handleDuplicateChoice(selectedElement.id, choice.id)}
                                      className="text-blue-400 hover:text-blue-600 p-1"
                                      title="Duplicate Item"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const newChoices = selectedElement.choices?.filter(c => c.id !== choice.id);
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="text-red-400 hover:text-red-600 p-1"
                                      title="Delete Item"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <select 
                                    value={choice.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as any;
                                      const newChoices = [...(selectedElement.choices || [])];
                                      newChoices[cIdx].type = newType;
                                      
                                      // Default sizes if in free layout
                                      if (selectedElement.style.layoutMode === 'free' || selectedElement.style.choiceLayout === 'free') {
                                        if (newType === 'icon') {
                                          newChoices[cIdx].width = 60;
                                          newChoices[cIdx].height = 60;
                                        } else if (newType === 'text') {
                                          newChoices[cIdx].width = 120;
                                          newChoices[cIdx].height = 48;
                                        }
                                      }
                                      
                                      updateElement(selectedElement.id, { choices: newChoices });
                                    }}
                                    className="w-full text-[10px] p-1.5 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-brand-primary outline-none"
                                  >
                                    <option value="text">Text / Label</option>
                                    <option value="image">Image Item</option>
                                    <option value="icon">Icon / Emoji</option>
                                  </select>

                                  {choice.type === 'image' ? (
                                    <div className="space-y-1">
                                      <textarea 
                                        value={choice.src || ''} 
                                        placeholder="Image URL"
                                        onChange={(e) => {
                                          const newChoices = [...(selectedElement.choices || [])];
                                          newChoices[cIdx].src = e.target.value;
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className="w-full text-[10px] p-2 bg-white border border-gray-200 rounded mb-1 min-h-[34px] resize-none"
                                      />
                                      <label className="block">
                                        <div className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors">
                                          <Download size={10} /> Upload Image
                                        </div>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              const reader = new FileReader();
                                              reader.onloadend = () => {
                                                const img = new Image();
                                                img.onload = () => {
                                                  const newChoices = [...(selectedElement.choices || [])];
                                                  newChoices[cIdx].src = reader.result as string;
                                                  
                                                  // Auto adjust dimensions if in free layout
                                                  if (selectedElement.style.choiceLayout === 'free') {
                                                    const maxDim = 200;
                                                    let w = img.width;
                                                    let h = img.height;
                                                    if (w > maxDim || h > maxDim) {
                                                      const ratio = Math.min(maxDim / w, maxDim / h);
                                                      w = Math.round(w * ratio);
                                                      h = Math.round(h * ratio);
                                                    }
                                                    newChoices[cIdx].width = w;
                                                    newChoices[cIdx].height = h;
                                                  }
                                                  
                                                  updateElement(selectedElement.id, { choices: newChoices });
                                                };
                                                img.src = reader.result as string;
                                              };
                                              reader.readAsDataURL(file);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <textarea 
                                      value={choice.content || ''} 
                                      placeholder={choice.type === 'icon' ? 'Enter Emoji' : 'Enter Item Label'}
                                      onChange={(e) => {
                                        const newChoices = [...(selectedElement.choices || [])];
                                        newChoices[cIdx].content = e.target.value;
                                        updateElement(selectedElement.id, { choices: newChoices });
                                      }}
                                      className="w-full text-[10px] p-2 bg-white border border-gray-200 rounded min-h-[40px] resize-none"
                                    />
                                  )}

                                  {(selectedElement.style.choiceLayout === 'free' || selectedElement.style.layoutMode === 'free') && (
                                    <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[9px] text-gray-400 font-bold uppercase">X Pos</span>
                                          <input 
                                            type="number"
                                            value={choice.x || 0}
                                            onChange={(e) => {
                                              const newChoices = [...(selectedElement.choices || [])];
                                              newChoices[cIdx].x = parseInt(e.target.value) || 0;
                                              updateElement(selectedElement.id, { choices: newChoices });
                                            }}
                                            className="w-full text-[10px] p-1.5 border border-gray-200 rounded font-mono"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-[9px] text-gray-400 font-bold uppercase">Y Pos</span>
                                          <input 
                                            type="number"
                                            value={choice.y || 0}
                                            onChange={(e) => {
                                              const newChoices = [...(selectedElement.choices || [])];
                                              newChoices[cIdx].y = parseInt(e.target.value) || 0;
                                              updateElement(selectedElement.id, { choices: newChoices });
                                            }}
                                            className="w-full text-[10px] p-1.5 border border-gray-200 rounded font-mono"
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Choice Size Presets */}
                                      <div className="flex gap-1">
                                        <button 
                                          onClick={() => {
                                            const newChoices = [...(selectedElement.choices || [])];
                                            newChoices[cIdx].width = 64;
                                            newChoices[cIdx].height = 64;
                                            updateElement(selectedElement.id, { choices: newChoices });
                                          }}
                                          className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-black hover:border-brand-primary transition-all uppercase"
                                        >
                                          Icon
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const newChoices = [...(selectedElement.choices || [])];
                                            newChoices[cIdx].width = 160;
                                            newChoices[cIdx].height = 120;
                                            updateElement(selectedElement.id, { choices: newChoices });
                                          }}
                                          className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-black hover:border-brand-primary transition-all uppercase"
                                        >
                                          Medium
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const newChoices = [...(selectedElement.choices || [])];
                                            newChoices[cIdx].width = 240;
                                            newChoices[cIdx].height = 180;
                                            updateElement(selectedElement.id, { choices: newChoices });
                                          }}
                                          className="flex-1 py-1 bg-white border border-gray-200 rounded text-[8px] font-black hover:border-brand-primary transition-all uppercase"
                                        >
                                          Large
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {selectedElement.type === 'numberbox' && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase mb-1.5 block">Correct Value (Text/Num/Sign)</span>
                                      <input 
                                        type="text"
                                        value={choice.answer || ''}
                                        onChange={(e) => {
                                          const newChoices = [...(selectedElement.choices || [])];
                                          newChoices[cIdx].answer = e.target.value;
                                          newChoices[cIdx].isCorrect = e.target.value.trim() !== '';
                                          updateElement(selectedElement.id, { choices: newChoices });
                                        }}
                                        className="w-full text-xs p-2 bg-white border border-gray-200 rounded focus:ring-1 focus:ring-brand-primary outline-none font-mono"
                                        placeholder="Enter correct answer..."
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newChoice = { id: `c-${Date.now()}`, type: 'text' as const, content: 'Text Label', isCorrect: false };
                                updateElement(selectedElement.id, { choices: [...(selectedElement.choices || []), newChoice] });
                              }}
                              className="w-full py-2 bg-brand-primary/10 text-brand-primary text-[10px] font-bold rounded-lg border border-dashed border-brand-primary hover:bg-brand-primary/20 transition-all"
                            >
                              + Add Item
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'fill-in-the-blank' && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Question Asset (Image/Icon)</span>
                          <div className="flex gap-2">
                             <input 
                               type="text"
                               placeholder="Image URL..."
                               value={selectedElement.src || ''}
                               onChange={(e) => updateElement(selectedElement.id, { src: e.target.value })}
                               className="flex-1 text-[10px] p-2 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-brand-primary outline-none"
                             />
                             <label className="p-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer transition-colors shrink-0">
                               <Download size={14} className="text-gray-600" />
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*"
                                 onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) {
                                     const reader = new FileReader();
                                     reader.onloadend = () => updateElement(selectedElement.id, { src: reader.result as string });
                                     reader.readAsDataURL(file);
                                   }
                                 }}
                               />
                             </label>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-gray-500 font-bold block">Question Template</span>
                            <span className="text-[9px] text-brand-primary font-bold bg-brand-primary/10 px-1.5 py-0.5 rounded">Use [blank]</span>
                          </div>
                          <textarea 
                            value={selectedElement.content || ''}
                            onChange={(e) => {
                              const newContent = e.target.value;
                              const blanksCount = (newContent.match(/\[blank\]/g) || []).length;
                              const currentBlanks = selectedElement.blanks || [];
                              let newBlanks = [...currentBlanks];
                              
                              if (blanksCount > currentBlanks.length) {
                                for (let i = currentBlanks.length; i < blanksCount; i++) {
                                  newBlanks.push({ id: `b-${Date.now()}-${i}`, answer: '', placeholder: 'Answer...' });
                                }
                              } else if (blanksCount < currentBlanks.length) {
                                newBlanks = newBlanks.slice(0, blanksCount);
                              }
                              
                              updateElement(selectedElement.id, { content: newContent, blanks: newBlanks });
                            }}
                            className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[80px] resize-none focus:ring-1 focus:ring-brand-primary outline-none"
                            placeholder="Example: The sky is [blank]."
                          />
                        </div>

                        <div className="space-y-3">
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Configure Blanks</span>
                          {selectedElement.blanks?.map((blank, bIdx) => (
                            <div key={blank.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                              <span className="text-[10px] font-black text-gray-400">Blank #{bIdx + 1}</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[9px] text-gray-400 block mb-1">Correct Answer</span>
                                  <input 
                                    type="text"
                                    value={blank.answer}
                                    onChange={(e) => {
                                      const newBlanks = [...(selectedElement.blanks || [])];
                                      newBlanks[bIdx].answer = e.target.value;
                                      updateElement(selectedElement.id, { blanks: newBlanks });
                                    }}
                                    className="w-full text-[10px] p-1.5 bg-white border border-gray-200 rounded"
                                  />
                                </div>
                                <div>
                                  <span className="text-[9px] text-gray-400 block mb-1">Placeholder</span>
                                  <input 
                                    type="text"
                                    value={blank.placeholder || ''}
                                    onChange={(e) => {
                                      const newBlanks = [...(selectedElement.blanks || [])];
                                      newBlanks[bIdx].placeholder = e.target.value;
                                      updateElement(selectedElement.id, { blanks: newBlanks });
                                    }}
                                    className="w-full text-[10px] p-1.5 bg-white border border-gray-200 rounded"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="h-px bg-gray-100 my-4" />
                      </div>
                    )}

                    {/* Label specific style */}
                    {(selectedElement.type === 'label' || selectedElement.type === 'label-input') && (
                      <div className="pt-4 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold mb-3 block uppercase tracking-wider">Label Shape</span>
                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                          {[
                            { name: 'Circle', val: '50%' },
                            { name: 'Rounded', val: '12px' },
                            { name: 'Square', val: '0px' },
                          ].map(shape => (
                            <button
                              key={shape.name}
                              onClick={() => updateStyle(selectedElement.id, { borderRadius: shape.val })}
                              className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedElement.style.borderRadius === shape.val ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              {shape.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedElement.type === 'label-input' && (
                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wider">Reference Image (Optional)</span>
                          <div className="space-y-2">
                             <input 
                               type="text"
                               placeholder="Image URL..."
                               value={selectedElement.src || ''}
                               onChange={(e) => updateElement(selectedElement.id, { src: e.target.value })}
                               className="w-full text-[10px] p-2 bg-gray-50 border border-gray-200 rounded focus:ring-1 focus:ring-brand-primary outline-none"
                             />
                             <label className="block">
                                <div className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm">
                                  <ImageIcon size={12} /> Upload Image
                                </div>
                                <input 
                                  type="file" className="hidden" accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => updateElement(selectedElement.id, { src: reader.result as string });
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                             </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Correct Answer (Label ID)</span>
                            <input 
                              type="text"
                              value={selectedElement.labelId || ''}
                              onChange={(e) => updateElement(selectedElement.id, { labelId: e.target.value.toUpperCase() })}
                              className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-primary outline-none font-black text-brand-primary"
                              placeholder="e.g. CAT"
                              maxLength={10}
                            />
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                           <div>
                            <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase tracking-wider">Badge Position</span>
                            <div className="grid grid-cols-5 gap-1">
                              {[
                                { id: 'top-left', icon: '↖' },
                                { id: 'top-right', icon: '↗' },
                                { id: 'bottom-left', icon: '↙' },
                                { id: 'bottom-right', icon: '↘' },
                                { id: 'free', icon: '✣' },
                              ].map((pos) => (
                                <button
                                  key={pos.id}
                                  onClick={() => updateStyle(selectedElement.id, { labelPosition: pos.id as any })}
                                  className={`py-1.5 rounded border text-xs font-bold transition-all ${selectedElement.style.labelPosition === pos.id || (!selectedElement.style.labelPosition && pos.id === 'top-left') ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-brand-primary/50'}`}
                                >
                                  {pos.icon}
                                </button>
                              ))}
                            </div>
                            
                            {selectedElement.style.labelPosition === 'free' && (
                              <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="space-y-1 text-center">
                                  <span className="text-[8px] text-gray-400 font-bold uppercase">X Offset (%)</span>
                                  <input 
                                    type="number"
                                    value={selectedElement.style.labelX || 0}
                                    onChange={(e) => updateStyle(selectedElement.id, { labelX: parseInt(e.target.value) || 0 })}
                                    className="w-full text-[10px] text-center p-1 border border-gray-200 rounded font-mono focus:ring-1 focus:ring-brand-primary outline-none"
                                    placeholder="-200 to 200"
                                  />
                                </div>
                                <div className="space-y-1 text-center">
                                  <span className="text-[8px] text-gray-400 font-bold uppercase">Y Offset (%)</span>
                                  <input 
                                    type="number"
                                    value={selectedElement.style.labelY || 0}
                                    onChange={(e) => updateStyle(selectedElement.id, { labelY: parseInt(e.target.value) || 0 })}
                                    className="w-full text-[10px] text-center p-1 border border-gray-200 rounded font-mono focus:ring-1 focus:ring-brand-primary outline-none"
                                    placeholder="-200 to 200"
                                  />
                                </div>
                                <p className="col-span-2 text-[7px] text-gray-400 italic mt-1 leading-tight text-center">
                                  Adjust offsets to place the label anywhere relative to the item. 0% is top-left, 100% is bottom-right.
                                </p>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Badge Size</span>
                              <span className="text-[10px] font-mono text-brand-primary">{selectedElement.style.labelSize || 32}px</span>
                            </div>
                            <input 
                              type="range"
                              min="20"
                              max="64"
                              value={selectedElement.style.labelSize || 32}
                              onChange={(e) => updateStyle(selectedElement.id, { labelSize: parseInt(e.target.value) })}
                              className="w-full accent-brand-primary"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">Border Settings</span>
                          <div className="grid grid-cols-2 gap-2">
                             <input 
                               type="color"
                               value={selectedElement.style.borderColor || '#e5e7eb'}
                               onChange={(e) => updateStyle(selectedElement.id, { borderColor: e.target.value, borderWidth: '2px' })}
                               className="w-full h-8 bg-white border border-gray-200 rounded p-1"
                             />
                             <div className="flex items-center gap-2">
                               <span className="text-[9px] text-gray-400">Thick</span>
                               <input 
                                 type="range"
                                 min="0"
                                 max="8"
                                 value={parseInt(selectedElement.style.borderWidth || '2')}
                                 onChange={(e) => updateStyle(selectedElement.id, { borderWidth: `${e.target.value}px` })}
                                 className="flex-1"
                               />
                             </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                   {/* Scaling Control */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Scaling (Zoom)</span>
                        <span className="text-[10px] font-mono font-bold text-brand-primary">
                          {selectedElement.style.scale ? Math.round(selectedElement.style.scale * 100) : 100}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.2"
                        max="3"
                        step="0.05"
                        value={selectedElement.style.scale || 1}
                        onChange={(e) => updateStyle(selectedElement.id, { scale: parseFloat(e.target.value) })}
                        className="w-full accent-brand-primary"
                      />
                    </div>

                    {/* Equal Size Choices */}
                    {(selectedElement.type === 'multiple-choice' || selectedElement.type === 'sequencing') && (
                      <div className="pt-4 border-t border-gray-100">
                        <button 
                          onClick={() => updateStyle(selectedElement.id, { equalSizeItems: !selectedElement.style.equalSizeItems })}
                          className={`w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 border-2 ${selectedElement.style.equalSizeItems ? 'bg-brand-primary border-brand-primary text-white shadow-lg translate-y-[-1px]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                        >
                          <Maximize size={14} />
                          {selectedElement.style.equalSizeItems ? 'Uniform Sizes: ON' : 'Uniform Sizes: OFF'}
                        </button>
                        <p className="text-[9px] text-gray-400 mt-2 italic text-center leading-tight px-2">Makes all choice buttons the same dimensions regardless of content</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Font Selection */}
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Font Family</span>
                        <select 
                          value={selectedElement.style.fontFamily || 'Inter'} 
                          onChange={(e) => updateStyle(selectedElement.id, { fontFamily: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium"
                          style={{ fontFamily: selectedElement.style.fontFamily }}
                        >
                          {FAMOUS_FONTS.map(font => (
                            <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Font Size (px)</span>
                          <input 
                            type="number"
                            value={parseInt(selectedElement.style.fontSize || '20')} 
                            onChange={(e) => updateStyle(selectedElement.id, { fontSize: `${e.target.value}px` })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono"
                            min="8"
                            max="120"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Weight</span>
                          <select 
                            value={selectedElement.style.fontWeight || '500'} 
                            onChange={(e) => updateStyle(selectedElement.id, { fontWeight: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium"
                          >
                            <option value="300">Light</option>
                            <option value="400">Regular</option>
                            <option value="500">Medium</option>
                            <option value="600">Semi Bold</option>
                            <option value="700">Bold</option>
                            <option value="900">Black</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Styles</span>
                          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                            <button
                              onClick={() => updateStyle(selectedElement.id, { fontStyle: selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
                              className={`flex-1 py-1.5 rounded-md flex justify-center items-center ${selectedElement.style.fontStyle === 'italic' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                            >
                              <Italic size={14} />
                            </button>
                            <button
                              onClick={() => updateStyle(selectedElement.id, { textDecoration: selectedElement.style.textDecoration === 'underline' ? 'none' : 'underline' })}
                              className={`flex-1 py-1.5 rounded-md flex justify-center items-center ${selectedElement.style.textDecoration === 'underline' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}
                            >
                              <Underline size={14} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Case</span>
                          <div className="flex bg-gray-100 rounded-lg p-1">
                            {['none', 'uppercase', 'lowercase', 'capitalize', 'small-caps'].map(transform => (
                              <button
                                key={transform}
                                onClick={() => {
                                  if (transform === 'small-caps') {
                                    updateStyle(selectedElement.id, { fontVariant: selectedElement.style.fontVariant === 'small-caps' ? 'normal' : 'small-caps' });
                                  } else {
                                    updateStyle(selectedElement.id, { textTransform: transform as any });
                                  }
                                }}
                                className={`flex-1 py-1.5 rounded-md text-[9px] font-bold ${
                                  (transform === 'small-caps' && selectedElement.style.fontVariant === 'small-caps') || 
                                  (transform !== 'small-caps' && selectedElement.style.textTransform === transform) 
                                    ? 'bg-white shadow-sm text-brand-primary' 
                                    : 'text-gray-400'
                                }`}
                              >
                                {transform === 'none' ? 'Aa' : 
                                 transform === 'uppercase' ? 'AA' : 
                                 transform === 'lowercase' ? 'aa' : 
                                 transform === 'capitalize' ? 'Ab' : 'aA'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Text Align</span>
                          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                            {[
                              { id: 'left', icon: AlignLeft },
                              { id: 'center', icon: AlignCenter },
                              { id: 'right', icon: AlignRight }
                            ].map(align => (
                              <button
                                key={align.id}
                                onClick={() => {
                                  updateStyle(selectedElement.id, { 
                                    textAlign: align.id as any,
                                    choiceAlign: align.id as any 
                                  });
                                }}
                                className={`flex-1 py-1.5 rounded-md flex justify-center items-center transition-all ${selectedElement.style.textAlign === align.id || selectedElement.style.choiceAlign === align.id ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                <align.icon size={14} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold mb-1.5 block uppercase">Text Color</span>
                          <input 
                            type="color"
                            value={selectedElement.style.color || '#1f2937'}
                            onChange={(e) => updateStyle(selectedElement.id, { color: e.target.value })}
                            className="w-full h-8 bg-white border border-gray-200 rounded-lg p-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 font-bold mb-1.5 block">Background Color</span>
                      <div className="flex flex-wrap gap-2">
                        {['transparent', '#FF6B6B', '#4ECDC4', '#FFE66D', '#1e293b', '#ffffff'].map(c => (
                          <button
                            key={c}
                            onClick={() => updateStyle(selectedElement.id, { backgroundColor: c })}
                            className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center ${selectedElement.style.backgroundColor === c ? 'ring-2 ring-brand-primary ring-offset-2 border-brand-primary' : 'border-gray-200 hover:border-gray-300'}`}
                            style={{ 
                              backgroundColor: c === 'transparent' ? 'transparent' : c,
                              backgroundImage: c === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)' : 'none',
                              backgroundSize: c === 'transparent' ? '8px 8px' : 'auto'
                            }}
                            title={c === 'transparent' ? 'Transparent' : c}
                          >
                            {c === 'transparent' && <X size={12} className="text-gray-400" />}
                          </button>
                        ))}
                        <input 
                          type="color"
                          value={selectedElement.style.backgroundColor && selectedElement.style.backgroundColor !== 'transparent' ? selectedElement.style.backgroundColor : '#ffffff'}
                          onChange={(e) => updateStyle(selectedElement.id, { backgroundColor: e.target.value })}
                          className="w-8 h-8 bg-white border border-gray-200 rounded-lg cursor-pointer p-0.5"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-gray-100" />

                {/* Interactions Section */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Interactions</label>
                    <button className="text-[10px] font-bold text-brand-primary hover:underline">+ New Block</button>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedElement.interactions.length === 0 ? (
                      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                        <p className="text-[10px] text-gray-400 font-bold leading-tight">
                          Select an element on canvas to add triggers, animations, or level transitions.
                        </p>
                      </div>
                    ) : (
                      selectedElement.interactions.map((int, idx) => (
                        <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-brand-primary uppercase flex items-center gap-1">
                              <Zap size={10} /> On {int.type}
                            </span>
                            <button className="text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">Action:</span>
                            <span className="text-[10px] font-bold text-gray-800 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{int.action}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <div className="h-px bg-gray-100" />

                {/* Pro Tips / Help */}
                <section className="bg-brand-primary/5 rounded-2xl p-4 border border-brand-primary/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary">
                      <HelpCircle size={18} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-brand-primary uppercase mb-1">Pro Tip</h4>
                      <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                        Interactions are event-driven. You can link multiple events to a single component for complex gameplay.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </aside>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
  </div>
  );
}
