/**
 * This file contains logic for the road, and manages the cars. This was mostly human made with
 * some AI enhancements.
 */

// Absolute number of spaces
const ROAD_WIDTH = 50;
// 0 index based (last 10 spaces: 40-49)
const BLOCK_START = 40;
// How long are trails of cars saved.
const CAR_TRAIL_LIFESPAN = 10000;

/**
 * Creates a road with space represented as an array. NULL = open drivable space,
 * 0 = blockage, cars must merge, anything else is probably a car.
 */
class Road {
    roadSpace = [];
    cars = [];
    blockedLanes = 0;
    trails = [];
    // Track completed car data for fairness calculation: {startLane, travelTime, expirationTime}
    completedCars = [];

    /**
     * Creates a road.
     * @param lanes number of lanes to create.
     * @param blockedLanes number of lanes blocked
     */
    constructor(lanes, blockedLanes, spaceSize) {
        if (lanes < 2 || blockedLanes >= lanes) return

        this.roadSpace = new Array(lanes);
        for (let i = 0; i < lanes; i++) {
            this.roadSpace[i] = new Array(ROAD_WIDTH).fill(null);
        }

        // Feet.
        this.spaceSize = spaceSize;
        this.placeBlockage(blockedLanes);
        // Bind purgeTrails to preserve 'this' context
        this.purgeTrails = this.purgeTrails.bind(this);
        setInterval(this.purgeTrails, 1000);
    }

    /**
     * Places a blockage on the road.
     * @param lanesToBlock number of lanes to block.
     */
    placeBlockage(lanesToBlock) {
        if (this.roadSpace.length <= lanesToBlock) return;
        let numLanes = this.roadSpace.length;
        for (let i = 0; i < lanesToBlock; i++) {
            // Block from the rightmost lane (highest index)
            let lane = this.roadSpace[numLanes - 1 - i];
            if (Array.isArray(lane) && lane.length >= BLOCK_START) {
                for (let j = BLOCK_START; j < lane.length; j++) {
                    lane[j] = 0;
                }
            }
        }
        this.blockedLanes = lanesToBlock;
    }

    /**
     * Adds a car to the road.
     * @param car to add to road.
     */
    addCar(car) {
        if (!(car instanceof Car)) return;
        let lane = this.getRandomLane();
        if (lane < 0) return;

        let laneArray = this.roadSpace[lane]
        if (laneArray instanceof Array) {
            laneArray[0] = car;
            this.cars.push(car);
            car.setLanePos(lane, 0);
            // Record start time for fairness calculation
            car.startTime = new Date().getTime();
            car.startLane = lane;
        }
    }

    /**
     * Gets size of road.
     */
    getSpaceSize() {
        return this.spaceSize;
    }

    /**
     * Gets a random lane. 0 Index based.
     * @returns {number} -1 if no open lanes.
     */
    getRandomLane() {
        let openLanes = [];
        let laneCount = this.roadSpace.length;
        for (let i = 0; i < laneCount; i++) {
            let target = this.roadSpace[i];
            if (target instanceof Array && target[0] == null) {
                openLanes.push(i);
            }
        }
        let openLanesN = openLanes.length;
        if (openLanesN <= 0) return -1;
        return openLanes[Math.floor(Math.random() * openLanesN)];
    }

    /**
     * Merge a car to the left.
     * @param car to merge
     */
    merge(car) {
        if (!(car instanceof Car)) return;
        let currentLane = car.getLaneN();
        let currentLaneX = car.getLaneX();

        // Check if there's a lane to merge into (left = lower index)
        if (currentLane - 1 < 0) return;
        let mergeSpace = this.roadSpace[currentLane - 1][currentLaneX];
        if (mergeSpace == null) this.setCarPos(car, currentLane - 1, currentLaneX);
    }

    /**
     * Tells all the cars on this road to drive!!
     */
    driveCars() {
        let toRemove = [];

        // Sort cars: leftmost lane first, then within each lane back-to-front (lowest laneX first)
        let sortedCars = [...this.cars].sort((a, b) => {
            if (a.getLaneN() !== b.getLaneN()) {
                return a.getLaneN() - b.getLaneN();
            }
            return a.getLaneX() - b.getLaneX();
        });

        sortedCars.forEach((car) => {
            this.driveCar(car, toRemove)
        });

        // Remove any cars marked for destruction.
        const currentTime = new Date().getTime();
        toRemove.sort((a, b) => b - a).forEach((item) => {
            let car = this.cars[item];
            if (car instanceof Car) {
                this.roadSpace[car.getLaneN()][car.getLaneX()] = null;
                this.trails.push(currentTime + CAR_TRAIL_LIFESPAN);
                if (car.startTime) {
                    this.completedCars.push({
                        startLane: car.startLane,
                        travelTime: currentTime - car.startTime,
                        expirationTime: currentTime + CAR_TRAIL_LIFESPAN
                    });
                }
            }
            this.cars.splice(item, 1);
        });
    }

    /**
     * Drives a single car.
     * @param car to drive
     * @param toRemove list to remove.
     */
    driveCar(car, toRemove) {
        if (!(car instanceof Car)) return;

            let index = this.cars.indexOf(car);
            car.drive(this);

            let desiredLaneX = Math.floor(car.getDistance() / this.getSpaceSize()) - 1;
            if (desiredLaneX < 0) desiredLaneX = 0;

            if (desiredLaneX != car.getLaneX()) {
                // Limit movement to available space ahead
                let availableSpace = getDistance(this, car.getLaneN(), car.getLaneX(), SpaceType.All);
                if (availableSpace < 0) availableSpace = ROAD_WIDTH;

                let maxLaneX = car.getLaneX() + availableSpace;
                let safeLaneX = Math.min(desiredLaneX, maxLaneX);

                if (safeLaneX != car.getLaneX()) {
                    let result = this.setCarPos(car, car.getLaneN(), safeLaneX);
                    if (result === -1) {
                        toRemove.push(index);
                    }
                }
            }
    }

    /**
     * Purge car trails after they have expired.
     * Trails store expiration timestamps - remove ones where current time has passed the expiration.
     */
    purgeTrails() {
        const currentTime = new Date().getTime();
        // Keep only trails that haven't expired yet (expiration time > current time)
        this.trails = this.trails.filter(expirationTime => expirationTime > currentTime);
        // Also purge expired completed car data
        this.completedCars = this.completedCars.filter(car => car.expirationTime > currentTime);
    }

    /**
     * Gets how many cars have been through this road in cars per second.
     * @returns {number}
     */
    getCarsPerSecond() {
        let totCars = this.trails.length;
        let seconds = CAR_TRAIL_LIFESPAN / 1000;
        return totCars / seconds;
    }

    /**
     * Gets the fairness score (0-1) based on variance in travel times.
     * 1 = perfectly fair (all cars take the same time)
     * 0 = completely unfair (high variance in travel times)
     * Uses coefficient of variation (CV) to normalize: fairness = 1 / (1 + CV)
     * @returns {number}
     */
    getFairness() {
        if (this.completedCars.length < 2) {
            return 1;
        }

        const times = this.completedCars.map(car => car.travelTime);

        // Calculate mean
        const mean = times.reduce((sum, t) => sum + t, 0) / times.length;

        if (mean === 0) {
            return 1;
        }

        // Calculate variance
        const squaredDiffs = times.map(t => Math.pow(t - mean, 2));
        const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / times.length;

        // Calculate standard deviation
        const stdDev = Math.sqrt(variance);

        // Coefficient of variation (normalized measure of dispersion)
        const cv = stdDev / mean;

        return 1 / (1 + cv);
    }

    /**
     * Sets a new car position.
     * @param car to set position of.
     * @param lane to set positon to.
     * @param laneX position within the lane to change to.
     * @returns {number} -1 if collision occurs, 0 if success.
     */
    setCarPos(car, lane, laneX) {
        if (!(car instanceof Car)) return;

        let numberOfLanes = this.roadSpace.length;

        if (lane >= numberOfLanes || laneX >= ROAD_WIDTH) return -1;

        let currentLane = car.getLaneN();
        let currentLaneX = car.getLaneX();

        if (currentLane >= numberOfLanes || currentLaneX >= ROAD_WIDTH) return -1;

        if (currentLane !== lane) {
            alertRearDriver(car, this, lane);
            car.alertMerge();
        }
        this.roadSpace[currentLane][currentLaneX] = null;
        let newSpace = this.roadSpace[lane][laneX];
        if (newSpace != null) {
            return -1;
        }
        this.roadSpace[lane][laneX] = car;
        car.setLanePos(lane, laneX);
        return 0
    }


}
