'use client';

import { useState } from 'react';
import { Users, Zap, Share2, Check, Copy } from 'lucide-react';

interface GameHeaderProps {
  roomCode: string;
  roundNumber: number;
  currentDrawer: string;
  gameStarted: boolean;
  wordHint: string;
  currentWord: string;
  isDrawing: boolean;
  maxRounds: number;
  timeLeft: number;
  creatorName: string;
}

export function GameHeader({
  roomCode,
  roundNumber,
  currentDrawer,
  gameStarted,
  wordHint,
  currentWord,
  isDrawing,
  maxRounds,
  timeLeft,
  creatorName,
}: GameHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleShareRoom = async () => {
    const shareUrl = `${window.location.origin}?code=${roomCode}`;
    const shareText = `Dudes join my dudle game! Room code: ${roomCode}\n${shareUrl}`;

    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dude join my dudle game!',
          text: shareText,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dudke</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              Room: <code className="bg-muted px-2 py-1 rounded font-mono">{roomCode}</code>
              <button
                onClick={handleShareRoom}
                className="ml-2 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded flex items-center gap-1 transition-colors"
                title="Share room code"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span className="text-xs font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3 h-3" />
                    <span className="text-xs font-medium">Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {gameStarted && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Round {roundNumber}</p>
            <p className="text-lg font-bold text-primary">
              {currentDrawer} is drawing...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}