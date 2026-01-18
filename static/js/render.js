/**
 * Logic for rendering cars and lanes. Mostly AI generated.
 */

const LANE_HEIGHT = 40;
const LANE_PADDING = 2;
const SPACE_WIDTH = 40;

// Car dimensions: length along X (direction of travel), height along Y
const CAR_LENGTH = 32;
const CAR_HEIGHT = 14;

// Lerp speed (0-1, higher = faster interpolation)
const LERP_SPEED = 0.15;

// Blinker animation (shared across all simulations)
let blinkerState = false;
let lastBlinkerToggle = 0;
const BLINKER_INTERVAL = 400; // ms

/**
 * Linear interpolation between two values
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Draw a cartoonish car with wheels and details
 * Car faces RIGHT (toward +X / +laneX)
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Car} car - The car to draw.
 * @param {number} x - X position.
 * @param {number} y - Y position.
 */
function drawCar(ctx, car, x, y) {
    const bodyColor = car.color;
    const darkColor = darkenColor(bodyColor, 0.2);
    const lightColor = lightenColor(bodyColor, 0.15);

    // Car dimensions (length along X, height along Y)
    const len = CAR_LENGTH;
    const h = CAR_HEIGHT;
    const wheelRadius = 4;
    const wheelWidth = 3;
    const wheelInset = 6;

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + len/2 + 2, y + h/2 + 2, len/2 - 2, h/2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw wheels (visible at top and bottom of car)
    ctx.fillStyle = '#222';
    // Front top wheel (right side of car, top)
    ctx.beginPath();
    ctx.ellipse(x + len - wheelInset, y - 1, wheelRadius, wheelWidth, 0, 0, Math.PI * 2);
    ctx.fill();
    // Front bottom wheel (right side of car, bottom)
    ctx.beginPath();
    ctx.ellipse(x + len - wheelInset, y + h + 1, wheelRadius, wheelWidth, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rear top wheel (left side of car, top)
    ctx.beginPath();
    ctx.ellipse(x + wheelInset, y - 1, wheelRadius, wheelWidth, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rear bottom wheel (left side of car, bottom)
    ctx.beginPath();
    ctx.ellipse(x + wheelInset, y + h + 1, wheelRadius, wheelWidth, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw wheel rims/hubcaps
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.ellipse(x + len - wheelInset, y - 1, wheelRadius/2, wheelWidth/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + len - wheelInset, y + h + 1, wheelRadius/2, wheelWidth/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + wheelInset, y - 1, wheelRadius/2, wheelWidth/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + wheelInset, y + h + 1, wheelRadius/2, wheelWidth/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw car body (rounded rectangle)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(x, y, len, h, 3);
    ctx.fill();

    // Draw body outline
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, len, h, 3);
    ctx.stroke();

    // Draw hood (front section - right side)
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.roundRect(x + len - 8, y + 2, 6, h - 4, 2);
    ctx.fill();

    // Draw windshield (front window - facing right)
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.roundRect(x + len - 14, y + 2, 5, h - 4, 1);
    ctx.fill();
    // Windshield shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(x + len - 13, y + 3, 2, 3);

    // Draw roof/cabin area (middle section)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 2, len - 26, h - 4, 1);
    ctx.fill();

    // Draw rear window (back - facing left)
    ctx.fillStyle = '#87CEEB';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 2, 5, h - 4, 1);
    ctx.fill();

    // Draw headlights (at front/right of car)
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.ellipse(x + len - 1, y + 3, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + len - 1, y + h - 3, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw taillights (at rear/left of car)
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 3, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 1, y + h - 3, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw blinker lights if indicating (left side blinkers for merging left/up)
    if (car.isIndicating() && blinkerState) {
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 8;

        // Front left blinker (top-right corner)
        ctx.beginPath();
        ctx.ellipse(x + len - 3, y - 1, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rear left blinker (top-left corner)
        ctx.beginPath();
        ctx.ellipse(x + 3, y - 1, 2, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
    }
}

/**
 * Updates visual positions of all cars using lerping
 * @param {Road} road - The road containing cars to update.
 */
function updateVisualPositions(road) {
    for (let car of road.cars) {
        // Calculate target position (car length extends along X axis)
        const targetX = car.lanePosX * SPACE_WIDTH - CAR_LENGTH / 2 + SPACE_WIDTH / 2;
        const targetY = car.laneNumber * LANE_HEIGHT + LANE_PADDING +
                       (LANE_HEIGHT - LANE_PADDING * 2 - CAR_HEIGHT) / 2;

        // Initialize visual position if first time
        if (!car.visualInitialized) {
            car.visualX = targetX;
            car.visualY = targetY;
            car.visualInitialized = true;
        } else {
            // Lerp towards target
            car.visualX = lerp(car.visualX, targetX, LERP_SPEED);
            car.visualY = lerp(car.visualY, targetY, LERP_SPEED);
        }
    }
}

/**
 * Update blinker animation state
 */
function updateBlinker(currentTime) {
    if (currentTime - lastBlinkerToggle > BLINKER_INTERVAL) {
        blinkerState = !blinkerState;
        lastBlinkerToggle = currentTime;
    }
}

/**
 * Renders the road and all cars on it.
 * @param {Road} road - Road object to render.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 */
function renderRoad(road, ctx, canvas) {
    const currentTime = performance.now();

    // Update blinker state
    updateBlinker(currentTime);

    // Update visual positions with lerping
    updateVisualPositions(road);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let roadSpace = road.roadSpace;
    let numLanes = roadSpace.length;

    // Draw road background with gradient
    const roadGradient = ctx.createLinearGradient(0, 0, 0, numLanes * LANE_HEIGHT);
    roadGradient.addColorStop(0, '#444');
    roadGradient.addColorStop(0.5, '#333');
    roadGradient.addColorStop(1, '#444');
    ctx.fillStyle = roadGradient;
    ctx.fillRect(0, 0, canvas.width, numLanes * LANE_HEIGHT);

    // Draw lane dividers
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([20, 15]);
    ctx.lineWidth = 2;
    for (let i = 1; i < numLanes; i++) {
        let y = i * LANE_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw blockages
    for (let lane = 0; lane < numLanes; lane++) {
        let laneData = roadSpace[lane];
        for (let x = 0; x < laneData.length; x++) {
            let cell = laneData[x];
            if (cell === 0) {
                // Blockage with stripes
                let posX = x * SPACE_WIDTH;
                let posY = lane * LANE_HEIGHT + LANE_PADDING;

                ctx.fillStyle = '#ff4444';
                ctx.fillRect(posX, posY, SPACE_WIDTH, LANE_HEIGHT - LANE_PADDING * 2);

                // Add warning stripes
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(posX, posY);
                ctx.lineTo(posX + SPACE_WIDTH, posY + LANE_HEIGHT - LANE_PADDING * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(posX + SPACE_WIDTH, posY);
                ctx.lineTo(posX, posY + LANE_HEIGHT - LANE_PADDING * 2);
                ctx.stroke();
            }
        }
    }

    // Draw all cars using their lerped visual positions
    for (let car of road.cars) {
        drawCar(ctx, car, car.visualX, car.visualY);
    }
}
