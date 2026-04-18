import React, { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TypingMessage = ({ text, onComplete }) => {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
        let i = 0;
        const interval = 5; 
        const timer = setInterval(() => {
            setDisplayedText(text.substring(0, i + 1));
            i++;
            if (i >= text.length) {
                clearInterval(timer);
                if (onComplete) onComplete();
            }
        }, interval);
        return () => clearInterval(timer);
    }, [text, onComplete]);

    return (
        <div className="markdown-content prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-blue-700 prose-p:mb-2 prose-ul:list-disc">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
        </div>
    );
};

const AiTutor = ({ courseId, isQuizActive }) => {
    const [input, setInput] = useState("");
    const [chat, setChat] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); 
    const chatEndRef = useRef(null);
    const abortControllerRef = useRef(null); 

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat, isProcessing]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setChat(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput("");
        setIsProcessing(true);

        abortControllerRef.current = new AbortController();

try {
            // No need to manually grab token or write the full URL
            const { data } = await API.post('/api/ai/ask', 
                { 
                    question: currentInput, 
                    courseId, 
                    isQuizActive 
                },
                { 
                    signal: abortControllerRef.current.signal 
                } 
            );
            
            setChat(prev => [...prev, { role: 'tutor', text: data.answer, isNew: true }]);
        } catch (err) {
            // Change axios.isCancel to API.isCancel if needed, 
            // but standard axios.isCancel still works if you import it separately.
            // Best practice: use the instance to check
            if (API.isCancel && API.isCancel(err)) {
                setChat(prev => [...prev, { role: 'tutor', text: "_Response cancelled by user._" }]);
            } else if (err.response?.status === 401) {
                setChat(prev => [...prev, { role: 'tutor', text: "⚠️ Please log in to use the AI Tutor." }]);
            } else {
                setChat(prev => [...prev, { role: 'tutor', text: "⚠️ Connection lost or server error." }]);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); 
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9999] font-['Plus_Jakarta_Sans']">
            
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)} 
                    className="bg-blue-600 text-white w-12 h-12 md:w-14 md:h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 cursor-pointer"
                >
                   <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                   </svg>
                </button>
            )}

            {isOpen && (
                <div className="w-[calc(100vw-32px)] md:w-[420px] h-[500px] md:h-[580px] bg-white shadow-2xl rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                    
                    {/* Header */}
                    <div className="bg-blue-600 p-4 md:p-5 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="font-bold text-xs md:text-sm tracking-widest uppercase">NextGen AI Tutor</span>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="hover:bg-white/20 rounded-lg p-1.5 transition-colors cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/50">
                        {chat.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] md:max-w-[85%] p-3 md:p-4 rounded-2xl md:rounded-3xl text-[12px] md:text-[13px] shadow-sm ${
                                    m.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    {m.role === 'tutor' && m.isNew ? (
                                        <TypingMessage text={m.text} onComplete={() => m.isNew = false} />
                                    ) : (
                                        <div className="markdown-content prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-blue-700">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-5 bg-white border-t border-slate-100">
                        <div className="flex gap-2">
                            <input 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                className="flex-1 bg-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                placeholder="Ask a question..."
                            />
                            
                            {isProcessing ? (
                                <button 
                                    onClick={handleStop} 
                                    className="bg-red-500 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl hover:bg-red-600 shadow-md flex items-center justify-center animate-pulse cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <rect width="12" height="12" x="6" y="6" rx="2" />
                                    </svg>
                                </button>
                            ) : (
                                <button 
                                    onClick={handleSend} 
                                    className="bg-blue-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl hover:bg-blue-700 shadow-md transition-all active:scale-90 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiTutor;