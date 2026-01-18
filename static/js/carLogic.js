/**
 * This file contains logic for car's decisions, used by both cars and roads. This is human
 * made.
 */

const SpaceType = {
    Cars: 'CARS',
    Blockage: 'BLOCKAGE',
    All: 'ALL',
    Empty: 'EMPTY'
}

// Rubbernecking effect: speed reduction factor when passing blockage zone (0.85 = 15% slower)
const RUBBERNECK_SPEED_FACTOR = 0.85;
// How many spaces past the blockage start the rubbernecking zone extends
const RUBBERNECK_ZONE_LENGTH = 8;

/**
 * Helper to get lane data.
 * @param road to get lane data from (Road object or roadSpace array).
 * @param lane to get lane data in.
 * @returns {number|Array} or -1 if lane data is invalid.
 */
function getLaneData(road, lane) {
    let roadSpace = road instanceof Road ? road.roadSpace : road;
    if (!(roadSpace instanceof Array)) {
        return -1;
    }
    let laneData = roadSpace[lane];

    if (!(laneData instanceof Array)) {
        return -1;
    }

    return laneData;
}

/**
 * Gets the following distance between a space in a line and the car or blockage in front.
 * @param road to check following distance on.
 * @param lane to check following distance in.
 * @param laneX position in lane to start following distance check.
 * @param targetSpace space to get distance to.
 */
function getDistance(road, lane, laneX, targetSpace) {
    let laneData = getLaneData(road, lane);
    if (!(laneData instanceof Array)) {
        return laneData;
    }

    let laneXSize = laneData.length;
    if (laneX + 1 >= laneXSize) {
        return -2;
    }

    let distance = 0;
    for (let space = laneX + 1; space < laneXSize; space++) {
        let cell = laneData[space];

        if (targetSpace === SpaceType.All && cell !== null) {
            // Found any obstacle (car or blockage)
            return distance;
        } else if (targetSpace === SpaceType.Blockage && cell === 0) {
            // Found a blockage
            return distance;
        } else if (targetSpace === SpaceType.Cars && cell instanceof Car) {
            // Found a car
            return distance;
        }
        distance++;
    }
    return 100;
}

/**
 * Gets the spaces to the left of a car that are open.
 * @param road to search on.
 * @param lane of car to search for.
 * @param laneX x position of car to search at.
 * @returns {*|{left_ahead: number, left_beside: number, left_behind: number}|number}
 */
function getLeftOpenSpaces(road, lane, laneX) {
    let laneOpenings = {
        "left_ahead": 0,
        "left_beside": 0,
        "left_behind": 0
    }

    let laneData = getLaneData(road, lane);
    if (!(laneData instanceof Array)) {
        return laneData;
    }

    let roadSpace = road instanceof Road ? road.roadSpace : road;
    let numberOfLanes = roadSpace.length;
    // Can't merge left if already in leftmost lane (index 0)
    if (lane <= 0) {
        return laneOpenings;
    }

    // Left lane = lower index (visually upward on screen)
    let leftLaneData = getLaneData(road, lane - 1);

    let laneSize = laneData.length;
    let leftLaneSize = leftLaneData.length;

    if (leftLaneSize !== laneSize) {
        return -1;
    } else if (laneX >= laneSize - 1) {
        return laneOpenings;
    }

    /* Check beside in left lane to see if there is space */
    let besideSpace = leftLaneData[laneX]
    if (besideSpace == null) {
        laneOpenings["left_beside"] = 1;
    } else {
        return laneOpenings;
    }

    /* Check ahead of left lane space to see how much space is available */
    let aheadSpaces = getDistance(road, lane - 1, laneX, SpaceType.All)
    if (aheadSpaces >= 0) {
        laneOpenings["left_ahead"] = aheadSpaces;
    }

    /* Checks behind of the left lane space to see how much space is available */
    let behindSpaces = 0;
    let leftLaneCheckIndex = laneX;
    while (leftLaneData[leftLaneCheckIndex] == null && leftLaneCheckIndex > 0) {
        behindSpaces += 1;
        leftLaneCheckIndex--;
    }
    laneOpenings["left_behind"] = behindSpaces;

    return laneOpenings;
}

/**
 * Calculates merge urgency factor based on distance to blockage.
 * As car gets closer to blockage, urgency increases (factor decreases).
 * @param car to check for.
 * @param road to check on.
 * @returns {number} urgency factor (1.0 = relaxed, 0.3 = desperate)
 */
function getMergeUrgency(car, road) {
    if (!(car instanceof Car) || !(road instanceof Road)) {
        return 1.0;
    }

    let distanceToBlockage = getDistance(road, car.getLaneN(), car.getLaneX(), SpaceType.Blockage);

    // If no blockage found or far away, no urgency
    if (distanceToBlockage < 0 || distanceToBlockage >= 100) {
        return 1.0;
    }

    // Urgency increases as distance decreases
    // At 20+ spaces: factor = 1.0 (relaxed)
    // At 10 spaces: factor = 0.7
    // At 5 spaces: factor = 0.5
    // At 2 spaces: factor = 0.3 (desperate)
    if (distanceToBlockage >= 20) {
        return 1.0;
    } else if (distanceToBlockage >= 10) {
        return 0.7 + (distanceToBlockage - 10) * 0.03;
    } else if (distanceToBlockage >= 5) {
        return 0.5 + (distanceToBlockage - 5) * 0.04;
    } else {
        return Math.max(0.3, 0.3 + (distanceToBlockage - 2) * 0.067);
    }
}

/**
 * Checks if the car can merge left.
 * @param car to check for.
 * @param road to check on.
 * @returns {boolean}
 */
function canMerge(car, road) {
    if (!(car instanceof Car)) {
        return false;
    }

    // Calculate urgency based on proximity to blockage
    let urgencyFactor = getMergeUrgency(car, road);

    // Get time-based desired spaces with urgency factor
    let desiredSpaces = car.getDesiredMergeSpace(road, urgencyFactor);

    // If traffic is moving slow enough, reduce requirements further
    let leftSpeed = getLeft10AverageSpeed(car, road);
    if (leftSpeed >= 0 && leftSpeed <= 1 && desiredSpaces > 2) {
        desiredSpaces = 2;
    }

    let spaces = getLeftOpenSpaces(road, car.getLaneN(), car.getLaneX());

    // Cooperative cars respect the quota system unless desperate
    if (!checkUnderCarLeftQuota(car, road, spaces) && leftSpeed <= MAX_SPEED / 2) {
        // TODO: Unsure if the quota system makes it more or less realistic. For now leaving
        // it disabled, as it seems to make it less.
        // return false;
    }

    try {
        let totSpaces = spaces["left_ahead"] + spaces["left_behind"] + spaces["left_beside"];
        if (totSpaces >= desiredSpaces) {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

/**
 * Checks if the car quota of the car that this car would be merging in front of is met.
 * @param car to check.
 * @param road to check.
 * @param spaces around the car.
 * @returns {boolean}
 */
function checkUnderCarLeftQuota(car, road, spaces) {
    if (!(car instanceof Car)) {
        return true;  // No valid car to check, allow merge
    }
    if (!(road instanceof Road)) {
        return true;  // No valid road, allow merge
    }

    let spacesBehind;
    try {
        spacesBehind = spaces["left_behind"];
    } catch (e) {
        return true;  // Can't get spaces, allow merge
    }

    if (spacesBehind <= 0) {
        return true;  // No space behind means no car to check, allow merge
    }

    let totLanes = road.roadSpace.length;
    let carLane = car.getLaneN();
    let carX = car.getLaneX();
    if (carLane <= 0 || carLane >= totLanes) {
        return true;  // Invalid lane, allow merge
    }
    let totLaneX = road.roadSpace[carLane - 1].length;
    let laneNCheck = carLane - 1;
    let laneXCheck = carX - spacesBehind;

    if (laneXCheck < 0 || laneNCheck >= totLaneX) {
        return true;  // Out of bounds, no car to check, allow merge
    }
    let target = road.roadSpace[laneNCheck][laneXCheck];
    if (target instanceof Car) {
        let quota = target.getCarQuota(road);
        let numberCars = target.getCarsLetIn();
        if (numberCars < quota) {
            return true;  // Car behind is under quota, they should yield, allow merge
        }
        return false;  // Car behind has met quota, don't merge in front of them
    }
    return true;  // No car behind, allow merge
}

/**
 * Checks if there exists a car in the lane to the right that should be let in.
 * @param car to check from.
 * @param road to check on.
 * @returns {boolean}
 */
function shouldLetCarIn(car, road) {
    if (!(road instanceof Road)) {
        return false;
    }
    if (!(car instanceof Car)) {
        return false;
    }
    if (car.getCarsLetIn() >= car.getCarQuota(road)) {
        return false;
    }

    let currentLane = car.getLaneN();
    let currentLaneX = car.getLaneX();

    let totLanes = road.roadSpace.length;
    if (currentLane >= totLanes - 1) {
        return false;
    }

    let nextLaneOver = road.roadSpace[currentLane + 1];
    let roadWidth = nextLaneOver.length;
    if (currentLaneX + 1 >= roadWidth - 1) {
        return false;
    }

    let distanceAhead = getDistance(road, currentLane + 1, currentLaneX + 1, SpaceType.All);
    if (distanceAhead < 0) {
        distanceAhead = roadWidth;
    }
    let roadXComp = Math.min(roadWidth, currentLaneX + 1 + distanceAhead);

    for (let i = currentLaneX + 1; i <= roadXComp; i++) {
        let space = nextLaneOver[i];
        if (space instanceof Car && space.isIndicating()) {
            return true;
        }
    }
    return false;
}

/**
 * Gets the average speed of cars in the left lane within 10 spaces of the car.
 * @param car to check from.
 * @param road to check on.
 * @returns {number} average speed, or -1 if no cars found.
 */
function getLeft10AverageSpeed(car, road) {
    if (!(car instanceof Car)) {
        return -1;
    }
    if (!(road instanceof Road)) {
        return -1;
    }

    let currentLane = car.getLaneN();
    let currentLaneX = car.getLaneX();

    // Can't check left if already in leftmost lane
    if (currentLane <= 0) {
        return -1;
    }

    let leftLane = road.roadSpace[currentLane - 1];
    let roadWidth = leftLane.length;

    // Check 10 spaces around the car's position
    let checkStart = Math.max(0, currentLaneX - 5);
    let checkEnd = Math.min(roadWidth, currentLaneX + 5);

    let totalSpeed = 0;
    let carCount = 0;

    for (let i = checkStart; i < checkEnd; i++) {
        let space = leftLane[i];
        if (space instanceof Car) {
            totalSpeed += space.speed;
            carCount++;
        }
    }

    if (carCount === 0) {
        return -1;
    }
    return totalSpeed / carCount;
}

/**
 * Alert the driver behind this car that a car has successfully merged.
 * @param car that has merged.
 * @param road road on which merge took place.
 * @param newLane the lane the car merged into.
 */
function alertRearDriver(car, road, newLane) {
    if (!(car instanceof Car)) {
        return;
    }
    if (!(road instanceof Road)) {
        return;
    }

    let currentLaneX = car.getLaneX();

    if (newLane < 0 || newLane >= road.roadSpace.length) {
        return;
    }
    if (currentLaneX <= 0) {
        return;
    }

    let lane = road.roadSpace[newLane];

    // Find the first car behind and alert them
    for (let i = currentLaneX - 1; i >= 0; i--) {
        let space = lane[i];
        if (space instanceof Car) {
            space.alertMerge();
            break;  // Only alert the first car behind
        }
    }
}

/**
 * Checks if a car is in the rubbernecking zone (passing the blockage area).
 * @param car to check.
 * @param road to check on.
 * @returns {boolean} true if in rubbernecking zone.
 */
function isInRubberneckZone(car, road) {
    if (!(car instanceof Car) || !(road instanceof Road)) {
        return false;
    }

    let carLane = car.getLaneN();
    let carX = car.getLaneX();
    let numLanes = road.roadSpace.length;

    // Only cars in non-blocked lanes (left lanes) rubberneck
    // Blocked lanes start from the right (highest indices)
    if (carLane >= numLanes - road.blockedLanes) {
        return false;
    }

    // Check if car is in the rubbernecking zone (just past where blockage starts)
    // BLOCK_START is defined in road.js as 40
    return carX >= BLOCK_START && carX < BLOCK_START + RUBBERNECK_ZONE_LENGTH;
}

/**
 * Speeds up or slows down car based on following distance and merge state.
 * @param car to effect speed of.
 * @param road to control speed off of.
 */
function effectSpeed(car, road) {
    if (!(car instanceof Car)) {
        return;
    }
    if (!(road instanceof Road)) {
        return;
    }

    let desiredDistance = car.getDesiredDistance(road);
    let actualDistanceSpaces = car.getActualDistance(road);

    // If error code returned, assume open road
    if (actualDistanceSpaces < 0) {
        return;
    }

    let actualDistanceFeet = actualDistanceSpaces * road.getSpaceSize();
    let difference = actualDistanceFeet - desiredDistance;

    // Speed matching: When merging, blend toward left lane speed
    if (car.getState() === State.Merge) {
        let leftLaneSpeed = getLeft10AverageSpeed(car, road);
        if (leftLaneSpeed >= 0) {
            // Calculate how much to adjust toward left lane speed
            let speedDiff = leftLaneSpeed - car.speed;
            // Blend: 30% toward left lane speed per update for smooth transition
            let speedMatchAdjustment = speedDiff * 0.3;
            // Combine following distance adjustment with speed matching
            // Weight speed matching more as urgency increases
            let urgency = getMergeUrgency(car, road);
            let speedMatchWeight = 1 - urgency; // Higher urgency = more speed matching
            difference = difference * (1 - speedMatchWeight) + speedMatchAdjustment * speedMatchWeight * 10;
        }
    }

    // Rubbernecking effect: slow down when passing the blockage zone
    if (isInRubberneckZone(car, road)) {
        // Calculate how deep into the rubberneck zone (0 to 1)
        let depthInZone = (car.getLaneX() - BLOCK_START) / RUBBERNECK_ZONE_LENGTH;
        // Peak rubbernecking at the start of the zone, fading out
        let rubberneckIntensity = 1 - depthInZone;
        // Calculate speed reduction needed
        let targetSpeed = car.speed * (RUBBERNECK_SPEED_FACTOR + (1 - RUBBERNECK_SPEED_FACTOR) * depthInZone);
        let rubberneckAdjustment = targetSpeed - car.speed;
        // Blend the rubberneck adjustment with normal driving
        difference += rubberneckAdjustment * rubberneckIntensity;
    }

    car.adjustSpeedBy(difference);
}

/**
 * Effects the current state of the car based on merge difference.
 * @param car to effect.
 * @param road to effect based on.
 */
function effectMergeState(car, road) {
    if (!(car instanceof Car)) {
        return;
    }
    if (!(road instanceof Road)) {
        return;
    }

    let desiredMergingDistance = car.getDesiredMergingDistance();
    let distanceToMerge = getDistance(road,
                                      car.laneNumber,
                                      car.getLaneX(),
                                      SpaceType.Blockage);
    let difference = distanceToMerge - desiredMergingDistance;
    let currentState = car.getState();

    if (difference <= 0) {
        if (currentState !== State.Merge) {
            car.setState(State.Merge);
        }
    } else {
        if (currentState !== State.Default) {
            car.setState(State.Default);
        }
    }
}
