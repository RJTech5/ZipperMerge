/**
 * This file contains logic related to individual cars, included in the Car class. This is human
 * made.
 */

// Following distance in
// seconds (e.g. 3 = 3 seconds to car or blockage in front based on current speed)
const FOLLOWING_DISTANCE_MID = 3;
const FOLLOWING_DISTANCE_LOW = 0.2;
const FOLLOWING_DISTANCE_HIGH = 5;

const MERGE_DISTANCE_MID = 25;
const MERGE_DISTANCE_LOW = 50;
const MERGE_DISTANCE_HIGH = 2;

// Merge gap acceptance in seconds (time-based, not space-based)
const MERGE_GAP_MID = 1.5;      // 1.5 seconds gap
const MERGE_GAP_LOW = 0.8;      // Aggressive: accept 0.8 second gap
const MERGE_GAP_HIGH = 3.0;     // Cautious: need 3 second gap

// Legacy space-based values (used as fallback at very low speeds)
const MERGE_SPACE_MID = 3;
const MERGE_SPACE_LOW = 1;
const MERGE_SPACE_HIGH = 5;

// In feet per seconds
const MAX_SPEED = 66;

const State = {
    Default: 'DEFAULT',
    Merge: 'MERGE',
    Yield: 'YIELD',
    Right: 'RIGHT',
}

// Random car colors - nice saturated colors
const CAR_COLORS = [
    '#e74c3c', // Red
    '#3498db', // Blue
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#9b59b6', // Purple
    '#1abc9c', // Teal
    '#e91e63', // Pink
    '#00bcd4', // Cyan
    '#ff5722', // Deep Orange
    '#673ab7', // Deep Purple
    '#4caf50', // Light Green
    '#ffc107', // Amber
];

/**
 * A car.
 */
class Car {
    laneNumber = 0;
    lanePosX = 0;
    state = State.Default;
    // Speed is in feet per second!!
    speed = MAX_SPEED;

    carsLetIn = 0;

    // Visual position for smooth lerping
    visualX = 0;
    visualY = 0;

    /**
     * Represents a car, and its behavior.
     * @param mergeTendency
     * @param cooperation 0.0 not cooperative, does not work with other drivers. 1.0 works
     * with other drivers.
     * @param aggressiveness
     * @param laneNumber for car to be in.
     */
    constructor(mergeTendency, cooperation, aggressiveness, laneNumber) {
        this.mergeTendency = mergeTendency;
        this.cooperation = cooperation;
        this.aggressiveness = aggressiveness;
        this.laneNumber = laneNumber;
        this.state = State.Default;
        this.speed = MAX_SPEED;
        // In seconds.
        this.followingDistance = getValueFromNormalized(this.aggressiveness,
                                                        FOLLOWING_DISTANCE_LOW,
                                                        FOLLOWING_DISTANCE_MID,
                                                        FOLLOWING_DISTANCE_HIGH)
        this.indicator = false;
        this.lastMoved = -1;
        this.distance = 0;
        // Assign random color
        this.color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
        // Track start time and lane for fairness calculation
        this.startTime = null;
        this.startLane = laneNumber;
    }

    /**
     * Drives a car forward.
     * @param road to drive on.
     */
    drive(road) {
        let currentTime = new Date();
        if (this.lastMoved === -1) {
            this.lastMoved = currentTime;
            return;
        }
        let elapsedMs = currentTime - this.lastMoved;
        this.distance += this.speed * (elapsedMs / 1000);
        effectSpeed(this, road);
        effectMergeState(this, road);
        this.lastMoved = currentTime;

        // TODO: add a randomized tendency to use turn signal.
        this.indicator = (this.state === State.Merge);

        if (this.state === State.Merge && canMerge(this, road)) {
            road.merge(this);
        }
    }

    /**
     * Checks if this car is currently indicating.
     * @returns {boolean}
     */
    isIndicating() {
        return this.indicator;
    }

    /**
     * Sets the lane position of this car.
     * @param laneN lane number to be in.
     * @param laneX distance in the lane.
     */
    setLanePos(laneN, laneX) {
        this.laneNumber = laneN;
        this.lanePosX = laneX;
    }

    /**
     * Gets the lane number this car is in.
     * @returns {number} representing the lane.
     */
    getLaneN() {
        return this.laneNumber;
    }

    /**
     * Get the cooperation of this vehicle.
     * @returns {*}
     */
    getCooperation() {
        return this.cooperation;
    }

    /**
     * Get the number of cars let in by this car.
     * @returns {number}
     */
    getCarsLetIn() {
        return this.carsLetIn
    }

    /**
     * Let this car know that a car merged in front of it.
     */
    alertMerge() {
        this.carsLetIn += 1;
    }

    /**
     * Gets the position in the lane the car is in.
     * @returns {number} representing the position in the lane.
     */
    getLaneX() {
        return this.lanePosX;
    }

    /**
     * Gets the desired merge gap in seconds (time-based).
     * @returns {number} gap time in seconds
     */
    getDesiredMergeGap() {
        return getValueFromNormalized(this.aggressiveness,
                                      MERGE_GAP_LOW,
                                      MERGE_GAP_MID,
                                      MERGE_GAP_HIGH);
    }

    /**
     * Gets the desired merge space for this vehicle, converted from time-based gap.
     * @param road to get space size from
     * @param urgencyFactor multiplier to reduce gap (1.0 = normal, 0.5 = desperate)
     * @returns {number} spaces needed
     */
    getDesiredMergeSpace(road, urgencyFactor = 1.0) {
        let gapSeconds = this.getDesiredMergeGap() * urgencyFactor;

        // Convert time gap to spaces: spaces = (speed * time) / spaceSize
        let spaceSize = road instanceof Road ? road.getSpaceSize() : 15;
        let spacesNeeded = (this.speed * gapSeconds) / spaceSize;

        // At very low speeds, use minimum space requirement
        let minSpaces = getValueFromNormalized(this.aggressiveness,
                                               MERGE_SPACE_LOW,
                                               MERGE_SPACE_MID,
                                               MERGE_SPACE_HIGH);

        return Math.max(minSpaces, Math.ceil(spacesNeeded));
    }

    /**
     * Get the desired merge distance for this vehicle in spaces.
     * @returns {*}
     */
    getDesiredMergingDistance() {
        return getValueFromNormalized(this.mergeTendency,
                                      MERGE_DISTANCE_LOW,
                                      MERGE_DISTANCE_MID,
                                      MERGE_DISTANCE_HIGH);

    }

    /**
     * Gets the distance that this vehicle would like to keep based on its current speed.
     * @returns {number}
     */
    getDesiredDistance(road) {
        if (shouldLetCarIn(this, road)) {
            if (!(road instanceof Road)) return;
            return this.getDesiredMergeSpace() * road.getSpaceSize();
        } else {
            return this.speed * this.followingDistance;
        }
    }

    /**
     * Gets the current state of this vehicle.
     * @returns {string}
     */
    getState() {
        return this.state
    }

    /**
     * Returns how many cars a car on the road should let in for a perfect zip merge.
     * @param car to check quote for.
     * @param road to base quote on.
     * @returns {number} of cars to let in.
     */
    getCarQuota(road) {
        if (!(road instanceof Road)) {
            return;
        }

        let blockedLanes = road.blockedLanes;
        let carLane = this.getLaneN();
        let perfectQuota = blockedLanes - carLane;
        return Math.round(this.cooperation * perfectQuota);
    }

    /**
     * Sets the state of this car.
     * @param state to set to.
     */
    setState(state) {
        this.state = state;
    }

    /**
     * Gets the actual distance from this car to anything in front of it.
     * @param road
     * @returns {number|number}
     */
    getActualDistance(road) {
        return getDistance(road, this.laneNumber, this.lanePosX, SpaceType.All);
    }

    /**
     * Adjusts the speed of this car by amount.
     * @param amount to adjust, - if slower, + if faster.
     */
    adjustSpeedBy(amount) {
        let effected = this.speed + amount;
        if (effected >= MAX_SPEED) {
            this.speed = MAX_SPEED;
        } else if (effected <= 0) {
            this.speed = 0;
        } else {
            this.speed = effected;
        }
    }

    /**
     * Get the distance this car has traveled.
     * @returns {number}
     */
    getDistance() {
        return this.distance;
    }
}

/**
 * Helper function to get a value from a normalized input.
 * @param input between 0 and 1.
 * @param low low value.
 * @param mid value.
 * @param high value.
 * @returns {*}
 */
function getValueFromNormalized(input, low, mid, high) {
    if (input == mid) {
        return mid;
    } else if (input < mid) {
        let spread = mid - low;
        let get = (input / 0.5) * spread;
        return low + get;
    } else if (input > mid) {
        let spread = high - mid;
        let get = ((input - 0.5) / 0.5) * spread;
        return mid + get;
    }
}