let capture;
let handPose;
let hands = [];

let score = 0;
let timer = 30; // 倒數 30 秒
let currentQuestion;
let successTimer = 0; // 用於控制「SUCCESS」特效顯示的時間
let incorrectTimer = 0; // 用於控制「INCORRECT」特效顯示的時間
let gameState = "startMenu"; // 遊戲狀態：'startMenu', 'playing' 或 'gameOver'
let restartBtn; // 儲存重新開始按鈕
let startBtn; // 儲存開始遊戲按鈕
let gameStartTime; // 儲存遊戲正式開始的時間點
let isModelReady = false; // 追蹤模型是否載入完成

function setup() {
  createCanvas(windowWidth, windowHeight);
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  capture.hide(); // 隱藏原本在畫布下方的 DOM 影片元件

  // 產生第一道題目
  currentQuestion = generateQuestion();

  // 每一秒鐘更新一次倒數計時
  setInterval(updateTimer, 1000);

  // 初始化 ml5 handPose 模型
  handPose = ml5.handPose(capture, modelReady);

  // 建立開始遊戲按鈕
  startBtn = createButton('開始遊戲');
  startBtn.style('font-size', '20px');
  startBtn.style('padding', '10px 20px');
  startBtn.style('cursor', 'pointer');
  startBtn.style('border-radius', '10px');
  startBtn.position(width / 2 - 60, height / 2 + 20);
  startBtn.mousePressed(startGame);
  startBtn.hide(); // 初始隱藏，等模型準備好再顯示

  // 建立重新開始按鈕
  restartBtn = createButton('重新開始');
  restartBtn.style('font-size', '20px');
  restartBtn.style('padding', '10px 20px');
  restartBtn.style('cursor', 'pointer');
  restartBtn.position(width / 2 - 60, height / 2 + 160);
  restartBtn.mousePressed(restartGame);
  restartBtn.hide(); // 初始隱藏
}

function modelReady() {
  console.log("Handpose 模型已準備就緒！");
  isModelReady = true;
  startBtn.show(); // 模型準備就緒，顯示開始按鈕
  // 開始持續偵測手部
  handPose.detectStart(capture, gotHands);
}

function gotHands(results) {
  hands = results;
}

function updateTimer() {
  if (gameState === "playing") {
    if (timer > 0) {
      timer--;
    } else {
      // 時間到，遊戲結束
      gameState = "gameOver";
      handPose.detectStop(); // 停止攝影機辨識，節省資源
      restartBtn.show(); // 顯示重啟按鈕
    }
  }
}

function startGame() {
  gameState = "playing";
  startBtn.hide();
  gameStartTime = millis(); // 記錄遊戲正式開始的毫秒數
}

function restartGame() {
  // 重置遊戲數據
  score = 0;
  timer = 30;
  successTimer = 0;
  incorrectTimer = 0;
  gameState = "playing";
  currentQuestion = generateQuestion();
  gameStartTime = millis(); // 重啟時也重置計時
  
  restartBtn.hide(); // 隱藏按鈕
  handPose.detectStart(capture, gotHands); // 再次啟動辨識
}

function generateQuestion() {
  const ops = ['+', '-', '×', '÷'];
  let op = random(ops);
  let n1, n2, ans;

  if (op === '+') { n1 = int(random(1, 50)); n2 = int(random(1, 50)); ans = n1 + n2; }
  else if (op === '-') { n1 = int(random(20, 100)); n2 = int(random(1, 20)); ans = n1 - n2; }
  else if (op === '×') { n1 = int(random(2, 10)); n2 = int(random(2, 10)); ans = n1 * n2; }
  else { ans = int(random(2, 10)); n2 = int(random(2, 10)); n1 = ans * n2; }

  return { display: `${n1} [ ? ] ${n2} = ${ans}`, answer: op };
}

function draw() {
  if (gameState === "startMenu") {
    // 顯示攝影機鏡像背景
    push();
    translate(width, 0);
    scale(-1, 1);
    image(capture, 0, 0, width, height);
    pop();
    
    background(0, 150); // 半透明遮罩
    drawStartMenu();
  } else if (gameState === "playing") {
    drawGame();
  } else {
    drawGameOver();
  }
}

function drawStartMenu() {
  textAlign(CENTER, CENTER);
  fill(255);
  noStroke();
  textSize(48);
  text("手勢數學挑戰賽", width / 2, height / 2 - 100);
  
  if (!isModelReady) {
    textSize(24);
    fill(255, 200, 0);
    text("模型載入中，請稍候...", width / 2, height / 2);
  } else {
    textSize(20);
    text("比出正確手指數量來答題 (1-4)\n點擊按鈕開始挑戰！", width / 2, height / 2 - 30);
  }
}

function drawGame() {
  // --- 震動效果實作 ---
  if (incorrectTimer > 0) {
    translate(random(-8, 8), random(-8, 8));
  }

  // 將攝影機影像水平翻轉繪製（鏡像效果，操作起來比較直覺）
  push();
  translate(width, 0);
  scale(-1, 1);
  image(capture, 0, 0, width, height);
  pop();

  if (hands.length > 0) {
    // 取得第一隻偵測到的手
    let hand = hands[0];
    let indexFinger = hand.index_finger_tip;

    // --- 檢查答案邏輯 ---
    // 判定手指是否伸直 (在攝影機座標中，y 座標越小代表位置越高)
    let isIndexExtended = hand.index_finger_tip.y < hand.index_finger_pip.y;
    let isMiddleExtended = hand.middle_finger_tip.y < hand.middle_finger_pip.y;
    let isRingExtended = hand.ring_finger_tip.y < hand.ring_finger_pip.y;
    let isPinkyExtended = hand.pinky_finger_tip.y < hand.pinky_finger_pip.y;

    // 計算伸直的手指數（排除大拇指，因為大拇指判定邏輯較不同）
    let extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(state => state).length;

    // --- 核心判定：手勢與運算符號對應 ---
    // 設定對應表：1根代表+，2根代表-，3根代表×，4根代表÷
    let gestureMap = {
      1: '+',
      2: '-',
      3: '×',
      4: '÷'
    };

    // 檢查目前比出的手指數是否對應到正確答案
    // successTimer === 0 是為了防止在同一題連續觸發
    if (gestureMap[extendedCount] === currentQuestion.answer && successTimer === 0 && incorrectTimer === 0) {
      score += 10;
      timer = min(timer + 3, 30); // 答對獎勵：時間增加 3 秒，上限 30 秒
      successTimer = 90; // 停頓 1.5 秒 (假設 60fps)
    } else if (extendedCount > 0 && gestureMap[extendedCount] !== currentQuestion.answer && successTimer === 0 && incorrectTimer === 0) {
      incorrectTimer = 90; // 答錯停頓 1.5 秒 (假設 60fps)
    }

    // 座標轉換（因為影像翻轉了，X 座標也要反向對應）
    let x = map(indexFinger.x, 0, capture.width, width, 0);
    let y = map(indexFinger.y, 0, capture.height, 0, height);

    // 畫出目前的食指尖端（紅色光點）
    fill(255, 0, 0);
    noStroke();
    ellipse(x, y, 15, 15);
  }

  // --- 遊戲 UI 顯示 ---
  // 顯示題目 (畫面正上方)
  textAlign(CENTER, TOP);
  textSize(60);
  fill(255);
  stroke(0);
  strokeWeight(4);
  text(currentQuestion.display, width / 2, 40);

  // 顯示中文操作提示 (持續顯示直到遊戲結束)
  textSize(24);
  fill(255, 255, 0); // 使用黃色讓提示更顯眼
  stroke(0);
  strokeWeight(2);
  text("請在鏡頭前比出正確符號對應的手指數量！", width / 2, 115);
  text("( 1:＋ , 2:－ , 3:× , 4:÷ )", width / 2, 150);

  // 顯示提示：目前偵測到的手指數與對應符號
  if (hands.length > 0) {
    let hand = hands[0];
    let isIndex = hand.index_finger_tip.y < hand.index_finger_pip.y;
    let isMiddle = hand.middle_finger_tip.y < hand.middle_finger_pip.y;
    let isRing = hand.ring_finger_tip.y < hand.ring_finger_pip.y;
    let isPinky = hand.pinky_finger_tip.y < hand.pinky_finger_pip.y;
    let count = [isIndex, isMiddle, isRing, isPinky].filter((s) => s).length;

    textAlign(LEFT, BOTTOM);
    textSize(24);
    fill(255, 255, 0);
    noStroke();
    text(`偵測手指數: ${count}`, 30, height - 30);
  }

  // 顯示分數與時間 (畫面右下角)
  textAlign(RIGHT, BOTTOM);
  textSize(32);
  fill(255);
  stroke(0);
  strokeWeight(2);
  text(`Score: ${score}  |  Time: ${timer}s`, width - 30, height - 30);

  // --- 顯示反饋特效 ---
  if (successTimer > 0) {
    textAlign(CENTER, CENTER);
    textSize(120);
    fill(0, 255, 100); // 亮綠色
    stroke(255);
    strokeWeight(10);
    text("SUCCESS!", width / 2, height / 2);

    // --- 新增：+3s 獎勵文字浮現動畫 ---
    push();
    // yOffset: 隨時間從 0 增加到 80，產生向上飄的效果
    let yOffset = map(successTimer, 90, 0, 0, 80); 
    // alpha: 隨時間從 255 減少到 0，產生淡出效果
    let alpha = map(successTimer, 0, 90, 0, 255);
    textSize(60);
    fill(255, 255, 0, alpha); // 使用亮黃色強調時間獎勵
    noStroke();
    // 初始位置在 SUCCESS! 下方約 120 像素處
    text("+3s", width / 2, height / 2 + 120 - yOffset);
    pop();

    successTimer--; 
    if (successTimer === 0) {
      currentQuestion = generateQuestion(); // 停頓結束後才更換下一題
    }
  } else if (incorrectTimer > 0) {
    textAlign(CENTER, CENTER);
    textSize(100);
    fill(255, 50, 50); // 亮紅色
    stroke(255);
    strokeWeight(10);
    text("INCORRECT!", width / 2, height / 2); // 顯示錯誤提示，且不會更換題目
    incorrectTimer--; // 每幀減少，直到消失
  }
}

function drawGameOver() {
  // 背景變暗，營造結束感
  background(0, 150);

  textAlign(CENTER, CENTER);
  fill(255, 0, 0);
  noStroke();
  textSize(100);
  text("GAME OVER", width / 2, height / 2 - 120);

  fill(255);
  textSize(50);
  text(`最終得分：${score}`, width / 2, height / 2);

  // 評價邏輯
  let evaluation = "";
  let evalColor = [255, 255, 255];

  if (score >= 50) {
    evaluation = "🏆 數學小大師 🏆";
    evalColor = [0, 255, 255]; // 青藍色
  } else {
    evaluation = "加油！再試一次吧！";
  }

  fill(evalColor);
  textSize(40);
  text(evaluation, width / 2, height / 2 + 100);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (restartBtn) {
    restartBtn.position(width / 2 - 60, height / 2 + 160);
  }
  if (startBtn) {
    startBtn.position(width / 2 - 60, height / 2 + 20);
  }
}
