class MazeGame {
    constructor() {
        console.log('Starting constructor');
        this.canvas = document.getElementById('mazeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 40;
        this.mazeSize = 21;
        this.playerPos = { x: Math.floor(this.mazeSize/2), y: Math.floor(this.mazeSize/2) };
        this.exitPos = null;
        this.maze = [];
        this.visitedCells = new Set();
        this.warps = new Map();
        this.startTime = null;
        this.timerInterval = null;
        this.gameInitialized = false;

        // Add viewport properties
        this.viewportSize = 11; // Default size (11x11 for fog of war)

        // Canvas size setup - initial size
        this.canvas.width = this.cellSize * 11;
        this.canvas.height = this.cellSize * 11;

        console.log('Before hiding victory screen');
        const victoryElement = document.getElementById('victory');
        if (victoryElement) {
            victoryElement.style.display = 'none';
            victoryElement.classList.add('hidden');
            console.log('Victory screen hidden');
        } else {
            console.error('Victory element not found!');
        }

        this.setupControls();
        
        // Now that everything is initialized, update canvas size and start game
        this.updateCanvasSize();
        console.log('About to start game');
        setTimeout(() => {
            this.startGame();
            console.log('Game started');
        }, 100);
    }

    updateCanvasSize() {
        const isFogOfWar = document.getElementById('fogOfWar').checked;
        if (isFogOfWar) {
            this.viewportSize = 11;
            this.cellSize = 40;
        } else {
            this.viewportSize = this.mazeSize;
            this.cellSize = Math.floor(440 / this.mazeSize);
        }
        
        this.canvas.width = this.cellSize * this.viewportSize;
        this.canvas.height = this.cellSize * this.viewportSize;
        
        if (this.gameInitialized) {  // Only draw if game is fully initialized
            this.draw();
        }
    }

    setupControls() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        document.getElementById('newGame').addEventListener('click', () => this.startGame());
        document.getElementById('playAgain').addEventListener('click', () => {
            document.getElementById('victory').classList.add('hidden');
            this.startGame();
        });
        
        // Add fog of war toggle handler
        document.getElementById('fogOfWar').addEventListener('change', () => {
            this.updateCanvasSize();
        });

        // Add portal visibility handler
        document.getElementById('showPortals').addEventListener('change', (e) => {
            const portalLegend = document.querySelector('.portal-legend');
            if (portalLegend) {
                portalLegend.style.display = e.target.checked ? 'flex' : 'none';
            }
            this.draw();
        });
    }

    generateMaze() {
        // Initialize empty maze
        this.maze = Array(this.mazeSize).fill().map(() => 
            Array(this.mazeSize).fill(1));
        
        // Generate maze using recursive backtracking
        this.carvePathFrom(Math.floor(this.mazeSize/2), Math.floor(this.mazeSize/2));
        
        // Add warps (random portals)
        this.generateWarps(3); // Add 3 pairs of warps
        
        // Place exit
        do {
            this.exitPos = {
                x: Math.floor(Math.random() * this.mazeSize),
                y: Math.floor(Math.random() * this.mazeSize)
            };
        } while (
            this.maze[this.exitPos.y][this.exitPos.x] === 1 ||
            (Math.abs(this.exitPos.x - Math.floor(this.mazeSize/2)) < 3 &&
             Math.abs(this.exitPos.y - Math.floor(this.mazeSize/2)) < 3)
        );
    }

    carvePathFrom(x, y) {
        const directions = [
            [0, -2], // North
            [2, 0],  // East
            [0, 2],  // South
            [-2, 0]  // West
        ];
        
        // Shuffle directions
        directions.sort(() => Math.random() - 0.5);

        this.maze[y][x] = 0;

        for (let [dx, dy] of directions) {
            let newX = x + dx;
            let newY = y + dy;
            
            if (newX > 0 && newX < this.mazeSize-1 && newY > 0 && newY < this.mazeSize-1 
                && this.maze[newY][newX] === 1) {
                this.maze[y + dy/2][x + dx/2] = 0;
                this.carvePathFrom(newX, newY);
            }
        }
    }

    generateWarps(numPairs) {
        for (let i = 0; i < numPairs; i++) {
            let pos1, pos2;
            do {
                pos1 = {
                    x: Math.floor(Math.random() * this.mazeSize),
                    y: Math.floor(Math.random() * this.mazeSize)
                };
                pos2 = {
                    x: Math.floor(Math.random() * this.mazeSize),
                    y: Math.floor(Math.random() * this.mazeSize)
                };
            } while (
                this.maze[pos1.y][pos1.x] === 1 ||
                this.maze[pos2.y][pos2.x] === 1 ||
                (pos1.x === pos2.x && pos1.y === pos2.y) ||
                this.warps.has(`${pos1.x},${pos1.y}`) ||
                this.warps.has(`${pos2.x},${pos2.y}`)
            );

            this.warps.set(`${pos1.x},${pos1.y}`, pos2);
            this.warps.set(`${pos2.x},${pos2.y}`, pos1);
        }
    }

    startGame() {
        console.log('StartGame called');
        
        // Force hide victory screen first
        const victoryElement = document.getElementById('victory');
        victoryElement.style.display = 'none';
        victoryElement.classList.add('hidden');
        
        // Initialize player position
        this.playerPos = { 
            x: Math.floor(this.mazeSize/2), 
            y: Math.floor(this.mazeSize/2) 
        };
        console.log('Player position set:', this.playerPos);
        
        // Clear previous game state
        this.visitedCells.clear();
        this.visitedCells.add(`${this.playerPos.x},${this.playerPos.y}`);
        this.warps.clear();
        
        // Generate new maze
        this.generateMaze();
        console.log('Maze generated');
        
        // Set exit position
        this.setExitPosition();
        console.log('Exit position set:', this.exitPos);
        
        // Reset timer
        document.getElementById('timer').textContent = '0:00';
        this.startTime = Date.now();
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        
        this.gameInitialized = true;
        this.draw();
        console.log('Game initialization complete');
    }

    setExitPosition() {
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            this.exitPos = {
                x: Math.floor(Math.random() * this.mazeSize),
                y: Math.floor(Math.random() * this.mazeSize)
            };
            attempts++;
            
            if (attempts >= maxAttempts) {
                console.error('Failed to place exit after', maxAttempts, 'attempts');
                // Force position far from player
                this.exitPos = {
                    x: this.playerPos.x < this.mazeSize/2 ? this.mazeSize-2 : 1,
                    y: this.playerPos.y < this.mazeSize/2 ? this.mazeSize-2 : 1
                };
                break;
            }
        } while (
            this.maze[this.exitPos.y][this.exitPos.x] === 1 || 
            (Math.abs(this.exitPos.x - this.playerPos.x) + Math.abs(this.exitPos.y - this.playerPos.y) < 10)
        );
        
        console.log('Exit position set to:', this.exitPos, 'after', attempts, 'attempts');
    }

    updateTimer() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    handleKeyPress(event) {
        if (!this.gameInitialized) {
            console.log('Key press ignored - game not ready');
            return;
        }

        const key = event.key;
        let newPos = { ...this.playerPos };

        switch(key) {
            case 'ArrowUp':
            case 'w':
                newPos.y--;
                break;
            case 'ArrowDown':
            case 's':
                newPos.y++;
                break;
            case 'ArrowLeft':
            case 'a':
                newPos.x--;
                break;
            case 'ArrowRight':
            case 'd':
                newPos.x++;
                break;
            default:
                return; // Ignore other keys
        }

        if (this.isValidMove(newPos)) {
            this.playerPos = newPos;
            this.visitedCells.add(`${newPos.x},${newPos.y}`);
            
            // Only use portals if they're enabled
            if (document.getElementById('showPortals').checked) {
                const warpDest = this.warps.get(`${newPos.x},${newPos.y}`);
                if (warpDest) {
                    this.playerPos = { ...warpDest };
                    this.visitedCells.add(`${warpDest.x},${warpDest.y}`);
                }
            }

            this.draw();
            
            // Check for victory
            if (this.playerPos.x === this.exitPos.x && 
                this.playerPos.y === this.exitPos.y) {
                console.log('Victory achieved!');
                clearInterval(this.timerInterval);
                const victoryElement = document.getElementById('victory');
                victoryElement.style.display = 'flex';  // Use flex to center content
                victoryElement.classList.remove('hidden');
                document.getElementById('finalTime').textContent = 
                    document.getElementById('timer').textContent;
            }
        }
    }

    isValidMove(pos) {
        return pos.x >= 0 && pos.x < this.mazeSize &&
               pos.y >= 0 && pos.y < this.mazeSize &&
               this.maze[pos.y][pos.x] === 0;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const isFogOfWar = document.getElementById('fogOfWar').checked;
        const offsetX = isFogOfWar ? this.playerPos.x - 5 : 0;
        const offsetY = isFogOfWar ? this.playerPos.y - 5 : 0;
        const viewSize = isFogOfWar ? 11 : this.mazeSize;

        // Draw maze
        for (let y = 0; y < viewSize; y++) {
            for (let x = 0; x < viewSize; x++) {
                const mazeX = x + offsetX;
                const mazeY = y + offsetY;
                
                if (mazeX >= 0 && mazeX < this.mazeSize && 
                    mazeY >= 0 && mazeY < this.mazeSize) {
                    
                    const showExit = document.getElementById('showExit').checked;
                    const showPath = document.getElementById('showPath').checked;
                    const showPortals = document.getElementById('showPortals').checked;
                    
                    // Calculate distance from player for fog of war
                    const distance = Math.sqrt(
                        Math.pow((isFogOfWar ? 5 : this.playerPos.x) - x, 2) + 
                        Math.pow((isFogOfWar ? 5 : this.playerPos.y) - y, 2)
                    );
                    
                    if (!isFogOfWar || distance <= 3) {
                        // Draw cell
                        this.ctx.fillStyle = this.maze[mazeY][mazeX] ? '#333' : '#fff';
                        this.ctx.fillRect(x * this.cellSize, y * this.cellSize, 
                                        this.cellSize, this.cellSize);
                        
                        // Draw visited path
                        if (showPath && this.visitedCells.has(`${mazeX},${mazeY}`)) {
                            this.ctx.fillStyle = 'rgba(100, 149, 237, 0.5)';
                            this.ctx.fillRect(x * this.cellSize, y * this.cellSize, 
                                            this.cellSize, this.cellSize);
                        }
                        
                        // Draw warp points
                        if (showPortals && this.warps.has(`${mazeX},${mazeY}`)) {
                            this.ctx.fillStyle = 'purple';
                            this.ctx.beginPath();
                            this.ctx.arc(x * this.cellSize + this.cellSize/2, 
                                       y * this.cellSize + this.cellSize/2, 
                                       this.cellSize/6, 0, Math.PI * 2);
                            this.ctx.fill();
                        }
                    } else {
                        // Draw fog
                        this.ctx.fillStyle = '#888';
                        this.ctx.fillRect(x * this.cellSize, y * this.cellSize, 
                                        this.cellSize, this.cellSize);
                    }
                }
            }
        }

        // Draw exit if visible
        if (document.getElementById('showExit').checked) {
            const exitScreenX = isFogOfWar ? (this.exitPos.x - offsetX) : this.exitPos.x;
            const exitScreenY = isFogOfWar ? (this.exitPos.y - offsetY) : this.exitPos.y;
            
            if (exitScreenX >= 0 && exitScreenX < viewSize && 
                exitScreenY >= 0 && exitScreenY < viewSize) {
                this.ctx.fillStyle = 'green';
                this.ctx.fillRect(exitScreenX * this.cellSize + this.cellSize/4,
                                exitScreenY * this.cellSize + this.cellSize/4,
                                this.cellSize/2, this.cellSize/2);
            }
        }

        // Draw player and direction arrow when fog of war is on
        const playerScreenX = isFogOfWar ? 5 : this.playerPos.x;
        const playerScreenY = isFogOfWar ? 5 : this.playerPos.y;
        
        // Draw player
        this.ctx.fillStyle = 'red';
        this.ctx.beginPath();
        this.ctx.arc(playerScreenX * this.cellSize + this.cellSize/2,
                    playerScreenY * this.cellSize + this.cellSize/2,
                    this.cellSize/3, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw direction arrow when fog of war is on
        if (isFogOfWar && document.getElementById('showExit').checked) {
            // Calculate angle to exit
            const dx = this.exitPos.x - this.playerPos.x;
            const dy = this.exitPos.y - this.playerPos.y;
            const angle = Math.atan2(dy, dx);
            
            // Arrow parameters
            const centerX = playerScreenX * this.cellSize + this.cellSize/2;
            const centerY = playerScreenY * this.cellSize + this.cellSize/2;
            const arrowLength = this.cellSize/2;
            
            // Draw arrow
            this.ctx.strokeStyle = 'yellow';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            
            // Arrow line
            this.ctx.moveTo(centerX, centerY);
            const endX = centerX + Math.cos(angle) * arrowLength;
            const endY = centerY + Math.sin(angle) * arrowLength;
            this.ctx.lineTo(endX, endY);
            
            // Arrow head
            const headLength = arrowLength/3;
            const angle1 = angle - Math.PI/6;
            const angle2 = angle + Math.PI/6;
            
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(
                endX - headLength * Math.cos(angle1),
                endY - headLength * Math.sin(angle1)
            );
            
            this.ctx.moveTo(endX, endY);
            this.ctx.lineTo(
                endX - headLength * Math.cos(angle2),
                endY - headLength * Math.sin(angle2)
            );
            
            this.ctx.stroke();
        }
    }
}

// Start the game when the page loads
window.onload = () => new MazeGame(); 

// Add this to your initialization code
function initControls() {
    const buttons = {
        'upBtn': { key: 'ArrowUp', code: 38 },
        'leftBtn': { key: 'ArrowLeft', code: 37 },
        'rightBtn': { key: 'ArrowRight', code: 39 },
        'downBtn': { key: 'ArrowDown', code: 40 }
    };

    for (const [btnId, keyInfo] of Object.entries(buttons)) {
        const button = document.getElementById(btnId);
        if (button) {
            // Handle both touch and click events
            ['touchstart', 'mousedown'].forEach(eventType => {
                button.addEventListener(eventType, function(e) {
                    e.preventDefault(); // Prevent default behavior
                    e.stopPropagation(); // Stop event bubbling
                    
                    // Try both keydown and direct movement handling
                    try {
                        // Method 1: Dispatch keyboard event
                        const keyEvent = new KeyboardEvent('keydown', {
                            key: keyInfo.key,
                            keyCode: keyInfo.code,
                            which: keyInfo.code,
                            code: keyInfo.key,
                            bubbles: true,
                            cancelable: true
                        });
                        document.dispatchEvent(keyEvent);
                        
                        // Method 2: Direct movement call
                        // This assumes your game uses these direction values
                        switch(btnId) {
                            case 'upBtn': moveUp(); break;
                            case 'leftBtn': moveLeft(); break;
                            case 'rightBtn': moveRight(); break;
                            case 'downBtn': moveDown(); break;
                        }
                    } catch(error) {
                        console.log('Movement handler error:', error);
                    }
                }, { passive: false });
            });

            // Visual feedback
            const pressedColor = 'rgba(0, 0, 0, 0.4)';
            const normalColor = 'rgba(0, 0, 0, 0.2)';
            
            button.addEventListener('mousedown', () => button.style.backgroundColor = pressedColor);
            button.addEventListener('mouseup', () => button.style.backgroundColor = normalColor);
            button.addEventListener('mouseleave', () => button.style.backgroundColor = normalColor);
            button.addEventListener('touchstart', () => button.style.backgroundColor = pressedColor);
            button.addEventListener('touchend', () => button.style.backgroundColor = normalColor);
        }
    }
}

// Ensure controls are initialized after the DOM and your game code is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControls);
} else {
    initControls();
}

// Prevent default touch behaviors that might interfere with the game
document.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, { passive: false }); 