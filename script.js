
const PLAYER = {
    HUMAN: 1,
    BOT: 2
  };

const GAME_PHASE = {
    PLACING: 1,
    MOVING: 2,
    FLYING: 3
};

const MOVE_RESULT = {
    INVALID_SRC_POS: -1,
    UNAVAILABLE_POS: -2,
    INVALID_MOVE: -3,
    VALID_MOVE: 0
};

const NUM_PIECES_PER_PLAYER = 9;
const MIN_NUM_PIECES = 2;
  
  let gameMode = null;
  let currentPlayer = PLAYER.HUMAN;
  let player1Name = 'Player 1';
  let player2Name = 'Player 2';
// Game variables
var playerOneCode = 1;
var playerTwoCode = 2;
var redBlocks = 0;
var greenBlocks = 0;
var isMillRed = false;
var isMillGreen = false;
var isActiveRed = false;
var isActiveGreen = false;
var isGreenThreeLeft = false;
var isRedThreeLeft = false;
var blockWidth = 16;
var strokeWidth = 2;
var lastX = 0;
var lastY = 0;
var lastCenterX = 0;
var lastCenterY = 0;
var numberOfTurns = 0;
var rows = 7;
var columns = 7;
var clickSound;
var positionMatrix = new Array(7);
var referenceMatrix = new Array(7);
var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");

// Add these variables at the top with other global variables
var backgroundImage = new Image();
var boardImage = new Image();
backgroundImage.src = 'background.jpg';
boardImage.src = 'main.png';

function initializeGame() {
    clickSound = new sound("sound.wav");
    initializeArray();
}

function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function() {
        this.sound.play();
    }
}

function initializeArray() {
    for (var i = 0; i < 7; i++) {
        referenceMatrix[i] = new Array(7);
        positionMatrix[i] = new Array(7);
    }

    for (var j = 0; j < 7; j++) {
        for (var k = 0; k < 7; k++) {
            if ((j == 3) || (k == 3) || (j == k) || (j + k == 6)) {
                referenceMatrix[j][k] = 0;
                positionMatrix[j][k] = 0;
            } else {
                referenceMatrix[j][k] = -1;
                positionMatrix[j][k] = -1;
            }
        }
    }
    referenceMatrix[3][3] = -1;
    positionMatrix[3][3] = -1;
}
  
  function selectMode(mode) {
      gameMode = mode;
      document.getElementById('name-inputs').classList.remove('hidden');
      if (mode === 'bot') {
          document.getElementById('player2').value = 'Bot';
          document.getElementById('player2').disabled = true;
      } else {
          document.getElementById('player2').value = '';
          document.getElementById('player2').disabled = false;
      }
  }
  
  function startGame() {
      player1Name = document.getElementById('player1').value || 'Player 1';
      player2Name = document.getElementById('player2').value || (gameMode === 'bot' ? 'Bot' : 'Player 2');
      
      document.getElementById('game-setup').classList.add('hidden');
      document.getElementById('game-board').classList.remove('hidden');
      document.getElementById('turn').innerHTML = player1Name;
      
      initializeGame();
  }
  
function makeMove(X, Y) {
    console.log(`Making move at (${X}, ${Y})`);
    
    // Get center coordinates for the move first
    let {xCenter, yCenter} = getCenterCoordinates(X, Y);
    if (!xCenter || !yCenter) return;
    
    // If a mill is active, handle piece removal
    if (isMillGreen || isMillRed) {
        console.log('Mill is active, handling piece removal');
        var playerCode = (isMillGreen) ? playerOneCode : playerTwoCode;
        var targetCode = (isMillGreen) ? playerTwoCode : playerOneCode;
        
        // Check if clicked piece belongs to the target player
        if (positionMatrix[X][Y] === targetCode) {
            // Check if the piece is part of a mill
            if (!checkMill(X, Y, targetCode) || allArePartOfMill(targetCode)) {
                clickSound.play();
                if (targetCode === playerTwoCode) {
                    redBlocks--;
                    document.getElementById("message").innerHTML = "Red block removed";
                } else {
                    greenBlocks--;
                    document.getElementById("message").innerHTML = "Green block removed";
                }
                
                // Clear the piece from the board
                clearBlock(xCenter, yCenter);
                
                // Update position matrix
                positionMatrix[X][Y] = 0;
                
                // Turn off mill state
                turnOffMill();
                
                // Update the board
                update();
                
                // Switch turn to the other player after piece removal
                numberOfTurns++;
                
                // If it's bot's turn after mill removal, schedule bot move
                if (gameMode === 'bot' && numberOfTurns % 2 !== 0) {
                    setTimeout(() => {
                        if (!isMillGreen && !isMillRed && !window.isBotMoving) {
                            if (numberOfTurns < 18) {
                                makeBotPlacement();
                            } else {
                                makeBotMove();
                            }
                        }
                    }, 1000);
                }
            } else {
                document.getElementById("message").innerHTML = "Can't remove a block which is already a part of mill";
            }
        } else {
            document.getElementById("message").innerHTML = "Select an opponent's piece to remove";
        }
        return;
    }

    // Handle piece movement phase
    if (numberOfTurns >= 18) {
        // If clicking on a piece
        if (positionMatrix[X][Y] !== 0) {
            // If clicking the same piece that was selected, or selecting a new piece
            if (X === lastX && Y === lastY) {
                handlePieceSelection(X, Y, xCenter, yCenter);
            } else {
                // Check if the piece belongs to the current player
                const currentPlayerCode = numberOfTurns % 2 === 0 ? playerOneCode : playerTwoCode;
                if (positionMatrix[X][Y] === currentPlayerCode) {
                    handlePieceSelection(X, Y, xCenter, yCenter);
                }
            }
            return;
        }
        
        // If a piece is selected and clicking on an empty spot
        if ((isActiveRed || isActiveGreen) && positionMatrix[X][Y] === 0) {
            handlePieceMovement(X, Y, xCenter, yCenter);
            return;
        }
    }

    // Handle piece placement phase
    if (positionMatrix[X][Y] === 0 && numberOfTurns < 18) {
        handlePiecePlacement(X, Y, xCenter, yCenter);
    }
}

function handlePiecePlacement(X, Y, xCenter, yCenter) {
    clickSound.play();
    if (numberOfTurns % 2 == 0) {
        greenBlocks++;
        positionMatrix[X][Y] = playerOneCode;
        drawPiece(xCenter, yCenter, true);
        
        if (checkMill(X, Y, playerOneCode)) {
            isMillGreen = true;
            document.getElementById("turn").innerHTML = player1Name;
            document.getElementById("message").innerHTML = "A Mill is formed. Click on red block to remove it.";
            return;
        }
        
        document.getElementById("turn").innerHTML = player2Name;
        if (gameMode === 'bot') {
            document.getElementById("message").innerHTML = "Bot is thinking...";
            window.isBotMoving = false;  // Reset bot state
            setTimeout(() => {
                if (!isMillGreen && !isMillRed) {
                    makeBotPlacement();
                }
            }, 1000);
        }
    } else {
        redBlocks++;
        positionMatrix[X][Y] = playerTwoCode;
        drawPiece(xCenter, yCenter, false);
        
        if (checkMill(X, Y, playerTwoCode)) {
            isMillRed = true;
            document.getElementById("turn").innerHTML = player2Name;
            document.getElementById("message").innerHTML = "Bot is removing a piece...";
            setTimeout(() => {
                makeBotRemoval();
            }, 500);
            return;
        }
        
        document.getElementById("turn").innerHTML = player1Name;
        document.getElementById("message").innerHTML = "Click on empty spot to place your piece";
    }
    
    if (numberOfTurns == 17) {
        document.getElementById("message").innerHTML = "Now, Move one step by clicking on Block";
    }
    numberOfTurns++;
}

function drawPiece(xCenter, yCenter, isGreen) {
    context.beginPath();
    context.arc(xCenter, yCenter, blockWidth, 0, 2 * Math.PI, false);
    context.fillStyle = isGreen ? '#2E7D32' : '#F44336';
    context.fill();
    context.lineWidth = strokeWidth;
    context.strokeStyle = '#003300';
    context.stroke();
}

function getCenterCoordinates(X, Y) {
    let xCenter, yCenter;
    
    // Fixed coordinate mapping
    const positions = {
        '0,0': {x: 25, y: 25}, '0,3': {x: 275, y: 25}, '0,6': {x: 525, y: 25},
        '1,1': {x: 115, y: 115}, '1,3': {x: 275, y: 115}, '1,5': {x: 435, y: 115},
        '2,2': {x: 195, y: 195}, '2,3': {x: 275, y: 195}, '2,4': {x: 355, y: 195},
        '3,0': {x: 25, y: 275}, '3,1': {x: 115, y: 275}, '3,2': {x: 195, y: 275},
        '3,4': {x: 355, y: 275}, '3,5': {x: 435, y: 275}, '3,6': {x: 525, y: 275},
        '4,2': {x: 195, y: 355}, '4,3': {x: 275, y: 355}, '4,4': {x: 355, y: 355},
        '5,1': {x: 115, y: 435}, '5,3': {x: 275, y: 435}, '5,5': {x: 435, y: 435},
        '6,0': {x: 25, y: 525}, '6,3': {x: 275, y: 525}, '6,6': {x: 525, y: 525}
    };
    
    const key = `${X},${Y}`;
    const position = positions[key];
    
    if (position) {
        xCenter = position.x;
        yCenter = position.y;
    }
    
    console.log(`Matrix position (${X}, ${Y}) maps to canvas coordinates (${xCenter}, ${yCenter})`);
    return {xCenter, yCenter};
}

function turnOffMill() {
    isMillGreen = false;
    isMillRed = false;
}

function drawBoard() {
    // Clear the entire canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the board image first
    if (boardImage.complete && boardImage.naturalWidth !== 0) {
        context.drawImage(boardImage, 0, 0, canvas.width, canvas.height);
    } else {
        drawFallbackBoard();
    }
    
    // Draw all pieces
    drawPieces();
}

function drawPieces() {
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === playerOneCode || positionMatrix[i][j] === playerTwoCode) {
                let coords = getCoordinates(i, j);
                if (coords) {
                    context.beginPath();
                    context.arc(coords.x, coords.y, blockWidth, 0, 2 * Math.PI, false);
                    context.fillStyle = positionMatrix[i][j] === playerOneCode ? '#2E7D32' : '#F44336';
                    context.fill();
                    context.lineWidth = strokeWidth;
                    context.strokeStyle = '#003300';
                    context.stroke();
                }
            }
        }
    }
}

// Add helper function to get coordinates for a position
function getCoordinates(i, j) {
    let x, y;
    
    // Map matrix positions to canvas coordinates
    switch (i) {
        case 0:
            x = j === 0 ? 25 : j === 3 ? 275 : j === 6 ? 525 : null;
            y = 25;
            break;
        case 1:
            x = j === 1 ? 115 : j === 3 ? 275 : j === 5 ? 435 : null;
            y = 115;
            break;
        case 2:
            x = j === 2 ? 195 : j === 3 ? 275 : j === 4 ? 355 : null;
            y = 195;
            break;
        case 3:
            x = j === 0 ? 25 : j === 1 ? 115 : j === 2 ? 195 : 
                j === 4 ? 355 : j === 5 ? 435 : j === 6 ? 525 : null;
            y = 275;
            break;
        case 4:
            x = j === 2 ? 195 : j === 3 ? 275 : j === 4 ? 355 : null;
            y = 355;
            break;
        case 5:
            x = j === 1 ? 115 : j === 3 ? 275 : j === 5 ? 435 : null;
            y = 435;
            break;
        case 6:
            x = j === 0 ? 25 : j === 3 ? 275 : j === 6 ? 525 : null;
            y = 525;
            break;
        default:
            return null;
    }
    
    return x && y ? {x, y} : null;
}

// Fix bot thinking issue
function makeBotPlacement() {
    console.log('Bot attempting to make a move...');
    console.log(`Current state: turns=${numberOfTurns}, isMillGreen=${isMillGreen}, isMillRed=${isMillRed}, isBotMoving=${window.isBotMoving}, redBlocks=${redBlocks}`);
    
    // Clear any existing timeouts
    if (window.botMoveTimeout) {
        clearTimeout(window.botMoveTimeout);
        window.botMoveTimeout = null;
    }

    // Reset bot state if it's stuck
    if (window.isBotMoving) {
        console.log('Resetting stuck bot state');
        window.isBotMoving = false;
    }

    // Check if it's bot's turn and no mill is active
    if (numberOfTurns % 2 === 0 || isMillGreen || isMillRed) {
        console.log('Bot cannot move: wrong turn or mill active');
        window.isBotMoving = false;
        return;
    }

    // Check if bot has already placed all 9 pieces
    if (redBlocks >= NUM_PIECES_PER_PLAYER) {
        console.log('Bot has already placed all 9 pieces');
        window.isBotMoving = false;
        return;
    }

    window.isBotMoving = true;
    console.log('Bot state set to moving');
    
    try {
        let validPositions = [];
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (referenceMatrix[i][j] === 0 && positionMatrix[i][j] === 0) {
                    validPositions.push({x: i, y: j});
                }
            }
        }

        console.log(`Found ${validPositions.length} valid positions`);

        if (validPositions.length === 0) {
            console.log('No valid positions found');
            window.isBotMoving = false;
            return;
        }

        // Select best move
        let bestMove = validPositions[0];
        let bestScore = -Infinity;

        for (let pos of validPositions) {
            const originalValue = positionMatrix[pos.x][pos.y];
            positionMatrix[pos.x][pos.y] = playerTwoCode;
            
            let score = evaluatePosition(pos.x, pos.y);
            console.log(`Evaluated position (${pos.x}, ${pos.y}) with score ${score}`);
            
            positionMatrix[pos.x][pos.y] = originalValue;

            if (score > bestScore) {
                bestScore = score;
                bestMove = pos;
            }
        }

        console.log(`Bot choosing move (${bestMove.x}, ${bestMove.y}) with score ${bestScore}`);
        
        // Execute move with timeout to prevent state issues
        setTimeout(() => {
            makeMove(bestMove.x, bestMove.y);
            // Reset bot state after move
            setTimeout(() => {
                window.isBotMoving = false;
                console.log('Bot state reset after move');
            }, 100);
        }, 100);
        
    } catch (error) {
        console.error('Error in bot move:', error);
        window.isBotMoving = false;
    }
}

function makeBotMove() {
    console.log('Bot making a move...');
    
    // Clear any existing timeouts
    if (window.botMoveTimeout) {
        clearTimeout(window.botMoveTimeout);
        window.botMoveTimeout = null;
    }

    // Reset bot state if it's stuck
    if (window.isBotMoving) {
        console.log('Resetting stuck bot state');
        window.isBotMoving = false;
    }

    // Check if it's bot's turn and no mill is active
    if (numberOfTurns % 2 === 0 || isMillGreen || isMillRed) {
        console.log('Bot cannot move: wrong turn or mill active');
        window.isBotMoving = false;
        return;
    }

    window.isBotMoving = true;
    console.log('Bot state set to moving');
    
    try {
        let bestScore = -Infinity;
        let bestMove = null;
        let hasValidMove = false;
        
        // Find all bot pieces and their possible moves
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (positionMatrix[i][j] === playerTwoCode) {
                    let moves = getPossibleMoves(i, j);
                    console.log(`Found ${moves.length} possible moves for piece at (${i}, ${j})`);
                    
                    if (moves.length > 0) {
                        hasValidMove = true;
                    }
                    
                    for (let move of moves) {
                        // Try the move
                        let originalValue = positionMatrix[i][j];
                        positionMatrix[i][j] = 0;
                        positionMatrix[move.x][move.y] = playerTwoCode;
                        
                        let score = evaluatePosition(move.x, move.y);
                        
                        // Check if this move forms a mill
                        if (checkMill(move.x, move.y, playerTwoCode)) {
                            score += 2000; // Heavily prioritize mill formation
                        }
                        
                        // Check if this move blocks opponent's potential mill
                        positionMatrix[move.x][move.y] = playerOneCode;
                        if (checkMill(move.x, move.y, playerOneCode)) {
                            score += 1500;
                        }
                        positionMatrix[move.x][move.y] = playerTwoCode;
                        
                        // Restore the position
                        positionMatrix[move.x][move.y] = 0;
                        positionMatrix[i][j] = originalValue;
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = {
                                from: {x: i, y: j},
                                to: move
                            };
                        }
                    }
                }
            }
        }
        
        if (!hasValidMove) {
            console.log('No valid moves found for bot - declaring human winner');
            showGameEndScreen(player1Name, `No possible moves left for ${player2Name}`);
            window.isBotMoving = false;
            return;
        }
        
        if (bestMove) {
            console.log(`Bot selected move from (${bestMove.from.x}, ${bestMove.from.y}) to (${bestMove.to.x}, ${bestMove.to.y})`);
            
            // Execute the move sequence
            let {xCenter: fromXCenter, yCenter: fromYCenter} = getCenterCoordinates(bestMove.from.x, bestMove.from.y);
            let {xCenter: toXCenter, yCenter: toYCenter} = getCenterCoordinates(bestMove.to.x, bestMove.to.y);
            
            // Store the move coordinates for the actual move
            lastX = bestMove.from.x;
            lastY = bestMove.from.y;
            lastCenterX = fromXCenter;
            lastCenterY = fromYCenter;
            
            // Set active state for bot
            isActiveRed = true;
            isActiveGreen = false;
            
            // Clear the piece from old position
            clearBlock(fromXCenter, fromYCenter);
            
            // Draw the piece in new position
            drawBlock(toXCenter, toYCenter, bestMove.to.x, bestMove.to.y);
            
            // If a mill is formed, automatically remove opponent's piece
            if (checkMill(bestMove.to.x, bestMove.to.y, playerTwoCode)) {
                setTimeout(() => {
                    makeBotRemoval();
                }, 500);
            }
        } else {
            console.log('No valid moves found for bot');
            // Reset bot state since no move was made
            window.isBotMoving = false;
        }
    } catch (error) {
        console.error('Error in bot move:', error);
        window.isBotMoving = false;
    }
}

function getPossibleMoves(x, y) {
    console.log(`Getting possible moves for piece at (${x}, ${y})`);
    let moves = [];
    
    // If player has only 3 pieces left, they can fly to any empty spot
    const currentPlayerCode = numberOfTurns % 2 === 0 ? playerOneCode : playerTwoCode;
    const piecesLeft = currentPlayerCode === playerOneCode ? greenBlocks : redBlocks;
    
    if (piecesLeft === 3) {
        console.log('Player has 3 pieces left - flying mode enabled');
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (positionMatrix[i][j] === 0 && referenceMatrix[i][j] === 0) {
                    moves.push({x: i, y: j});
                }
            }
        }
        return moves;
    }
    
    // Normal movement - check adjacent positions only
    // Check horizontal connections
    if (y === 0 || y === 6) {
        // Outer square horizontal connections
        if (x + 3 < 7 && positionMatrix[x + 3][y] === 0 && referenceMatrix[x + 3][y] === 0) {
            moves.push({x: x + 3, y: y});
        }
        if (x - 3 >= 0 && positionMatrix[x - 3][y] === 0 && referenceMatrix[x - 3][y] === 0) {
            moves.push({x: x - 3, y: y});
        }
    } else if (y === 1 || y === 5) {
        // Middle square horizontal connections
        if (x + 2 < 7 && positionMatrix[x + 2][y] === 0 && referenceMatrix[x + 2][y] === 0) {
            moves.push({x: x + 2, y: y});
        }
        if (x - 2 >= 0 && positionMatrix[x - 2][y] === 0 && referenceMatrix[x - 2][y] === 0) {
            moves.push({x: x - 2, y: y});
        }
    } else if (y === 2 || y === 4) {
        // Inner square horizontal connections
        if (x + 1 < 7 && positionMatrix[x + 1][y] === 0 && referenceMatrix[x + 1][y] === 0) {
            moves.push({x: x + 1, y: y});
        }
        if (x - 1 >= 0 && positionMatrix[x - 1][y] === 0 && referenceMatrix[x - 1][y] === 0) {
            moves.push({x: x - 1, y: y});
        }
    }
    
    // Check vertical connections
    if (x === 0 || x === 6) {
        // Outer square vertical connections
        if (y + 3 < 7 && positionMatrix[x][y + 3] === 0 && referenceMatrix[x][y + 3] === 0) {
            moves.push({x: x, y: y + 3});
        }
        if (y - 3 >= 0 && positionMatrix[x][y - 3] === 0 && referenceMatrix[x][y - 3] === 0) {
            moves.push({x: x, y: y - 3});
        }
    } else if (x === 1 || x === 5) {
        // Middle square vertical connections
        if (y + 2 < 7 && positionMatrix[x][y + 2] === 0 && referenceMatrix[x][y + 2] === 0) {
            moves.push({x: x, y: y + 2});
        }
        if (y - 2 >= 0 && positionMatrix[x][y - 2] === 0 && referenceMatrix[x][y - 2] === 0) {
            moves.push({x: x, y: y - 2});
        }
    } else if (x === 2 || x === 4) {
        // Inner square vertical connections
        if (y + 1 < 7 && positionMatrix[x][y + 1] === 0 && referenceMatrix[x][y + 1] === 0) {
            moves.push({x: x, y: y + 1});
        }
        if (y - 1 >= 0 && positionMatrix[x][y - 1] === 0 && referenceMatrix[x][y - 1] === 0) {
            moves.push({x: x, y: y - 1});
        }
    }
    
    // Special handling for middle column (y=3)
    if (y === 3) {
        // For pieces on the middle column, they can move up or down
        if (x > 0 && positionMatrix[x-1][y] === 0 && referenceMatrix[x-1][y] === 0) {
            moves.push({x: x-1, y: y});
        }
        if (x < 6 && positionMatrix[x+1][y] === 0 && referenceMatrix[x+1][y] === 0) {
            moves.push({x: x+1, y: y});
        }
    }
    
    // Special handling for middle row (x=3)
    if (x === 3) {
        // For pieces on the middle row, they can move left or right
        if (y > 0 && positionMatrix[x][y-1] === 0 && referenceMatrix[x][y-1] === 0) {
            moves.push({x: x, y: y-1});
        }
        if (y < 6 && positionMatrix[x][y+1] === 0 && referenceMatrix[x][y+1] === 0) {
            moves.push({x: x, y: y+1});
        }
    }
    
    console.log('Valid moves:', moves);
    return moves;
}

function countPotentialMillsFromPosition(x, y, playerCode) {
    let count = 0;
    const originalValue = positionMatrix[x][y];
    positionMatrix[x][y] = playerCode;
    
    // Check horizontal mills
    const horizontalPositions = [
        [[x, y-2], [x, y-1]], // Left side
        [[x, y-1], [x, y+1]], // Center
        [[x, y+1], [x, y+2]]  // Right side
    ];
    
    // Check vertical mills
    const verticalPositions = [
        [[x-2, y], [x-1, y]], // Top side
        [[x-1, y], [x+1, y]], // Center
        [[x+1, y], [x+2, y]]  // Bottom side
    ];
    
    // Check all possible mill combinations
    [...horizontalPositions, ...verticalPositions].forEach(positions => {
        const [pos1, pos2] = positions;
        if (isValidPosition(pos1[0], pos1[1]) && isValidPosition(pos2[0], pos2[1])) {
            const piece1 = positionMatrix[pos1[0]][pos1[1]];
            const piece2 = positionMatrix[pos2[0]][pos2[1]];
            if ((piece1 === playerCode || piece1 === 0) && 
                (piece2 === playerCode || piece2 === 0)) {
                count++;
            }
        }
    });
    
    positionMatrix[x][y] = originalValue;
    return count;
}

function evaluateThreats(x, y, playerCode) {
    let threats = 0;
    const originalValue = positionMatrix[x][y];
    positionMatrix[x][y] = playerCode;
    
    // Check each empty adjacent position
    const moves = getPossibleMoves(x, y);
    for (let move of moves) {
        if (positionMatrix[move.x][move.y] === 0) {
            positionMatrix[move.x][move.y] = playerCode;
            if (checkMill(move.x, move.y, playerCode)) {
                threats++;
            }
            positionMatrix[move.x][move.y] = 0;
        }
    }
    
    positionMatrix[x][y] = originalValue;
    return threats;
}

function isValidPosition(x, y) {
    return x >= 0 && x < 7 && y >= 0 && y < 7 && referenceMatrix[x][y] === 0;
}

function evaluatePosition(x, y) {
    // Only check if position is valid on the board
    if (!isValidPosition(x, y)) {
        return -Infinity;
    }

    let score = 0;
    const originalValue = positionMatrix[x][y];
    
    try {
        // Place bot's piece
        positionMatrix[x][y] = playerTwoCode;
        
        // Check for immediate mill formation
        if (checkMill(x, y, playerTwoCode)) {
            score += 1000;
        }
        
        // Check if move blocks opponent's potential mill
        positionMatrix[x][y] = playerOneCode;
        if (checkMill(x, y, playerOneCode)) {
            score += 800;
        }
        
        // Restore to bot's piece for further evaluation
        positionMatrix[x][y] = playerTwoCode;
        
        // Strategic position bonuses
        const cornerPositions = [[0,0], [0,6], [6,0], [6,6]];
        const centerPositions = [[3,1], [3,5], [1,3], [5,3]];
        
        if (cornerPositions.some(([cx, cy]) => cx === x && cy === y)) {
            score += 150;
        }
        if (centerPositions.some(([cx, cy]) => cx === x && cy === y)) {
            score += 100;
        }
        
        // Count potential mills from this position
        score += countPotentialMillsFromPosition(x, y, playerTwoCode) * 200;
        
        // Count opponent's potential mills that this move blocks
        score += countPotentialMillsFromPosition(x, y, playerOneCode) * 150;
        
        // Evaluate mobility (number of possible moves from this position)
        const moves = getPossibleMoves(x, y);
        score += moves.length * 50;
        
        // Check if this move creates a fork (multiple potential mills)
        let forkCount = 0;
        for (let move of moves) {
            const originalValue = positionMatrix[move.x][move.y];
            positionMatrix[move.x][move.y] = playerTwoCode;
            if (checkMill(move.x, move.y, playerTwoCode)) {
                forkCount++;
            }
            positionMatrix[move.x][move.y] = originalValue;
        }
        score += forkCount * 300;
        
        // Base score for any valid move
        score += 10;
        
        return score;
    } finally {
        // Always restore the original position
        positionMatrix[x][y] = originalValue;
    }
}

function cleanup() {
    if (window.botMoveTimeout) {
        clearTimeout(window.botMoveTimeout);
    }
}

// Add CSS for game end screen
const style = document.createElement('style');
style.textContent = `
    .game-end-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .game-end-content {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
    }
    .retry-button {
        background: #4CAF50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 1rem;
        font-size: 1.1rem;
    }
    .retry-button:hover {
        background: #45a049;
    }
`;
document.head.appendChild(style);

// Add function to show game end screen
function showGameEndScreen(winner, reason) {
    const gameEndScreen = document.createElement('div');
    gameEndScreen.className = 'game-end-screen';
    
    gameEndScreen.innerHTML = `
        <div class="game-end-content">
            <h2>${winner} Wins!</h2>
            <p>${reason}</p>
            <button class="retry-button">Play Again</button>
        </div>
    `;
    
    document.body.appendChild(gameEndScreen);
    
    const retryButton = gameEndScreen.querySelector('.retry-button');
    retryButton.addEventListener('click', () => {
        location.reload();
    });
}

// Add this new function to handle bot's piece removal
function makeBotRemoval() {
    console.log('Bot removing opponent piece...');
    
    // Check if mill state is still valid
    if (!isMillRed) {
        console.log('Mill state is no longer valid, resetting bot state');
        window.isBotMoving = false;
        turnOffMill();
        update();
        return;
    }

    let bestPieceToRemove = null;
    let bestScore = -Infinity;

    // Find all removable human pieces
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (positionMatrix[i][j] === playerOneCode) {
                // Check if piece is not part of a mill or if all pieces are in mills
                if (!checkMill(i, j, playerOneCode) || allArePartOfMill(playerOneCode)) {
                    let score = 0;
                    
                    // Prioritize pieces that could form mills
                    score += countPotentialMillsFromPosition(i, j, playerOneCode) * 100;
                    
                    // Prioritize pieces that block bot's potential mills
                    score += evaluateThreats(i, j, playerTwoCode) * 50;
                    
                    // Prioritize corner and center positions
                    if ((i === 0 || i === 6) && (j === 0 || j === 6)) score += 30;
                    if (i === 3 || j === 3) score += 20;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestPieceToRemove = {x: i, y: j};
                    }
                }
            }
        }
    }

    if (bestPieceToRemove) {
        console.log(`Bot removing piece at (${bestPieceToRemove.x}, ${bestPieceToRemove.y})`);
        let {xCenter, yCenter} = getCenterCoordinates(bestPieceToRemove.x, bestPieceToRemove.y);
        
        // Clear the piece from the board
            clearBlock(xCenter, yCenter);
            
        // Update position matrix and counters
        positionMatrix[bestPieceToRemove.x][bestPieceToRemove.y] = 0;
            greenBlocks--;
            
        // Turn off mill state immediately
            isMillRed = false;
            
        // Update display
        document.getElementById("message").innerHTML = "Green block removed";
        document.getElementById("turn").innerHTML = player1Name;
        
        // Reset bot state
        window.isBotMoving = false;
        
        // Update the board
            update();
            
        // Switch turn to human player after piece removal
        numberOfTurns++;
        
        // Check for game over conditions
                checkGameOver();
        
        // Clear any existing bot move timeout
        if (window.botMoveTimeout) {
            clearTimeout(window.botMoveTimeout);
            window.botMoveTimeout = null;
        }
        
        // Force update the display to show it's human's turn
        setTimeout(() => {
            document.getElementById("turn").innerHTML = player1Name;
            document.getElementById("message").innerHTML = "Your turn to move";
        }, 100);
    } else {
        console.log('No valid piece to remove found');
        // Reset mill state and bot state
        isMillRed = false;
        window.isBotMoving = false;
        update();
    }
}

// Add meta tag to prevent mobile refresh on screen changes
function addMetaTags() {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    const orientationMeta = document.createElement('meta');
    orientationMeta.name = 'screen-orientation';
    orientationMeta.content = 'any';
    
    const x5Meta = document.createElement('meta');
    x5Meta.name = 'x5-orientation';
    x5Meta.content = 'any';
    
    document.head.appendChild(viewportMeta);
    document.head.appendChild(orientationMeta);
    document.head.appendChild(x5Meta);
}

// Add CSS to prevent mobile refresh behavior
const preventRefreshStyle = document.createElement('style');
preventRefreshStyle.textContent = `
    html, body {
        overscroll-behavior: none;
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
        touch-action: none;
    }
    #game-board {
        touch-action: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
    }
`;
document.head.appendChild(preventRefreshStyle);

// Add fallback board drawing function
function drawFallbackBoard() {
    // Draw the board lines
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    
    // Outer square
    context.beginPath();
    context.moveTo(25, 25);
    context.lineTo(525, 25);
    context.lineTo(525, 525);
    context.lineTo(25, 525);
    context.lineTo(25, 25);
    context.stroke();
    
    // Middle square
    context.beginPath();
    context.moveTo(115, 115);
    context.lineTo(435, 115);
    context.lineTo(435, 435);
    context.lineTo(115, 435);
    context.lineTo(115, 115);
    context.stroke();
    
    // Inner square
    context.beginPath();
    context.moveTo(195, 195);
    context.lineTo(355, 195);
    context.lineTo(355, 355);
    context.lineTo(195, 355);
    context.lineTo(195, 195);
    context.stroke();
    
    // Connecting lines
    context.beginPath();
    // Vertical middle lines
    context.moveTo(275, 25);
    context.lineTo(275, 195);
    context.moveTo(275, 355);
    context.lineTo(275, 525);
    // Horizontal middle lines
    context.moveTo(25, 275);
    context.lineTo(195, 275);
    context.moveTo(355, 275);
    context.lineTo(525, 275);
    context.stroke();
}

function drawPiecesInArea(x, y, size) {
    // Calculate matrix coordinates for this area
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] !== 0 && positionMatrix[i][j] !== -1) {
                let coords = getCoordinates(i, j);
                if (coords && 
                    coords.x >= x && coords.x <= x + size &&
                    coords.y >= y && coords.y <= y + size) {
                    // Redraw this piece
                    context.beginPath();
                    context.arc(coords.x, coords.y, blockWidth, 0, 2 * Math.PI, false);
                    context.fillStyle = positionMatrix[i][j] === playerOneCode ? '#2E7D32' : '#F44336';
                    context.fill();
                    context.lineWidth = strokeWidth;
                    context.strokeStyle = '#003300';
                    context.stroke();
                }
            }
        }
    }
}

function clearBlock(xI, yI) {
    console.log(`Clearing block at (${xI}, ${yI})`);
    clickSound.play();
    
    const clearSize = (blockWidth + strokeWidth) * 2;
    const x = xI - blockWidth - strokeWidth;
    const y = yI - blockWidth - strokeWidth;
    
    // Clear the area
    context.clearRect(x, y, clearSize, clearSize);
    
    // Always redraw the board image section
    if (boardImage.complete && boardImage.naturalWidth !== 0) {
        context.drawImage(boardImage,
                         x, y,
                         clearSize, clearSize,
                         x, y,
                        clearSize, clearSize);
    }
    
    // Find the matrix coordinates for this position
    let matrixX = -1, matrixY = -1;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            let coords = getCoordinates(i, j);
            if (coords && coords.x === xI && coords.y === yI) {
                matrixX = i;
                matrixY = j;
                break;
            }
        }
        if (matrixX !== -1) break;
    }
    
    // Update position matrix if we found the coordinates
    if (matrixX !== -1 && matrixY !== -1) {
        positionMatrix[matrixX][matrixY] = 0;
    }
    
    // Redraw any remaining pieces in this area
    drawPiecesInArea(x, y, clearSize);
    
    // Check for game over after piece removal
    checkGameOver();
    
    console.log('Block cleared and board image redrawn');
}

function drawBlock(x, y, X, Y) {
    console.log(`Drawing block at canvas (${x}, ${y}), matrix (${X}, ${Y})`);
    const currentPlayerCode = isActiveRed ? playerTwoCode : playerOneCode;
    
    const pieceSize = (blockWidth + strokeWidth) * 2;
    const pieceX = x - blockWidth - strokeWidth;
    const pieceY = y - blockWidth - strokeWidth;
    
    // Clear and redraw the board section first
    context.clearRect(pieceX, pieceY, pieceSize, pieceSize);
    
    // Always redraw the board image section
    if (boardImage.complete && boardImage.naturalWidth !== 0) {
        context.drawImage(boardImage,
                         pieceX, pieceY,
                         pieceSize, pieceSize,
                         pieceX, pieceY,
                         pieceSize, pieceSize);
    }
    
    // Redraw any other pieces in this area
    drawPiecesInArea(pieceX, pieceY, pieceSize);
    
    // Update the position matrix
    positionMatrix[X][Y] = currentPlayerCode;
    
    // Draw the new piece
    context.beginPath();
    context.arc(x, y, blockWidth, 0, 2 * Math.PI, false);
    context.fillStyle = isActiveRed ? '#F44336' : '#2E7D32';
    context.fill();
    context.lineWidth = strokeWidth;
    context.strokeStyle = '#003300';
    context.stroke();
    
    // Check for mill formation
    if (checkMill(X, Y, currentPlayerCode)) {
        console.log(`Mill formed at (${X}, ${Y}) for player ${currentPlayerCode}`);
        if (currentPlayerCode === playerOneCode) {
            isMillGreen = true;
            document.getElementById("turn").innerHTML = player1Name;
            document.getElementById("message").innerHTML = "A Mill is formed. Click on red block to remove it.";
    } else {
            isMillRed = true;
            document.getElementById("turn").innerHTML = player2Name;
            document.getElementById("message").innerHTML = "Bot is removing a piece...";
            // Reset bot state before removal
            window.isBotMoving = false;
            setTimeout(() => {
                makeBotRemoval();
            }, 500);
        }
        return; // Exit early to prevent state changes
    }

    isActiveGreen = false;
    isActiveRed = false;
    numberOfTurns++;
    
    // Check for game over after piece movement
    checkGameOver();
    
    update();
    console.log('Block drawn and board updated');
}

function checkMill(x, y, playerCode) {
    console.log(`Checking mill at (${x}, ${y}) for player ${playerCode}`);
    
    // Print current state for debugging
    console.log('Current position matrix state:');
    for (let i = 0; i < 7; i++) {
        console.log(`Row ${i}:`, positionMatrix[i].join(' '));
    }
    
    // Check vertical mills first
    // Outer vertical mills (y = 0 or y = 6)
    if (y === 0 || y === 6) {
        console.log(`Checking outer vertical mill at y=${y}`);
        if (positionMatrix[0][y] === playerCode &&
            positionMatrix[3][y] === playerCode &&
            positionMatrix[6][y] === playerCode) {
            console.log(`Found vertical outer mill at y=${y}`);
            return true;
        }
    }
    
    // Middle vertical mills (y = 1 or y = 5)
    if (y === 1 || y === 5) {
        console.log(`Checking middle vertical mill at y=${y}`);
        console.log(`Values: [${positionMatrix[1][y]}, ${positionMatrix[3][y]}, ${positionMatrix[5][y]}]`);
        if (positionMatrix[1][y] === playerCode &&
            positionMatrix[3][y] === playerCode &&
            positionMatrix[5][y] === playerCode) {
            console.log(`Found vertical middle mill at y=${y}`);
            return true;
        }
    }
    
    // Inner vertical mills (y = 2 or y = 4)
    if (y === 2 || y === 4) {
        console.log(`Checking inner vertical mill at y=${y}`);
        console.log(`Values: [${positionMatrix[2][y]}, ${positionMatrix[3][y]}, ${positionMatrix[4][y]}]`);
        if (positionMatrix[2][y] === playerCode &&
            positionMatrix[3][y] === playerCode &&
            positionMatrix[4][y] === playerCode) {
            console.log(`Found vertical inner mill at y=${y}`);
            return true;
        }
    }

    // Middle column vertical mills
    if (y === 3) {
        // Top side mill (positions 0, 1, 2)
        if (x <= 2 && positionMatrix[0][y] === playerCode &&
            positionMatrix[1][y] === playerCode &&
            positionMatrix[2][y] === playerCode) {
            console.log('Found vertical top middle mill');
            return true;
        }
        // Bottom side mill (positions 4, 5, 6)
        if (x >= 4 && positionMatrix[4][y] === playerCode &&
            positionMatrix[5][y] === playerCode &&
            positionMatrix[6][y] === playerCode) {
            console.log('Found vertical bottom middle mill');
            return true;
        }
    }
    
    // Check horizontal mills
    // Check if we're in a row that could have a mill (0, 3, or 6)
    if (x === 0 || x === 3 || x === 6) {
        console.log(`Checking outer horizontal mill at row ${x}`);
        // Check outer horizontal mills (positions 0, 3, 6 in the row)
        if (positionMatrix[x][0] === playerCode &&
            positionMatrix[x][3] === playerCode &&
            positionMatrix[x][6] === playerCode) {
            console.log(`Found horizontal outer mill in row ${x}`);
            return true;
        }
    }
    
    // Check if we're in a row that could have a middle mill (1, 5)
    if (x === 1 || x === 5) {
        console.log(`Checking middle horizontal mill at row ${x}`);
        // Check middle horizontal mills (positions 1, 3, 5 in the row)
        if (positionMatrix[x][1] === playerCode &&
            positionMatrix[x][3] === playerCode &&
            positionMatrix[x][5] === playerCode) {
            console.log(`Found horizontal middle mill in row ${x}`);
            return true;
        }
    }
    
    // Check if we're in a row that could have an inner mill (2, 4)
    if (x === 2 || x === 4) {
        console.log(`Checking inner horizontal mill at row ${x}`);
        // Check inner horizontal mills (positions 2, 3, 4 in the row)
        if (positionMatrix[x][2] === playerCode &&
            positionMatrix[x][3] === playerCode &&
            positionMatrix[x][4] === playerCode) {
            console.log(`Found horizontal inner mill in row ${x}`);
            return true;
        }
    }

    // Middle row horizontal mills
    if (x === 3) {
        // Left side mill (positions 0, 1, 2)
        if (y <= 2 && positionMatrix[x][0] === playerCode &&
            positionMatrix[x][1] === playerCode &&
            positionMatrix[x][2] === playerCode) {
            console.log('Found horizontal left middle mill');
            return true;
        }
        // Right side mill (positions 4, 5, 6)
        if (y >= 4 && positionMatrix[x][4] === playerCode &&
            positionMatrix[x][5] === playerCode &&
            positionMatrix[x][6] === playerCode) {
            console.log('Found horizontal right middle mill');
            return true;
        }
    }

    console.log('No mill found');
    return false;
}

function checkGameOver() {
    console.log('Checking game over conditions...');
    console.log(`Current state: redBlocks=${redBlocks}, greenBlocks=${greenBlocks}, turns=${numberOfTurns}`);

    let humanHasValidMoves = false;

    // Iterate over all positions to check if the human player has any valid moves
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === playerOneCode) {
                const validMoves = getValidMoves(i, j);
                if (validMoves.length > 0) {
                    humanHasValidMoves = true;
                    break;
                }
            }
        }
        if (humanHasValidMoves) break;
    }

    if (!humanHasValidMoves) {
        console.log('Human has no valid moves - bot wins');
        // Ensure resetGame is defined or handle the game over state appropriately
        if (typeof resetGame === 'function') {
            resetGame();
        } else {
            console.error('resetGame function is not defined');
        }
    }
}

function getValidMoves(x, y) {
    let moves = [];
    
    // Check all possible directions for a valid move
    const directions = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, // Vertical
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }  // Horizontal
    ];
    
    for (const { dx, dy } of directions) {
        const newX = x + dx;
        const newY = y + dy;
        if (newX >= 0 && newX < 7 && newY >= 0 && newY < 7 && positionMatrix[newX][newY] === 0) {
            moves.push({x: newX, y: newY});
        }
    }
    
    return moves;
}

function update() {
    // Clear any stuck bot state
    if (window.botMoveTimeout) {
        clearTimeout(window.botMoveTimeout);
        window.botMoveTimeout = null;
    }

    if (numberOfTurns % 2 !== 0) {
        document.getElementById("turn").innerHTML = player2Name;
        if (gameMode === 'bot') {
            document.getElementById("message").innerHTML = "Bot is thinking...";
            // Reset bot state if it's stuck
            if (window.isBotMoving) {
                console.log('Resetting stuck bot state');
                window.isBotMoving = false;
            }
            
            // Schedule bot's move if no mill is active and not already moving
            if (!isMillGreen && !isMillRed && !window.isBotMoving) {
                window.isBotMoving = true;
                window.botMoveTimeout = setTimeout(() => {
                    try {
                        if (numberOfTurns >= 18) {
                            makeBotMove();
                        } else {
                            makeBotPlacement();
                        }
                    } catch (error) {
                        console.error('Error in bot move:', error);
                        window.isBotMoving = false;
                    }
                }, 1000);
            }
        } else {
            document.getElementById("message").innerHTML = "Click on empty spot to place your piece";
        }
    } else {
        document.getElementById("turn").innerHTML = player1Name;
        document.getElementById("message").innerHTML = numberOfTurns >= 18 ? 
            "Select your piece to move" : "Click on empty spot to place your piece";
    }
    
    // Always ensure bot state is cleaned up if it's not bot's turn
    if (numberOfTurns % 2 === 0 && window.isBotMoving) {
        window.isBotMoving = false;
    }
}

canvas.addEventListener("click", mouseClick);

function mouseClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const X = (event.clientX - rect.left) * scaleX;
    const Y = (event.clientY - rect.top) * scaleY;
    
    console.log(`Click at screen coordinates: (${event.clientX}, ${event.clientY})`);
    console.log(`Translated to canvas coordinates: (${X}, ${Y})`);

    // Define the valid intersection points
    const intersections = [
        // Top row
        {x: 25, y: 25, moveX: 0, moveY: 0}, {x: 275, y: 25, moveX: 0, moveY: 3}, {x: 525, y: 25, moveX: 0, moveY: 6},
        // Second row
        {x: 115, y: 115, moveX: 1, moveY: 1}, {x: 275, y: 115, moveX: 1, moveY: 3}, {x: 435, y: 115, moveX: 1, moveY: 5},
        // Third row
        {x: 195, y: 195, moveX: 2, moveY: 2}, {x: 275, y: 195, moveX: 2, moveY: 3}, {x: 355, y: 195, moveX: 2, moveY: 4},
        // Middle row
        {x: 25, y: 275, moveX: 3, moveY: 0}, {x: 115, y: 275, moveX: 3, moveY: 1}, {x: 195, y: 275, moveX: 3, moveY: 2},
        {x: 355, y: 275, moveX: 3, moveY: 4}, {x: 435, y: 275, moveX: 3, moveY: 5}, {x: 525, y: 275, moveX: 3, moveY: 6},
        // Fifth row
        {x: 195, y: 355, moveX: 4, moveY: 2}, {x: 275, y: 355, moveX: 4, moveY: 3}, {x: 355, y: 355, moveX: 4, moveY: 4},
        // Sixth row
        {x: 115, y: 435, moveX: 5, moveY: 1}, {x: 275, y: 435, moveX: 5, moveY: 3}, {x: 435, y: 435, moveX: 5, moveY: 5},
        // Bottom row
        {x: 25, y: 525, moveX: 6, moveY: 0}, {x: 275, y: 525, moveX: 6, moveY: 3}, {x: 525, y: 525, moveX: 6, moveY: 6}
    ];

    // Find the closest intersection point
    const clickRange = 40; // Acceptable click distance from intersection
    let closestPoint = null;
    let minDistance = clickRange;

    for (const point of intersections) {
        const distance = Math.sqrt(Math.pow(X - point.x, 2) + Math.pow(Y - point.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
            closestPoint = point;
        }
    }

    // If we found a close enough intersection point, make the move
    if (closestPoint) {
        console.log(`Making move at board position (${closestPoint.moveX}, ${closestPoint.moveY})`);
        makeMove(closestPoint.moveX, closestPoint.moveY);
    }
}

window.onload = function() {
    addMetaTags();
    canvas = document.getElementById("myCanvas");
    context = canvas.getContext("2d");
    
    // Enable image smoothing for better quality
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    // Initialize game board
    initializeGame();
    
    // Load and draw the board
    boardImage = new Image();
    boardImage.src = 'main.png';
    boardImage.onload = function() {
        drawBoard();
    };
    boardImage.onerror = function() {
        console.error('Failed to load board image');
        drawFallbackBoard();
    };
    
    // Add event listeners for game mode buttons
    document.querySelectorAll('.game-mode-btn').forEach(button => {
        button.addEventListener('click', function() {
            const mode = this.textContent.toLowerCase().includes('bot') ? 'bot' : 'human';
            selectMode(mode);
        });
    });
    
    document.querySelector('.start-game-btn').addEventListener('click', startGame);
    
    window.addEventListener('unload', cleanup);
    
    // Initialize bot state
    window.isBotMoving = false;
    window.lastBotMove = 0;
};

// Add helper function to load images
function loadImage(img) {
    return new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
    });
}

function handlePieceSelection(X, Y, xCenter, yCenter) {
    console.log(`Selecting piece at (${X}, ${Y})`);
    
    // Check if the selected piece belongs to the current player
    const currentPlayerCode = numberOfTurns % 2 === 0 ? playerOneCode : playerTwoCode;
    if (positionMatrix[X][Y] !== currentPlayerCode) {
        console.log('Invalid piece selection - wrong player');
        document.getElementById("message").innerHTML = "Select your own piece to move";
        return;
    }

    // If clicking the same piece that was already selected, deselect it
    if (X === lastX && Y === lastY && lastCenterX !== 0 && lastCenterY !== 0) {
        console.log('Deselecting piece');
        
        // Reset active states first
        isActiveGreen = false;
        isActiveRed = false;
        
        // Clear the highlight
        const pieceSize = (blockWidth + strokeWidth) * 2;
        const pieceX = lastCenterX - blockWidth - strokeWidth;
        const pieceY = lastCenterY - blockWidth - strokeWidth;
        
        // Redraw the board section
        context.clearRect(pieceX, pieceY, pieceSize, pieceSize);
        if (boardImage.complete && boardImage.naturalWidth !== 0) {
            context.drawImage(boardImage,
                            pieceX, pieceY,
                            pieceSize, pieceSize,
                            pieceX, pieceY,
                            pieceSize, pieceSize);
        }
        
        // Redraw the piece without highlight
        drawPiecesInArea(pieceX, pieceY, pieceSize);
        
        // Reset selection state
        lastX = 0;
        lastY = 0;
        lastCenterX = 0;
        lastCenterY = 0;
        
        // Update message
        document.getElementById("message").innerHTML = "Select your piece to move";
        return;
    }

    // If a different piece was previously selected, clear its highlight
    if (lastCenterX !== 0 && lastCenterY !== 0) {
        // Redraw the board section to clear the highlight
        const pieceSize = (blockWidth + strokeWidth) * 2;
        const pieceX = lastCenterX - blockWidth - strokeWidth;
        const pieceY = lastCenterY - blockWidth - strokeWidth;
        
        context.clearRect(pieceX, pieceY, pieceSize, pieceSize);
        
        if (boardImage.complete && boardImage.naturalWidth !== 0) {
            context.drawImage(boardImage,
                            pieceX, pieceY,
                            pieceSize, pieceSize,
                            pieceX, pieceY,
                            pieceSize, pieceSize);
        }
        
        // Redraw the piece without highlight
        drawPiecesInArea(pieceX, pieceY, pieceSize);
    }

    // Set the active state based on current player
    if (currentPlayerCode === playerOneCode) {
        isActiveGreen = true;
        isActiveRed = false;
    } else {
        isActiveRed = true;
        isActiveGreen = false;
    }

    // Store the selected piece's position
    lastX = X;
    lastY = Y;
    lastCenterX = xCenter;
    lastCenterY = yCenter;

    // Highlight the selected piece
    context.beginPath();
    context.arc(xCenter, yCenter, blockWidth + 2, 0, 2 * Math.PI, false);
    context.strokeStyle = '#FFD700';
    context.lineWidth = 3;
    context.stroke();

    // Update message
    document.getElementById("message").innerHTML = "Select an empty spot to move your piece";
}

function handlePieceMovement(X, Y, xCenter, yCenter) {
    console.log(`Moving piece from (${lastX}, ${lastY}) to (${X}, ${Y})`);
    
    // Check if the move is valid
    if (!isValidMove(lastX, lastY, X, Y)) {
        console.log('Invalid move - not adjacent or not flying');
        document.getElementById("message").innerHTML = "Invalid move! Select a valid position";
        return;
    }

    // Store the current player code before clearing the piece
    const currentPlayerCode = numberOfTurns % 2 === 0 ? playerOneCode : playerTwoCode;
    
    // Update the position matrix first
    positionMatrix[lastX][lastY] = 0;
    positionMatrix[X][Y] = currentPlayerCode;
    
    // Clear the old position
    clearBlock(lastCenterX, lastCenterY);
    
    // Draw the piece in the new position
    drawBlock(xCenter, yCenter, X, Y);
    
    // Check if human player has any valid moves after this move
    let hasValidMove = false;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === playerOneCode) {
                let moves = getPossibleMoves(i, j);
                if (moves.length > 0) {
                    hasValidMove = true;
                    break;
                }
            }
        }
        if (hasValidMove) break;
    }
    
    if (!hasValidMove) {
        console.log('No valid moves found for human player - declaring bot winner');
        showGameEndScreen(player2Name, `No possible moves left for ${player1Name}`);
        return;
    }
    
    // Check for game over conditions
    checkGameOver();
}

function isValidMove(fromX, fromY, toX, toY) {
    console.log(`Checking if move from (${fromX}, ${fromY}) to (${toX}, ${toY}) is valid`);
    
    // If player has only 3 pieces left, they can fly to any empty spot
    const currentPlayerCode = numberOfTurns % 2 === 0 ? playerOneCode : playerTwoCode;
    const piecesLeft = currentPlayerCode === playerOneCode ? greenBlocks : redBlocks;
    
    if (piecesLeft === 3) {
        console.log('Player has 3 pieces left - flying mode enabled');
        return positionMatrix[toX][toY] === 0 && referenceMatrix[toX][toY] === 0;
    }

    // Check if the move is to an adjacent position
    const possibleMoves = getPossibleMoves(fromX, fromY);
    console.log('Possible moves:', possibleMoves);
    
    const isValid = possibleMoves.some(move => move.x === toX && move.y === toY);
    console.log('Move is valid:', isValid);
    return isValid;
}
