import { ref } from 'vue';

const wakeWord = ref('');

export function useWakeWord() {
  function setWakeWord(word) {
    wakeWord.value = word.toLowerCase();
  }

  function check(text) {
    return wakeWord.value ? text.toLowerCase().includes(wakeWord.value) : false;
  }

  return { setWakeWord, check, wakeWord };
}
