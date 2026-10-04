<script lang="ts">
  import { onMount } from 'svelte';
  import PondCanvas from '../pond/PondCanvas.svelte';
  import { PALETTES, type PaletteName } from '../pond/palette';
  import { getDailyWord, isValidWord } from '../wordle/words';
  import {
    playDelete,
    playDuetCroak,
    playFrogCroak,
    playHeartChime,
    playInvalid,
    playKeyPress,
    playLoveSerenade,
    playRevealTile,
    playSecretUnlock,
    playWin,
  } from '../wordle/sound';
  import { logoutSecret } from './auth';
  import PassDeck from './PassDeck.svelte';

  let {
    onLogout,
    onNavigate,
  }: {
    onLogout: () => void;
    onNavigate: (tab: 'portfolio' | 'wordle') => void;
  } = $props();

  // Floating hearts counter
  interface FloatingHeart {
    id: number;
    left: number;
    size: number;
    delay: number;
    duration: number;
  }
  let hearts = $state<FloatingHeart[]>([]);
  let heartCount = $state(0);

  // Wordle intelligence
  const todayDaily = getDailyWord();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDaily = getDailyWord(tomorrowDate);

  let revealToday = $state(false);
  let revealTomorrow = $state(false);

  // Custom word generator
  let customWord = $state('');
  let customError = $state('');
  let customCopied = $state(false);

  // Pond laboratory with Dusk/Sunset theme
  let selectedPalette = $state<PaletteName>('dusk');
  let labSeed = $state('anniversary-pond-2026');
  let pondRef = $state<ReturnType<typeof PondCanvas>>();
  let frogSpeech = $state('Happy Anniversary, sweet girl! 🎀❤️');
  let speechTimer: ReturnType<typeof setTimeout> | null = null;

  const availablePalettes: PaletteName[] = ['dusk', 'potion', 'ember', 'night', 'moss', 'mist'];

  // Reasons Why I Love You
  interface ReasonCard {
    id: number;
    title: string;
    icon: string;
    body: string;
    revealed: boolean;
  }

  let reasons = $state<ReasonCard[]>([
    {
      id: 1,
      title: 'Our Morning Boba & Coffee Runs',
      icon: '🧋',
      body: 'The way your face lights up on that first sip, and how the simplest errand becomes the highlight of my day when I am with you.',
      revealed: false,
    },
    {
      id: 2,
      title: 'Your Smile That Melts Everything Away',
      icon: '✨',
      body: 'No matter how stressful or hectic a day gets, one smile from you makes everything instantly okay. It is my favorite sight in the world.',
      revealed: false,
    },
    {
      id: 3,
      title: 'Cozy Movie & Cuddle Nights',
      icon: '🛋️',
      body: 'Curled up under warm blankets, sharing snacks, and you inevitably resting your head on my shoulder halfway through the show.',
      revealed: false,
    },
    {
      id: 4,
      title: 'My Number One Cheerleader',
      icon: '🧩',
      body: 'You always believe in me, celebrate my wins, and lift me up when I doubt myself. I am so lucky to have you in my corner.',
      revealed: false,
    },
    {
      id: 5,
      title: 'Our Adventures & Silly Inside Jokes',
      icon: '✈️',
      body: 'Every trip we take, singing together in the car, exploring new spots, and laughing so hard our stomachs hurt at things only we understand.',
      revealed: false,
    },
    {
      id: 6,
      title: 'My Lifelong Player Two',
      icon: '🎮',
      body: 'The best teammate for games, for road trips, and for life. I would choose you on my team every single time, in every universe.',
      revealed: false,
    },
    {
      id: 7,
      title: 'Our Foodie Quests & Late Night Treats',
      icon: '🍝',
      body: 'Exploring new restaurants, ordering way too much food, sharing bites, and play-fighting over who gets the last french fry.',
      revealed: false,
    },
    {
      id: 8,
      title: 'Simply Everything About You',
      icon: '💖',
      body: 'Your huge compassionate heart, your sharp mind, your warmth, your silliness, and the way you make home feel like wherever you are.',
      revealed: false,
    },
  ]);

  // Love Coupons
  interface Coupon {
    id: number;
    title: string;
    icon: string;
    desc: string;
    redeemed: boolean;
  }

  let coupons = $state<Coupon[]>([
    {
      id: 1,
      title: 'Unlimited Massage Pass',
      icon: '💆‍♀️',
      desc: 'One long, relaxing back & shoulder massage. No time limit or questions asked!',
      redeemed: false,
    },
    {
      id: 2,
      title: 'Fancy Dinner Date of Your Choice',
      icon: '🍽️',
      desc: 'Pick any restaurant, anywhere, anytime. All delicious treats completely on me.',
      redeemed: false,
    },
    {
      id: 3,
      title: 'Late-Night Boba / Sweet Treat Delivery',
      icon: '🧋',
      desc: 'Craving something sweet or an ice-cold boba? Instant delivery directly to your couch.',
      redeemed: false,
    },
    {
      id: 4,
      title: 'Movie Night Executive Control',
      icon: '🎬',
      desc: 'Complete 100% control over the movie lineup and snacks. No complaints permitted!',
      redeemed: false,
    },
    {
      id: 5,
      title: 'Win-Any-Argument Free Pass',
      icon: '👑',
      desc: 'Play this card during any playful debate and you are instantly and officially 100% right.',
      redeemed: false,
    },
    {
      id: 6,
      title: 'Spontaneous Weekend Getaway',
      icon: '🏖️',
      desc: 'A fun day trip or weekend escape together to explore, relax, and make new memories.',
      redeemed: false,
    },
  ]);

  let activePassIndex = $state(0);

  // Mini Love Wordle puzzle
  const LOVE_TARGET = 'HEART';
  let loveGuess = $state('');
  let loveSolved = $state(false);
  let loveHint = $state(false);
  let loveError = $state('');

  function handleLoveInput(letter: string) {
    if (loveSolved) return;
    if (loveGuess.length < 5) {
      loveGuess += letter.toUpperCase();
      playKeyPress(true);
      loveError = '';
    }
  }

  function handleLoveBackspace() {
    if (loveSolved) return;
    if (loveGuess.length > 0) {
      loveGuess = loveGuess.slice(0, -1);
      playDelete(true);
      loveError = '';
    }
  }

  function handleLoveSubmit() {
    if (loveSolved) return;
    if (loveGuess.length !== 5) {
      loveError = 'Need 5 letters!';
      playInvalid(true);
      return;
    }
    if (loveGuess === LOVE_TARGET) {
      loveSolved = true;
      playWin(true);
      playLoveSerenade(true);
      triggerHeartShower();
    } else {
      loveError = 'Close! Hint: What beats for you every day?';
      playInvalid(true);
    }
  }

  function triggerHeartShower() {
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        addFloatingHeart();
      }, i * 70);
    }
  }

  function addFloatingHeart() {
    heartCount++;
    const newHeart: FloatingHeart = {
      id: Date.now() + Math.random(),
      left: Math.random() * 92 + 4,
      size: Math.floor(Math.random() * 16) + 16,
      delay: Math.random() * 0.2,
      duration: Math.random() * 2 + 3,
    };
    hearts = [...hearts.slice(-30), newHeart];
  }

  function handleLogoutClick() {
    logoutSecret();
    onLogout();
  }

  function handleFrogLoveClick() {
    playDuetCroak(true);
    pondRef?.react();
    triggerHeartShower();

    if (speechTimer) clearTimeout(speechTimer);
    const quotes = [
      'Bumpy says: "Ribbit! You are the sweetest human! 🐸❤️"',
      'Girlfriend Frog says: "Ribbit! He loves you so much! 🎀💕"',
      'Both frogs harmonizing: "Happy Anniversary!! 🐸💕🎀"',
      'Ribbit! You two are our favorite pair! 💖',
    ];
    frogSpeech = quotes[Math.floor(Math.random() * quotes.length)];
    speechTimer = setTimeout(() => {
      frogSpeech = 'Happy Anniversary, sweet girl! 🎀❤️';
    }, 4000);
  }

  function handleToggleReason(id: number) {
    playHeartChime(true);
    addFloatingHeart();
    reasons = reasons.map((r) => (r.id === id ? { ...r, revealed: !r.revealed } : r));
  }

  function handleRedeemCoupon(id: number) {
    let redeemedNow = false;
    coupons = coupons.map((c) => {
      if (c.id === id && !c.redeemed) {
        playSecretUnlock(true);
        playHeartChime(true);
        triggerHeartShower();
        redeemedNow = true;
        return { ...c, redeemed: true };
      }
      return c;
    });

    if (!redeemedNow) return;

    const idx = coupons.findIndex((c) => c.id === id);
    setTimeout(() => {
      const nextUnredeemed = coupons.findIndex((c, i) => i !== idx && !c.redeemed);
      if (nextUnredeemed !== -1) {
        activePassIndex = nextUnredeemed;
      }
    }, 1400);
  }

  function handleGenerateCustom() {
    customError = '';
    const clean = customWord.trim().toUpperCase();
    if (clean.length !== 5) {
      customError = 'Must be exactly 5 letters';
      return;
    }
    if (!isValidWord(clean)) {
      customError = 'Not in official Wordle dictionary';
      return;
    }

    const url = `${window.location.origin}/#wordle?custom=${clean}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        customCopied = true;
        setTimeout(() => {
          customCopied = false;
        }, 2500);
      });
    }
  }

  onMount(() => {
    // Generate initial gentle ambient floating hearts
    const interval = setInterval(() => {
      if (hearts.length < 8) {
        addFloatingHeart();
      }
    }, 1800);

    return () => {
      clearInterval(interval);
      if (speechTimer) clearTimeout(speechTimer);
    };
  });
</script>

<!-- Ambient Floating Hearts -->
<div class="floating-hearts-overlay" aria-hidden="true">
  {#each hearts as h (h.id)}
    <span
      class="pixel-heart"
      style:left="{h.left}%"
      style:font-size="{h.size}px"
      style:animation-duration="{h.duration}s"
      style:animation-delay="{h.delay}s"
    >
      💖
    </span>
  {/each}
</div>

<PassDeck
  bind:activeIndex={activePassIndex}
  passes={coupons}
  onRedeem={handleRedeemCoupon}
  onLock={handleLogoutClick}
/>

<div id="vault-rest" class="vault-container">
  <header class="vault-banner px">
    <div class="banner-top">
      <div class="clearance-tag">
        <span class="pulse-dot"></span>
        <span>CLEARANCE: LEVEL ❤️ // FOREVER & ALWAYS</span>
        <span class="token-badge">sk_live_authenticated 🗝️</span>
      </div>
      <div class="banner-actions">
        <button type="button" class="btn px mini-btn logout-btn" onclick={handleLogoutClick}>
          Lock Vault 🔒
        </button>
      </div>
    </div>
    <div class="banner-bottom">
      <div>
        <h1 class="vault-heading">HAPPY ANNIVERSARY, MY LOVE! 💖</h1>
        <p class="vault-subheading">
          Pond, letter, games, and everything else — scroll down whenever you are ready.
        </p>
      </div>
      <nav class="quick-nav">
        <a class="nav-chip px pass-jump" href="#anniversary-passes">Back to passes ↑</a>
        <button type="button" class="nav-chip px" onclick={() => onNavigate('wordle')}>
          ← Back to Wordle
        </button>
        <button type="button" class="nav-chip px" onclick={() => onNavigate('portfolio')}>
          ← Portfolio
        </button>
      </nav>
    </div>
  </header>

  <!-- Interactive Love Pond Hero (Bumpy & Pink Girlfriend Frog) -->
  <section id="anniversary-pond" class="love-pond-card px">
    <div class="card-header">
      <div class="header-left">
        <span class="card-icon">🐸💕🎀</span>
        <h2 class="card-title">Bumpy & Girlfriend's Anniversary Pond</h2>
      </div>
      <div class="frog-bubble px">
        {frogSpeech}
      </div>
    </div>

    <div class="pond-wrap px">
      <PondCanvas
        bind:this={pondRef}
        seed={labSeed}
        palette={selectedPalette}
        options={{
          k: 1.7,
          frogs: 2,
          flies: 7,
          horizon: 0.44,
        }}
        interactive
      />
    </div>

    <div class="pond-bar">
      <div class="pond-actions">
        <button type="button" class="btn px love-btn" onclick={handleFrogLoveClick}>
          Send Love to Bumpy & Girlfriend 🐸💕
        </button>
        <button type="button" class="btn px serenade-btn" onclick={() => playLoveSerenade(true)}>
          Play Love Serenade 🎶
        </button>
      </div>

      <div class="palette-group">
        <span class="pal-lbl">Pond Vibe:</span>
        <div class="pal-buttons">
          {#each availablePalettes as p}
            <button
              type="button"
              class="pal-chip px"
              class:active={selectedPalette === p}
              onclick={() => (selectedPalette = p)}
            >
              {p}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- The Love Letter -->
  <section id="anniversary-letter" class="love-letter-card px">
    <div class="letter-stamp">
      <span class="stamp-icon">💌</span>
      <span class="stamp-text">SPECIAL DELIVERY FOR PLAYER TWO</span>
    </div>

    <div class="letter-body">
      <h2 class="letter-greeting">To My Favorite Person in the World,</h2>
      <p class="letter-para">
        Happy Anniversary! Every single day with you is my happiest day. From our lazy mornings, late-night snack runs, and cozy movie cuddles, to laughing until our stomachs hurt and navigating everything together, you make my life endlessly brighter.
      </p>
      <p class="letter-para">
        You are the kindest, smartest, funniest, and most gorgeous girl in the universe. Thank you for being my rock, my biggest supporter, my best friend, and my lifelong Player Two.
      </p>
      <p class="letter-para">
        I built this secret vault just for you because you deserve all the love, happiness, and magic in the world. I love you more than words, code, or infinite Wordle puzzles could ever express!
      </p>
      <div class="letter-signoff">
        <span>Forever & always yours,</span>
        <strong class="signature">With all my love ❤️</strong>
      </div>
    </div>

    <div class="kiss-action">
      <button type="button" class="btn px heart-pop-btn" onclick={() => { playHeartChime(true); triggerHeartShower(); }}>
        Send Infinite Hugs & Kisses 💋💖
      </button>
    </div>
  </section>

  <!-- Reasons Why I Love You -->
  <section id="anniversary-reasons" class="panel px">
      <div class="panel-header">
        <span class="panel-icon">✨</span>
        <h2 class="panel-title">8 Reasons Why I Love You (Click to Reveal)</h2>
      </div>
      <div class="panel-body">
        <p class="desc">A few of the million things that make you so special to me:</p>
        <div class="reasons-list">
          {#each reasons as r (r.id)}
            <button
              type="button"
              class="reason-item px"
              class:open={r.revealed}
              onclick={() => handleToggleReason(r.id)}
            >
              <div class="reason-top">
                <span class="reason-icon">{r.icon}</span>
                <span class="reason-title">{r.title}</span>
                <span class="reason-toggle">{r.revealed ? '▲' : '▼'}</span>
              </div>
              {#if r.revealed}
                <div class="reason-content">
                  {r.body}
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </section>

  <!-- Mini Love Wordle & Oracle Section -->
  <div class="vault-grid">
    <!-- Playable Mini Love Wordle -->
    <section id="anniversary-wordle" class="panel px">
      <div class="panel-header">
        <span class="panel-icon">🟩</span>
        <h2 class="panel-title">Our Mini Love Wordle (5-Letter Riddle)</h2>
      </div>
      <div class="panel-body">
        <p class="desc">Can you guess the 5-letter word that beats for you every day?</p>

        <!-- Mini Tiles -->
        <div class="love-tiles-row">
          {#each Array(5) as _, idx}
            <div
              class="love-tile px"
              class:filled={Boolean(loveGuess[idx])}
              class:correct={loveSolved}
            >
              {loveGuess[idx] || ''}
            </div>
          {/each}
        </div>

        {#if loveSolved}
          <div class="love-solved-box px">
            <span class="solved-star">💖 🟩🟩🟩🟩🟩 💖</span>
            <strong>YOU SOLVED MY HEART!</strong>
            <p>Not that you ever had to guess — my heart is already completely yours!</p>
          </div>
        {:else}
          <!-- Quick Keyboard Helper -->
          <div class="love-keys-box">
            <div class="love-keys-row">
              {#each ['H', 'E', 'A', 'R', 'T', 'S', 'W', 'Y', 'O', 'U'] as letter}
                <button
                  type="button"
                  class="key-btn px"
                  onclick={() => handleLoveInput(letter)}
                >
                  {letter}
                </button>
              {/each}
            </div>
            <div class="love-action-row">
              <button type="button" class="btn px mini-btn back-btn" onclick={handleLoveBackspace}>
                ⌫ Back
              </button>
              <button type="button" class="btn px mini-btn submit-btn" onclick={handleLoveSubmit}>
                Enter Guess ↵
              </button>
              <button
                type="button"
                class="btn px mini-btn hint-btn"
                onclick={() => { loveHint = !loveHint; playHeartChime(true); }}
              >
                {loveHint ? 'Hide Hint' : 'Need a Hint? 💡'}
              </button>
            </div>
            {#if loveHint}
              <div class="hint-text px">
                Hint: It starts with <strong>H</strong> and rhymes with <em>PART</em>! (Or spells H-E-A-R-T ❤️)
              </div>
            {/if}
            {#if loveError}
              <div class="error-text">⚠ {loveError}</div>
            {/if}
          </div>
        {/if}
      </div>
    </section>

    <!-- Girlfriend's VIP Wordle Oracle -->
    <section id="anniversary-oracle" class="panel px">
      <div class="panel-header">
        <span class="panel-icon">🔮</span>
        <h2 class="panel-title">Wordle Oracle: Girlfriend VIP Answers</h2>
      </div>
      <div class="panel-body">
        <p class="desc">Exclusive anniversary perk: You never have to lose a Wordle game again!</p>

        <div class="intel-card px">
          <div class="intel-row">
            <span class="intel-lbl">Today's Daily Wordle (#{todayDaily.puzzleNumber})</span>
            <span class="intel-date">{todayDaily.dateString}</span>
          </div>
          <div class="reveal-box">
            {#if revealToday}
              <span class="revealed-word px">{todayDaily.word}</span>
            {:else}
              <button type="button" class="btn px mini-btn" onclick={() => { playRevealTile(true, 4, 'correct'); revealToday = true; }}>
                Reveal Today's Answer 👁️
              </button>
            {/if}
          </div>
        </div>

        <div class="intel-card px">
          <div class="intel-row">
            <span class="intel-lbl">Tomorrow's Daily Wordle (#{tomorrowDaily.puzzleNumber})</span>
            <span class="intel-date">{tomorrowDaily.dateString}</span>
          </div>
          <div class="reveal-box">
            {#if revealTomorrow}
              <span class="revealed-word px">{tomorrowDaily.word}</span>
            {:else}
              <button type="button" class="btn px mini-btn" onclick={() => { playRevealTile(true, 4, 'correct'); revealTomorrow = true; }}>
                Preview Tomorrow's Answer 🔮
              </button>
            {/if}
          </div>
        </div>

        <div class="custom-builder">
          <h3 class="sub-title">Challenge a Friend</h3>
          <p class="sub-desc">Generate a direct Wordle challenge link with any 5-letter word.</p>
          <div class="builder-row">
            <input
              type="text"
              class="custom-input px"
              maxlength="5"
              placeholder="e.g. SWEET"
              bind:value={customWord}
            />
            <button type="button" class="btn px generate-btn" onclick={handleGenerateCustom}>
              {customCopied ? 'Link Copied! ✓' : 'Copy Link 📋'}
            </button>
          </div>
          {#if customError}
            <span class="error-text">⚠ {customError}</span>
          {/if}
        </div>
      </div>
    </section>
  </div>

  <!-- 8-Bit Romantic Synthesizer Jukebox -->
  <section id="anniversary-jukebox" class="panel px jukebox-panel">
    <div class="panel-header">
      <span class="panel-icon">🎶</span>
      <h2 class="panel-title">8-Bit Retro Love Jukebox</h2>
    </div>
    <div class="panel-body">
      <p class="desc">Live synthesizer triggers tuned for our celebration:</p>
      <div class="sound-grid">
        <button type="button" class="sound-btn px romantic-tune" onclick={() => playLoveSerenade(true)}>
          Anniversary Serenade 🎶
        </button>
        <button type="button" class="sound-btn px romantic-tune" onclick={() => playHeartChime(true)}>
          Heart Chime 💖
        </button>
        <button type="button" class="sound-btn px frog-duet" onclick={() => playDuetCroak(true)}>
          Bumpy & Girlfriend Duet 🐸💕
        </button>
        <button type="button" class="sound-btn px" onclick={() => playWin(true)}>
          Victory Fanfare 🏆
        </button>
        <button type="button" class="sound-btn px" onclick={() => playSecretUnlock(true)}>
          Secret Discovery 🗝️
        </button>
        <button type="button" class="sound-btn px" onclick={() => playFrogCroak(true)}>
          Bumpy Solo Croak 🐸
        </button>
      </div>
    </div>
  </section>
</div>

<style>
  /* Floating hearts ambient layer */
  .floating-hearts-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    overflow: hidden;
  }

  .pixel-heart {
    position: absolute;
    bottom: -30px;
    animation-name: float-up;
    animation-timing-function: ease-out;
    animation-fill-mode: forwards;
    opacity: 0.85;
    filter: drop-shadow(0 0 6px rgba(255, 105, 180, 0.6));
  }

  @keyframes float-up {
    0% {
      transform: translateY(0) scale(0.8) rotate(0deg);
      opacity: 0;
    }
    15% {
      opacity: 0.9;
    }
    85% {
      opacity: 0.8;
    }
    100% {
      transform: translateY(-105vh) scale(1.15) rotate(15deg);
      opacity: 0;
    }
  }

  .vault-container {
    width: 100%;
    max-width: var(--width);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    user-select: none;
    padding-bottom: 40px;
  }

  /* Anniversary Classified Banner */
  .vault-banner {
    background: #171120;
    border: 2px solid #f48cb8;
    padding: 22px 26px;
    box-shadow: 0 8px 30px rgba(244, 140, 184, 0.18), 0 0 15px rgba(0, 0, 0, 0.8);
  }

  .banner-top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(244, 140, 184, 0.3);
    padding-bottom: 12px;
    margin-bottom: 14px;
    gap: 10px;
  }

  .clearance-tag {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #ff94c2;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }

  .token-badge {
    background: #2a1122;
    border: 1px solid #f48cb8;
    color: #ffc4da;
    padding: 2px 8px;
    font-size: 11px;
    letter-spacing: 1px;
    border-radius: 2px;
  }

  .pulse-dot {
    width: 10px;
    height: 10px;
    background: #ff4d94;
    border-radius: 50%;
    box-shadow: 0 0 10px #ff4d94;
    animation: pulse 1.2s infinite alternate;
  }

  @keyframes pulse {
    from {
      opacity: 0.5;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1.15);
    }
  }

  .logout-btn {
    background: #23192a;
    color: var(--fg);
    border: 1px solid var(--dim);
    font-size: 13px;
    padding: 6px 12px;
  }

  .logout-btn:hover {
    background: var(--error);
    color: #080c18;
    border-color: var(--error);
  }

  .banner-bottom {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }

  .vault-heading {
    margin: 0;
    font-size: 32px;
    color: #ffe8f3;
    letter-spacing: 1px;
    text-shadow: 0 0 12px rgba(244, 140, 184, 0.4);
  }

  .vault-subheading {
    margin: 6px 0 0;
    color: #c9b9d6;
    font-size: 16px;
    line-height: 1.4;
  }

  .quick-nav {
    display: flex;
    gap: 10px;
  }

  .nav-chip {
    background: var(--field);
    color: var(--fg);
    border: 1px solid var(--dim);
    padding: 8px 14px;
    font-size: 14px;
    font-weight: 700;
    cursor: var(--cursor-pointer);
    transition: all 0.15s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .nav-chip:hover {
    background: #2b1d36;
    border-color: #f48cb8;
    color: #ffc4da;
  }

  /* Love Pond Card */
  .love-pond-card {
    background: var(--field);
    border: 2px solid #d65a8f;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card-header {
    background: #191224;
    padding: 12px 18px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 2px solid #d65a8f;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .card-icon {
    font-size: 20px;
  }

  .card-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #ffe8f3;
  }

  .frog-bubble {
    background: #ffe8f3;
    color: #2a0f1a;
    font-size: 13px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    animation: bubble-bob 2s ease-in-out infinite alternate;
  }

  @keyframes bubble-bob {
    0% { transform: translateY(0); }
    100% { transform: translateY(-3px); }
  }

  .pond-wrap {
    height: 190px;
    position: relative;
    overflow: hidden;
    background: #090e18;
  }

  .pond-bar {
    padding: 14px 18px;
    background: #111726;
    border-top: 1px solid rgba(214, 90, 143, 0.3);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
  }

  .pond-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .love-btn {
    background: #d65a8f;
    color: #ffffff;
    font-size: 14px;
    padding: 8px 16px;
    border: none;
    box-shadow: 0 0 10px rgba(214, 90, 143, 0.4);
  }

  .love-btn:hover {
    background: #ff4d94;
    color: #ffffff;
    transform: translateY(-1px);
  }

  .serenade-btn {
    background: #2a1b38;
    color: #ffc4da;
    border: 1px solid #d65a8f;
    font-size: 14px;
    padding: 8px 14px;
  }

  .serenade-btn:hover {
    background: #3b244f;
    color: #ffffff;
  }

  .palette-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .pal-lbl {
    color: var(--muted);
    font-weight: 700;
  }

  .pal-buttons {
    display: flex;
    gap: 4px;
  }

  .pal-chip {
    background: #0e1320;
    border: 1px solid var(--dim);
    color: var(--muted);
    font-size: 12px;
    padding: 4px 8px;
    cursor: var(--cursor-pointer);
    text-transform: capitalize;
  }

  .pal-chip.active {
    background: #f48cb8;
    color: #080c18;
    border-color: #f48cb8;
    font-weight: 700;
  }

  /* Love Letter Card */
  .love-letter-card {
    background: #181222;
    border: 2px solid #f48cb8;
    padding: 28px;
    position: relative;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
  }

  .letter-stamp {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ff94c2;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.5px;
    border-bottom: 1px dashed rgba(244, 140, 184, 0.4);
    padding-bottom: 12px;
    margin-bottom: 20px;
  }

  .stamp-icon {
    font-size: 20px;
  }

  .letter-greeting {
    margin: 0 0 14px;
    font-size: 24px;
    color: #ffe8f3;
  }

  .letter-para {
    font-size: 17px;
    line-height: 1.6;
    color: #e5daf0;
    margin: 0 0 14px;
  }

  .letter-signoff {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 20px;
    font-size: 17px;
    color: #c9b9d6;
  }

  .signature {
    font-size: 22px;
    color: #ff7eb6;
  }

  .kiss-action {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
  }

  .heart-pop-btn {
    background: #ff4d94;
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    padding: 10px 18px;
    border: none;
    box-shadow: 0 0 14px rgba(255, 77, 148, 0.5);
    transition: transform 0.1s ease;
  }

  .heart-pop-btn:hover {
    transform: scale(1.03);
    background: #ff66a3;
  }

  /* 2-Column Vault Grid */
  .vault-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }

  .panel {
    background: var(--field);
    border: 2px solid var(--dim);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-header {
    background: #0f1524;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 2px solid var(--dim);
  }

  .panel-icon {
    font-size: 18px;
  }

  .panel-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
  }

  .panel-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
  }

  .desc {
    margin: 0;
    font-size: 14px;
    color: var(--muted);
  }

  /* Reasons List */
  .reasons-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .reason-item {
    background: #0f1422;
    border: 1px solid rgba(104, 113, 132, 0.4);
    padding: 10px 14px;
    text-align: left;
    cursor: var(--cursor-pointer);
    font-family: inherit;
    color: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .reason-item:hover {
    border-color: #f48cb8;
    background: #181424;
  }

  .reason-item.open {
    border-color: #f48cb8;
    background: #1a1326;
  }

  .reason-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .reason-icon {
    font-size: 18px;
  }

  .reason-title {
    flex: 1;
    font-size: 14px;
    font-weight: 700;
    color: #ffe8f3;
  }

  .reason-toggle {
    font-size: 11px;
    color: #ff94c2;
  }

  .reason-content {
    margin-top: 8px;
    font-size: 13px;
    color: #d1c4e0;
    line-height: 1.5;
    border-top: 1px dashed rgba(244, 140, 184, 0.3);
    padding-top: 8px;
  }

  /* Love pass deck lives in PassDeck.svelte */

  /* Mini Love Wordle */
  .love-tiles-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 10px 0;
  }

  .love-tile {
    width: 48px;
    height: 48px;
    background: #090e18;
    border: 2px solid var(--dim);
    color: var(--fg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
  }

  .love-tile.filled {
    border-color: #f48cb8;
    color: #ffc4da;
    transform: scale(1.04);
  }

  .love-tile.correct {
    background: #8bbf73;
    border-color: #8bbf73;
    color: #080c18;
    animation: bounce 0.4s ease;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .love-solved-box {
    background: #172418;
    border: 2px solid #8bbf73;
    padding: 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    color: #ece6cc;
  }

  .solved-star {
    font-size: 18px;
  }

  .love-solved-box p {
    margin: 0;
    font-size: 14px;
    color: #a8cc5c;
  }

  .love-keys-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .love-keys-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  .key-btn {
    background: #0f1524;
    border: 1px solid var(--dim);
    color: var(--fg);
    width: 34px;
    height: 38px;
    font-size: 15px;
    font-weight: 700;
    cursor: var(--cursor-pointer);
    font-family: inherit;
  }

  .key-btn:hover {
    background: #f48cb8;
    color: #080c18;
    border-color: #f48cb8;
  }

  .love-action-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 4px;
  }

  .submit-btn {
    background: #8bbf73;
    color: #080c18;
    font-size: 13px;
    font-weight: 700;
  }

  .submit-btn:hover {
    background: #a8cc5c;
  }

  .back-btn, .hint-btn {
    background: #0f1524;
    border: 1px solid var(--dim);
    color: var(--muted);
    font-size: 13px;
  }

  .back-btn:hover, .hint-btn:hover {
    color: var(--fg);
    border-color: var(--fg);
  }

  .hint-text {
    background: #181326;
    border-left: 3px solid #f48cb8;
    padding: 8px 12px;
    font-size: 13px;
    color: #ffc4da;
    text-align: center;
  }

  .error-text {
    font-size: 12px;
    color: var(--error);
    text-align: center;
  }

  /* Intel Cards */
  .intel-card {
    background: #0e1320;
    border: 1px solid rgba(104, 113, 132, 0.4);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .intel-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 700;
  }

  .intel-lbl {
    color: var(--fg);
  }

  .intel-date {
    color: var(--dim);
  }

  .reveal-box {
    display: flex;
    align-items: center;
  }

  .revealed-word {
    background: #8bbf73;
    color: #080c18;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 4px;
    padding: 4px 12px;
  }

  .mini-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .custom-builder {
    margin-top: 8px;
    border-top: 1px dashed rgba(104, 113, 132, 0.3);
    padding-top: 14px;
  }

  .sub-title {
    margin: 0;
    font-size: 16px;
  }

  .sub-desc {
    margin: 2px 0 10px;
    font-size: 13px;
    color: var(--muted);
  }

  .builder-row {
    display: flex;
    gap: 8px;
  }

  .custom-input {
    flex: 1;
    background: #0e1320;
    border: 2px solid var(--dim);
    color: var(--fg);
    padding: 8px 12px;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    outline: none;
  }

  .custom-input:focus {
    border-color: #f48cb8;
  }

  .generate-btn {
    font-size: 14px;
    padding: 8px 14px;
    background: var(--fg);
    color: var(--bg);
  }

  .generate-btn:hover {
    background: #f48cb8;
    color: #080c18;
  }

  /* Jukebox */
  .sound-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .sound-btn {
    background: #0e1320;
    border: 1px solid var(--dim);
    color: var(--fg);
    font-size: 13px;
    font-weight: 700;
    padding: 10px 4px;
    cursor: var(--cursor-pointer);
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .sound-btn:hover {
    background: var(--field-focus);
    border-color: #f48cb8;
    color: #ffe8f3;
  }

  .sound-btn.romantic-tune {
    background: #251329;
    border-color: #d65a8f;
    color: #ff94c2;
  }

  .sound-btn.romantic-tune:hover {
    background: #d65a8f;
    color: #ffffff;
  }

  .sound-btn.frog-duet {
    background: #172418;
    border-color: #8bbf73;
    color: #a8cc5c;
  }

  .sound-btn.frog-duet:hover {
    background: #8bbf73;
    color: #080c18;
  }

  @media (max-width: 768px) {
    .vault-grid {
      grid-template-columns: 1fr;
    }
    .vault-heading {
      font-size: 24px;
    }
    .sound-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
