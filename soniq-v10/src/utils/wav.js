// ── WAV encoder ───────────────────────────────────────────────────────────────

/**
 * Write an ASCII string into a DataView at the given byte offset.
 * @param {DataView} view
 * @param {number} offset  Byte offset to start writing
 * @param {string} str     ASCII string to write
 */
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Encode an AudioBuffer to a WAV Blob at 16-bit or 24-bit PCM depth.
 * Interleaves all channels (L, R, L, R, …) per the PCM WAV spec.
 * The RIFF/WAVE header is written inline — no external library needed.
 *
 * @param {AudioBuffer} audioBuffer  Source buffer to encode
 * @param {16|24}       bitDepth     Output bit depth (16 or 24)
 * @returns {Blob}  WAV Blob with MIME type "audio/wav"
 */
export function encodeWAV(audioBuffer, bitDepth) {
  const nch      = audioBuffer.numberOfChannels;
  const sr       = audioBuffer.sampleRate;
  const n        = audioBuffer.length;
  const bps      = bitDepth === 16 ? 2 : 3;   // bytes per sample
  const dataSize = nch * n * bps;

  const ab = new ArrayBuffer(44 + dataSize);
  const v  = new DataView(ab);

  // RIFF chunk descriptor
  writeString(v, 0,  'RIFF');
  v.setUint32(4,  36 + dataSize, true);
  writeString(v, 8,  'WAVE');

  // fmt sub-chunk
  writeString(v, 12, 'fmt ');
  v.setUint32(16, 16,       true);   // sub-chunk size = 16 for PCM
  v.setUint16(20, 1,        true);   // PCM audio format
  v.setUint16(22, nch,      true);
  v.setUint32(24, sr,       true);
  v.setUint32(28, sr * nch * bps, true);  // byte rate
  v.setUint16(32, nch * bps,      true);  // block align
  v.setUint16(34, bitDepth,       true);

  // data sub-chunk
  writeString(v, 36, 'data');
  v.setUint32(40, dataSize, true);

  // Peak scan — normalize if signal exceeds 0.99 FS to prevent hard clipping
  let _peak = 0;
  for (let c = 0; c < nch; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const a = Math.abs(data[i]);
      if (a > _peak) _peak = a;
    }
  }
  if (_peak > 1.0) console.warn(`SONIQ export: peak ${_peak.toFixed(3)} exceeded 1.0 — normalization applied`);
  const normGain = _peak > 0.99 ? 0.99 / _peak : 1.0;

  // Interleaved sample data
  let off = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      const s = Math.max(-1, Math.min(1, audioBuffer.getChannelData(c)[i] * normGain));
      if (bitDepth === 16) {
        v.setInt16(off, Math.round(s * 32767), true);
        off += 2;
      } else {
        // 24-bit: write three bytes little-endian
        const val = Math.round(s < 0 ? s * 8388608 : s * 8388607);
        v.setUint8(off,     val         & 0xFF);
        v.setUint8(off + 1, (val >> 8)  & 0xFF);
        v.setUint8(off + 2, (val >> 16) & 0xFF);
        off += 3;
      }
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

/**
 * Trigger a browser download for a Blob.
 * Creates a temporary <a> element, clicks it, then revokes the object URL
 * after 2 seconds to avoid memory leaks.
 *
 * @param {Blob}   blob      The Blob to download
 * @param {string} filename  Suggested filename for the download
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
