/**
 * Prepare the targets of a runtime for interpolation.
 * @param {Runtime} runtime The Runtime with targets to prepare for interpolation.
 */
const setupInitialState = runtime => {
    const renderer = runtime.renderer;

    for (const target of runtime.targets) {
        const directionAndScale = target._getRenderedDirectionAndScale();

        // If sprite may have been interpolated in the previous frame, reset its renderer state.
        if (renderer && target.interpolationData) {
            const drawableID = target.drawableID;
            renderer.updateDrawablePosition(drawableID, [target.x, target.y]);
            renderer.updateDrawableDirectionScale(drawableID, directionAndScale.direction, directionAndScale.scale);
            renderer.updateDrawableEffect(drawableID, 'ghost', target.effects.ghost);
        }

        if (target.visible && !target.isStage) {
            target.interpolationData = {
                x: target.x,
                y: target.y,
                direction: directionAndScale.direction,
                scale: directionAndScale.scale,
                costume: target.currentCostume,
                ghost: target.effects.ghost
            };
        } else {
            target.interpolationData = null;
        }
    }
};

/**
 * Interpolate the position of targets.
 * @param {Runtime} runtime The Runtime with targets to interpolate.
 * @param {number} time Relative time in the frame in [0-1].
 */
const interpolate = (runtime, time) => {
    const renderer = runtime.renderer;
    if (!renderer) {
        return;
    }

    for (const target of runtime.targets) {
        // interpolationData is the initial state at the start of the frame (time 0)
        // the state on the target itself is the state at the end of the frame (time 1)
        const interpolationData = target.interpolationData;
        if (!interpolationData) {
            continue;
        }

        // Don't waste time interpolating sprites that are hidden.
        if (
            !target.visible ||
            (
                target.effects.ghost === 100 &&
                interpolationData.ghost === 100
            )
        ) {
            continue;
        }

        runtime.emit(runtime.constructor.BEFORE_INTERPOLATE, target);

        const drawableID = target.drawableID;

        // Position interpolation.
        const xDistance = target.x - interpolationData.x;
        const yDistance = target.y - interpolationData.y;
        const absoluteXDistance = Math.abs(xDistance);
        const absoluteYDistance = Math.abs(yDistance);
        if (absoluteXDistance > 0.1 || absoluteYDistance > 0.1) {
            const drawable = renderer._allDrawables[drawableID];
            // Large movements are likely intended to be instantaneous.
            // getAABB is less accurate than getBounds, but it's much faster
            const bounds = drawable.getAABB();
            const tolerance = Math.min(240, Math.max(50, 1.5 * (bounds.width + bounds.height)));
            const distance = Math.sqrt((absoluteXDistance ** 2) + (absoluteYDistance ** 2));
            if (distance < tolerance) {
                const newX = interpolationData.x + (xDistance * time);
                const newY = interpolationData.y + (yDistance * time);
                renderer.updateDrawablePosition(drawableID, [newX, newY]);
            }
        }

        // Effect interpolation.
        const ghostChange = target.effects.ghost - interpolationData.ghost;
        const absoluteGhostChange = Math.abs(ghostChange);
        // Large changes are likely intended to be instantaneous.
        if (absoluteGhostChange > 0 && absoluteGhostChange < 25) {
            const newGhost = target.effects.ghost + (ghostChange * time);
            renderer.updateDrawableEffect(drawableID, 'ghost', newGhost);
        }

        // Interpolate scale and direction.
        const costumeUnchanged = interpolationData.costume === target.currentCostume;
        if (costumeUnchanged) {
            let {direction, scale} = target._getRenderedDirectionAndScale();
            let updateDrawableDirectionScale = false;

            // Interpolate direction.
            if (direction !== interpolationData.direction) {
                // Perfect 90 degree angles should not be interpolated.
                // eg. the foreground tile clones in https://scratch.mit.edu/projects/60917032/
                if (direction % 90 !== 0 || interpolationData.direction % 90 !== 0) {
                    const currentRadians = direction * Math.PI / 180;
                    const startingRadians = interpolationData.direction * Math.PI / 180;
                    direction = Math.atan2(
                        (Math.sin(currentRadians) * time) + (Math.sin(startingRadians) * (1 - time)),
                        (Math.cos(currentRadians) * time) + (Math.cos(startingRadians) * (1 - time))
                    ) * 180 / Math.PI;
                    updateDrawableDirectionScale = true;
                }
            }

            // Interpolate scale.
            const startingScale = interpolationData.scale;
            if (scale[0] !== startingScale[0] || scale[1] !== startingScale[1]) {
                // Do not interpolate size when the sign of either scale differs.
                if (
                    Math.sign(scale[0]) === Math.sign(startingScale[0]) &&
                    Math.sign(scale[1]) === Math.sign(startingScale[1])
                ) {
                    const changeX = scale[0] - startingScale[0];
                    const changeY = scale[1] - startingScale[1];
                    const absoluteChangeX = Math.abs(changeX);
                    const absoluteChangeY = Math.abs(changeY);
                    // Large changes are likely intended to be instantaneous.
                    if (absoluteChangeX < 100 && absoluteChangeY < 100) {
                        scale[0] = startingScale[0] + (changeX * time);
                        scale[1] = startingScale[1] + (changeY * time);
                        updateDrawableDirectionScale = true;
                    }
                }
            }

            if (updateDrawableDirectionScale) {
                renderer.updateDrawableDirectionScale(drawableID, direction, scale);
            }
        }

        runtime.emit(runtime.constructor.AFTER_INTERPOLATE, target);
    }
};

module.exports = {
    setupInitialState,
    interpolate
};
