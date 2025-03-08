const PLAYER = {
  HUMAN: 1,
  BOT: 2
};

let gameMode = null;
let currentPlayer = PLAYER.HUMAN;
let player1Name = 'Player 1';
let player2Name = 'Player 2';
let playerOneCode = 1;
let playerTwoCode = 2;
let redBlocks = 0;
let greenBlocks = 0;
let isMillRed = false;
let isMillGreen = false;
let isActiveRed = false;
let isActiveGreen = false;
let isGreenThreeLeft = false;
let isRedThreeLeft = false;
let blockWidth = 16;
let strokeWidth = 2;
let lastX = 0;
let lastY = 0;
let lastCenterX = 0;
let lastCenterY = 0;
let numberOfTurns = 0;
let rows = 7;
let columns = 7;
let clickSound;
let positionMatrix = new Array(7);
let referenceMatrix = new Array(7);
let canvas = document.getElementById("myCanvas");
let context = canvas.getContext("2d");
let selectedPiece = null;

// Initialize game board background
let boardImage = new Image();
boardImage.src = 'main.png';
boardImage.onload = function() {
    context.drawImage(boardImage, 0, 0, 550, 550);
};

// Set background
document.body.style.backgroundImage = "url('background.jpg')";
document.body.style.backgroundSize = "cover";

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

function initializeGame() {
    clickSound = new Audio("sound.wav");
    initializeArray();
    context.drawImage(boardImage, 0, 0, 550, 550);
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

function makeMove(X, Y) {
    let xCenter, yCenter;
    [xCenter, yCenter] = getCoordinates(X, Y);

    if (!xCenter || !yCenter) return;

    if (isMillGreen || isMillRed) {
        handleMillRemoval(X, Y, xCenter, yCenter);
    } else if (numberOfTurns < 18 && positionMatrix[X][Y] === 0) {
        placePiece(X, Y, xCenter, yCenter);
    } else if (numberOfTurns >= 18) {
        handleMovementPhase(X, Y, xCenter, yCenter);
    }
}

function handleMillRemoval(X, Y, xCenter, yCenter) {
    const playerToRemove = isMillGreen ? playerTwoCode : playerOneCode;
    
    if (positionMatrix[X][Y] === playerToRemove) {
        if (!checkMill(X, Y, playerToRemove) || allArePartOfMill(playerToRemove)) {
            clickSound.play();
            if (playerToRemove === playerTwoCode) {  // Removing red piece
                redBlocks--;
                document.getElementById("message").innerHTML = "Red block removed";
                clearBlock(xCenter, yCenter);
                positionMatrix[X][Y] = 0;
                isMillGreen = false;
                
                if (checkGameOver()) return;
                
                currentPlayer = PLAYER.BOT;
                if (gameMode === 'bot') {
                    document.getElementById("message").innerHTML = "Bot is thinking...";
                    setTimeout(makeBotMove, 1000);
                } else {
                    document.getElementById("message").innerHTML = player2Name + "'s turn";
                }
            } else {  // Removing green piece
                greenBlocks--;
                document.getElementById("message").innerHTML = "Green block removed";
                clearBlock(xCenter, yCenter);
                positionMatrix[X][Y] = 0;
                isMillRed = false;
                
                if (checkGameOver()) return;
                
                currentPlayer = PLAYER.HUMAN;
                document.getElementById("message").innerHTML = player1Name + "'s turn";
            }
            updateTurnDisplay();
            
            // Redraw the board at the cleared location
            context.drawImage(boardImage, 
                xCenter - blockWidth - strokeWidth, 
                yCenter - blockWidth - strokeWidth,
                2 * (blockWidth + strokeWidth),
                2 * (blockWidth + strokeWidth),
                xCenter - blockWidth - strokeWidth,
                yCenter - blockWidth - strokeWidth,
                2 * (blockWidth + strokeWidth),
                2 * (blockWidth + strokeWidth)
            );
        } else {
            document.getElementById("message").innerHTML = "Can't remove a piece which is part of a mill";
        }
    } else if (positionMatrix[X][Y] === 0) {
        document.getElementById("message").innerHTML = "Click on an opponent's piece to remove it";
    } else {
        document.getElementById("message").innerHTML = "You must remove opponent's piece";
    }
}

function handleMovementPhase(X, Y, xCenter, yCenter) {
    if ((currentPlayer === PLAYER.HUMAN && positionMatrix[X][Y] === playerOneCode) || 
        (currentPlayer === PLAYER.BOT && positionMatrix[X][Y] === playerTwoCode && gameMode !== 'bot')) {
        // Select piece
        if (selectedPiece) {
            turnOffActive(selectedPiece.centerX, selectedPiece.centerY);
        }
        selectedPiece = { x: X, y: Y, centerX: xCenter, centerY: yCenter };
        isActiveGreen = currentPlayer === PLAYER.HUMAN;
        isActiveRed = currentPlayer === PLAYER.BOT;
        
        const piecesLeft = currentPlayer === PLAYER.HUMAN ? greenBlocks : redBlocks;
        if (piecesLeft === 3) {
            document.getElementById("message").innerHTML = 
                `${currentPlayer === PLAYER.HUMAN ? "Green" : "Red"} can now move anywhere (3 are left only)`;
        } else {
            document.getElementById("message").innerHTML = "Move one step by clicking on Block";
        }
        
        // Highlight selected piece
        context.beginPath();
        context.arc(xCenter, yCenter, blockWidth, 0, 2 * Math.PI, false);
        context.fillStyle = currentPlayer === PLAYER.HUMAN ? '#AED581' : '#FFCDD2';
        context.fill();
        context.lineWidth = strokeWidth;
        context.strokeStyle = '#003300';
        context.stroke();
    } else if (positionMatrix[X][Y] === 0 && selectedPiece) {
        // Check if move is valid
        if (isValidMove(selectedPiece.x, selectedPiece.y, X, Y)) {
            // Move the piece
            clearBlock(selectedPiece.centerX, selectedPiece.centerY);
            positionMatrix[selectedPiece.x][selectedPiece.y] = 0;
            positionMatrix[X][Y] = currentPlayer === PLAYER.HUMAN ? playerOneCode : playerTwoCode;
            
            // Draw the piece in new position
            context.beginPath();
            context.arc(xCenter, yCenter, blockWidth, 0, 2 * Math.PI, false);
            context.fillStyle = currentPlayer === PLAYER.HUMAN ? '#2E7D32' : '#F44336';
            context.fill();
            context.lineWidth = strokeWidth;
            context.strokeStyle = '#003300';
            context.stroke();
            
            // Check for mill
            if (checkMill(X, Y, currentPlayer === PLAYER.HUMAN ? playerOneCode : playerTwoCode)) {
                if (currentPlayer === PLAYER.HUMAN) {
                    isMillGreen = true;
                    document.getElementById("message").innerHTML = "A Mill is formed. Click on red block to remove it.";
                } else {
                    isMillRed = true;
                    if (gameMode === 'bot') {
                        setTimeout(() => {
                            removeBestHumanPiece();
                            isMillRed = false;
                            currentPlayer = PLAYER.HUMAN;
                            document.getElementById('message').innerHTML = "Your turn";
                            updateTurnDisplay();
                        }, 500);
                    } else {
                        document.getElementById("message").innerHTML = "A Mill is formed. Click on green block to remove it.";
                    }
                }
            } else {
                if (gameMode === 'bot' && currentPlayer === PLAYER.HUMAN) {
                    currentPlayer = PLAYER.BOT;
                    document.getElementById("message").innerHTML = "Bot is thinking...";
                    setTimeout(makeBotMove, 1000);
                } else {
                    currentPlayer = currentPlayer === PLAYER.HUMAN ? PLAYER.BOT : PLAYER.HUMAN;
                    document.getElementById("message").innerHTML = 
                        `${currentPlayer === PLAYER.HUMAN ? player1Name : player2Name}'s turn`;
                }
            }
            
            isActiveGreen = false;
            isActiveRed = false;
            selectedPiece = null;
            clickSound.play();
            updateTurnDisplay();
        }
    }
}

function isValidMove(fromX, fromY, toX, toY) {
    if (numberOfTurns < 18) return false;
    
    // If only 3 pieces left, can move anywhere
    if (greenBlocks === 3) {
        return positionMatrix[toX][toY] === 0 && referenceMatrix[toX][toY] === 0;
    }
    
    // Check if move is to adjacent position
    if ((fromX === toX) || (fromY === toY)) {
        if (fromX === 0 || fromX === 6 || fromY === 0 || fromY === 6) {
            return ((Math.abs(fromX - toX) + Math.abs(fromY - toY)) === 3) || 
                   ((Math.abs(fromX - toX) + Math.abs(fromY - toY)) === 1);
        } else if (fromX === 1 || fromX === 5 || fromY === 1 || fromY === 5) {
            return ((Math.abs(fromX - toX) + Math.abs(fromY - toY)) === 2) || 
                   ((Math.abs(fromX - toX) + Math.abs(fromY - toY)) === 1);
        } else if (fromX === 2 || fromX === 4 || fromY === 2 || fromY === 4) {
            return ((Math.abs(fromX - toX) + Math.abs(fromY - toY)) === 1);
        }
    }
    
    return false;
}

function turnOffActive(x, y) {
    clickSound.play();
    context.beginPath();
    context.arc(x, y, blockWidth, 0, 2 * Math.PI, false);
    context.fillStyle = '#2E7D32';  // Return to original green color
    context.fill();
    context.lineWidth = strokeWidth;
    context.strokeStyle = '#003300';
    context.stroke();
    isActiveGreen = false;
}

function placePiece(X, Y, xCenter, yCenter) {
    clickSound.play();
    if (currentPlayer === PLAYER.HUMAN) {  // Player 1's turn (Green)
        greenBlocks++;
        positionMatrix[X][Y] = playerOneCode;
        drawPiece(xCenter, yCenter, '#2E7D32');
        if (checkMill(X, Y, playerOneCode)) {
            isMillGreen = true;
            document.getElementById('message').innerHTML = "A Mill is formed. Click on red block to remove it.";
        } else {
            currentPlayer = PLAYER.BOT;
            if (gameMode === 'bot') {
                document.getElementById('message').innerHTML = "Bot is thinking...";
                setTimeout(makeBotMove, 1000);
            } else {
                document.getElementById('message').innerHTML = player2Name + "'s turn";
            }
            updateTurnDisplay();
        }
    } else {  // Player 2's/Bot's turn (Red)
        redBlocks++;
        positionMatrix[X][Y] = playerTwoCode;
        drawPiece(xCenter, yCenter, '#F44336');
        if (checkMill(X, Y, playerTwoCode)) {
            isMillRed = true;
            if (gameMode === 'bot') {
                setTimeout(() => {
                    removeBestHumanPiece();
                    isMillRed = false;
                    currentPlayer = PLAYER.HUMAN;
                    document.getElementById('message').innerHTML = "Your turn";
                    updateTurnDisplay();
                }, 500);
            } else {
                document.getElementById('message').innerHTML = "A Mill is formed. Click on green block to remove it.";
            }
        } else {
            currentPlayer = PLAYER.HUMAN;
            document.getElementById('message').innerHTML = player1Name + "'s turn";
            updateTurnDisplay();
        }
    }
    numberOfTurns++;
    updateTurnDisplay();
}

function removeBestHumanPiece() {
    // First try to remove pieces that aren't part of a mill
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === playerOneCode) {
                if (!checkMill(i, j, playerOneCode)) {
                    const [xCenter, yCenter] = getCoordinates(i, j);
                    if (xCenter && yCenter) {
                        clearBlock(xCenter, yCenter);
                        positionMatrix[i][j] = 0;
                        greenBlocks--;
                        document.getElementById("message").innerHTML = "Bot removed a green piece";
                        
                        if (checkGameOver()) return;
                        
                        // Redraw the board image at the cleared location
                        context.drawImage(boardImage, 
                            xCenter - blockWidth - strokeWidth, 
                            yCenter - blockWidth - strokeWidth,
                            2 * (blockWidth + strokeWidth),
                            2 * (blockWidth + strokeWidth),
                            xCenter - blockWidth - strokeWidth,
                            yCenter - blockWidth - strokeWidth,
                            2 * (blockWidth + strokeWidth),
                            2 * (blockWidth + strokeWidth)
                        );
                        return;
                    }
                }
            }
        }
    }

    // If all pieces are part of mills, remove any piece
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === playerOneCode) {
                const [xCenter, yCenter] = getCoordinates(i, j);
                if (xCenter && yCenter) {
                    clearBlock(xCenter, yCenter);
                    positionMatrix[i][j] = 0;
                    greenBlocks--;
                    document.getElementById("message").innerHTML = "Bot removed a green piece from a mill";
                    
                    if (checkGameOver()) return;
                    
                    // Redraw the board image at the cleared location
                    context.drawImage(boardImage, 
                        xCenter - blockWidth - strokeWidth, 
                        yCenter - blockWidth - strokeWidth,
                        2 * (blockWidth + strokeWidth),
                        2 * (blockWidth + strokeWidth),
                        xCenter - blockWidth - strokeWidth,
                        yCenter - blockWidth - strokeWidth,
                        2 * (blockWidth + strokeWidth),
                        2 * (blockWidth + strokeWidth)
                    );
                    return;
                }
            }
        }
    }
}

function clearBlock(xCenter, yCenter) {
    context.clearRect(
        xCenter - blockWidth - strokeWidth,
        yCenter - blockWidth - strokeWidth,
        2 * (blockWidth + strokeWidth),
        2 * (blockWidth + strokeWidth)
    );
}

function highlightPiece(xCenter, yCenter) {
    context.beginPath();
    context.arc(xCenter, yCenter, blockWidth, 0, 2 * Math.PI, false);
    context.fillStyle = '#AED581';  // Light green for highlight
    context.fill();
    context.lineWidth = strokeWidth;
    context.strokeStyle = '#003300';
    context.stroke();
}

function drawPiece(xCenter, yCenter, color) {
    context.beginPath();
    context.arc(xCenter, yCenter, blockWidth, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = strokeWidth;
    context.strokeStyle = '#003300';
    context.stroke();
}

function countMills(player) {
    let mills = 0;
    
    // Check horizontal mills
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
            if (positionMatrix[i][j] === player &&
                positionMatrix[i][j+1] === player &&
                positionMatrix[i][j+2] === player) {
                mills++;
            }
        }
    }
    
    // Check vertical mills
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
            if (positionMatrix[j][i] === player &&
                positionMatrix[j+1][i] === player &&
                positionMatrix[j+2][i] === player) {
                mills++;
            }
        }
    }
    
    return mills;
}

function countPotentialMills(player) {
    let potential = 0;
    
    // Check horizontal potential mills
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
            let count = 0;
            let empty = 0;
            for (let k = 0; k < 3; k++) {
                if (positionMatrix[i][j+k] === player) count++;
                if (positionMatrix[i][j+k] === 0) empty++;
            }
            if (count === 2 && empty === 1) potential++;
        }
    }
    
    // Check vertical potential mills
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
            let count = 0;
            let empty = 0;
            for (let k = 0; k < 3; k++) {
                if (positionMatrix[j+k][i] === player) count++;
                if (positionMatrix[j+k][i] === 0) empty++;
            }
            if (count === 2 && empty === 1) potential++;
        }
    }
    
    return potential;
}

function allArePartOfMill(player) {
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === player && !checkMill(i, j, player)) {
                return false;
            }
        }
    }
    return true;
}

function evaluateBoard() {
    let score = 0;
    score += countMills(PLAYER.BOT) * 100;
    score -= countMills(PLAYER.HUMAN) * 100;
    score += redBlocks * 10;
    score -= greenBlocks * 10;
    score += countPotentialMills(PLAYER.BOT) * 50;
    score -= countPotentialMills(PLAYER.HUMAN) * 50;
    return score;
}

function findBestPlacement() {
    // Simple strategy: Look for a position that could form a mill
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === 0 && referenceMatrix[i][j] === 0) {
                // Try placing a piece here
                positionMatrix[i][j] = playerTwoCode;
                if (checkMill(i, j, playerTwoCode)) {
                    positionMatrix[i][j] = 0;
                    return { x: i, y: j };
                }
                positionMatrix[i][j] = 0;
            }
        }
    }
    
    // If no potential mill, place randomly on valid spot
    let validMoves = [];
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === 0 && referenceMatrix[i][j] === 0) {
                validMoves.push({ x: i, y: j });
            }
        }
    }
    
    if (validMoves.length > 0) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    return null;
}

function findBestMove() {
    let bestMove = null;
    let bestScore = -Infinity;
    
    // Check all bot pieces
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
            if (positionMatrix[i][j] === playerTwoCode) {
                // Get possible moves for this piece
                let moves = getPossibleMoves(i, j);
                for (let move of moves) {
                    // Try the move
                    positionMatrix[i][j] = 0;
                    positionMatrix[move.x][move.y] = playerTwoCode;
                    
                    // Evaluate position
                    let score = 0;
                    if (checkMill(move.x, move.y, playerTwoCode)) {
                        score += 100;
                    }
                    
                    // Undo move
                    positionMatrix[move.x][move.y] = 0;
                    positionMatrix[i][j] = playerTwoCode;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = {
                            from: { x: i, y: j },
                            to: { x: move.x, y: move.y }
                        };
                    }
                }
            }
        }
    }
    
    // If no good moves found, make a random valid move
    if (!bestMove) {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (positionMatrix[i][j] === playerTwoCode) {
                    let moves = getPossibleMoves(i, j);
                    if (moves.length > 0) {
                        let randomMove = moves[Math.floor(Math.random() * moves.length)];
                        bestMove = {
                            from: { x: i, y: j },
                            to: { x: randomMove.x, y: randomMove.y }
                        };
                        break;
                    }
                }
            }
            if (bestMove) break;
        }
    }
    
    return bestMove;
}

function getPossibleMoves(x, y) {
    let moves = [];
    
    // If only 3 pieces left, can move anywhere
    if (redBlocks === 3) {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (positionMatrix[i][j] === 0 && referenceMatrix[i][j] === 0) {
                    moves.push({x: i, y: j});
                }
            }
        }
        return moves;
    }
    
    // Check adjacent positions
    const directions = [[-1,0], [1,0], [0,-1], [0,1]];
    
    for (let [dx, dy] of directions) {
        let newX = x + dx;
        let newY = y + dy;
        
        if (newX >= 0 && newX < 7 && newY >= 0 && newY < 7) {
            if (positionMatrix[newX][newY] === 0 && referenceMatrix[newX][newY] === 0) {
                moves.push({x: newX, y: newY});
            }
        }
    }
    
    return moves;
}

function checkMill(x, y, playerCode) {
    //Using the fact that two mills cannot occur simultaneously
    var flag = 0;
    var temp = 0;
    
    //Traverse through the given row and check for mill
    for (var i = 0; i < 5; i++) {
        flag = 0;
        for (var j = temp; j < temp + 3; j++) {
            if (positionMatrix[j][y] === playerCode) {
                continue;
            } else {
                flag = 1;
                break;
            }
        }
        if (flag === 0) {
            return true;
        } else {
            temp++;
        }
    }

    flag = 0;
    temp = 0;
    //Now moving along the given column
    for (var k = 0; k < 5; k++) {
        flag = 0;
        for (var l = temp; l < temp + 3; l++) {
            if (positionMatrix[x][l] === playerCode) {
                continue;
            } else {
                flag = 1;
                break;
            }
        }
        if (flag === 0) {
            return true;
        } else {
            temp++;
        }
    }

    var check = true;
    var oppositeCode = (playerCode === playerOneCode) ? playerTwoCode : playerOneCode;
    
    // Check entire row
    for (var a = 0; a < 7; a++) {
        if ((positionMatrix[a][y] === oppositeCode) || (positionMatrix[a][y] === 0)) {
            check = false;
            break;
        }
    }
    if (check === true) {
        return true;
    }
    
    // Check entire column
    check = true;
    for (var b = 0; b < 7; b++) {
        if ((positionMatrix[x][b] === oppositeCode) || (positionMatrix[x][b] === 0)) {
            check = false;
            break;
        }
    }
    if (check === true) {
        return true;
    }

    return false;
}

function getCoordinates(X, Y) {
    const coordinates = {
        '0,0': [25, 25],
        '0,3': [275, 25],
        '0,6': [525, 25],
        '1,1': [115, 115],
        '1,3': [275, 115],
        '1,5': [435, 115],
        '2,2': [195, 195],
        '2,3': [275, 195],
        '2,4': [355, 195],
        '3,0': [25, 275],
        '3,1': [115, 275],
        '3,2': [195, 275],
        '3,4': [355, 275],
        '3,5': [435, 275],
        '3,6': [525, 275],
        '4,2': [195, 355],
        '4,3': [275, 355],
        '4,4': [355, 355],
        '5,1': [115, 435],
        '5,3': [275, 435],
        '5,5': [435, 435],
        '6,0': [25, 525],
        '6,3': [275, 525],
        '6,6': [525, 525]
    };

    const key = `${X},${Y}`;
    return coordinates[key] || [null, null];
}

function getClickPosition(X, Y) {
    const positions = [
        // Top row
        { x: 0, y: 0, bounds: [0, 50, 0, 50] },
        { x: 0, y: 3, bounds: [250, 300, 0, 50] },
        { x: 0, y: 6, bounds: [500, 550, 0, 50] },
        
        // Second row
        { x: 1, y: 1, bounds: [90, 140, 90, 140] },
        { x: 1, y: 3, bounds: [250, 300, 90, 140] },
        { x: 1, y: 5, bounds: [410, 460, 90, 140] },
        
        // Third row
        { x: 2, y: 2, bounds: [170, 220, 170, 220] },
        { x: 2, y: 3, bounds: [250, 300, 170, 220] },
        { x: 2, y: 4, bounds: [330, 380, 170, 220] },
        
        // Middle row
        { x: 3, y: 0, bounds: [0, 50, 250, 300] },
        { x: 3, y: 1, bounds: [90, 140, 250, 300] },
        { x: 3, y: 2, bounds: [170, 220, 250, 300] },
        { x: 3, y: 4, bounds: [330, 380, 250, 300] },
        { x: 3, y: 5, bounds: [410, 460, 250, 300] },
        { x: 3, y: 6, bounds: [500, 550, 250, 300] },
        
        // Fifth row
        { x: 4, y: 2, bounds: [170, 220, 330, 380] },
        { x: 4, y: 3, bounds: [250, 300, 330, 380] },
        { x: 4, y: 4, bounds: [330, 380, 330, 380] },
        
        // Sixth row
        { x: 5, y: 1, bounds: [90, 140, 410, 460] },
        { x: 5, y: 3, bounds: [250, 300, 410, 460] },
        { x: 5, y: 5, bounds: [410, 460, 410, 460] },
        
        // Bottom row
        { x: 6, y: 0, bounds: [0, 50, 500, 550] },
        { x: 6, y: 3, bounds: [250, 300, 500, 550] },
        { x: 6, y: 6, bounds: [500, 550, 500, 550] }
    ];

    for (let pos of positions) {
        const [minX, maxX, minY, maxY] = pos.bounds;
        if (X >= minX && X <= maxX && Y >= minY && Y <= maxY) {
            return pos;
        }
    }
    return null;
}

function updateTurnDisplay() {
    document.getElementById('turn').innerHTML = currentPlayer === PLAYER.HUMAN ? player1Name : player2Name;
}

function makeBotMove() {
    if (currentPlayer !== PLAYER.BOT) return;
    
    setTimeout(() => {
        if (isMillRed) {
            removeBestHumanPiece();
            isMillRed = false;
            currentPlayer = PLAYER.HUMAN;
            document.getElementById('message').innerHTML = "Your turn";
            updateTurnDisplay();
        } else if (numberOfTurns < 18) {
            // Placement phase - find best spot
            let bestMove = findBestPlacement();
            if (bestMove) {
                const [xCenter, yCenter] = getCoordinates(bestMove.x, bestMove.y);
                if (xCenter && yCenter) {
                    placePiece(bestMove.x, bestMove.y, xCenter, yCenter);
                }
            }
        } else {
            // Movement phase - find best move
            let bestMove = findBestMove();
            if (bestMove) {
                const [fromXCenter, fromYCenter] = getCoordinates(bestMove.from.x, bestMove.from.y);
                const [toXCenter, toYCenter] = getCoordinates(bestMove.to.x, bestMove.to.y);
                if (fromXCenter && fromYCenter && toXCenter && toYCenter) {
                    // Execute bot's move
                    clearBlock(fromXCenter, fromYCenter);
                    positionMatrix[bestMove.from.x][bestMove.from.y] = 0;
                    
                    // Redraw board and place new piece
                    context.drawImage(boardImage, 
                        fromXCenter - blockWidth - strokeWidth, 
                        fromYCenter - blockWidth - strokeWidth,
                        2 * (blockWidth + strokeWidth),
                        2 * (blockWidth + strokeWidth),
                        fromXCenter - blockWidth - strokeWidth,
                        fromYCenter - blockWidth - strokeWidth,
                        2 * (blockWidth + strokeWidth),
                        2 * (blockWidth + strokeWidth)
                    );
                    
                    positionMatrix[bestMove.to.x][bestMove.to.y] = playerTwoCode;
                    drawPiece(toXCenter, toYCenter, '#F44336');
                    clickSound.play();
                    
                    if (checkMill(bestMove.to.x, bestMove.to.y, playerTwoCode)) {
                        isMillRed = true;
                        setTimeout(() => {
                            removeBestHumanPiece();
                            isMillRed = false;
                            currentPlayer = PLAYER.HUMAN;
                            document.getElementById('message').innerHTML = "Your turn";
                            updateTurnDisplay();
                        }, 500);
                    } else {
                        currentPlayer = PLAYER.HUMAN;
                        document.getElementById('message').innerHTML = "Your turn";
                        updateTurnDisplay();
                    }
                }
            }
        }
    }, 1000);
}

canvas.addEventListener("click", function(event) {
    const rect = canvas.getBoundingClientRect();
    const X = event.clientX - rect.left;
    const Y = event.clientY - rect.top;
    
    if (X >= 0 && X <= 550 && Y >= 0 && Y <= 550) {
        const position = getClickPosition(X, Y);
        if (position) {
            makeMove(position.x, position.y);
        }
    }
});

window.onload = function() {
    canvas = document.getElementById("myCanvas");
    context = canvas.getContext("2d");
    boardImage.src = 'main.png';
};

// Add this function if you want to debug the click areas
function debugClickAreas() {
    positions.forEach(pos => {
        const [minX, maxX, minY, maxY] = pos.bounds;
        context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        context.strokeRect(minX, minY, maxX - minX, maxY - minY);
    });
}

function checkGameOver() {
    if (numberOfTurns >= 18) {  // Only check after placement phase
        if (redBlocks < 3) {
            if (gameMode === 'bot') {
                alert("Bot has less than 3 pieces left!\nCongratulations! You win!");
            } else {
                alert(`${player2Name} has less than 3 pieces left!\n${player1Name} wins!`);
            }
            location.reload();  // Restart game
            return true;
        } else if (greenBlocks < 3) {
            if (gameMode === 'bot') {
                alert("You have less than 3 pieces left!\nBot wins!");
            } else {
                alert(`${player1Name} has less than 3 pieces left!\n${player2Name} wins!`);
            }
            location.reload();  // Restart game
            return true;
        }
    }
    return false;
}