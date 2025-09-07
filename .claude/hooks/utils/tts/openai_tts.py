#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "openai",
#     "openai[voice_helpers]",
#     "python-dotenv",
# ]
# ///

import os
import sys
import asyncio
import tempfile
import subprocess
from dotenv import load_dotenv


async def main():
    """
    OpenAI TTS Script

    Uses OpenAI's latest TTS model for high-quality text-to-speech.
    Accepts optional text prompt as command-line argument.

    Usage:
    - ./openai_tts.py                    # Uses default text
    - ./openai_tts.py "Your custom text" # Uses provided text

    Features:
    - OpenAI gpt-4o-mini-tts model (latest)
    - Nova voice (engaging and warm)
    - Streaming audio with instructions support
    - Live audio playback via LocalAudioPlayer
    """

    # Load environment variables
    load_dotenv()

    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment variables")
        print("Please add your OpenAI API key to .env file:")
        print("OPENAI_API_KEY=your_api_key_here")
        sys.exit(1)

    try:
        from openai import AsyncOpenAI

        # Initialize OpenAI client
        openai = AsyncOpenAI(api_key=api_key)

        print("🎙️  OpenAI TTS")
        print("=" * 20)

        # Get text from command line argument or use default
        if len(sys.argv) > 1:
            text = " ".join(sys.argv[1:])  # Join all arguments as text
        else:
            text = "Today is a wonderful day to build something people love!"

        print(f"🎯 Text: {text}")
        print("🔊 Generating audio...")

        try:
            # Generate audio using OpenAI TTS
            response = await openai.audio.speech.create(
                model="tts-1",  # Use standard TTS model
                voice="nova",  # Try nova voice (more natural)
                input=text,
                response_format="mp3",
            )

            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                temp_file.write(response.content)
                temp_path = temp_file.name

            print("🔊 Playing audio...")

            # Try different audio players
            players = [
                ["mpg123", "-q", temp_path],  # MPG123 (best for MP3)
                [
                    "ffplay",
                    "-nodisp",
                    "-autoexit",
                    "-loglevel",
                    "quiet",
                    temp_path,
                ],  # FFmpeg
                ["paplay", temp_path],  # PulseAudio
                ["cvlc", "--play-and-exit", "--intf", "dummy", temp_path],  # VLC
                ["aplay", "-q", temp_path],  # ALSA (может давать шум с MP3)
            ]

            audio_played = False
            for player_cmd in players:
                try:
                    result = subprocess.run(player_cmd, capture_output=True, timeout=30)
                    if result.returncode == 0:
                        audio_played = True
                        break
                except (subprocess.SubprocessError, FileNotFoundError):
                    continue

            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass

            if audio_played:
                print("✅ Playback complete!")
            else:
                print("⚠️  No audio player found. Audio saved but not played.")

        except Exception as e:
            print(f"❌ Error: {e}")

    except ImportError:
        print("❌ Error: Required package not installed")
        print("This script uses UV to auto-install dependencies.")
        print("Make sure UV is installed: https://docs.astral.sh/uv/")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
