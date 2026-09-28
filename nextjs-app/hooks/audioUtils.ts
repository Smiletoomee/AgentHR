export const convertInt16ToFloat32 = (int16Array: Int16Array): Float32Array => {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
};

export const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    const s = Math.max(-1, Math.min(1, buffer[l]));
    buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf;
};