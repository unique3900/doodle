"use client";

import React, { useEffect, useState } from 'react'
import { useWebSocket } from './provider'
import { useRouter } from 'next/navigation';
import { getWebSocketClient } from '@monorepo/utils/websocket-client';
import { Hash, Play, Plus, Zap } from 'lucide-react';

const page = () => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'join' | 'joinCode' | 'create' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const router = useRouter();

  const ws = getWebSocketClient();

  useEffect(() => {
    // Connect to WebSocket
    ws.connect()
      .then(() => setConnected(true))
      .catch((err) => {
        console.error('Failed to connect:', err);
        setError('Failed to connect to server');
      });

    // Message handler
    const handleMessage = (type: string, payload: any) => {
      if (type === 'ROOM_JOINED') {
        const { roomId, roomCode, playerId } = payload;
        // Store in sessionStorage to handle refresh
        sessionStorage.setItem(`room_${roomCode}`, JSON.stringify({ playerId, username, roomId }));
        router.push(`/game/${roomId}?code=${roomCode}&playerId=${playerId}&username=${encodeURIComponent(username)}`);
      } else if (type === 'ERROR') {
        setError(payload.message);
        setLoading(false);
      }
    };

    ws.on('message', handleMessage);

    return () => {
      ws.off('message', handleMessage);
    };
  }, [username, router, ws]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();

    if(!username.trim()){
      setError('Username is required');
      return;
    }

    if(!roomCode.trim()){
      setError('Room code is required');
      return;
    }

    if(!connected){
      setError('Failed to connect to server');
      return;
    }


    setLoading(true);
    setError('');

    ws.send('JOIN_BY_CODE', { username: username.trim(), code: roomCode.trim() });
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if(!username.trim()){
      setError('Username is required');
      return;
    }

    if(!connected){
      setError('Failed to connect to server');
      return;
    }

    setLoading(true);
    setError('');

    ws.send('JOIN_ROOM', { username: username.trim() });
  }

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if(!username.trim()){
      setError('Username is required');
      return;
    }

    if(!connected){
      setError('Failed to connect to server');
      return;
    }

    setLoading(true);
    setError('');

    ws.send('CREATE_ROOM', { username: username.trim() });
  }


  if (mode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                  <Zap className="w-12 h-12 text-white transform -rotate-3" />
                </div>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Dudle
              </h1>
              <p className="text-gray-600 text-lg">Dudes play dudle</p>

              {!connected && (
                <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                  Connecting to server...
                </div>
              )}
            </div>

            {/* Mode Selection */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setMode('join');
                  setError('');
                  setUsername('');
                }}
                disabled={!connected}
                className="w-full py-5 px-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Play className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">Quick Play</div>
                    <div className="text-sm opacity-90">Join random room</div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-2xl">→</div>
              </button>

              <button
                onClick={() => {
                  setMode('joinCode');
                  setError('');
                  setUsername('');
                  setRoomCode('');
                }}
                disabled={!connected}
                className="w-full py-5 px-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">Join with Code</div>
                    <div className="text-sm opacity-90">Enter room code</div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-2xl">→</div>
              </button>

              <button
                onClick={() => {
                  setMode('create');
                  setError('');
                  setUsername('');
                }}
                disabled={!connected}
                className="w-full py-5 px-6 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">Create Room</div>
                    <div className="text-sm opacity-90">Start private game</div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-2xl">→</div>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                <span className="font-semibold">How to play:</span> One player draws while others guess. Earn points for correct guesses!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Forms
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-9 h-9 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Skribble
            </h1>
            <p className="text-gray-600">
              {mode === 'join' && 'Join a random room'}
              {mode === 'joinCode' && 'Enter room code'}
              {mode === 'create' && 'Create your room'}
            </p>
          </div>

          {/* Quick Play Form */}
          {mode === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your name"
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!username.trim() || loading || !connected}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          )}

          {/* Join by Code Form */}
          {mode === 'joinCode' && (
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your name"
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-center text-lg tracking-widest"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!username.trim() || !roomCode.trim() || loading || !connected}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          )}

          {/* Create Room Form */}
          {mode === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your name"
                  maxLength={20}
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!username.trim() || loading || !connected}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>

              <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                <p className="text-xs text-center text-pink-700">
                  You'll get a room code to share with friends!
                </p>
              </div>
            </form>
          )}

          {/* Back Button */}
          <button
            onClick={() => {
              setMode(null);
              setError('');
              setUsername('');
              setRoomCode('');
            }}
            className="w-full py-2 text-gray-600 hover:text-gray-900 transition-all text-sm font-medium"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default page