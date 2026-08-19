import { Howl } from 'howler';

import { useSoundStore } from '../store/sound-store/sound-store';

type SoundRegistration = {
  src: string | string[];
  volume?: number;
};

type PlayOptions = {
  volume?: number;
};

class SoundService {
  private sounds = new Map<string, Howl>();
  private soundVolumes = new Map<string, number>();

  register(id: string, registration: SoundRegistration): void {
    if (this.sounds.has(id)) {
      return;
    }

    const soundVolume = registration.volume ?? 1;

    const howl = new Howl({
      src: registration.src,
      volume: soundVolume,
      preload: true,
    });

    this.sounds.set(id, howl);
    this.soundVolumes.set(id, soundVolume);
  }

  play(id: string, options?: PlayOptions): void {
    const { muted, volume: globalVolume } = useSoundStore.getState();

    if (muted) {
      return;
    }

    const howl = this.sounds.get(id);

    if (!howl) {
      return;
    }

    const playVolume = options?.volume ?? 1;
    const registeredVolume = this.soundVolumes.get(id) ?? 1;
    howl.volume(playVolume * registeredVolume * globalVolume);
    howl.play();
  }

  stop(id: string): void {
    this.sounds.get(id)?.stop();
  }

  preload(ids?: string[]): void {
    const targets = ids ?? [...this.sounds.keys()];

    targets.forEach((id) => {
      this.sounds.get(id)?.load();
    });
  }

  resetForTests(): void {
    this.sounds.forEach((howl) => {
      howl.unload();
    });
    this.sounds.clear();
    this.soundVolumes.clear();
  }
}

export const soundService = new SoundService();
