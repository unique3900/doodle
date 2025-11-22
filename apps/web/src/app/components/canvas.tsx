"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Trash2, Paintbrush, Droplet, Square, Circle, Triangle, Minus } from 'lucide-react';
import { hexToRgb } from '@/lib/hexToRgb';

interface CanvasProps {
    canDraw: boolean;
    onDraw: (data: any) => void;
    onClear: () => void;
    currentDrawer?: string;
}

type Tool = 'brush' | 'fill' | 'rectangle' | 'circle' | 'triangle' | 'line';


export const Canvas = forwardRef<any, CanvasProps>(({ canDraw, onDraw, onClear, currentDrawer }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
    const [tool, setTool] = useState<Tool>('brush');
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
    const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);

    const colors = [
        '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
        '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
    ];


    useImperativeHandle(ref, () => ({
        clear: () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        },
        drawLine: (data: any) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            if (data.tool === 'fill') {
                floodFill(ctx, data.x, data.y, data.color);
            } else if (data.tool === 'rectangle') {
                drawRectangle(ctx, data.x0, data.y0, data.x1, data.y1, data.colorm, data.size);
            } else if (data.tool === 'circle') {
                drawCircle(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.size);
            } else if (data.tool === 'triangle') {
                drawTriangle(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.size);
            } else if (data.tool === 'line') {
                drawStraightLine(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.size);
            } else {
                ctx.strokeStyle = data.color;
                ctx.lineWidth = data.size;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                ctx.moveTo(data.x0, data.y0);
                ctx.lineTo(data.x1, data.y1);
                ctx.stroke();
            }
        }
    }), []);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
        }
    }, []);


    // Flood Fill Algorithm
    const floodFill = (ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const targetColor = getPixelColor(imageData, x, y);
        const fillRgb = hexToRgb(fillColor);

        // Dont fill if target color is the same as fill color
        if (colorsMatch(targetColor, fillRgb)) return;

        const pixelsToCheck = [{ x: Math.floor(x), y: Math.floor(y) }];
        const visited = new Set<string>();

        while (pixelsToCheck.length > 0) {
            // Get the last pixel from the array ! Important to pop() ! 
            const { x: px, y: py } = pixelsToCheck.pop()!;
            const key = `${px},${py}`;

            if (visited.has(key)) continue;
            if (px < 0 || px > canvas.width || py < 0 || py > canvas.height) continue;

            const currentColor = getPixelColor(imageData, px, py);
            if (!colorsMatch(currentColor, targetColor)) continue;

            visited.add(key);
            setPixelColor(imageData, px, py, { r: fillRgb.r, g: fillRgb.g, b: fillRgb.b, a: 255 });

            pixelsToCheck.push({ x: px - 1, y: py });
            pixelsToCheck.push({ x: px + 1, y: py });
            pixelsToCheck.push({ x: px, y: py - 1 });
            pixelsToCheck.push({ x: px, y: py + 1 });
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Helper to get the color of a pixel
    // How it works:
    // The image data is an array of 4 bytes per pixel (RGBA)
    // The index is calculated by multiplying the y coordinate by the width of the canvas and adding the x coordinate
    // The index is then multiplied by 4 to get the index of the pixel
    // The index is then used to get the color of the pixel
    // The color is returned as an object with r, g, b, and a properties
    // The a property is the alpha channel and is not used in this implementation
    const getPixelColor = (imageData: ImageData, x: number, y: number) => {
        const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        return {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
        };
    }

    // Helper to set the color of a pixel
    // How it works:
    // The image data is an array of 4 bytes per pixel (RGBA)
    // The index is calculated by multiplying the y coordinate by the width of the canvas and adding the x coordinate
    // The index is then multiplied by 4 to get the index of the pixel
    // The index is then used to set the color of the pixel
    // The color is set as an object with r, g, b, and a properties
    // The a property is the alpha channel and is not used in this implementation
    const setPixelColor = (imageData: ImageData, x: number, y: number, color: { r: number, g: number, b: number, a: number }) => {
        const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = 255;
    }

    const colorsMatch = (color1: any, color2: any, tolerance: number = 10) => {
        return Math.abs(color1.r - color2.r) <= tolerance &&
            Math.abs(color1.g - color2.g) <= tolerance &&
            Math.abs(color1.b - color2.b) <= tolerance;
    }

    // Helper to draw a rectangle
    const drawRectangle = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, strokeColor: string, lineWidth: number) => {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    };

    // Helper to draw a circle
    const drawCircle = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, strokeColor: string, lineWidth: number) => {
        const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
        ctx.stroke();
    };

    // Helper to draw a triangle
    const drawTriangle = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, strokeColor: string, lineWidth: number) => {
        const width = x1 - x0;
        const height = y1 - y0;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x0 + width / 2, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x0, y1);
        ctx.closePath();
        ctx.stroke();
    };

    // Helper to draw a straight line
    const drawStraightLine = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, strokeColor: string, lineWidth: number) => {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    };

    //   Helper to get mouse position
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        if (!touch) return { x: 0, y: 0 };

        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    const drawLine = (x0: number, y0: number, x1: number, y1: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        // Broadcast to other players
        onDraw({ x0, y0, x1, y1, color, size: brushSize });
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canDraw) return;
        const pos = getMousePos(e);

        if (tool === 'fill') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            floodFill(ctx, pos.x, pos.y, color);
            // Broadcast to other players
            onDraw({ x: pos.x, y: pos.y, color, tool: 'fill' });
        } else if (tool === 'brush') {
            setIsDrawing(true);
            setLastPos(pos);
        } else {
            setIsDrawing(true);
            setStartPos(pos);
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canDraw || !isDrawing) return;
        const pos = getMousePos(e);

        if (tool === 'brush' && lastPos) {
            drawLine(lastPos.x, lastPos.y, pos.x, pos.y);
            setLastPos(pos);
        } else if (tool !== 'brush' && tool !== 'fill' && startPos) {
            // Preview shape while drawing
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Save current canvas state
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Draw preview shape
            if (tool === 'rectangle') {
                drawRectangle(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            } else if (tool === 'circle') {
                drawCircle(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            } else if (tool === 'triangle') {
                drawTriangle(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            } else if (tool === 'line') {
                drawStraightLine(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            }

            setTimeout(() => {
                if (isDrawing) {
                    ctx.putImageData(imageData, 0, 0);
                }
            }, 0);
        }
    }


    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canDraw || !isDrawing) return;
        const pos = getMousePos(e);
    
        if (tool !== 'brush' && tool !== 'fill' && startPos) {
          // Finalize shape
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
    
          if (tool === 'rectangle') {
            drawRectangle(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            onDraw({ tool: 'rectangle', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y, color, size: brushSize });
          } else if (tool === 'circle') {
            drawCircle(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            onDraw({ tool: 'circle', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y, color, size: brushSize });
          } else if (tool === 'triangle') {
            drawTriangle(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            onDraw({ tool: 'triangle', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y, color, size: brushSize });
          } else if (tool === 'line') {
            drawStraightLine(ctx, startPos.x, startPos.y, pos.x, pos.y, color, brushSize);
            onDraw({ tool: 'line', x0: startPos.x, y0: startPos.y, x1: pos.x, y1: pos.y, color, size: brushSize });
          }
        }
    
        setIsDrawing(false);
        setLastPos(null);
        setStartPos(null);
      };

      const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!canDraw) return;
        e.preventDefault();
        setIsDrawing(true);
        const pos = getTouchPos(e);
        setLastPos(pos);
      };


      const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!canDraw || !isDrawing || !lastPos) return;
        e.preventDefault();
    
        const pos = getTouchPos(e);
        drawLine(lastPos.x, lastPos.y, pos.x, pos.y);
        setLastPos(pos);
      };


      const handleTouchEnd = () => {
        setIsDrawing(false);
        setLastPos(null);
      };

      return (
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Drawing Tools */}
          {canDraw && (
            <div className="bg-gray-50 border-b border-gray-200 p-3">
              <div className="flex flex-col gap-3">
                {/* Tools Row */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Tools:</span>
                  <button
                    onClick={() => setTool('brush')}
                    className={`p-2 rounded-lg transition-all ${
                      tool === 'brush' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Brush"
                  >
                    <Paintbrush className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('fill')}
                    className={`p-2 rounded-lg transition-all ${
                      tool === 'fill' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Fill"
                  >
                    <Droplet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('line')}
                    className={`p-2 rounded-lg transition-all ${
                      tool === 'line' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Line"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('rectangle')}
                    className={`p-2 rounded-lg transition-all ${
                      tool === 'rectangle' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Rectangle"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('circle')}
                    className={`p-2 rounded-lg transition-all ${
                      tool === 'circle' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Circle"
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTool('triangle')}
                    className={`p-2 rounded-lg transition-all ${
                      tool === 'triangle' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Triangle"
                  >
                    <Triangle className="w-4 h-4" />
                  </button>
                </div>
    
                {/* Colors and Size Row */}
                <div className="flex items-center gap-4">
                  {/* Colors */}
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
    
                  {/* Brush Size */}
                  {tool !== 'fill' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Size:</span>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600 w-8">{brushSize}</span>
                    </div>
                  )}
    
                  {/* Clear Button */}
                  <button
                    onClick={onClear}
                    className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
    
          {/* Canvas */}
          <div className="flex-1 relative">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`absolute inset-0 ${
                canDraw 
                  ? tool === 'fill' 
                    ? 'cursor-pointer' 
                    : 'cursor-crosshair' 
                  : 'cursor-not-allowed'
              }`}
              style={{ touchAction: 'none' }}
            />
            
            {!canDraw && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none">
                <div className="bg-white px-6 py-3 rounded-xl shadow-lg">
                  <p className="text-gray-600 font-medium">
                    {currentDrawer ? `${currentDrawer} is drawing...` : 'Waiting for game to start'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    });
    
    Canvas.displayName = 'Canvas';