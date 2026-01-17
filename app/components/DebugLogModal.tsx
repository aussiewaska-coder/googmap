'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface LogEntry {
    timestamp: number;
    type: 'log' | 'error' | 'warn';
    emoji: string;
    messages: any[];
}

export default function DebugLogModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        // Intercept console methods
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args: any[]) => {
            originalLog(...args);

            // Check if first arg is a string with emoji
            const firstArg = args[0];
            let emoji = '📝';
            if (typeof firstArg === 'string') {
                if (firstArg.includes('🔵')) emoji = '🔵';
                else if (firstArg.includes('🟢')) emoji = '🟢';
                else if (firstArg.includes('🟡')) emoji = '🟡';
                else if (firstArg.includes('🟣')) emoji = '🟣';
                else if (firstArg.includes('🌍')) emoji = '🌍';
                else if (firstArg.includes('🔧')) emoji = '🔧';
                else if (firstArg.includes('🎮')) emoji = '🎮';
                else if (firstArg.includes('✅')) emoji = '✅';
                else if (firstArg.includes('❌')) emoji = '❌';
            }

            setLogs(prev => [...prev, {
                timestamp: Date.now(),
                type: 'log',
                emoji,
                messages: args
            }]);
        };

        console.error = (...args: any[]) => {
            originalError(...args);
            setLogs(prev => [...prev, {
                timestamp: Date.now(),
                type: 'error',
                emoji: '❌',
                messages: args
            }]);
        };

        console.warn = (...args: any[]) => {
            originalWarn(...args);
            setLogs(prev => [...prev, {
                timestamp: Date.now(),
                type: 'warn',
                emoji: '⚠️',
                messages: args
            }]);
        };

        // Listen for keyboard shortcut (Ctrl+Shift+L or Cmd+Shift+L)
        const handleKeyPress = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    const clearLogs = () => {
        setLogs([]);
    };

    const formatMessage = (msg: any): string => {
        if (typeof msg === 'string') return msg;
        if (typeof msg === 'number' || typeof msg === 'boolean') return String(msg);
        try {
            return JSON.stringify(msg, null, 2);
        } catch {
            return String(msg);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[9999] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg transition-all"
                title="Open Debug Logs (Ctrl+Shift+L)"
            >
                📋 Debug Logs
            </button>
        );
    }

    return (
        <div
            className={`fixed right-4 z-[9999] bg-black/95 border-2 border-blue-500 rounded-lg shadow-2xl transition-all ${
                isMinimized ? 'bottom-4 w-80' : 'top-4 bottom-4 w-[600px]'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold">📋 Debug Logs</span>
                    <span className="text-xs text-white/60">({logs.length} entries)</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoScroll(prev => !prev)}
                        className={`p-1.5 rounded transition-colors ${
                            autoScroll
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-white/5 text-white/60'
                        }`}
                        title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                    >
                        <ChevronDown size={16} />
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={() => setIsMinimized(prev => !prev)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors"
                        title={isMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors"
                        title="Close (Ctrl+Shift+L)"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Logs */}
            {!isMinimized && (
                <div className="overflow-y-auto h-full p-3 space-y-1 font-mono text-xs custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="text-white/40 text-center py-8">
                            No logs yet. Interact with the controller to see debug output.
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div
                                key={i}
                                className={`p-2 rounded ${
                                    log.type === 'error'
                                        ? 'bg-red-900/20 border border-red-500/30'
                                        : log.type === 'warn'
                                        ? 'bg-yellow-900/20 border border-yellow-500/30'
                                        : 'bg-white/5'
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-lg flex-shrink-0">{log.emoji}</span>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        {log.messages.map((msg, j) => (
                                            <div
                                                key={j}
                                                className={`${
                                                    log.type === 'error'
                                                        ? 'text-red-300'
                                                        : log.type === 'warn'
                                                        ? 'text-yellow-300'
                                                        : 'text-white/90'
                                                } break-words whitespace-pre-wrap`}
                                            >
                                                {formatMessage(msg)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            )}

            {/* Minimized hint */}
            {isMinimized && (
                <div className="p-3 text-center text-white/60 text-sm">
                    Click to expand logs
                </div>
            )}
        </div>
    );
}
