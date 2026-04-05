let lastSpokenText = '';

export function speakDutch(text) {
  if (!('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking && text === lastSpokenText) {
    window.speechSynthesis.paused
      ? window.speechSynthesis.resume()
      : window.speechSynthesis.pause();
    return;
  }
  window.speechSynthesis.cancel();
  lastSpokenText = text;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'nl-NL';
  msg.rate = 0.9;
  msg.onend = () => { lastSpokenText = ''; };
  const dutchVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('nl'));
  if (dutchVoice) msg.voice = dutchVoice;
  window.speechSynthesis.speak(msg);
}
