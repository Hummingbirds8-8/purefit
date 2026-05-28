/* ==========================================
   PURESUMMIT - REVERSE DIET MOUNTAIN ENGINE
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 1. APPLICATION STATE
  // ==========================================
  
  let state = {
    profile: {
      age: 28,
      gender: 'female',
      height: 158,
      initialWeight: 55.0,
      currentWeight: 55.0,
      targetWeight: 50.0,
      activeLevel: 1.2,
      deficitPace: 500,
      setupComplete: true
    },
    currentTheme: 'slate',
    unlockedThemes: ['slate'],
    coins: 0,
    streak: 0,
    lastActiveDate: null,
    weightHistory: [
      { date: '2026-05-25', weight: 55.6, fat: 26.2 },
      { date: '2026-05-26', weight: 55.3, fat: 26.0 },
      { date: '2026-05-27', weight: 55.0, fat: 25.8 }
    ],
    dailyLogs: {},
    lastSyncedDeskSummitCalories: 0
  };

  // State variables for step counting sensor
  let stepCountingActive = false;
  let lastAcceleration = { x: 0, y: 0, z: 0 };
  let stepCountAcc = 0;
  let threshold = 1.6; // Step detection sensitivity
  let lastStepTime = 0;

  // Active logging meal slot
  let activeMealSlot = 'breakfast';

  // ==========================================
  // Dynamic AI Calorie Estimation Engine
  // ==========================================
  const CALORIE_DB = {
    'ご飯': 240, '白米': 240, 'ライス': 240, 'おにぎり': 180, 'おむすび': 180, 'カレーライス': 700, 
    'カツカレー': 1050, 'チャーハン': 650, '炒飯': 650, 'オムライス': 700, 'かつ丼': 850, 'カツ丼': 850,
    '親子丼': 650, '牛丼': 700, '天丼': 750, '中華丼': 600, '麻婆豆腐': 400, 'すし': 500, '寿司': 500, 
    'お寿司': 500, 'そば': 300, '蕎麦': 300, '天ぷらそば': 500, 'うどん': 320, 'きつねうどん': 400, 
    '天ぷらうどん': 520, 'ラーメン': 600, 'らーめん': 600, '醤油ラーメン': 550, '味噌ラーメン': 650, 
    '豚骨ラーメン': 750, 'とんこつラーメン': 750, 'パスタ': 600, 'スパゲティ': 600, 'カルボナーラ': 750, 
    'ナポリタン': 600, 'ミートソース': 600, 'ピザ': 500, '食パン': 160, 'パン': 200, 'トースト': 200, 
    'サンドイッチ': 300, 'クロワッサン': 200, 'ハンバーガー': 350, 'フライドポテト': 250,
    'ハンバーグ': 400, '唐揚げ': 280, 'からあげ': 280, 'とんかつ': 550, 'トンカツ': 550, 'ステーキ': 450,
    '焼肉': 500, '焼き鳥': 180, '餃子': 240, 'ギョーザ': 240, '春巻き': 200, '焼き魚': 180, '刺身': 140, 
    'お刺身': 140, '天ぷら': 350, '野菜炒め': 150, '生姜焼き': 380, 'コロッケ': 200, '納豆': 100, 
    '豆腐': 80, '冷奴': 60, 'ゆで卵': 80, '目玉焼き': 100, '卵焼き': 120, 'ソーセージ': 120, 'ハム': 60,
    'サラダ': 40, 'シーザーサラダ': 150, 'ポテトサラダ': 180, 'キャベツ': 15, 'レタス': 10, 'ブロッコリー': 30,
    '味噌汁': 35, 'みそ汁': 35, '豚汁': 120, 'コーンスープ': 110, 'コンソメスープ': 30, 'スープ': 60,
    'ケーキ': 350, 'チョコレート': 220, 'チョコ': 220, 'クッキー': 120, 'アイス': 180, 'アイスクリーム': 200,
    'シュークリーム': 220, 'プリン': 120, 'ドーナツ': 250, '和菓子': 150,
    'ビール': 150, '缶ビール': 150, 'コーラ': 140, 'ジュース': 120, '牛乳': 130, 'コーヒー': 8,
    'カフェラテ': 110, 'ウーロン茶': 0, 'お茶': 0, '緑茶': 0, '水': 0, 'プロテイン': 120
  };

  function estimateCaloriesAI(foodText) {
    if (!foodText.trim()) return { total: 0, items: [] };

    // Split text by standard Japanese separators (と、や、・、カンマ、スペース)
    const separators = /[とや・,\s+、]+/g;
    const rawTokens = foodText.split(separators);
    const tokens = rawTokens.map(t => t.trim()).filter(t => t.length > 0);

    let total = 0;
    const items = [];

    tokens.forEach(token => {
      let cleaned = token;
      let matchedCal = 0;
      let isEstimated = false;

      // 1. Direct match
      if (CALORIE_DB[cleaned] !== undefined) {
        matchedCal = CALORIE_DB[cleaned];
      } else {
        // Strip leading "お" or "ご" if exists and try again
        if ((cleaned.startsWith('お') || cleaned.startsWith('ご')) && cleaned.length > 1) {
          const stripped = cleaned.substring(1);
          if (CALORIE_DB[stripped] !== undefined) {
            matchedCal = CALORIE_DB[stripped];
            cleaned = stripped;
          }
        }
      }

      // 2. Fuzzy Keyword heuristic match if not found directly
      if (matchedCal === 0) {
        isEstimated = true;
        
        if (cleaned.includes('唐揚') || cleaned.includes('からあげ') || cleaned.includes('天ぷら') || cleaned.includes('カツ') || cleaned.includes('フライ') || cleaned.includes('揚げ') || cleaned.includes('かつ')) {
          matchedCal = 450;
        } else if (cleaned.includes('ラーメン') || cleaned.includes('らーめん') || cleaned.includes('パスタ') || cleaned.includes('スパゲティ') || cleaned.includes('そば') || cleaned.includes('うどん') || cleaned.includes('麺')) {
          matchedCal = 480;
        } else if (cleaned.includes('丼') || cleaned.includes('カレー') || cleaned.includes('ピラフ') || cleaned.includes('炒飯') || cleaned.includes('チャーハン') || cleaned.includes('オムライス') || cleaned.includes('重')) {
          matchedCal = 650;
        } else if (cleaned.includes('サラダ') || cleaned.includes('野菜') || cleaned.includes('キャベツ') || cleaned.includes('レタス') || cleaned.includes('ナムル') || cleaned.includes('お浸し') || cleaned.includes('おひたし')) {
          matchedCal = 45;
        } else if (cleaned.includes('ステーキ') || cleaned.includes('肉') || cleaned.includes('牛') || cleaned.includes('豚') || cleaned.includes('チキン') || cleaned.includes('ソテー') || cleaned.includes('焼き鳥') || cleaned.includes('焼肉')) {
          matchedCal = 380;
        } else if (cleaned.includes('ケーキ') || cleaned.includes('チョコ') || cleaned.includes('クッキー') || cleaned.includes('アイス') || cleaned.includes('パフェ') || cleaned.includes('スイーツ') || cleaned.includes('クレープ') || cleaned.includes('パンケーキ')) {
          matchedCal = 280;
        } else if (cleaned.includes('汁') || cleaned.includes('スープ') || cleaned.includes('ポタージュ') || cleaned.includes('シチュー')) {
          matchedCal = 40;
        } else if (cleaned.includes('魚') || cleaned.includes('刺身') || cleaned.includes('鮭') || cleaned.includes('鯖') || cleaned.includes('さんま') || cleaned.includes('寿司') || cleaned.includes('すし')) {
          matchedCal = 180;
        } else if (cleaned.includes('コーヒー') || cleaned.includes('お茶') || cleaned.includes('ウーロン') || cleaned.includes('紅茶')) {
          matchedCal = 10;
        } else {
          matchedCal = 220; // Default average fallback
        }
      }

      total += matchedCal;
      items.push({
        name: token,
        calories: matchedCal,
        isEstimated: isEstimated
      });
    });

    return { total, items };
  }

  // Available themes catalog
  const THEMES = {
    slate: { name: 'サニースレート', cost: 0 },
    cyber: { name: 'サイバーネオン', cost: 100 },
    forest: { name: 'フォレストグリーン', cost: 150 },
    sakura: { name: 'サクラドロップ', cost: 200 },
    gold: { name: 'ゴールドサミット', cost: 500 }
  };

  // Antigravity's Encouragement Message Database
  const ANTIMESSAGES = {
    welcome: [
      "PureSummitへようこそ！今日はあなたの『カロリー山』を何キロカロリー削れるか楽しみです。一歩ずつ、無理なく登りましょう！",
      "記録をつけようとアプリを開いた、その行動だけで今日は大勝利です。まずはその姿勢を誇りに思いましょう！",
      "あすけんのように怒るアドバイザーはここにはいません。私と一緒に、ゲーム感覚で楽しんで脂肪山を崩していきましょう！"
    ],
    encouragement: [
      "素晴らしい！一歩一歩、確実に山頂（目標体重）へのルートを切り開いています。マイペースが一番の近道です！",
      "一時的な体重の変動は、ほとんどが水分や塩分によるものです。日々のグラフの上下に一喜一憂せず、山全体の進捗を眺めましょう。",
      "カロリーを記録できていること自体がすごい習慣です。これこそが未来のあなたを作る確かな実績ですよ！",
      "もし食べすぎても、それはエネルギーをチャージした証拠！山が少し高くなっただけで、あなたの努力の結晶は何も失われていません。明日からまた削っていきましょう！",
      "完璧を目指さなくて大丈夫。7割の力で細く長く続けることこそが、登山の極意です。"
    ],
    activeDeskfit: [
      "DeskFitでのアタックを検知しました！座った状態での地道なエクササイズ、本当に素晴らしい努力です。山削りパワーに加算しました！",
      "デスクワーク中にDeskFitでカロリーを消費するストイックさ、本当に尊敬します！山のHPが大きく減りましたよ！"
    ],
    highDeficit: [
      "今日の削り幅は凄まじいですね！まるでダイナマイトでカロリー山を爆破したような快進撃です！お疲れ様でした！",
      "素晴らしい採掘量です！今日は体がよく動きましたね。夜は暖かくしてぐっすり眠り、体を休めてくださいね。"
    ],
    surplus: [
      "美味しいエネルギーをしっかり補給できましたね！たまの栄養補給は山を安全に登り切るための必須ステップです。明日は新しい一日、また一緒に削りましょう！",
      "ログの記録ありがとうございます！食べすぎを正直に記録したあなたは最高に誠実でかっこいいです。罪悪感は置いていきましょう！"
    ]
  };

  // ==========================================
  // 2. CORE MATHEMATICS (BMR / TDEE / MOUNTAIN)
  // ==========================================

  function calculateBMR() {
    const { age, gender, height, currentWeight } = state.profile;
    if (gender === 'male') {
      // Mifflin-St Jeor for Male
      return Math.round(10 * currentWeight + 6.25 * height - 5 * age + 5);
    } else {
      // Mifflin-St Jeor for Female
      return Math.round(10 * currentWeight + 6.25 * height - 5 * age - 161);
    }
  }

  function calculateTDEE() {
    const bmr = calculateBMR();
    return Math.round(bmr * parseFloat(state.profile.activeLevel));
  }

  function getDailyTargetIntake() {
    const tdee = calculateTDEE();
    const pace = parseInt(state.profile.deficitPace);
    const target = tdee - pace;
    // Safety clamp: do not suggest under 1000 kcal for general safety
    return Math.max(1000, target);
  }

  function getTodayDateStr() {
    const today = new Date();
    // Offset for local timezone format YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function initTodayLog() {
    const dateStr = getTodayDateStr();
    if (!state.dailyLogs[dateStr]) {
      state.dailyLogs[dateStr] = {
        steps: 8000,
        meals: [],
        deskfitCalories: 0
      };
    }
    return state.dailyLogs[dateStr];
  }

  function calculateStepCalories(steps) {
    // Standard METs approximation for moderate walking
    // kcal = steps * weight * 0.0005 * 1.05
    return Math.round(steps * state.profile.currentWeight * 0.0005 * 1.05);
  }

  // Calculate total target deficit mountain
  function getMountainTotalGoal() {
    const { initialWeight, targetWeight } = state.profile;
    const diff = initialWeight - targetWeight;
    if (diff <= 0) return 7200; // Default minimum
    return Math.round(diff * 7200); // 1kg fat = 7200 kcal
  }

  // Cumulative calorie deficit from all past dailyLogs
  function getCumulativeDeficit() {
    let total = 0;
    const todayStr = getTodayDateStr();
    
    // Sum up past daily deficits
    for (const [date, log] of Object.entries(state.dailyLogs)) {
      if (date === todayStr) continue; // Calculate today separately for real-time responsiveness
      
      const intake = log.meals.reduce((sum, m) => sum + m.calories, 0);
      const stepCals = calculateStepCalories(log.steps);
      const deskfitCals = log.deskfitCalories || 0;
      
      // Deficit = TDEE + Exercise - Intake
      // We assume historical weight is state.profile.currentWeight for simplicity,
      // or we could map weightHistory to past BMRs. Let's use current TDEE as basis.
      const tdee = calculateTDEE();
      const dailyDeficit = (tdee + stepCals + deskfitCals) - intake;
      total += dailyDeficit;
    }
    return total;
  }

  function getTodayDeficit() {
    const log = initTodayLog();
    const tdee = calculateTDEE();
    const stepCals = calculateStepCalories(log.steps);
    const deskfitCals = log.deskfitCalories || 0;
    const intake = log.meals.reduce((sum, m) => sum + m.calories, 0);
    return (tdee + stepCals + deskfitCals) - intake;
  }

  function getRemainingMountainCalories() {
    const totalGoal = getMountainTotalGoal();
    const pastDeficit = getCumulativeDeficit();
    const todayDeficit = getTodayDeficit();
    const remaining = totalGoal - pastDeficit - todayDeficit;
    return Math.max(0, remaining);
  }

  // ==========================================
  // 3. UI RENDERING & DOM UPDATE ENGINE
  // ==========================================

  function updateUI() {
    const todayLog = initTodayLog();
    
    // 1. Update Header stats
    document.getElementById('streak-val').textContent = state.streak;
    document.getElementById('coins-val').textContent = state.coins;
    document.getElementById('shop-coins-val').textContent = state.coins;
    
    // 2. Update Mountain Card
    const totalGoal = getMountainTotalGoal();
    const remaining = getRemainingMountainCalories();
    const todayChipped = getTodayDeficit();
    
    document.getElementById('remaining-calories-val').textContent = Math.round(remaining).toLocaleString();
    document.getElementById('initial-calories-val').textContent = Math.round(totalGoal).toLocaleString();
    document.getElementById('today-chipped-val').textContent = Math.round(todayChipped).toLocaleString();
    
    // Animate Hiker on SVG Mountain Path
    animateHiker(totalGoal, remaining);

    // 3. Update Step Slider & Display
    document.getElementById('step-display').textContent = todayLog.steps.toLocaleString();
    document.getElementById('step-slider').value = todayLog.steps;
    document.getElementById('step-cal-val').textContent = calculateStepCalories(todayLog.steps);
    
    // Update active preset button in step section
    document.querySelectorAll('.qs-presets .btn-chip').forEach(btn => {
      const steps = parseInt(btn.getAttribute('data-steps'));
      if (steps === todayLog.steps) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 4. Update Meal intake checkboxes
    updateMealCheckItems(todayLog);
    
    // 5. Update Profile settings box numbers
    document.getElementById('res-bmr').textContent = calculateBMR().toLocaleString();
    document.getElementById('res-tdee').textContent = calculateTDEE().toLocaleString();
    document.getElementById('res-target-limit').textContent = getDailyTargetIntake().toLocaleString();
    
    // 6. Update Diary/History Logs
    updateDiaryLogList(todayLog);
    
    // 7. Update Theme Shop Cards status
    updateThemeShopUI();

    // 8. Re-evaluate Lucide Icons for dynamic content
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Visual SVG animation for climber pin
  function animateHiker(totalGoal, remaining) {
    const percentConquered = Math.min(100, Math.max(0, ((totalGoal - remaining) / totalGoal) * 100));
    
    // Mountain cap path coordinates in index.html SVG: Start: M 50 200 -> Peak: L 200 40 -> End: L 350 200
    // Total path length is: left leg (150 width, 160 height) -> hypotenuse = sqrt(150^2 + 160^2) = 219.3px.
    // If percent is 0 to 100%, let's linearly map the climber along this left leg!
    // Start at (50, 200). Peak is (200, 40).
    const startX = 50;
    const startY = 200;
    const peakX = 200;
    const peakY = 40;
    
    // Move skier/climber up the left slope
    const ratio = percentConquered / 100;
    const climberX = startX + (peakX - startX) * ratio;
    const climberY = startY + (peakY - startY) * ratio;
    
    const climberGroup = document.getElementById('climber-group');
    if (climberGroup) {
      climberGroup.setAttribute('transform', `translate(${climberX}, ${climberY})`);
    }
  }

  function updateMealCheckItems(todayLog) {
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    mealTypes.forEach(type => {
      const itemEl = document.querySelector(`.meal-check-grid [data-meal="${type}"]`);
      const stateEl = document.getElementById(`state-${type}`);
      
      const loggedMeals = todayLog.meals.filter(m => m.type === type);
      if (itemEl && stateEl) {
        if (loggedMeals.length > 0) {
          itemEl.classList.add('logged');
          const sumCal = loggedMeals.reduce((sum, m) => sum + m.calories, 0);
          stateEl.textContent = `${sumCal} kcal`;
        } else {
          itemEl.classList.remove('logged');
          stateEl.textContent = '未入力';
        }
      }
    });
  }

  function updateDiaryLogList(todayLog) {
    const ul = document.getElementById('log-list-ul');
    const emptyMsg = document.getElementById('logs-empty-msg');
    
    ul.innerHTML = '';
    const totalIntake = todayLog.meals.reduce((sum, m) => sum + m.calories, 0);
    document.getElementById('total-intake-val').textContent = totalIntake.toLocaleString();
    
    const items = [];
    
    // 1. Add meals
    todayLog.meals.forEach((meal, idx) => {
      items.push({
        id: `meal-${idx}`,
        type: 'meal',
        name: `${getMealNameJP(meal.type)}: ${meal.name || '簡易入力'}`,
        calories: meal.calories,
        time: meal.time,
        action: () => deleteMealLog(idx)
      });
    });

    // 2. Add Steps if not zero
    if (todayLog.steps > 0) {
      const stepCals = calculateStepCalories(todayLog.steps);
      items.push({
        id: 'steps-item',
        type: 'exercise',
        name: `ウォーキング: ${todayLog.steps.toLocaleString()} 歩`,
        calories: stepCals,
        time: '--:--',
        action: null // steps managed by slider
      });
    }

    // 3. Add DeskFit calories if not zero
    if (todayLog.deskfitCalories > 0) {
      items.push({
        id: 'deskfit-item',
        type: 'exercise',
        name: 'DeskFit 座位コアトレーニング',
        calories: todayLog.deskfitCalories,
        time: '--:--',
        action: null // managed by DeskFit sync
      });
    }

    if (items.length === 0) {
      emptyMsg.style.display = 'flex';
      return;
    }
    
    emptyMsg.style.display = 'none';
    
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'log-item';
      
      const isMeal = item.type === 'meal';
      const iconName = isMeal ? 'coffee' : 'zap';
      const calSign = isMeal ? '+' : '-';
      const calClass = isMeal ? 'meal' : 'exercise';
      
      li.innerHTML = `
        <div class="log-item-details">
          <div class="log-item-icon ${isMeal ? 'meal' : 'exercise'}">
            <i data-lucide="${iconName}"></i>
          </div>
          <div class="log-item-info">
            <span class="log-item-name">${item.name}</span>
            <span class="log-item-time">${item.time}</span>
          </div>
        </div>
        <div class="log-item-calc">
          <span class="log-item-cal ${calClass}">${calSign}${item.calories} kcal</span>
          ${item.action ? `<button class="btn-icon-sm delete-btn" data-id="${item.id}"><i data-lucide="trash-2"></i></button>` : ''}
        </div>
      `;
      
      ul.appendChild(li);
      
      if (item.action) {
        li.querySelector('.delete-btn').addEventListener('click', item.action);
      }
    });
  }

  function getMealNameJP(type) {
    const names = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
    return names[type] || '食事';
  }

  function deleteMealLog(idx) {
    const todayLog = initTodayLog();
    todayLog.meals.splice(idx, 1);
    saveData();
    updateUI();
  }

  // ==========================================
  // 4. THEME SHOP LOGIC
  // ==========================================

  function updateThemeShopUI() {
    document.querySelectorAll('.theme-grid .theme-card').forEach(card => {
      const themeId = card.getAttribute('data-theme-id');
      const btn = card.querySelector('.btn-theme');
      const config = THEMES[themeId];
      
      card.classList.remove('active');
      
      if (state.currentTheme === themeId) {
        card.classList.add('active');
        btn.className = 'btn btn-primary btn-sm btn-theme';
        btn.textContent = '適用中';
        btn.disabled = true;
      } else if (state.unlockedThemes.includes(themeId)) {
        btn.className = 'btn btn-secondary btn-sm btn-theme';
        btn.textContent = '適用する';
        btn.disabled = false;
      } else {
        btn.className = 'btn btn-secondary btn-sm btn-theme';
        btn.innerHTML = `<i data-lucide="lock" style="width:14px;height:14px;"></i> ${config.cost} コイン`;
        btn.disabled = false;
      }
    });
  }

  function handleThemeInteraction(themeId) {
    const config = THEMES[themeId];
    if (!config) return;
    
    if (state.unlockedThemes.includes(themeId)) {
      // Apply theme
      state.currentTheme = themeId;
      applyThemeStyle(themeId);
      saveData();
      updateUI();
      triggerEncouragement("theme-change");
    } else {
      // Purchase theme
      if (state.coins >= config.cost) {
        state.coins -= config.cost;
        state.unlockedThemes.push(themeId);
        state.currentTheme = themeId;
        applyThemeStyle(themeId);
        saveData();
        updateUI();
        triggerPickaxeHitEffect();
        alert(`おめでとうございます！プレミアムテーマ「${config.name}」を解放し適用しました！`);
      } else {
        alert("コインが足りません！山を削るか、毎日の記録クエストをクリアしてコインを貯めましょう。");
      }
    }
  }

  function applyThemeStyle(themeId) {
    document.body.className = '';
    document.body.classList.add(`theme-${themeId}`);
  }

  // ==========================================
  // 5. ACCELEROMETER MOBILE STEP COUNTER SENSOR
  // ==========================================

  function startLiveStepCounter() {
    if (typeof DeviceMotionEvent === 'undefined') {
      alert('このデバイスは加速度センサーに対応していません。手動スライダーをご利用ください。');
      return;
    }
    
    // Request iOS sensor permissions if needed
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            toggleStepCounterListener();
          } else {
            alert('センサーのアクセス権限が拒否されました。設定アプリから許可してください。');
          }
        })
        .catch(console.error);
    } else {
      // Android / generic
      toggleStepCounterListener();
    }
  }

  function toggleStepCounterListener() {
    const liveBtn = document.getElementById('live-step-btn');
    
    if (stepCountingActive) {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      stepCountingActive = false;
      if (liveBtn) {
        liveBtn.textContent = 'ライブ計測スタート';
        liveBtn.classList.remove('btn-primary');
      }
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion);
      stepCountingActive = true;
      stepCountAcc = 0;
      if (liveBtn) {
        liveBtn.textContent = '計測中...（タップで停止）';
        liveBtn.classList.add('btn-primary');
      }
      alert('スマホをポケットに入れるか持って歩いてください。歩数をリアルタイムで加算します！');
    }
  }

  function handleDeviceMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;
    
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    
    // High-pass filter vector magnitude calculation
    const magnitude = Math.sqrt(x*x + y*y + z*z);
    
    const delta = Math.abs(magnitude - 9.8); // 9.8 is base gravity
    
    const now = Date.now();
    if (delta > threshold && (now - lastStepTime) > 350) { // step debounce 350ms
      const todayLog = initTodayLog();
      todayLog.steps += 1;
      lastStepTime = now;
      
      // Reward 1 Adventure Coin per 50 steps
      if (todayLog.steps % 50 === 0) {
        state.coins += 1;
      }
      
      // Update UI in chunks for optimization
      if (todayLog.steps % 5 === 0) {
        saveData();
        updateUI();
        triggerPickaxeHitEffect();
      }
    }
  }

  // Visual dynamic pickaxe visual sparkles
  function triggerPickaxeHitEffect() {
    const spark = document.getElementById('pickaxe-spark');
    if (spark) {
      spark.classList.add('active');
      setTimeout(() => {
        spark.classList.remove('active');
      }, 800);
    }
  }

  // ==========================================
  // 6. DESKFIT SYNC ENGINE
  // ==========================================

  function syncWithDeskFit() {
    const savedData = localStorage.getItem('DeskSummit_SaveData');
    const syncCard = document.getElementById('deskfit-sync-card');
    const dfDesc = document.getElementById('deskfit-desc');
    
    if (!savedData) {
      if (dfDesc) {
        dfDesc.textContent = '同じ端末のDeskFitウィジェットが見つかりません。';
      }
      return;
    }
    
    try {
      const data = JSON.parse(savedData);
      const deskfitCalories = Math.round(data.totalCalories || 0);
      
      if (deskfitCalories > 0) {
        const todayLog = initTodayLog();
        
        // Calculate incremental calorie burn since last sync
        if (state.lastSyncedDeskSummitCalories < deskfitCalories) {
          const addedBurn = deskfitCalories - state.lastSyncedDeskSummitCalories;
          todayLog.deskfitCalories += addedBurn;
          state.lastSyncedDeskSummitCalories = deskfitCalories;
          
          // Reward 1 Adventure Coin per 10 exercise calories
          const bonusCoins = Math.max(1, Math.round(addedBurn / 10));
          state.coins += bonusCoins;
          
          saveData();
          updateUI();
          triggerPickaxeHitEffect();
          triggerEncouragement("deskfit-sync-success");
          
          alert(`DeskFitのデータを同期しました！\n今日の消費に +${addedBurn} kcal が合算され、コインを ${bonusCoins} 枚獲得しました！`);
        } else {
          // Already synchronized
          if (dfDesc) {
            dfDesc.textContent = `同期済み: 総 ${deskfitCalories} kcal (今日加算: ${todayLog.deskfitCalories} kcal)`;
          }
        }
      } else {
        if (dfDesc) {
          dfDesc.textContent = 'DeskFitに運動記録がまだありません。';
        }
      }
    } catch (e) {
      console.error('DeskFit data parse error: ', e);
      if (dfDesc) {
        dfDesc.textContent = '連動データの読み込みに失敗しました。';
      }
    }
  }

  // ==========================================
  // 7. ANTIGRAVITY COMPANION ENCOURAGEMENT ENGINE
  // ==========================================

  function triggerEncouragement(context = "general") {
    const encourText = document.getElementById('encouragement-text');
    if (!encourText) return;
    
    let pool = ANTIMESSAGES.encouragement;
    
    if (context === "welcome") {
      pool = ANTIMESSAGES.welcome;
    } else if (context === "deskfit-sync-success") {
      pool = ANTIMESSAGES.activeDeskfit;
    } else if (context === "theme-change") {
      pool = [
        "おおっ、新しい着せ替えテーマ、最高にお似合いです！新鮮な気分で今日もカロリー山アタックを続けましょう！",
        "美しいデザインはモチベーションを極限まで高めてくれますね。素晴らしい選択です！"
      ];
    } else if (context === "wf-save") {
      const lastWeight = state.weightHistory[state.weightHistory.length - 1];
      const diff = lastWeight ? (state.profile.currentWeight - state.profile.targetWeight) : 0;
      if (diff <= 0) {
        pool = ["目標体重を完全に突破しました！おめでとうございます！あなたは真のカロリー山登頂者です！"];
      } else {
        pool = [
          `体重の記録ありがとうございます！目標まであと ${diff.toFixed(1)}kg です。山頂の輪郭が見えていますよ！`,
          "今日体重を量って記録した、その自律的で素晴らしいマインドに大きな拍手を！"
        ];
      }
    } else {
      // Analyze current daily balance to generate context
      const todayChipped = getTodayDeficit();
      if (todayChipped > 600) {
        pool = ANTIMESSAGES.highDeficit;
      } else if (todayChipped < -100) {
        pool = ANTIMESSAGES.surplus;
      }
    }
    
    const randomIndex = Math.floor(Math.random() * pool.length);
    encourText.textContent = pool[randomIndex];
  }

  // ==========================================
  // 8. DATA PERSISTENCE & STREAK CALCULATIONS
  // ==========================================

  function loadData() {
    try {
      const saved = localStorage.getItem('PureSummit_SaveData');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        state.profile = parsed.profile || state.profile;
        state.currentTheme = parsed.currentTheme || state.currentTheme;
        state.unlockedThemes = parsed.unlockedThemes || state.unlockedThemes;
        state.coins = parsed.coins || 0;
        state.streak = parsed.streak || 0;
        state.lastActiveDate = parsed.lastActiveDate || null;
        state.weightHistory = parsed.weightHistory || state.weightHistory;
        state.dailyLogs = parsed.dailyLogs || state.dailyLogs;
        state.lastSyncedDeskSummitCalories = parsed.lastSyncedDeskSummitCalories || 0;
      }
      
      applyThemeStyle(state.currentTheme);
      verifyStreak();
      updateUI();
      renderTrendChart();
      
      // Welcome message on load
      triggerEncouragement("welcome");
      
      // Auto DeskFit check on load
      setTimeout(syncWithDeskFit, 800);
      
    } catch (e) {
      console.error("Save load failed:", e);
    }
  }

  function saveData() {
    try {
      localStorage.setItem('PureSummit_SaveData', JSON.stringify(state));
    } catch (e) {
      console.error("Save save failed:", e);
    }
  }

  function verifyStreak() {
    const todayStr = getTodayDateStr();
    if (state.lastActiveDate) {
      const lastActive = new Date(state.lastActiveDate);
      const diffTime = Math.abs(new Date(todayStr) - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        state.streak = 0;
      }
    } else {
      state.streak = 0;
    }
  }

  function updateStreakAndCoinsForToday() {
    const todayStr = getTodayDateStr();
    if (state.lastActiveDate !== todayStr) {
      if (state.lastActiveDate) {
        const lastActive = new Date(state.lastActiveDate);
        const diffTime = Math.abs(new Date(todayStr) - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          state.streak += 1;
        } else {
          state.streak = 1;
        }
      } else {
        state.streak = 1;
      }
      // Reward streak completion with coins
      state.coins += 10;
      state.lastActiveDate = todayStr;
      saveData();
    }
  }

  // ==========================================
  // 9. CHART.JS GRAPH IMPLEMENTATION
  // ==========================================

  let myChart = null;

  function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    
    // Sort weight history chronologically
    const history = [...state.weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Fetch last 7 days by default or period selection
    const periodBtn = document.querySelector('.chart-period .active');
    const period = periodBtn ? periodBtn.getAttribute('data-period') : '7';
    
    let filteredHistory = history;
    if (period !== 'all') {
      const days = parseInt(period);
      filteredHistory = history.slice(-days);
    }
    
    const labels = filteredHistory.map(h => {
      const d = new Date(h.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
    const weights = filteredHistory.map(h => h.weight);
    const targetWeights = filteredHistory.map(() => state.profile.targetWeight);
    
    if (myChart) {
      myChart.destroy();
    }
    
    // Fetch active accent color for styling from CSS variables dynamically
    const computedAccent = getComputedStyle(document.body).getPropertyValue('--accent-color').trim() || '#10b981';
    
    myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '体重 (kg)',
            data: weights,
            borderColor: computedAccent,
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: computedAccent,
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true
          },
          {
            label: '目標体重',
            data: targetWeights,
            borderColor: '#f59e0b',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: 'Outfit',
                size: 10
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: 'Outfit',
                size: 10
              }
            }
          }
        }
      }
    });
  }

  // ==========================================
  // 10. SPA TAB SWITCH NAVIGATION
  // ==========================================

  function setupTabNavigation() {
    document.querySelectorAll('.app-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        
        // Toggle Nav Items
        document.querySelectorAll('.app-nav .nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Toggle Views
        document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(target);
        if (targetView) {
          targetView.classList.add('active');
        }
        
        // Refresh graph if entering graph tab
        if (target === 'diary-tab') {
          setTimeout(renderTrendChart, 50);
        }
      });
    });
  }

  // ==========================================
  // 11. BINDING USER ACTIONS & EVENT LISTENERS
  // ==========================================

  function bindEvents() {
    
    // -- Step count slider --
    const slider = document.getElementById('step-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        const todayLog = initTodayLog();
        todayLog.steps = parseInt(e.target.value);
        saveData();
        updateUI();
      });
    }

    // -- Step preset chips --
    document.querySelectorAll('.qs-presets .btn-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const steps = parseInt(btn.getAttribute('data-steps'));
        const todayLog = initTodayLog();
        todayLog.steps = steps;
        updateStreakAndCoinsForToday();
        saveData();
        updateUI();
        triggerPickaxeHitEffect();
        triggerEncouragement();
      });
    });

    // -- Accelerometer Step Count Button --
    const liveBtn = document.createElement('button');
    liveBtn.id = 'live-step-btn';
    liveBtn.className = 'btn btn-secondary w-full mt-2';
    liveBtn.innerHTML = '<i data-lucide="compass"></i> スマホ用リアルタイム万歩計スタート';
    document.querySelector('.quick-step-card').appendChild(liveBtn);
    liveBtn.addEventListener('click', startLiveStepCounter);

    // -- Meal check grid slot togglers --
    document.querySelectorAll('.meal-check-grid .meal-check-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.meal-check-grid .meal-check-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const mealSlot = item.getAttribute('data-meal');
        activeMealSlot = mealSlot;
        
        // Show Quick Input Form
        const form = document.getElementById('quick-meal-form');
        const formTitle = document.getElementById('meal-form-title');
        form.classList.add('active');
        formTitle.textContent = `${getMealNameJP(mealSlot)} の簡易入力`;
        
        // Focus first field
        document.getElementById('meal-name-input').value = '';
        document.getElementById('meal-cal-input').value = '';
        
        // Hide AI breakdown box
        const aiBox = document.getElementById('ai-breakdown-box');
        if (aiBox) {
          aiBox.style.display = 'none';
          aiBox.innerHTML = '';
        }
      });
    });

    // -- Meal Calories Quick Preset Buttons --
    document.querySelectorAll('.qm-cal-presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        const cal = parseInt(btn.getAttribute('data-cal'));
        const calInput = document.getElementById('meal-cal-input');
        calInput.value = cal;
      });
    });

    // -- AI Calorie Estimator Trigger --
    const aiEstBtn = document.getElementById('ai-estimate-btn');
    if (aiEstBtn) {
      aiEstBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('meal-name-input');
        const calInput = document.getElementById('meal-cal-input');
        const aiBox = document.getElementById('ai-breakdown-box');
        
        const text = nameInput.value.trim();
        if (!text) {
          alert('食べたものを入力してください（例: カツ丼、みそ汁）。AIが自動でカロリーを推論します。');
          return;
        }
        
        // Show scanning state
        aiBox.style.display = 'block';
        aiBox.innerHTML = `<div class="ai-breakdown-title" style="color:var(--text-muted);"><i data-lucide="loader" class="pulse"></i> AIが料理と調理法を解析中...</div>`;
        if (window.lucide) window.lucide.createIcons();
        
        setTimeout(() => {
          const est = estimateCaloriesAI(text);
          calInput.value = est.total;
          
          if (est.items.length === 0) {
            aiBox.style.display = 'none';
            return;
          }
          
          // Build breakdown HTML
          let html = `
            <div class="ai-breakdown-title"><i data-lucide="sparkles"></i> AI判定結果 (推定カロリー)</div>
          `;
          
          est.items.forEach(item => {
            html += `
              <div class="ai-breakdown-item">
                <span>・${item.name} ${item.isEstimated ? '<span style="font-size:9px;color:var(--text-muted);">[AI推論]</span>' : ''}</span>
                <span class="font-outfit">${item.calories} kcal</span>
              </div>
            `;
          });
          
          html += `
            <div class="ai-breakdown-total">合計: <span class="color-emerald font-outfit" style="font-size:13px;">${est.total}</span> kcal</div>
          `;
          
          aiBox.innerHTML = html;
          if (window.lucide) window.lucide.createIcons();
          
          // Tiny hit spark
          triggerPickaxeHitEffect();
        }, 600); // 600ms loading effect for realistic AI vibe
      });
    }

    // -- Add Meal to diary --
    document.getElementById('add-meal-btn').addEventListener('click', () => {
      const nameInput = document.getElementById('meal-name-input');
      const calInput = document.getElementById('meal-cal-input');
      
      const foodText = nameInput.value.trim();
      if (!foodText) {
        alert('食べたものを入力してください。');
        return;
      }
      
      let calories = parseInt(calInput.value);
      
      // AI Calorie Auto-Estimation Heuristics if calories field is empty
      if (isNaN(calories) || calories <= 0) {
        const est = estimateCaloriesAI(foodText);
        calories = est.total;
        if (calories === 0) {
          alert('カロリーを入力するか、正しい料理名を入力してください。');
          return;
        }
      }
      
      const todayLog = initTodayLog();
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      todayLog.meals.push({
        type: activeMealSlot,
        name: foodText,
        calories: calories,
        time: timeStr
      });
      
      // Close Form and active check
      document.getElementById('quick-meal-form').classList.remove('active');
      document.querySelectorAll('.meal-check-grid .meal-check-item').forEach(i => i.classList.remove('active'));
      
      // Hide AI breakdown box
      const aiBox = document.getElementById('ai-breakdown-box');
      if (aiBox) {
        aiBox.style.display = 'none';
        aiBox.innerHTML = '';
      }
      
      updateStreakAndCoinsForToday();
      saveData();
      updateUI();
      triggerPickaxeHitEffect();
      triggerEncouragement();
    });

    // -- Weight and Fat manual saving --
    document.getElementById('save-wf-btn').addEventListener('click', () => {
      const weightIn = document.getElementById('weight-input');
      const fatIn = document.getElementById('fat-input');
      
      const weight = parseFloat(weightIn.value);
      const fat = parseFloat(fatIn.value) || 0;
      
      if (isNaN(weight) || weight <= 0) {
        alert('正しい体重を入力してください。');
        return;
      }
      
      const todayStr = getTodayDateStr();
      
      // Update historical record
      const index = state.weightHistory.findIndex(h => h.date === todayStr);
      const newEntry = { date: todayStr, weight: weight, fat: fat };
      if (index !== -1) {
        state.weightHistory[index] = newEntry;
      } else {
        state.weightHistory.push(newEntry);
      }
      
      // Update profile current weight
      state.profile.currentWeight = weight;
      
      weightIn.value = '';
      fatIn.value = '';
      
      updateStreakAndCoinsForToday();
      saveData();
      updateUI();
      renderTrendChart();
      triggerPickaxeHitEffect();
      triggerEncouragement("wf-save");
      alert('体重の記録を完了しました！山頂グラフを更新しました。');
    });

    // -- Trend chart period switcher --
    document.querySelectorAll('.chart-period button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-period button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTrendChart();
      });
    });

    // -- Sync Button for DeskFit --
    document.getElementById('deskfit-sync-btn').addEventListener('click', () => {
      syncWithDeskFit();
    });

    // -- AI Encouragement charge --
    document.getElementById('affirmation-btn').addEventListener('click', () => {
      triggerEncouragement();
      triggerPickaxeHitEffect();
    });

    // -- Theme Shop Purchase items trigger --
    document.querySelectorAll('.theme-grid .theme-card').forEach(card => {
      const themeId = card.getAttribute('data-theme-id');
      const btn = card.querySelector('.btn-theme');
      btn.addEventListener('click', () => {
        handleThemeInteraction(themeId);
      });
    });

    // -- Profile settings submission --
    document.getElementById('profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const age = parseInt(document.getElementById('prof-age').value);
      const gender = document.getElementById('prof-gender').value;
      const height = parseInt(document.getElementById('prof-height').value);
      const curWeight = parseFloat(document.getElementById('prof-weight').value);
      const targetWeight = parseFloat(document.getElementById('prof-target').value);
      const active = parseFloat(document.getElementById('prof-active').value);
      const pace = parseInt(document.getElementById('prof-pace').value);
      
      state.profile = {
        age,
        gender,
        height,
        initialWeight: state.profile.initialWeight || curWeight,
        currentWeight: curWeight,
        targetWeight,
        activeLevel: active,
        deficitPace: pace,
        setupComplete: true
      };
      
      saveData();
      updateUI();
      renderTrendChart();
      
      alert('プロフィール身体設定を更新し、新しい『カロリー登山目標』を設定しました！');
    });

    // -- Admin Data resetting option --
    document.getElementById('reset-app-btn').addEventListener('click', () => {
      if (confirm('警告: 全ての日誌データ、体重履歴、解放したテーマを削除し初期状態に戻します。よろしいですか？')) {
        localStorage.removeItem('PureSummit_SaveData');
        alert('データを完全に消去しました。アプリをリロードします。');
        window.location.reload();
      }
    });

  }

  // ==========================================
  // 12. BOOTSTRAP INITIALIZATION
  // ==========================================
  
  setupTabNavigation();
  bindEvents();
  loadData();
  
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('ServiceWorker registered successfully: ', reg.scope))
        .catch(err => console.log('ServiceWorker registration failed: ', err));
    });
  }

});
