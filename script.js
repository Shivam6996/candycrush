const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container');
const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const levelText = document.getElementById('level-text');
const highScoreEl = document.getElementById('high-score');
const progressBar = document.querySelector('.progress-bar');
const progressText = document.getElementById('progress-text');
const comboPopup = document.getElementById('combo-popup');

const bgMusic = document.getElementById('bg-music');
const moveSound = document.getElementById('move-sound');
const comboSound = document.getElementById('combo-sound');

const boardSize = 8;
let boardData = [];
let score = 0;
let level = 1;
let progress = 0;
let highScore = +localStorage.getItem('match3HighScore') || 0;

highScoreEl.textContent = `High Score: ${highScore}`;

const candyColorMap = {
  1: 'red',
  2: 'blue',
  3: 'purple',
  4: 'green',
  5: 'yellow'
};

function getRandomCandyType() {
  return Math.floor(Math.random() * 5) + 1;
}

function createBoard() {
  board.innerHTML = '';
  boardData = [];
  for (let i = 0; i < boardSize * boardSize; i++) {
    const type = getRandomCandyType();
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.style.backgroundImage = `url('${candyColorMap[type]}.png')`;
    tile.dataset.type = type;
    board.appendChild(tile);
    boardData.push({ type, element: tile });
  }
}

function updateTileImage(i) {
  const type = boardData[i].type;
  if (type === 0) {
    boardData[i].element.style.backgroundImage = '';
  } else {
    const color = candyColorMap[type];
    boardData[i].element.style.backgroundImage = `url('${color}.png')`;
  }
}

function updateScore(points) {
  score += points;
  scoreEl.textContent = `Score: ${score}`;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('match3HighScore', highScore);
    highScoreEl.textContent = `High Score: ${highScore}`;
  }

  progress = Math.min(100, (score / 500) * 100);
  progressText.textContent = `${Math.floor(progress)}%`;

  const circumference = 100;
  progressBar.style.strokeDashoffset = circumference - (progress / 100) * circumference;

  if (progress >= 100) {
    level++;
    levelText.textContent = `Level: ${level}`;
    progress = 0;
    progressText.textContent = '0%';
    progressBar.style.strokeDashoffset = circumference;
  }
}

function isAdjacent(i1, i2) {
  const row1 = Math.floor(i1 / boardSize), col1 = i1 % boardSize;
  const row2 = Math.floor(i2 / boardSize), col2 = i2 % boardSize;
  return (row1 === row2 && Math.abs(col1 - col2) === 1) ||
         (col1 === col2 && Math.abs(row1 - row2) === 1);
}

function swapTiles(i1, i2) {
  const temp = boardData[i1].type;
  boardData[i1].type = boardData[i2].type;
  boardData[i2].type = temp;
  updateTileImage(i1);
  updateTileImage(i2);
  setTimeout(() => {
    if (checkMatches()) {
      swapInProgress = false;
    } else {
      // revert swap
      const revert = boardData[i1].type;
      boardData[i1].type = boardData[i2].type;
      boardData[i2].type = revert;
      updateTileImage(i1);
      updateTileImage(i2);
      swapInProgress = false;
    }
  }, 300);
}

function checkMatches() {
  let matches = [];

  // Horizontal matches
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize - 2; c++) {
      const i = r * boardSize + c;
      const t = boardData[i].type;
      if (t && t === boardData[i+1].type && t === boardData[i+2].type) {
        matches.push(i, i+1, i+2);
      }
    }
  }

  // Vertical matches
  for (let c = 0; c < boardSize; c++) {
    for (let r = 0; r < boardSize - 2; r++) {
      const i = r * boardSize + c;
      const t = boardData[i].type;
      if (t && t === boardData[i+boardSize].type && t === boardData[i+2*boardSize].type) {
        matches.push(i, i+boardSize, i+2*boardSize);
      }
    }
  }

  matches = [...new Set(matches)];
  if (matches.length === 0) return false;

  matches.forEach(i => {
    boardData[i].element.classList.add('removing');
  });

  setTimeout(() => {
    matches.forEach(i => {
      boardData[i].type = 0;
      boardData[i].element.classList.remove('removing');
      boardData[i].element.style.backgroundImage = '';
    });

    updateScore(matches.length * 10);
    comboSound.play();
    showComboPopup(boardData[matches[0]]?.type);

    setTimeout(() => {
      requestAnimationFrame(() => refillBoard());
    }, 300);
  }, 300);

  return true;
}

function refillBoard() {
  for (let c = 0; c < boardSize; c++) {
    let empty = 0;
    for (let r = boardSize - 1; r >= 0; r--) {
      const i = r * boardSize + c;
      if (boardData[i].type === 0) {
        empty++;
      } else if (empty > 0) {
        const target = i + empty * boardSize;
        boardData[target].type = boardData[i].type;
        updateTileImage(target);
        boardData[i].type = 0;
        updateTileImage(i);
      }
    }
    for (let r = 0; r < empty; r++) {
      const i = r * boardSize + c;
      const newType = getRandomCandyType();
      boardData[i].type = newType;
      updateTileImage(i);
    }
  }
  setTimeout(() => {
    requestAnimationFrame(() => checkMatches());
  }, 400);
}

function showComboPopup(type) {
  if (!type || !candyColorMap[type]) return;
  comboPopup.style.backgroundImage = `url('${candyColorMap[type]}.png')`;
  comboPopup.classList.add('show');
  setTimeout(() => comboPopup.classList.remove('show'), 1000);
}

let draggedTile = null;
let dragIndex = null;
let swapInProgress = false;

board.addEventListener('pointerdown', e => {
  if (e.target.classList.contains('tile') && !swapInProgress) {
    draggedTile = e.target;
    dragIndex = [...board.children].indexOf(draggedTile);
    e.target.setPointerCapture(e.pointerId);
    draggedTile.classList.add('dragging');
  }
});

board.addEventListener('pointermove', e => {
  if (!draggedTile) return;
  e.preventDefault();
});

board.addEventListener('pointerup', e => {
  if (!draggedTile) return;
  const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
  if (
    elementBelow &&
    elementBelow.classList.contains('tile') &&
    elementBelow !== draggedTile &&
    !swapInProgress
  ) {
    const dropIndex = [...board.children].indexOf(elementBelow);
    if (isAdjacent(dragIndex, dropIndex)) {
      swapInProgress = true;
      swapTiles(dragIndex, dropIndex);
      moveSound.play();
    }
  }
  draggedTile.classList.remove('dragging');
  draggedTile = null;
  dragIndex = null;
});

startBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  gameContainer.style.display = 'block';

  score = 0;
  level = 1;
  progress = 0;
  scoreEl.textContent = 'Score: 0';
  levelText.textContent = 'Level: 1';
  progressText.textContent = '0%';
  progressBar.style.strokeDashoffset = 100;

  createBoard();
  bgMusic.volume = 1.0;
  bgMusic.play().catch(() => {});
});
