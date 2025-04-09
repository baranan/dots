// dots.js

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let gridSize = 6;
let movesLeft = 0;
let timeLeft = 0;
let total = 0;
let score = 0;
let moves = 0;
let timer;
let cellSize;
let board = [];
let path = [];
let isMouseDown = false;
let currentColor = null;
const colors = ['#ff4c4c', '#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
let fallingDots = [];
let skipColor = null; // for square removals
let particles = [];


function startGame() {
    gridSize = parseInt(document.getElementById('grid-size').value);
    movesLeft = parseInt(document.getElementById('moves-limit').value);
    timeLeft = parseInt(document.getElementById('time-limit').value);
    total = 0;
    score = 0;
    moves = 0;
    path = [];

    resizeCanvas();
    generateBoard();
    updateInfo();
    drawBoard();

    clearInterval(timer);
    if (timeLeft > 0) {
        timer = setInterval(() => {
        timeLeft--;
        updateInfo();
        if (timeLeft <= 0) endGame();
        }, 1000);
  }

  canvas.addEventListener('mousedown', handleStart);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('mouseup', handleEnd);
  canvas.addEventListener('touchstart', handleStart);
  canvas.addEventListener('touchmove', handleMove);
  canvas.addEventListener('touchend', handleEnd);
}

function resizeCanvas() {
  canvas.width = canvas.height = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  cellSize = canvas.width / gridSize;
}

function generateBoard() {
  board = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({
      color: colors[Math.floor(Math.random() * colors.length)],
      exploding: false
    }))
  );
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const dot = board[y][x];
        if (!dot) continue;
  
        const scale = dot.exploding ? dot.scale || 1 : 1;
        const radius = (cellSize / 3) * scale;
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
  
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  
    // Path line
    if (path.length > 1) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const { x, y } = path[i];
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
}

  

function getCellFromEvent(evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  const x = Math.floor((clientX - rect.left) / cellSize);
  const y = Math.floor((clientY - rect.top) / cellSize);
  return { x, y };
}

function handleStart(evt) {
  evt.preventDefault();
  isMouseDown = true;
  path = [];
  const { x, y } = getCellFromEvent(evt);
  if (validCell(x, y)) {
    path.push({ x, y });
    currentColor = board[y][x].color;
  }
  drawBoard();
}

function handleMove(evt) {
  if (!isMouseDown) return;
  const { x, y } = getCellFromEvent(evt);
  if (!validCell(x, y)) return;

  const last = path[path.length - 1];
  const alreadyInPath = path.some(p => p.x === x && p.y === y);

  const adjacent =
    Math.abs(x - last.x) + Math.abs(y - last.y) === 1 &&
    board[y][x].color === currentColor;

  const backtrack =
    path.length >= 2 &&
    path[path.length - 2].x === x &&
    path[path.length - 2].y === y;

  if (backtrack) {
    path.pop();
  } else if (adjacent && (!alreadyInPath || (alreadyInPath && x === path[0].x && y === path[0].y))) {
    path.push({ x, y });
  }

  drawBoard();
}

function handleEnd(evt) {
  evt.preventDefault();
  isMouseDown = false;

  if (path.length >= 2) {
    const isSquare = checkForSquare();
    let toRemove = [];

    if (isSquare) {
      // Remove all dots with the same color as the rectangle
      const squareColor = currentColor; // Color of the square
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (board[y][x] && board[y][x].color === squareColor) {
            toRemove.push({ x, y });
          }
        }
      }
    } else {
      toRemove = path;
    }

    if (toRemove.length > 0) {
        animateRemoval(toRemove);
      
        setTimeout(() => {
          removeDots(toRemove);
          //drawBoard(); // Show empty spaces for 200ms
      
          setTimeout(() => {
            dropDots(() => {
              drawBoard(); // draw final resting board
            });
          }, 20);
        }, 130);
        /*removeDots(toRemove); // Remove dots immediately from the board
        dropDots(() => {
          drawBoard(); // Draw the final resting board after dropping
        });*/
      
        total += toRemove.length;
        moves++;
        score = Math.round(total/ moves, 2);
        if (timeLeft === 0) movesLeft--;
        updateInfo();
      
        if (movesLeft <= 0 && timeLeft === 0) endGame();
      }      
  }

  path = [];
  currentColor = null;
}

function checkForSquare() {
    if (path.length < 4) return false;
  
    const positions = path.map(p => `${p.x},${p.y}`);
    const unique = new Set(positions);
    if (unique.size < path.length) {
        skipColor = currentColor;
        return true;
      }
    skipColor = null;
    return false;
  }
  

  function animateRemoval(dots) {
    particles = [];
  
    // Tag the exploding dots with a shrink scale
    for (const { x, y } of dots) {
      const dot = board[y][x];
      if (!dot) continue;
  
      dot.exploding = true;
      dot.scale = 1.0; // initial full size
  
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: x * cellSize + cellSize / 2,
          y: y * cellSize + cellSize / 2,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          radius: Math.random() * 4 + 2,
          color: dot.color,
          life: 30 + Math.random() * 10
        });
      }
    }
  
    const totalFrames = 30;
    let frame = 0;
  
    const step = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Shrink dots that are exploding
      for (const { x, y } of dots) {
        const dot = board[y][x];
        if (!dot || !dot.exploding) continue;
        dot.scale = 1 - frame / totalFrames;
        if (dot.scale < 0) dot.scale = 0;
      }
  
      drawBoard();
      updateParticles();
      drawParticles();
  
      frame++;
      if (frame <= totalFrames) {
        requestAnimationFrame(step);
      } else {
        // Cleanup
        for (const { x, y } of dots) {
          if (board[y][x]) board[y][x].exploding = false;
        }
        particles = [];
      }
    };
  
    step();
  }
  

function updateParticles() {
    particles = particles.filter(p => p.life > 0);
    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life--;
    }
}

  
function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 40);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}
  

function removeDots(dots) {
  for (const { x, y } of dots) {
    board[y][x] = null;
  }
}

function dropDots(callback) {
    fallingDots = [];
  
    for (let x = 0; x < gridSize; x++) {
      let pointer = gridSize - 1;
  
      for (let y = gridSize - 1; y >= 0; y--) {
        if (board[y][x]) {
          if (y !== pointer) {
            fallingDots.push({
              x,
              fromY: y,
              toY: pointer,
              dot: board[y][x],
              yPos: y * cellSize,
            });
            board[pointer][x] = board[y][x];
            board[y][x] = null;
          }
          pointer--;
        }
      }
  
      // Fill empty cells at top with new falling dots
      for (let y = pointer; y >= 0; y--) {
        const colorOptions = skipColor ? colors.filter(c => c !== skipColor) : colors;
        const newDot = {
          color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
          exploding: false
        };
        board[y][x] = newDot;
  
        fallingDots.push({
          x,
          fromY: -1 - (pointer - y), // start outside the grid
          toY: y,
          dot: newDot,
          yPos: (-1 - (pointer - y)) * cellSize,
        });
      }
    }
  
    animateFalling(() => {
      fallingDots = [];
      callback();
    });
  } 
  
 
  function animateFalling(callback) {
    const durationPerDot = 300; // ms for full fall
    const startTime = performance.now();
  
    const step = (now) => {
      let done = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStaticBoard();
  
      for (let d of fallingDots) {
        const distance = (d.toY - d.fromY) * cellSize;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationPerDot);
  
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
  
        const y = d.fromY * cellSize + eased * distance + cellSize / 2;
        const x = d.x * cellSize + cellSize / 2;
  
        ctx.fillStyle = d.dot.color;
        ctx.beginPath();
        ctx.arc(x, y, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
  
        if (progress < 1) done = false;
      }
  
      if (!done) requestAnimationFrame(step);
      else callback();
    };
  
    requestAnimationFrame(step);
}

  

function drawStaticBoard() {
    const occupied = new Set(fallingDots.map(d => `${d.toY},${d.x}`));
  
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (occupied.has(`${y},${x}`)) continue; // skip spots where falling dots will land
        const dot = board[y][x];
        if (!dot) continue;
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(x * cellSize + cellSize / 2, y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } 

function validCell(x, y) {
  return x >= 0 && y >= 0 && x < gridSize && y < gridSize;
}

function updateInfo() {
  document.getElementById('moves-left').textContent =
    movesLeft > 0 ? `Moves Left: ${movesLeft}` : '';
  document.getElementById('time-left').textContent =
    timeLeft > 0 ? `Time Left: ${timeLeft}s` : '';
  document.getElementById('score').textContent = `score: ${score}`;
}

function endGame() {
  clearInterval(timer);
  canvas.removeEventListener('mousedown', handleStart);
  canvas.removeEventListener('mousemove', handleMove);
  canvas.removeEventListener('mouseup', handleEnd);
  canvas.removeEventListener('touchstart', handleStart);
  canvas.removeEventListener('touchmove', handleMove);
  canvas.removeEventListener('touchend', handleEnd);
  alert(`Game over! Your total: ${total}`);
}

document.getElementById('start-game').addEventListener('click', startGame);
