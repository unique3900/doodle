export const hexToRgb = (hex: string) => {
    if (!hex) return { r: 0, g: 0, b: 0 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || [];
    return result ? {
      r: parseInt(result[1] || '0', 16),
      g: parseInt(result[2] || '0', 16),
      b: parseInt(result[3] || '0', 16)
    } : { r: 0, g: 0, b: 0 };
  };