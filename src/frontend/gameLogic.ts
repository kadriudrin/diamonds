import {
  Application,
  Assets,
  Sprite,
  Texture,
  Ticker,
  Text,
  TextStyle,
} from 'pixi.js';
import { dataService } from './lib/DataService';
import { ELogType } from '../common/models';
import blueGem from './assets/blue.png';
import aquaGem from './assets/aqua.png';
import purpleGem from './assets/purple.png';
import greenGem from './assets/green.png';
import redGem from './assets/red.png';
import pinkGem from './assets/pink.png';
import yellowGem from './assets/yellow.png';
import emptySlot from './assets/slot.png';
import winSound from './assets/win.mp3';

function playWinSound() {
  const audio = new Audio(winSound);
  audio.play();
}

// Define gem types and their corresponding textures
const gemTypes = [
  'blue',
  'aqua',
  'purple',
  'green',
  'red',
  'pink',
  'yellow',
];

export async function gameLogic(app: Application, w: number, h: number) {
  // Load gem textures
  const gemTextures: { [key: string]: Texture } = {
    blue: await Assets.load(blueGem),
    aqua: await Assets.load(aquaGem),
    purple: await Assets.load(purpleGem),
    green: await Assets.load(greenGem),
    red: await Assets.load(redGem),
    pink: await Assets.load(pinkGem),
    yellow: await Assets.load(yellowGem),
  };

  // Load empty slot texture
  const emptySlotTexture = await Assets.load(emptySlot);

  // Variables
  const slots: Sprite[] = [];
  const gemSprites: Sprite[] = [];
  let balance = 100; // Starting balance
  dataService.balanceEmitter.emit(balance);
  let ticker: Ticker | null = null;
  let resultText: Text;

  // Initialize slots
  const totalSlots = 7;
  const slotWidth = w / (totalSlots + 2); // Adjust for margins
  const slotHeight = slotWidth; // Square slots
  const slotSpacing = (w - totalSlots * slotWidth) / (totalSlots + 1);
  const slotY = h * 0.8;

  for (let i = 0; i < totalSlots; i++) {
    const slotSprite = new Sprite(emptySlotTexture);
    slotSprite.anchor.set(0.5);
    slotSprite.x =
      slotSpacing + slotWidth / 2 + i * (slotWidth + slotSpacing);
    slotSprite.y = slotY;
    slotSprite.width = slotWidth;
    slotSprite.height = slotHeight;
    app.stage.addChild(slotSprite);
    slots.push(slotSprite);
  }

  // Create result text
  const style = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 36,
    fill: 'white',
    align: 'center',
  });
  resultText = new Text('', style);
  resultText.anchor.set(0.5);
  resultText.x = w / 2;
  resultText.y = h * 0.2; // Place it at 20% from the top
  resultText.alpha = 0; // Start invisible
  app.stage.addChild(resultText);

  // Register to betEmitter to handle new bets
  dataService.betEmitter.register((betAmount: number) => {
    handleBet(betAmount);
  });

  // Handle bets
  function handleBet(betAmount: number) {
    // Reset slot tints
    slots.forEach((slot) => (slot.tint = 0xffffff));

    // Reset result text
    resultText.text = '';
    resultText.alpha = 0;
    resultText.style.fill = 'white';

    // Stop previous wave animation
    if (ticker) {
      ticker.stop();
      ticker.destroy();
      ticker = null;
    }

    // Fade out current gems if any
    if (gemSprites.length > 0) {
      fadeOutGems(() => {
        proceedWithBet(betAmount);
      });
    } else {
      proceedWithBet(betAmount);
    }
  }

  // Proceed with bet
  async function proceedWithBet(betAmount: number) {
    // Check balance
    if (betAmount > balance) {
      dataService.logEmitter.emit({
        message: 'Insufficient balance',
        logType: ELogType.Error,
      });
      return;
    }

    // Deduct bet amount
    balance -= betAmount;
    dataService.balanceEmitter.emit(balance);

    // Generate random gems
    const gems: string[] = [];
    for (let i = 0; i < totalSlots; i++) {
      const randomGem =
        gemTypes[Math.floor(Math.random() * gemTypes.length)];
      gems.push(randomGem);
    }

    // Clear previous gems from array
    gemSprites.length = 0;

    // Animate gem spawning
    const spawnPromises: Promise<void>[] = [];
    const spawnDelay = 500; // milliseconds

    gems.forEach((gemType, index) => {
      const gemTexture = gemTextures[gemType];
      const gemSprite = new Sprite(gemTexture);
      gemSprite.anchor.set(0.5);
      gemSprite.x = slots[index].x;
      gemSprite.y = slots[index].y - 50; // Start above the slot
      gemSprite.alpha = 0;

      // Scale gem to fit within slot
      const gemScale = Math.min(
        (slots[index].width * 0.8) / gemSprite.texture.width,
        (slots[index].height * 0.8) / gemSprite.texture.height
      );
      gemSprite.scale.set(gemScale);

      app.stage.addChild(gemSprite);
      gemSprites.push(gemSprite);

      // Animate appearance after delay
      const promise = new Promise<void>((resolve) => {
        setTimeout(() => {
          animateGemSpawn(gemSprite, slots[index].y).then(resolve);
        }, index * spawnDelay);
      });
      spawnPromises.push(promise);
    });

    // Wait for all gems to finish spawning
    await Promise.all(spawnPromises);

    // Check for combinations after all gems have spawned
    const winnings = checkCombinations(gems, betAmount);
    if (winnings > 0) {
      highlightWinningGems(gems);
      playWinSound();
      balance += winnings;
      dataService.balanceEmitter.emit(balance);
      dataService.logEmitter.emit({
        message: `You won ${winnings.toFixed(2)}$`,
        logType: ELogType.Success,
      });
      animateResultText(winnings, true);
    } else {
      dataService.logEmitter.emit({
        message: `You lost ${betAmount.toFixed(2)}$`,
        logType: ELogType.Error,
      });
      animateResultText(-betAmount, false);
    }
    startWaveAnimation();
  }

  // Animate gem spawning
  function animateGemSpawn(
    sprite: Sprite,
    targetY: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const duration = 500; // milliseconds
      const startTime = Date.now();
      const startY = sprite.y;

      function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        sprite.y = startY + (targetY - startY) * progress;
        sprite.alpha = progress;
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      animate();
    });
  }

  // Fade out existing gems
  function fadeOutGems(callback: () => void) {
    const duration = 500; // milliseconds
    const startTime = Date.now();

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      gemSprites.forEach((sprite) => {
        sprite.alpha = 1 - progress;
      });
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Remove gems from stage
        gemSprites.forEach((sprite) => app.stage.removeChild(sprite));
        gemSprites.length = 0; // Clear the gemSprites array
        callback();
      }
    }
    animate();
  }

  // Check for winning combinations
  function checkCombinations(
    gems: string[],
    betAmount: number
  ): number {
    const counts: { [key: string]: number } = {};
    gems.forEach((gem) => {
      counts[gem] = (counts[gem] || 0) + 1;
    });

    const occurrences = Object.values(counts).sort((a, b) => b - a);
    let multiplier = 0;

    if (occurrences[0] === 7) {
      multiplier = 1000; // Seven of a kind
    } else if (occurrences[0] === 6) {
      multiplier = 100; // Six of a kind
    } else if (occurrences[0] === 5) {
      multiplier = 50; // Five of a kind
    } else if (occurrences[0] === 4) {
      multiplier = 5; // Four of a kind
    } else if (occurrences[0] === 3 && occurrences[1] === 2) {
      multiplier = 4; // Full house
    } else if (occurrences[0] === 3) {
      multiplier = 3; // Three of a kind
    } else if (
      occurrences[0] === 2 &&
      occurrences[1] === 2 &&
      occurrences[2] === 2
    ) {
      multiplier = 3; // Three pairs
    }
    return betAmount * multiplier;
  }

  // Highlight winning slots
  function highlightWinningGems(gems: string[]) {
    const counts: { [key: string]: number } = {};
    gems.forEach((gem) => {
      counts[gem] = (counts[gem] || 0) + 1;
    });

    const winningGemTypes = Object.keys(counts).filter(
      (gem) => counts[gem] >= 2
    );

    gems.forEach((gem, index) => {
      if (winningGemTypes.includes(gem)) {
        const slotSprite = slots[index];
        slotSprite.tint = getGemTint(gem);
      }
    });
  }

  // Get tint color for a gem type
  function getGemTint(gemType: string): number {
    const gemColors: { [key: string]: number } = {
      blue: 0x0000ff,
      aqua: 0x00ffff,
      purple: 0x800080,
      green: 0x00ff00,
      red: 0xff0000,
      pink: 0xffc0cb,
      yellow: 0xffff00,
    };
    return gemColors[gemType] || 0xffffff;
  }

  // Start wave animation for gems
  function startWaveAnimation() {
    ticker = new Ticker();
    ticker.add(() => {
      gemSprites.forEach((sprite, index) => {
        const time = Date.now() / 500 + index;
        sprite.y = slots[index].y + Math.sin(time) * 10;
      });
    });
    ticker.start();
  }

  // Animate result text
  function animateResultText(amount: number, isWin: boolean) {
    resultText.text = isWin
      ? `+${amount.toFixed(2)}$`
      : `-${Math.abs(amount).toFixed(2)}$`;
    resultText.style.fill = isWin ? 'green' : 'red';
    resultText.alpha = 0; // Start invisible

    const duration = 1000; // milliseconds
    const startTime = Date.now();
    const startAmount = 0;
    const endAmount = amount;
    const startAlpha = 0;
    const endAlpha = 1;

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Update alpha
      resultText.alpha = startAlpha + (endAlpha - startAlpha) * progress;

      // Update amount
      const currentAmount =
        startAmount + (endAmount - startAmount) * progress;
      resultText.text = isWin
        ? `+${currentAmount.toFixed(2)}$`
        : `-${Math.abs(currentAmount).toFixed(2)}$`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    animate();
  }
}

