/**
 * Simulation class that encapsulates a complete zipper merge simulation.
 * Allows multiple simulations to run independently on different canvases.
 * This was mostly AI generated.
 */
class Simulation {
    // Road configuration
    road = null;

    // Driver behavior parameters
    mergeTendency = 0.9;
    mergeTendencyVariance = 0.1;
    cooperation = 1;
    cooperationVariance = 0.1;
    aggressiveness = 0.5;
    aggressivenessVariance = 0.1;

    // Timing
    carGenerationInterval = 500;  // ms between car spawns
    simulationUpdateInterval = 200;  // ms between simulation updates

    // Internal state
    canvas = null;
    ctx = null;
    running = false;
    carIntervalId = null;
    simIntervalId = null;
    animationFrameId = null;

    /**
     * Creates a new simulation.
     * @param {string} canvasId - The ID of the canvas element to render to.
     * @param {Object} options - Configuration options.
     * @param {number} options.lanes - Number of lanes (default: 3).
     * @param {number} options.blockedLanes - Number of blocked lanes (default: 1).
     * @param {number} options.spaceSize - Size of each space in feet (default: 15).
     * @param {number} options.mergeTendency - Base merge tendency (default: 0.9).
     * @param {number} options.mergeTendencyVariance - Variance for merge tendency (default: 0.1).
     * @param {number} options.cooperation - Base cooperation (default: 1).
     * @param {number} options.cooperationVariance - Variance for cooperation (default: 0.1).
     * @param {number} options.aggressiveness - Base aggressiveness (default: 0.5).
     * @param {number} options.aggressivenessVariance - Variance for aggressiveness (default: 0.1).
     */
    constructor(canvasId, options = {}) {
        // Get canvas
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with id '${canvasId}' not found`);
        }
        this.ctx = this.canvas.getContext('2d');

        // Road configuration
        const lanes = options.lanes ?? 2;
        const blockedLanes = options.blockedLanes ?? 1;
        const spaceSize = options.spaceSize ?? 15;
        this.road = new Road(lanes, blockedLanes, spaceSize);

        // Driver behavior parameters
        if (options.mergeTendency !== undefined) this.mergeTendency = options.mergeTendency;
        if (options.mergeTendencyVariance !== undefined) this.mergeTendencyVariance = options.mergeTendencyVariance;
        if (options.cooperation !== undefined) this.cooperation = options.cooperation;
        if (options.cooperationVariance !== undefined) this.cooperationVariance = options.cooperationVariance;
        if (options.aggressiveness !== undefined) this.aggressiveness = options.aggressiveness;
        if (options.aggressivenessVariance !== undefined) this.aggressivenessVariance = options.aggressivenessVariance;

        // Timing options
        if (options.carGenerationInterval !== undefined) this.carGenerationInterval = options.carGenerationInterval;
        if (options.simulationUpdateInterval !== undefined) this.simulationUpdateInterval = options.simulationUpdateInterval;

        // Bind methods to preserve 'this' context in callbacks
        this.generateRandomCar = this.generateRandomCar.bind(this);
        this.simulationUpdate = this.simulationUpdate.bind(this);
        this.renderLoop = this.renderLoop.bind(this);
    }

    /**
     * Starts the simulation.
     */
    start() {
        if (this.running) return;
        this.running = true;

        // Start car generation
        this.carIntervalId = setInterval(this.generateRandomCar, this.carGenerationInterval);

        // Start simulation updates
        this.simIntervalId = setInterval(this.simulationUpdate, this.simulationUpdateInterval);

        // Start render loop
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * Stops the simulation.
     */
    stop() {
        if (!this.running) return;
        this.running = false;

        if (this.carIntervalId) {
            clearInterval(this.carIntervalId);
            this.carIntervalId = null;
        }

        if (this.simIntervalId) {
            clearInterval(this.simIntervalId);
            this.simIntervalId = null;
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Resets the simulation with a fresh road.
     */
    reset() {
        const wasRunning = this.running;
        this.stop();

        // Create a new road with the same configuration
        const lanes = this.road.roadSpace.length;
        const blockedLanes = this.road.blockedLanes;
        const spaceSize = this.road.spaceSize;
        this.road = new Road(lanes, blockedLanes, spaceSize);

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Restart if it was running
        if (wasRunning) {
            this.start();
        }
    }

    /**
     * Gets the number of cars per second.
     * @returns {number|*}
     */
    getCarsPerSecond() {
        return this.road.getCarsPerSecond();
    }

    /**
     * Gets the fairness score (0-1).
     * @returns {number}
     */
    getFairness() {
        return this.road.getFairness();
    }

    /**
     * Generates a random car and adds it to the road.
     */
    generateRandomCar() {
        const mt = randomBoundedNormal(this.mergeTendency, this.mergeTendencyVariance);
        const c = randomBoundedNormal(this.cooperation, this.cooperationVariance);
        const a = randomBoundedNormal(this.aggressiveness, this.aggressivenessVariance);
        const laneNumber = this.road.getRandomLane();

        if (laneNumber >= 0) {
            const car = new Car(mt, c, a, laneNumber);
            this.road.addCar(car);
        }
    }

    /**
     * Updates the simulation state.
     */
    simulationUpdate() {
        this.road.driveCars();
    }

    /**
     * Render loop using requestAnimationFrame.
     */
    renderLoop() {
        if (!this.running) return;

        renderRoad(this.road, this.ctx, this.canvas);
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    }
}
