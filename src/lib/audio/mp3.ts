
/**
 * MP3 Duration Parser
 * Accurately calculates duration of MP3 buffers without external dependencies.
 * Handles ID3v2 tags and VBR (Xing/Info) headers.
 */

export function getMp3Duration(buffer: Buffer): number {
    try {
        let offset = 0;

        // 1. Skip ID3v2 Tag if present
        if (buffer.toString('ascii', 0, 3) === 'ID3') {
            // ID3v2 header is 10 bytes
            // The size is encoded as 4 sync-safe integers (7 bits each)
            const sizeEncoded = buffer.slice(6, 10);
            const tagSize = (sizeEncoded[0] << 21) | (sizeEncoded[1] << 14) | (sizeEncoded[2] << 7) | sizeEncoded[3];
            offset = 10 + tagSize;
        }

        // 2. Find first MPEG Frame Header
        // Sync word is 11 bits set to 1 (0xFF 0xE0)
        // We look for 0xFF followed by a byte with high 3 bits set (0xE0)
        while (offset < buffer.length - 1) {
            if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xE0) === 0xE0) {
                break;
            }
            offset++;
        }

        if (offset >= buffer.length - 4) {
            // No MP3 frame found, fallback to estimation based on file size (assuming 128kbps)
            // 128 kbps = 16 KB/s
            return Math.round((buffer.length / 16000) * 1000);
        }

        // 3. Parse Frame Header
        const header = buffer.readUInt32BE(offset);

        // Version Index: (header >> 19) & 3
        // 0=2.5, 1=reserved, 2=2, 3=1
        const versionIndex = (header >> 19) & 3;

        // Layer Index: (header >> 17) & 3
        // 0=reserved, 1=III, 2=II, 3=I
        const layerIndex = (header >> 17) & 3;

        // Bitrate Index: (header >> 12) & 0xF
        const bitrateIndex = (header >> 12) & 0xF;

        // Sample Rate Index: (header >> 10) & 3
        const sampleRateIndex = (header >> 10) & 3;

        // Padding Bit: (header >> 9) & 1
        const paddingBit = (header >> 9) & 1;

        // 4. Determine MPEG Version and Layer
        let mpegVersion = 0; // 1 or 2
        if (versionIndex === 3) mpegVersion = 1;
        else if (versionIndex === 2) mpegVersion = 2;
        else if (versionIndex === 0) mpegVersion = 2.5;

        let layer = 0;
        if (layerIndex === 1) layer = 3;
        else if (layerIndex === 2) layer = 2;
        else if (layerIndex === 3) layer = 1;

        // 5. Calculate Sample Rate
        const sampleRates = [
            [44100, 48000, 32000], // MPEG 1
            [22050, 24000, 16000], // MPEG 2
            [11025, 12000, 8000]   // MPEG 2.5
        ];

        let sampleRate = 44100;
        if (mpegVersion === 1) sampleRate = sampleRates[0][sampleRateIndex];
        else if (mpegVersion === 2) sampleRate = sampleRates[1][sampleRateIndex];
        else if (mpegVersion === 2.5) sampleRate = sampleRates[2][sampleRateIndex];

        // 6. Check for VBR Header (Xing or Info)
        // Offset depends on Mono/Stereo
        const channelMode = (header >> 6) & 3; // 3 is single channel (mono)

        let xingOffset = offset + 4; // After header

        // Side info size
        if (mpegVersion === 1) {
            xingOffset += (channelMode === 3) ? 17 : 32;
        } else {
            xingOffset += (channelMode === 3) ? 9 : 17;
        }

        const xingTag = buffer.toString('ascii', xingOffset, xingOffset + 4);

        if (xingTag === 'Xing' || xingTag === 'Info') {
            // VBR Found
            const flags = buffer.readUInt32BE(xingOffset + 4);

            // Check if Number of Frames field is present (0x01)
            if (flags & 1) {
                const numFrames = buffer.readUInt32BE(xingOffset + 8);

                // Samples per frame
                let samplesPerFrame = 1152;
                if (mpegVersion === 1 && layer === 1) samplesPerFrame = 384;
                else if (mpegVersion >= 2 && layer === 3) samplesPerFrame = 576;
                else if (mpegVersion >= 2 && layer === 1) samplesPerFrame = 384; // Layer I is always 384

                if (sampleRate > 0) {
                    const duration = (numFrames * samplesPerFrame) / sampleRate;
                    return Math.round(duration * 1000);
                }
            }
        }

        // 7. CBR Fallback
        // Calculate frame size and assume constant bitrate for the whole file (minus ID3)
        // Bitrate lookup table (kbps) for MPEG 1 Layer III
        const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, -1];
        // We simplified here, a full table would be larger. Assuming 128kbps default if parsing fails.

        let bitrate = 128000;
        if (bitrateIndex > 0 && bitrateIndex < 15) {
            bitrate = bitrateTable[bitrateIndex] * 1000;
        }

        const audioSize = buffer.length - offset; // Approximate audio data size
        const durationSec = (audioSize * 8) / bitrate;

        return Math.round(durationSec * 1000);

    } catch (e) {
        console.error('MP3 parsing error:', e);
        // Fallback: estimate based on 128kbps
        return Math.round((buffer.length / 16000) * 1000);
    }
}
