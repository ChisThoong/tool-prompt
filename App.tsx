import React, { useState, useCallback } from 'react';
import { generateOutline, generateStoryAndPrompts, analyzeCharacterImage } from './services/geminiService';
import { Spinner } from './components/Spinner';
import { DownloadIcon, SparklesIcon, CopyIcon, CheckIcon, UploadIcon, TrashIcon, PlusIcon } from './components/Icons';

interface Character {
  id: number;
  description: string;
  image: string | null;
  imageName: string;
  isAnalyzing?: boolean;
}

type ActiveTab = 'story' | 'prompts';

// Define props interfaces for sub-components
interface ControlPanelProps {
    theme: string;
    setTheme: (value: string) => void;
    detailedDescription: string;
    setDetailedDescription: (value: string) => void;
    characters: Character[];
    addCharacter: () => void;
    removeCharacter: (id: number) => void;
    handleCharacterDescriptionChange: (id: number, value: string) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, id: number) => void;
    removeImage: (id: number) => void;
    numPrompts: string;
    setNumPrompts: (value: string) => void;
    videoStyle: string;
    setVideoStyle: (value: string) => void;
    handleGenerateAll: () => void;
    isLoading: boolean;
}

interface ResultsPanelProps {
    isLoading: boolean;
    prompts: string[];
    story: string;
    setStory: (value: string) => void;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    downloadPrompts: () => void;
    handlePromptChange: (index: number, newText: string) => void;
    handleCopyPrompt: (text: string, index: number) => void;
    copiedIndices: number[];
}

// Moved ControlPanel outside of App component to prevent re-creation on re-renders
const ControlPanel: React.FC<ControlPanelProps> = ({
    theme,
    setTheme,
    detailedDescription,
    setDetailedDescription,
    characters,
    addCharacter,
    removeCharacter,
    handleCharacterDescriptionChange,
    handleImageUpload,
    removeImage,
    numPrompts,
    setNumPrompts,
    videoStyle,
    setVideoStyle,
    handleGenerateAll,
    isLoading
}) => {
    const promptCount = parseInt(numPrompts, 10);
    const totalSeconds = !isNaN(promptCount) && promptCount > 0 ? promptCount * 8 : 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return (
    <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-6">
       <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-3 text-yellow-400">1. Ý tưởng</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-300 mb-1">Chủ đề</label>
                    <input id="theme" type="text" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="VD: Một chú mèo học lập trình" className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-200" disabled={isLoading} />
                </div>
                <div>
                    <label htmlFor="detailed-description" className="block text-sm font-medium text-gray-300 mb-1">Mô tả chi tiết (Tùy chọn)</label>
                    <textarea id="detailed-description" value={detailedDescription} onChange={(e) => setDetailedDescription(e.target.value)} placeholder="VD: Bối cảnh, phong cách nghệ thuật..." rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-200" disabled={isLoading} />
                </div>
            </div>
        </section>

        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-3 text-yellow-400">2. Nhân vật (Tùy chọn)</h2>
            <div className="space-y-4">
                {characters.map((character, index) => (
                    <div key={character.id} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-md font-medium text-gray-200">Nhân vật {index + 1}</h3>
                            {characters.length > 1 && (
                                <button onClick={() => removeCharacter(character.id)} className="text-gray-400 hover:text-white transition" disabled={isLoading} aria-label="Xóa nhân vật">
                                    <TrashIcon />
                                </button>
                            )}
                        </div>
                        <div className="space-y-4">
                             <div className="relative">
                                <textarea
                                    id={`character-description-${character.id}`}
                                    value={character.description} 
                                    onChange={(e) => handleCharacterDescriptionChange(character.id, e.target.value)}
                                    placeholder={character.isAnalyzing ? "Đang phân tích hình ảnh..." : "Mô tả hoặc tải ảnh để AI tự mô tả..."}
                                    rows={3}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-yellow-500 transition"
                                    disabled={isLoading || character.isAnalyzing}
                                />
                                {character.isAnalyzing && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-700/70 rounded-md">
                                        <Spinner />
                                    </div>
                                )}
                            </div>
                            <div>
                                {character.image ? (
                                    <div className="relative group">
                                        <img src={character.image} alt={`Character ${index + 1}`} className="w-full h-auto max-h-32 object-contain rounded-md border border-gray-600"/>
                                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                            <p className="text-white text-xs break-all px-2 text-center">{character.imageName}</p>
                                            <button onClick={() => removeImage(character.id)} disabled={isLoading} className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md flex items-center gap-1 text-xs">
                                                <TrashIcon /> Xóa
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label htmlFor={`character-image-upload-${character.id}`} className="flex flex-col justify-center items-center w-full h-32 bg-gray-700 rounded-lg border-2 border-gray-600 border-dashed cursor-pointer hover:bg-gray-800 transition">
                                        <div className="flex flex-col justify-center items-center text-center">
                                            <UploadIcon />
                                            <p className="text-xs text-gray-400"><span className="font-semibold">Tải ảnh lên</span></p>
                                        </div>
                                        <input id={`character-image-upload-${character.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, character.id)} disabled={isLoading} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <button onClick={addCharacter} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center gap-2">
                    <PlusIcon /> Thêm nhân vật
                </button>
            </div>
        </section>

        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 mt-auto">
            <h2 className="text-xl font-semibold mb-3 text-yellow-400">3. Thiết lập</h2>
             <div className="space-y-4">
                <div>
                    <label htmlFor="video-style" className="block text-sm font-medium text-gray-300 mb-1">Phong cách Video</label>
                    <select
                        id="video-style"
                        value={videoStyle}
                        onChange={(e) => setVideoStyle(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-200"
                        disabled={isLoading}
                    >
                        <option value="basic">Cơ bản (Cinematic)</option>
                        <option value="ai-storytelling">Kể chuyện bằng AI (Storybook)</option>
                        <option value="ai-lip-sync">AI Lip-sync / Talking Head</option>
                        <option value="animation">Hoạt hình & Nghệ thuật</option>
                        <option value="simulation">Mô phỏng & Hiệu ứng</option>
                    </select>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <label htmlFor="num-prompts" className="text-sm font-medium text-gray-300 whitespace-nowrap">Số lượng Prompt:</label>
                    <input id="num-prompts" type="number" value={numPrompts} onChange={(e) => setNumPrompts(e.target.value)} min="1" max="100" className="w-24 bg-gray-700 border border-gray-600 rounded-md p-2 text-center focus:ring-2 focus:ring-yellow-500 transition" disabled={isLoading} />
                </div>
                 {totalSeconds > 0 && (
                     <p className="text-sm text-gray-400 text-right -mt-2">
                        Tổng thời lượng: {minutes > 0 ? `${minutes} phút ` : ''}{seconds > 0 ? `${seconds} giây` : ''}
                    </p>
                )}
                 <button onClick={handleGenerateAll} disabled={isLoading || !theme} className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center gap-2 text-lg mt-2">
                    {isLoading ? <Spinner /> : <SparklesIcon />}
                    <span>Tạo ngay</span>
                </button>
            </div>
        </section>
    </div>
)};

// Moved ResultsPanel outside of App component to prevent re-creation on re-renders
const ResultsPanel: React.FC<ResultsPanelProps> = ({
    isLoading,
    prompts,
    story,
    setStory,
    activeTab,
    setActiveTab,
    downloadPrompts,
    handlePromptChange,
    handleCopyPrompt,
    copiedIndices
}) => (
     <div className="w-full lg:w-2/3 xl:w-3/4">
        {isLoading && prompts.length === 0 ? (
            <div className="flex justify-center items-center h-full bg-gray-800/50 rounded-xl border border-gray-700 min-h-[60vh]">
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-400">Đang tạo, vui lòng chờ...</p>
                </div>
            </div>
        ) : !isLoading && prompts.length === 0 ? (
             <div className="flex justify-center items-center h-full bg-gray-800/50 rounded-xl border border-gray-700 min-h-[60vh]">
                <div className="text-center text-gray-500">
                    <p className="text-xl">Kết quả sẽ xuất hiện ở đây</p>
                    <p>Điền thông tin và nhấn "Tạo ngay" để bắt đầu.</p>
                </div>
            </div>
        ) : (
            <div className="bg-gray-800/50 rounded-xl shadow-2xl border border-gray-700 flex flex-col h-full">
                <div className="flex border-b border-gray-700 p-2">
                     <button onClick={() => setActiveTab('story')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'story' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Kịch bản</button>
                    <button onClick={() => setActiveTab('prompts')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'prompts' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Prompts ({prompts.length})</button>
                    <div className="flex-grow"></div>
                    {activeTab === 'prompts' && (
                         <button onClick={downloadPrompts} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center gap-2 text-sm">
                            <DownloadIcon />
                            <span>Tải file .txt</span>
                        </button>
                    )}
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {activeTab === 'story' ? (
                        <div>
                             <h2 className="text-xl font-semibold mb-3 text-yellow-400">Nội dung kịch bản</h2>
                             <textarea id="story" value={story} onChange={(e) => setStory(e.target.value)} placeholder="Kịch bản..." rows={20} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-yellow-500 transition" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {prompts.map((prompt, index) => {
                                const isCopied = copiedIndices.includes(index);
                                return (
                                <div key={index} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <label htmlFor={`prompt-${index}`} className="text-md font-semibold text-gray-300">
                                            Prompt {index + 1}
                                        </label>
                                        <button onClick={() => handleCopyPrompt(prompt, index)} className={`font-bold p-2 rounded-md transition-all duration-200 ${ isCopied ? 'bg-green-700' : 'bg-gray-600 hover:bg-gray-500'}`} aria-label={isCopied ? `Đã sao chép` : `Sao chép`}>
                                            {isCopied ? <CheckIcon /> : <CopyIcon />}
                                        </button>
                                    </div>
                                    <textarea
                                        id={`prompt-${index}`} value={prompt} onChange={(e) => handlePromptChange(index, e.target.value)}
                                        rows={8}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition flex-grow"
                                    />
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            </div>
        )}
     </div>
);


const App: React.FC = () => {
  const [theme, setTheme] = useState<string>('');
  const [detailedDescription, setDetailedDescription] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([
    { id: Date.now(), description: '', image: null, imageName: '' }
  ]);
  const [outline, setOutline] = useState<string>('');
  const [story, setStory] = useState<string>('');
  const [numPrompts, setNumPrompts] = useState<string>('16');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndices, setCopiedIndices] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('story');
  const [videoStyle, setVideoStyle] = useState<string>('basic');

  const handleGenerateAll = useCallback(async () => {
    const promptCount = parseInt(numPrompts, 10);
    if (!theme || isNaN(promptCount) || promptCount <= 0) {
      setError('Vui lòng nhập chủ đề và số lượng prompt hợp lệ.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setOutline('');
    setStory('');
    setPrompts([]);
    setCopiedIndices([]);

    try {
      const generatedOutline = await generateOutline(theme, detailedDescription, characters);
      setOutline(generatedOutline);

      const { story: newStory, prompts: newPrompts } = await generateStoryAndPrompts(theme, detailedDescription, generatedOutline, promptCount, characters, videoStyle);
      setStory(newStory);
      setPrompts(newPrompts);
      setActiveTab('prompts'); // Automatically switch to prompts tab on success

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không xác định trong quá trình tạo.');
      setActiveTab('story'); // Revert to story tab on failure
    } finally {
      setIsLoading(false);
    }
  }, [theme, detailedDescription, numPrompts, characters, videoStyle]);


  const handlePromptChange = (index: number, newText: string) => {
    setPrompts(prevPrompts => {
      const updatedPrompts = [...prevPrompts];
      updatedPrompts[index] = newText;
      return updatedPrompts;
    });
  };
  
  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedIndices(prevIndices => [...new Set([...prevIndices, index])]);
        setTimeout(() => {
            setCopiedIndices(prev => prev.filter(i => i !== index));
        }, 2000);
    });
  };

  const downloadPrompts = () => {
    const fileContent = prompts.map((prompt, index) => `Prompt ${index + 1}: ${prompt}`).join('\n\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedTheme = theme.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${sanitizedTheme}_video_prompts.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const addCharacter = () => {
    setCharacters(prev => [...prev, { id: Date.now(), description: '', image: null, imageName: '' }]);
  };

  const removeCharacter = (id: number) => {
    setCharacters(prev => prev.filter(char => char.id !== id));
  };
  
  const handleCharacterDescriptionChange = (id: number, value: string) => {
    setCharacters(prev => prev.map(char => 
        char.id === id ? { ...char, description: value } : char
    ));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const imageDataUrl = reader.result as string;
            
            // Set image and loading state immediately
            setCharacters(prev => prev.map(char => 
                char.id === id ? { ...char, image: imageDataUrl, imageName: file.name, isAnalyzing: true, description: '' } : char
            ));
            
            try {
                // Call AI for analysis
                const description = await analyzeCharacterImage(imageDataUrl);
                setCharacters(prev => prev.map(char => 
                    char.id === id ? { ...char, description: description, isAnalyzing: false } : char
                ));
            } catch (err) {
                setError(err instanceof Error ? `Lỗi phân tích ảnh: ${err.message}` : 'Lỗi phân tích ảnh không xác định.');
                // Turn off loading state on error
                setCharacters(prev => prev.map(char => 
                    char.id === id ? { ...char, isAnalyzing: false } : char
                ));
            }
        };
        reader.readAsDataURL(file);
    } else {
        setError("Vui lòng chọn một tệp hình ảnh hợp lệ.");
    }
  };

  const removeImage = (id: number) => {
      setCharacters(prev => prev.map(char => 
          char.id === id ? { ...char, image: null, imageName: '', description: '' } : char
      ));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
      <div className="max-w-screen-2xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-orange-600 pb-2">
            TOOL TẠO PROMPT - CHISTHONGG
          </h1>
          <p className="text-gray-400 mt-2 text-lg">
            Tạo kịch bản video hoàn hảo từ một ý tưởng duy nhất.
          </p>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg animate-fade-in" role="alert">
            <strong className="font-bold">Lỗi: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <main className="flex flex-col lg:flex-row gap-8">
           <ControlPanel 
                theme={theme}
                setTheme={setTheme}
                detailedDescription={detailedDescription}
                setDetailedDescription={setDetailedDescription}
                characters={characters}
                addCharacter={addCharacter}
                removeCharacter={removeCharacter}
                handleCharacterDescriptionChange={handleCharacterDescriptionChange}
                handleImageUpload={handleImageUpload}
                removeImage={removeImage}
                numPrompts={numPrompts}
                setNumPrompts={setNumPrompts}
                videoStyle={videoStyle}
                setVideoStyle={setVideoStyle}
                handleGenerateAll={handleGenerateAll}
                isLoading={isLoading}
           />
           <ResultsPanel 
                isLoading={isLoading}
                prompts={prompts}
                story={story}
                setStory={setStory}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                downloadPrompts={downloadPrompts}
                handlePromptChange={handlePromptChange}
                handleCopyPrompt={handleCopyPrompt}
                copiedIndices={copiedIndices}
           />
        </main>
      </div>
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Custom scrollbar for better aesthetics */
        .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
            background: #2d3748; /* gray-800 */
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
            background: #4a5568; /* gray-600 */
            border-radius: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: #718096; /* gray-500 */
        }
      `}</style>
    </div>
  );
};

export default App;