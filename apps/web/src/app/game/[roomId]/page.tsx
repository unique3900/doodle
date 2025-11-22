'use client'

import { Canvas } from '@/app/components/canvas'
import { GameHeader } from '@/app/components/game-header';
import { getWebSocketClient } from '@monorepo/utils/websocket-client';
import { Zap } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'


interface Player {
    id: string;
    username: string;
    score: number;
    guessedCorrect: boolean;
    isDrawing: boolean;
}

interface Message {
    username: string;
    message: string;
    playerId: string;
    timestamp: number;
    isCorrect?: boolean;
    isSystem?: boolean;
}


const page = () => {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const ws = getWebSocketClient();


    const roomId = params.roomId as string;
    const roomCode = searchParams.get('code') || '';
    const playerId = searchParams.get('playerId') || '';
    const username = searchParams.get('username') || '';


    const [players, setPlayers] = useState<Player[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [currentDrawer, setCurrentDrawer] = useState('');
    const [currentDrawerId, setCurrentDrawerId] = useState('');
    const [currentWord, setCurrentWord] = useState('');
    const [wordHint, setWordHint] = useState('');
    const [roundNumber, setRoundNumber] = useState(0);
    const [maxRounds, setMaxRounds] = useState(3);
    const [canDraw, setCanDraw] = useState(false);
    const [wordChoices, setWordChoices] = useState<string[]>([]);
    const [showWordSelection, setShowWordSelection] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [gameEnded, setGameEnded] = useState(false);
    const [winners, setWinners] = useState<any[]>([]);
    const [creatorName, setCreatorName] = useState('');
    const [autoStartCountdown, setAutoStartCountdown] = useState(0);


    const canvasRef = useRef<any>(null);

    useEffect(() => {
        if (!roomCode || !playerId || !username) {
            router.push('/');
            return;
        }

        // Sync state when the component mounts
        ws.connect().then(() => {
            ws.send('SYNC_STATE', { roomId, playerId });
        }).catch((err) => {
            console.error('Failed to connect:', err);
        });

        const handleMessage = (type: string, payload: any) => {
            console.log("Received message:", type, payload);

            switch (type) {
                case 'STATE_SYNCED':
                case "ROOM_JOINED":
                    setPlayers(payload.players);
                    setCreatorName(payload.creatorName || '');
                    if (payload.gameStarted) {
                        setGameStarted(true);
                        setCurrentDrawer(payload.currentDrawer);
                        setCurrentDrawerId(payload.currentDrawerId);
                        setRoundNumber(payload.roundNumber);
                        setMaxRounds(payload.maxRounds);
                        setWordHint(payload.wordHint);
                        setCurrentWord(payload.currentWord);
                        setCanDraw(payload.currentDrawerId === playerId);
                    }
                    break;

                case "PLAYERS_UPDATED":
                    setPlayers(payload.players);
                    break;

                case "PPLAYER_JOINED":
                    setMessages(prev => [...prev, {
                        username: payload.username,
                        message: payload.username + " joined the game",
                        playerId: 'system',
                        timestamp: Date.now(),
                        isSystem: true,
                    }])
                    break;

                case "PLAYER_LEFT":
                    setMessages(prev => [...prev, {
                        username: payload.username,
                        message: payload.username + " left the game",
                        playerId: 'system',
                        timestamp: Date.now(),
                        isSystem: true,
                    }])
                    break;

                case "GAME_STARTED":
                    setGameStarted(true);
                    setGameEnded(false);
                    setCurrentDrawer(payload.drawer);
                    setCurrentDrawerId(payload.drawerId);
                    setRoundNumber(payload.roundNumber);
                    setMaxRounds(payload.maxRounds);
                    setPlayers(payload.players);
                    setCanDraw(payload.drawerId === playerId);
                    setMessages([]);
                    setWordHint('');
                    setCurrentWord('');
                    break;

                case "CHOOSE_WORD":
                    setWordChoices(payload.wordChoices);
                    setShowWordSelection(true);
                    setTimeLeft(15)
                    break;

                case 'WORD_SELECTED':
                    setShowWordSelection(false);
                    setWordChoices([]);
                    if (payload.word) {
                        setCurrentWord(payload.word);
                    }
                    if (payload.wordHint) {
                        setWordHint(payload.wordHint);
                    }
                    setTimeLeft(30);
                    break;

                case "NEW_TURN":
                    setCurrentDrawer(payload.drawer);
                    setCurrentDrawerId(payload.drawerId);
                    setCurrentWord('');
                    setWordHint('');
                    setRoundNumber(payload.roundNumber);
                    setMaxRounds(payload.maxRounds);
                    setPlayers(payload.players);
                    setCanDraw(payload.drawerId === playerId);
                    if (canvasRef.current) {
                        canvasRef.current.clear();
                    }
                    setMessages(prev => [...prev, {
                        username: '',
                        message: `${payload.drawer}'s turn to draw!`,
                        playerId: 'system',
                        timestamp: Date.now(),
                        isSystem: true
                    }]);
                    break;

                case "DRAW":
                    if (canvasRef.current && payload.drawerId !== playerId) {
                        canvasRef.current.drawLine(payload)
                    }
                    break;

                case "CLEAR_CANVAS":
                    if (canvasRef.current) {
                        canvasRef.current.clear();
                    }
                    break;

                case "MESSAGE":
                    setMessages(prev => [...prev, payload]);
                    break;

                case "CORRECT_GUESS":
                    setMessages(prev => [...prev, {
                        username: '',
                        message: `${payload.username} guessed correctly!`,
                        playerId: payload.playerId,
                        timestamp: Date.now(),
                        isCorrect: true,
                    }]);
                    break;

                case "ROUND_ENDED":
                    setMessages(prev => [...prev, {
                        username: '',
                        message: `Time is up! The word was ${payload.word}`,
                        playerId: 'system',
                        timestamp: Date.now(),
                        isSystem: true,
                    }]);
                    break;

                case "GAME_ENDED":
                    setGameEnded(true);
                    setWinners(payload.winners);
                    setPlayers(payload.players);
                    setTimeLeft(0);
                    break;

                case "AUTO_START_COUNTDOWN":
                    setAutoStartCountdown(payload.countdown);
                    break;

                case "'AUTO_START_CANCELLED":
                    setAutoStartCountdown(0);
                    break;

                case 'ERROR':
                    console.error('[Game] Error:', payload.message);
                    break;
            }
        };

        ws.on('message', handleMessage);
        return () => {
            ws.off('message', handleMessage);
        }
    }, [roomCode, playerId, username, router, ws]);

    // Timer effect
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft]);


    const handleStartGame = () => {
        ws.send('START_GAME', { roomId });
    };

    const handleNextTurn = () => {
        ws.send('NEXT_TURN', { roomId });
    };

    const handleSelectWord = (word: string) => {
        ws.send('SELECT_WORD', { word });
        setShowWordSelection(false);
    };

    const handleSendMessage = (message: string) => {
        ws.send('SEND_MESSAGE', { roomId, message });
    };

    const handleDraw = (drawData: any) => {
        ws.send('DRAW', { roomId, ...drawData, drawerId: playerId });
    };

    const handleClearCanvas = () => {
        ws.send('CLEAR_CANVAS', { roomId });
        if (canvasRef.current) {
            canvasRef.current.clear();
        }
    };

    if (!roomCode || !playerId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <Zap className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Game Link</h1>
                    <p className="text-gray-600">Please join from the home page.</p>
                </div>
            </div>
        );
    }

    // Game ended modal
    if (gameEnded) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4">
                    <div className="text-center space-y-6">
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Game Over!
                        </h1>

                        {winners.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-3xl font-bold text-gray-800">
                                    {winners.length === 1 ? '🏆 Winner 🏆' : '🏆 Winners 🏆'}
                                </h2>
                                {winners.map((winner, idx) => (
                                    <div key={idx} className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-xl p-4">
                                        <p className="text-2xl font-bold text-gray-800">{winner.username}</p>
                                        <p className="text-xl text-gray-600">{winner.score} points</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-gray-700">Final Scores</h3>
                            <div className="space-y-2">
                                {players
                                    .sort((a, b) => b.score - a.score)
                                    .map((player, idx) => (
                                        <div key={player.id} className="flex justify-between items-center bg-gray-100 rounded-lg px-4 py-2">
                                            <span className="font-medium text-gray-800">
                                                {idx + 1}. {player.username}
                                            </span>
                                            <span className="font-bold text-indigo-600">{player.score} pts</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <button
                            onClick={() => router.push('/')}
                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Word Selection Modal */}
            {showWordSelection && wordChoices.length > 0 && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                        <div className="text-center space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose a Word</h2>
                                <p className="text-gray-600">You have {timeLeft} seconds</p>
                            </div>

                            <div className="space-y-3">
                                {wordChoices.map((word, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectWord(word)}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
                                    >
                                        {word}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <GameHeader
                roomCode={roomCode}
                roundNumber={roundNumber}
                currentDrawer={currentDrawer}
                gameStarted={gameStarted}
                wordHint={wordHint}
                currentWord={currentWord}
                isDrawing={canDraw}
                maxRounds={maxRounds}
                timeLeft={timeLeft}
                creatorName={creatorName}
            />

            <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                {/* Left - Players List */}

                {/* Center - Canvas */}
                <div className="flex-1 flex flex-col gap-3">
                    <Canvas
                        ref={canvasRef}
                        canDraw={canDraw}
                        onDraw={handleDraw}
                        onClear={handleClearCanvas}
                        currentDrawer={currentDrawer}
                    />

                    {/* Game Controls */}
                    {!gameStarted && (
                        <div className="space-y-2">
                            {autoStartCountdown > 0 && (
                                <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 text-center">
                                    <p className="text-green-700 font-semibold text-lg">
                                        Game starting in {autoStartCountdown}...
                                    </p>
                                </div>
                            )}
                            <button
                                onClick={handleStartGame}
                                disabled={players.length < 2}
                                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                            >
                                {autoStartCountdown > 0 ? 'Start Now' : `Start Game (${players.length}/8)`}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right - Chat */}
            </div>
        </div>
    );
};

export default page;