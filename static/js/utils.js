/**
 * Some random util functions. Human made.
 */

/**
 * Gets a random value around a mean with a given standard deviation.
 * @param mean to use as center.
 * @param sd standard deviation.
 * @returns {number} a number.
 */
function getRandomValue(mean, sd) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Gets a random number centered around a center and standard deviation, and between 0 and 1.
 * @param center to center.
 * @param sd standard deviation.
 * @returns {number} result.
 */
function randomBoundedNormal(center, sd) {
    let value = getRandomValue(center, sd);

    return Math.max(0, Math.min(1, value));
}